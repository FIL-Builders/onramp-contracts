// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IPCAddress, SubnetID} from "ipc-sdk/contracts/structs/Subnet.sol";
import {FvmAddress} from "ipc-sdk/contracts/structs/FvmAddress.sol";
import {FilAddress} from "fevmate/contracts/utils/FilAddress.sol";
import {IpcEnvelope, CallMsg, IpcMsgKind} from "ipc-sdk/contracts/structs/CrossNet.sol";



contract IpcGatewayMock {
 using FilAddress for address;

    struct IpcCall {
        IPCAddress destination;
        CallMsg message;
        uint256 value;
    }

    IpcCall[] public ipcCalls;

    function performIpcCall(
        IPCAddress memory destination,
        CallMsg memory message,
        uint256 value
    ) public returns (IpcEnvelope memory) {
        ipcCalls.push(IpcCall(destination, message, value));

        // Return a dummy IpcEnvelope
        return IpcEnvelope({
            from: IPCAddress({
                subnetId: SubnetID({ root: 0, route: new address[](0) }) ,
                rawAddress: FvmAddress({addrType: 0, payload: bytes("")})
            }),
            to: destination,
            nonce: uint64(ipcCalls.length),
            message: bytes(""),
            kind: IpcMsgKind.Call,
            value:value
        });
    }

    function getCalls() public view returns (IpcCall[] memory) {
        return ipcCalls;
    }
}

