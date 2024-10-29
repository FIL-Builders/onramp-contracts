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

using CBOR for CBOR.CBORBuffer;

struct RequestId {
    bytes32 requestId;
    bool valid;
}

struct RequestIdx {
    uint256 idx;
    bool valid;
}

struct ProviderSet {
    bytes provider;
    bool valid;
}

// User request for this contract to make a deal. This structure is modelled after Filecoin's Deal
// Proposal, but leaves out the provider, since any provider can pick up a deal broadcast by this
// contract.
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
    ExtraParamsV1 extra_params;
}

// Extra parameters associated with the deal request. These are off-protocol flags that
// the storage provider will need.
struct ExtraParamsV1 {
    string location_ref;
    uint64 car_size;
    bool skip_ipni_announce;
    bool remove_unsealed_copy;
}

contract DealClient {
    using AccountCBOR for *;
    using MarketCBOR for *;

    uint64 public constant AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 public constant DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 public constant MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    address public constant MARKET_ACTOR_ETH_ADDRESS =
        address(0xff00000000000000000000000000000000000005);
    address public constant DATACAP_ACTOR_ETH_ADDRESS =
        address(0xfF00000000000000000000000000000000000007);

    enum Status {
        None,
        RequestSubmitted,
        DealPublished,
        DealActivated,
        DealTerminated
    }

    mapping(bytes32 => RequestIdx) public dealRequestIdx; // contract deal id -> deal index
    DealRequest[] public dealRequests;

    mapping(bytes => RequestId) public pieceRequests; // commP -> dealProposalID
    mapping(bytes => ProviderSet) public pieceProviders; // commP -> provider
    mapping(bytes => uint64) public pieceDeals; // commP -> deal ID
    mapping(bytes => Status) public pieceStatus;

    event ReceivedDataCap(string received);
    event DealProposalCreate(bytes32 indexed id, uint64 size, bool indexed verified, uint256 price);

    IBridgeContract public bridgeContract;

    function setBridgeContract(address _bridgeContract) external {
        if (address(bridgeContract) == address(0)) {
            bridgeContract = IBridgeContract(_bridgeContract);
        } else {
            revert("Bridge contract already set");
        }
    }

    function makeDealProposal(DealRequest calldata deal) public returns (bytes32) {
        if (
            pieceStatus[deal.piece_cid] == Status.DealPublished ||
            pieceStatus[deal.piece_cid] == Status.DealActivated
        ) {
            revert("deal with this pieceCid already published");
        }

        uint256 index = dealRequests.length;
        dealRequests.push(deal);

        // creates a unique ID for the deal proposal -- there are many ways to do this
        bytes32 id = keccak256(abi.encodePacked(block.timestamp, msg.sender, index));
        dealRequestIdx[id] = RequestIdx(index, true);

        pieceRequests[deal.piece_cid] = RequestId(id, true);
        pieceStatus[deal.piece_cid] = Status.RequestSubmitted;

        // writes the proposal metadata to the event log
        emit DealProposalCreate(
            id,
            deal.piece_size,
            deal.verified_deal,
            deal.storage_price_per_epoch
        );

        return id;
    }

    // authenticateMessage is the callback from the market actor into the contract
    // as part of PublishStorageDeals. This message holds the deal proposal from the
    // miner, which needs to be validated by the contract in accordance with the
    // deal requests made and the contract's own policies
    // @params - cbor byte array of AccountTypes.AuthenticateMessageParams
    function authenticateMessage(bytes memory params) internal view {
        require(msg.sender == MARKET_ACTOR_ETH_ADDRESS, "msg.sender needs to be market actor f05");

        AccountTypes.AuthenticateMessageParams memory amp = params
            .deserializeAuthenticateMessageParams();
        MarketTypes.DealProposal memory proposal = MarketCBOR.deserializeDealProposal(amp.message);

        bytes memory pieceCid = proposal.piece_cid.data;
        require(pieceRequests[pieceCid].valid, "piece cid must be added before authorizing");
        require(
            !pieceProviders[pieceCid].valid,
            "deal failed policy check: provider already claimed this cid"
        );

        DealRequest memory req = getDealRequest(pieceRequests[pieceCid].requestId);
        require(proposal.verified_deal == req.verified_deal, "verified_deal param mismatch");
        (uint256 proposalStoragePricePerEpoch, bool storagePriceConverted) = BigInts.toUint256(
            proposal.storage_price_per_epoch
        );
        require(
            !storagePriceConverted,
            "Issues converting uint256 to BigInt, may not have accurate values"
        );
        (uint256 proposalClientCollateral, bool collateralConverted) = BigInts.toUint256(
            proposal.client_collateral
        );
        require(
            !collateralConverted,
            "Issues converting uint256 to BigInt, may not have accurate values"
        );
        require(
            proposalStoragePricePerEpoch <= req.storage_price_per_epoch,
            "storage price greater than request amount"
        );
        require(
            proposalClientCollateral <= req.client_collateral,
            "client collateral greater than request amount"
        );
    }

    // helper function to get deal request based from id
    function getDealRequest(bytes32 requestId) internal view returns (DealRequest memory) {
        RequestIdx memory ri = dealRequestIdx[requestId];
        require(ri.valid, "proposalId not available");
        return dealRequests[ri.idx];
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
        DataAttestation memory attest = DataAttestation(
            proposal.piece_cid.data,
            duration,
            mdnp.dealId,
            uint256(Status.DealPublished)
        );
        bridgeContract._execute(
            "FIL",
            addressToHexString(address(this)),
            abi.encode(attest)
        );
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
