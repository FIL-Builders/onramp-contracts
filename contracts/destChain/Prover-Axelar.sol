// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketAPI} from "filecoin-solidity-api/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "filecoin-solidity-api/contracts/v0.8/types/MarketTypes.sol";
import {AccountTypes} from "filecoin-solidity-api/contracts/v0.8/types/AccountTypes.sol";
import {CommonTypes} from "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import {AccountCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/AccountCbor.sol";
import {MarketCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/MarketCbor.sol";
import {BytesCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/BytesCbor.sol";
import {BigInts} from "filecoin-solidity-api/contracts/v0.8/utils/BigInts.sol";
import {CBOR} from "solidity-cborutils/contracts/CBOR.sol";
import {Misc} from "filecoin-solidity-api/contracts/v0.8/utils/Misc.sol";
import {FilAddresses} from "filecoin-solidity-api/contracts/v0.8/utils/FilAddresses.sol";
import {DataAttestation, IBridgeContract, StringsEqual} from "../sourceChain/Oracles.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";

using CBOR for CBOR.CBORBuffer;

contract DealClientAxl is AxelarExecutable {
    using AccountCBOR for *;
    using MarketCBOR for *;

    IAxelarGasService public gasService;
    uint64 public constant AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 public constant DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 public constant MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    address public constant MARKET_ACTOR_ETH_ADDRESS = address(0xff00000000000000000000000000000000000005);
    address public constant DATACAP_ACTOR_ETH_ADDRESS = address(0xfF00000000000000000000000000000000000007);
    uint256 public constant AXELAR_GAS_FEE = 100000000000000000; // Start with 0.1 FIL

    // Storage gap
    uint256[50] private __gap;

    struct DestinationChain {
        string chainName;
        address destinationAddress;
    }

    struct RequestId {
        bytes32 requestId;
        bool valid;
    }

    struct RequestIdx {
        uint256 idx;
        bool valid;
    }

    struct DealRequest {
        bytes piece_cid;
        uint64 piece_size;
        bool verified_deal;
        string label;
        int64 start_epoch;
        int64 end_epoch;
        uint256 storage_price_per_epoch;
        uint256 provider_collateral;
        uint256 client_collateral;
        uint64 extra_params_version;
        ExtraParams extra_params;
    }

    struct ExtraParams {
        string location_ref;
        uint64 car_size;
        bool skip_ipni_announce;
        bool remove_unsealed_copy;
    }

    enum Status {
        None,
        DealPublished,
        DealActivated,
        DealTerminated
    }

    DealRequest[] public dealRequests;
    mapping(bytes32 => RequestIdx) public dealIdToIndex;

    mapping(bytes => uint64) public pieceDeals; // commP -> deal ID
    mapping(bytes => RequestId) public pieceRequests; // commP -> deal request Id
    mapping(bytes => Status) public pieceStatus;
    mapping(bytes => uint256) public providerGasFunds; // Funds set aside for calling oracle by provider
    mapping(uint256 => DestinationChain) public chainIdToDestinationChain;

 

    event DealProposalCreate(
        bytes32 indexed id,
        uint64 size,
        bool indexed verified,
        uint256 price
    );

    function initialize(address _gateway, address _gasReceiver) public initializer{
        __AxelarExecutable_init(_gateway);

        gasService = IAxelarGasService(_gasReceiver);
    }

    function setDestinationChains(
        uint[] calldata chainIds,
        string[] calldata destinationChains,
        address[] calldata destinationAddresses
    ) external {
        require(
            chainIds.length == destinationChains.length &&
                destinationChains.length == destinationAddresses.length,
            "Input arrays must have the same length"
        );

        for (uint i = 0; i < chainIds.length; i++) {
            require(
                chainIdToDestinationChain[chainIds[i]].destinationAddress ==
                    address(0),
                "Destination chains already configured for the chainId"
            );
            chainIdToDestinationChain[chainIds[i]] = DestinationChain(
                destinationChains[i],
                destinationAddresses[i]
            );
        }
    }

    function addGasFunds(bytes calldata providerAddrData) external payable {
        providerGasFunds[providerAddrData] += msg.value;
    }

    function makeDealProposal(DealRequest calldata deal) public returns (bytes32){
        require(
            pieceStatus[deal.piece_cid] != Status.DealActivated || 
            pieceStatus[deal.piece_cid] != Status.DealPublished, 
            "this deal is already active or published"
        );

        uint256 idx = dealRequests.length;
        dealRequests.push(deal);

        bytes32 proposalId =  keccak256(abi.encodePacked(msg.sender, block.timestamp, idx));
        dealIdToIndex[proposalId] = RequestIdx(idx, true);

        pieceRequests[deal.piece_cid] = RequestId(proposalId, true);
        pieceStatus[deal.piece_cid] = Status.DealPublished;

        emit DealProposalCreate(proposalId, deal.piece_size, deal.verified_deal, deal.storage_price_per_epoch);
        return proposalId;
    }

    function getDealRequest(bytes32 proposalId) public view returns (DealRequest memory) {
        require(dealIdToIndex[proposalId].valid, "Deal does not exist");
        return dealRequests[dealIdToIndex[proposalId].idx];
    }

    function getDealProposal(bytes32 proposalId) public view returns (bytes memory) {
        DealRequest memory deal = getDealRequest(proposalId);
        MarketTypes.DealProposal memory proposal = MarketTypes.DealProposal(
            CommonTypes.Cid(deal.piece_cid),
            deal.piece_size,
            deal.verified_deal,
            FilAddresses.fromEthAddress(address(this)),
            // Dummy provider address, should be replaced with the provider address who pickes the deal
            FilAddresses.fromActorID(0),
            CommonTypes.DealLabel(abi.encode(deal.label), true),
            CommonTypes.ChainEpoch.wrap(deal.start_epoch),
            CommonTypes.ChainEpoch.wrap(deal.end_epoch),
            BigInts.fromUint256(deal.storage_price_per_epoch),
            BigInts.fromUint256(deal.provider_collateral),
            BigInts.fromUint256(deal.client_collateral)
        );
        return MarketCBOR.serializeDealProposal(proposal);
    }

    function serializeExtraParams(ExtraParams memory params) internal pure returns (bytes memory) {
        CBOR.CBORBuffer memory buffer = CBOR.create(64);
        buffer.startFixedArray(4);
        buffer.writeString(params.location_ref);
        buffer.writeUInt64(params.car_size);
        buffer.writeBool(params.skip_ipni_announce);
        buffer.writeBool(params.remove_unsealed_copy);
        buffer.endSequence();
        return buffer.data();
    }

    function getExtraParams(bytes32 proposalId) public view returns (bytes memory extra_params) {
        DealRequest memory deal = getDealRequest(proposalId);
        return serializeExtraParams(deal.extra_params);
    }

    function updateDealStatus(bytes memory pieceCid) public {

        require(pieceDeals[pieceCid] > 0, "Deal does not exist for piece cid");

        (int256 exit_code, MarketTypes.GetDealActivationReturn memory ret) = MarketAPI
            .getDealActivation(pieceDeals[pieceCid]);
        
        require(exit_code == 0, "Deal activation failed with non zero exit code");
      
        if (CommonTypes.ChainEpoch.unwrap(ret.terminated) > 0) {
            pieceStatus[pieceCid] = Status.DealTerminated;
        } else if (CommonTypes.ChainEpoch.unwrap(ret.activated) > 0) {
            pieceStatus[pieceCid] = Status.DealActivated;
        }
    }

    // dealNotify is the callback from the market actor into the contract at the end
    // of PublishStorageDeals. This message holds the previously approved deal proposal
    // and the associated dealID. The dealID is stored as part of the contract state
    // and the completion of this call marks the success of PublishStorageDeals
    // @params - cbor byte array of MarketDealNotifyParams
    function dealNotify(bytes memory params) internal {
        require(
            msg.sender == MARKET_ACTOR_ETH_ADDRESS,
            "msg.sender needs to be market actor f05"
        );

        MarketTypes.MarketDealNotifyParams memory mdnp = MarketCBOR
            .deserializeMarketDealNotifyParams(params);
        MarketTypes.DealProposal memory proposal = MarketCBOR
            .deserializeDealProposal(mdnp.dealProposal);

        pieceDeals[proposal.piece_cid.data] = mdnp.dealId;
        pieceStatus[proposal.piece_cid.data] = Status.DealPublished;

        int64 duration = CommonTypes.ChainEpoch.unwrap(proposal.end_epoch) -
            CommonTypes.ChainEpoch.unwrap(proposal.start_epoch);
        // Expects deal label to be chainId encoded in bytes
        uint256 chainId = abi.decode(proposal.label.data, (uint256));
        DataAttestation memory attest = DataAttestation(
            proposal.piece_cid.data,
            duration,
            mdnp.dealId,
            uint256(Status.DealPublished)
        );
        bytes memory payload = abi.encode(attest);
        if (chainId == block.chainid) {
            IBridgeContract(
                chainIdToDestinationChain[chainId].destinationAddress
            )._execute(
                    chainIdToDestinationChain[chainId].chainName,
                    addressToHexString(address(this)),
                    payload
                );
        } else {
            // If the chainId is not the current chain, we need to call the gateway
            // to forward the message to the correct chain
            call_axelar(
                payload,
                proposal.provider.data,
                AXELAR_GAS_FEE,
                chainId
            );
        }
    }

    function call_axelar(
        bytes memory payload,
        bytes memory providerAddrData,
        uint256 gasTarget,
        uint256 chainId
    ) internal {
        uint256 gasFunds = gasTarget;
        if (providerGasFunds[providerAddrData] >= gasTarget) {
            providerGasFunds[providerAddrData] -= gasTarget;
        } else {
            gasFunds = providerGasFunds[providerAddrData];
            providerGasFunds[providerAddrData] = 0;
        }
        string memory destinationChain = chainIdToDestinationChain[chainId]
            .chainName;
        string memory destinationAddress = addressToHexString(
            chainIdToDestinationChain[chainId].destinationAddress
        );
        gasService.payNativeGasForContractCall{value: gasFunds}(
            address(this),
            destinationChain,
            destinationAddress,
            payload,
            msg.sender
        );
        gateway().callContract(destinationChain, destinationAddress, payload);
    }

    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload) internal override{
            //Do Nothing
    }

    function debug_call(
        bytes calldata commp,
        bytes calldata providerAddrData,
        uint256 gasFunds,
        uint256 chainId
    ) public {
        DataAttestation memory attest = DataAttestation(
            commp,
            0,
            42,
            uint256(Status.DealPublished)
        );
        bytes memory payload = abi.encode(attest);
        if (chainId == block.chainid) {
            IBridgeContract(
                chainIdToDestinationChain[chainId].destinationAddress
            )._execute(
                    chainIdToDestinationChain[chainId].chainName,
                    addressToHexString(address(this)),
                    payload
                );
        } else {
            // If the chainId is not the current chain, we need to call the gateway
            // to forward the message to the correct chain
            call_axelar(payload, providerAddrData, gasFunds, chainId);
        }
    }

    // handle_filecoin_method is the universal entry point for any evm based
    // actor for a call coming from a builtin filecoin actor
    // @method - FRC42 method number for the specific method hook
    // @params - CBOR encoded byte array params
    function handle_filecoin_method(
        uint64 method,
        uint64,
        bytes memory params
    ) public returns (uint32, uint64, bytes memory) {
        bytes memory ret;
        uint64 codec;
        // dispatch methods
        if (method == AUTHENTICATE_MESSAGE_METHOD_NUM) {
            // If we haven't reverted, we should return a CBOR true to indicate that verification passed.
            // Always authenticate message
            CBOR.CBORBuffer memory buf = CBOR.create(1);
            buf.writeBool(true);
            ret = buf.data();
            codec = Misc.CBOR_CODEC;
        } else if (method == MARKET_NOTIFY_DEAL_METHOD_NUM) {
            dealNotify(params);
        } else {
            revert("the filecoin method that was called is not handled");
        }
        return (0, codec, ret);
    }

    function addressToHexString(
        address _addr
    ) internal pure returns (string memory) {
        return Strings.toHexString(uint256(uint160(_addr)), 20);
    }
}
