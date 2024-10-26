// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../contracts/destChain/Prover-IPC.sol";
import {MarketTypes} from "filecoin-solidity-api/contracts/v0.8/types/MarketTypes.sol";
import {CommonTypes} from "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import {SubnetID, IPCAddress} from "ipc-sdk/contracts/structs/Subnet.sol";
import {FvmAddress} from "ipc-sdk/contracts/structs/FvmAddress.sol";
import {IpcEnvelope, CallMsg} from "ipc-sdk/contracts/structs/CrossNet.sol";
import {DataAttestation} from "../contracts/sourceChain/Oracles.sol";
import {IpcGatewayMock} from "./mocks/IpcGatewayMock.sol";
import {SubnetIDHelper} from "ipc-sdk/contracts/lib/SubnetIDHelper.sol";


contract ProverIPCTest is Test {

    using SubnetIDHelper for SubnetID;


    DealClientIPC dealClient;
    IpcGatewayMock ipcGatewayMock;

    address marketActor = address(0xff00000000000000000000000000000000000005);

    function setUp() public {
        // Deploy a mock IPC Gateway
        ipcGatewayMock = new IpcGatewayMock();

        // Deploy the DealClientIPC contract with the mock gateway address
        dealClient = new DealClientIPC(address(ipcGatewayMock));

        // Label addresses for clarity in logs
        vm.label(address(dealClient), "DealClientIPC");
        vm.label(address(ipcGatewayMock), "IpcGatewayMock");
        vm.label(marketActor, "MarketActor");
    }

    function testSetDestinationChains() public {
        // Define subnet IDs and destination addresses
        SubnetID memory rootSubnet = SubnetID({ root: 0, route: new address[](0) });
        SubnetID[] memory subnetIds = new SubnetID[](1);
        subnetIds[0] = rootSubnet;

        address[] memory destinationAddresses = new address[](1);
        destinationAddresses[0] = address(0x1234567890AbcdEF1234567890aBcdef12345678);

        // Call setDestinationChains
        dealClient.setDestinationChains(subnetIds, destinationAddresses);

        // Verify that the destination address is set correctly
        bytes32 subnetHash = rootSubnet.toHash();
        assertEq(
            dealClient.subnetIdToDestinationAddress(subnetHash),
            destinationAddresses[0],
            "Destination address not set correctly"
        );
    }

    /*
    function testDealNotify() public {
        // Set up the destination chain
        SubnetID memory rootSubnet = SubnetID({ root: 0, route: new address[](0) });
        SubnetID[] memory subnetIds = new SubnetID[](1);
        subnetIds[0] = rootSubnet;

        address[] memory destinationAddresses = new address[](1);
        destinationAddresses[0] = address(0x1234567890AbcdEF1234567890aBcdef12345678);

        dealClient.setDestinationChains(subnetIds, destinationAddresses);

        // Prepare MarketDealNotifyParams
        MarketTypes.MarketDealNotifyParams memory mdnp;
        mdnp.dealId = 42;

        // Prepare DealProposal
        MarketTypes.DealProposal memory proposal;
        proposal.piece_cid = CommonTypes.Cid({
            version: 0x01,
            codec: 0x71,
            hash: hex"0123456789abcdef"
        });
        proposal.piece_size = 2048;
        proposal.verified_deal = true;
        proposal.client = CommonTypes.FilAddress(hex"00");
        proposal.provider = CommonTypes.FilAddress(hex"01");
        proposal.label = CommonTypes.DealLabel({
            data: abi.encode(rootSubnet) // Encode root subnet ID in label
        });
        proposal.start_epoch = CommonTypes.ChainEpoch.wrap(1000);
        proposal.end_epoch = CommonTypes.ChainEpoch.wrap(2000);
        proposal.storage_price_per_epoch = BigInts({sign: false, val: bytes("")});
        proposal.provider_collateral = BigInts({sign: false, val: bytes("")});
        proposal.client_collateral = BigInts({sign: false, val: bytes("")});

        // Serialize DealProposal and set in mdnp
        mdnp.dealProposal = MarketCBOR.serializeDealProposal(proposal);

        // Serialize MarketDealNotifyParams
        bytes memory params = MarketCBOR.serializeMarketDealNotifyParams(mdnp);

        // Simulate calling dealNotify from the Market Actor
        vm.prank(marketActor);
        dealClient.handle_filecoin_method(
            dealClient.MARKET_NOTIFY_DEAL_METHOD_NUM(),
            0,
            params
        );

        // Verify that the deal ID and status are set correctly
        bytes memory pieceCidData = proposal.piece_cid.hash;
        assertEq(dealClient.pieceDeals(pieceCidData), mdnp.dealId, "Deal ID not set correctly");
        assertEq(uint(dealClient.pieceStatus(pieceCidData)), uint(DealClientIPC.Status.DealPublished), "Status not set correctly");

        // Verify that an IPC call was made
        IpcGatewayMock.IpcCall[] memory ipcCalls = ipcGatewayMock.getCalls();
        assertEq(ipcCalls.length, 1, "IPC call not made");

        // Verify the details of the IPC call
        IpcGatewayMock.IpcCall memory ipcCall = ipcCalls[0];

        // Check destination
        assertTrue(ipcCall.destination.subnetId.equals(rootSubnet), "Incorrect subnet ID in IPC call");
        assertEq(
            ipcCall.destination.rawAddress.toAddress(),
            destinationAddresses[0],
            "Incorrect destination address in IPC call"
        );

        // Decode the method and params
        bytes4 methodSelector;
        assembly {
            methodSelector := mload(add(ipcCall.message.method, 32))
        }
        assertEq(
            methodSelector,
            bytes4(keccak256("receiveDataAttestation(bytes)")),
            "Incorrect method called in IPC message"
        );

        // Decode the payload and verify contents
        DataAttestation memory attest = abi.decode(ipcCall.message.params, (DataAttestation));
        assertEq(attest.piece_cid, pieceCidData, "Incorrect piece CID in attestation");
        assertEq(attest.duration, 1000, "Incorrect duration in attestation");
        assertEq(attest.deal_id, mdnp.dealId, "Incorrect deal ID in attestation");
        assertEq(attest.status, uint(DealClientIPC.Status.DealPublished), "Incorrect status in attestation");
    }
    */

    function testHandleFilecoinMethodUnknownMethod() public {
        // Try calling an unknown method
        vm.expectRevert("the filecoin method that was called is not handled");
        dealClient.handle_filecoin_method(123456789, 0, bytes(""));
    }

    /*
    function testHandleFilecoinMethodAuthenticateMessage() public {
        // Call authenticate message method
        (uint32 exitCode, uint64 codec, bytes memory ret) = dealClient.handle_filecoin_method(
            dealClient.AUTHENTICATE_MESSAGE_METHOD_NUM(),
            0,
            bytes("")
        );

        // Deserialize the return value
        (bool authenticated) = CBOR.deserialize(ret).readBool();

        assertEq(exitCode, 0, "Exit code should be 0");
        assertEq(codec, uint64(Misc.CBOR_CODEC), "Codec should be CBOR");
        assertTrue(authenticated, "Message should be authenticated");
    }

    function testDealNotifyRevertsIfNotMarketActor() public {
        // Prepare MarketDealNotifyParams
        MarketTypes.MarketDealNotifyParams memory mdnp;
        mdnp.dealId = 42;

        // Prepare DealProposal
        MarketTypes.DealProposal memory proposal;
        proposal.piece_cid = CommonTypes.Cid({
            version: 0x01,
            codec: 0x71,
            hash: hex"0123456789abcdef"
        });
        proposal.piece_size = 2048;
        proposal.verified_deal = true;
        proposal.client = CommonTypes.FilAddress(hex"00");
        proposal.provider = CommonTypes.FilAddress(hex"01");
        proposal.label = CommonTypes.DealLabel({
            data: abi.encode(SubnetID(new address )) // Empty subnet ID
        });
        proposal.start_epoch = CommonTypes.ChainEpoch.wrap(1000);
        proposal.end_epoch = CommonTypes.ChainEpoch.wrap(2000);
        proposal.storage_price_per_epoch = BigInts({sign: false, val: bytes("")});
        proposal.provider_collateral = BigInts({sign: false, val: bytes("")});
        proposal.client_collateral = BigInts({sign: false, val: bytes("")});

        // Serialize DealProposal and set in mdnp
        mdnp.dealProposal = MarketCBOR.serializeDealProposal(proposal);

        // Serialize MarketDealNotifyParams
        bytes memory params = MarketCBOR.serializeMarketDealNotifyParams(mdnp);

        // Try calling dealNotify from a non-market actor
        vm.expectRevert("msg.sender needs to be market actor f05");
        dealClient.handle_filecoin_method(
            dealClient.MARKET_NOTIFY_DEAL_METHOD_NUM(),
            0,
            params
        );
    }
    */
}


