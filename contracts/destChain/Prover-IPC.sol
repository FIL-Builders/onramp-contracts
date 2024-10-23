// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketAPI} from "filecoin-solidity-api/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "filecoin-solidity-api/contracts/v0.8/types/MarketTypes.sol";
import {AccountTypes} from "filecoin-solidity-api/contracts/v0.8/types/AccountTypes.sol";
import {AccountCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/AccountCbor.sol";
import {MarketCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/MarketCbor.sol";
import {BytesCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/BytesCbor.sol";
import {BigInts} from "filecoin-solidity-api/contracts/v0.8/utils/BigInts.sol";
import {CBOR} from "solidity-cborutils/contracts/CBOR.sol";
import {Misc} from "filecoin-solidity-api/contracts/v0.8/utils/Misc.sol";
import {FilAddresses} from "filecoin-solidity-api/contracts/v0.8/utils/FilAddresses.sol";
import {DataAttestation} from "../sourceChain/Oracles.sol";
import {IpcContract} from "@ipc/sdk/IpcContract.sol";
import {IpcEnvelope, CallMsg} from "@ipc/contracts/structs/CrossNet.sol";
import {IPCAddress, SubnetID} from "@ipc/contracts/structs/Subnet.sol";
import {SubnetIDHelper} from "@ipc/contracts/lib/SubnetIDHelper.sol";
import {FvmAddressHelper} from "@ipc/contracts/lib/FvmAddressHelper.sol";
import {FvmAddress} from "@ipc/contracts/structs/FvmAddress.sol";

using CBOR for CBOR.CBORBuffer;

contract DealClientIPC is IpcContract {
    using AccountCBOR for *;
    using MarketCBOR for *;

    uint64 public constant AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 public constant MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    address public constant MARKET_ACTOR_ETH_ADDRESS =
        address(0xff00000000000000000000000000000000000005);

    enum Status {
        None,
        DealPublished,
        DealActivated,
        DealTerminated
    }

    mapping(bytes => uint64) public pieceDeals; // commP -> deal ID
    mapping(bytes => Status) public pieceStatus;
    mapping(bytes32 => address) public subnetIdToDestinationAddress; // SubnetID hash to destination address

    constructor(address _gateway) IpcContract(_gateway) {
        // Initialization if needed
    }

    function setDestinationChains(
        SubnetID[] calldata subnetIds,
        address[] calldata destinationAddresses
    ) external {
        require(
            subnetIds.length == destinationAddresses.length,
            "Input arrays must have the same length"
        );

        for (uint i = 0; i < subnetIds.length; i++) {
            bytes32 subnetHash = subnetIds[i].toHash();
            require(
                subnetIdToDestinationAddress[subnetHash] == address(0),
                "Destination already configured for this subnet"
            );
            subnetIdToDestinationAddress[subnetHash] = destinationAddresses[i];
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

        // Expects deal label to be SubnetID encoded in bytes
        SubnetID memory subnetId = abi.decode(proposal.label.data, (SubnetID));

        DataAttestation memory attest = DataAttestation(
            proposal.piece_cid.data,
            duration,
            mdnp.dealId,
            uint256(Status.DealPublished)
        );
        bytes memory payload = abi.encode(attest);

        CallMsg memory message = CallMsg({
            method: abi.encodePacked(bytes4(keccak256("receiveDataAttestation(bytes)"))),
            params: payload
        });

        bytes32 subnetHash = subnetId.toHash();
        address destinationAddress = subnetIdToDestinationAddress[subnetHash];
        require(destinationAddress != address(0), "Destination address not set for subnet");

        IPCAddress memory destination = IPCAddress({
            subnetId: subnetId,
            rawAddress: FvmAddressHelper.from(destinationAddress)
        });

        // Perform IPC call
        performIpcCall(destination, message, 0);
    }

    // handle_filecoin_method is the universal entry point for any evm based
    // actor for a call coming from a builtin Filecoin actor
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

    // Override _handleIpcCall to handle incoming IPC calls if needed
    function _handleIpcCall(
        IpcEnvelope memory envelope,
        CallMsg memory callMsg
    ) internal override returns (bytes memory) {
        // Handle incoming IPC calls if necessary
        revert("No IPC calls expected");
    }

    // Optionally override _handleIpcResult to handle results from IPC calls
    function _handleIpcResult(
        IpcEnvelope storage original,
        IpcEnvelope memory result,
        ResultMsg memory resultMsg
    ) internal override {
        // Handle results from IPC calls if needed
    }
}

