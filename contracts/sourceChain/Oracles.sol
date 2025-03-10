// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressString.sol";

interface IBridgeContract {
    function _execute(
        string calldata sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload_
    ) external;
}

struct DataAttestation {
    bytes commP;
    int64 duration;
    uint64 FILID;
    uint status;
}

interface IReceiveAttestation {
    function proveDataStored(DataAttestation calldata attestation_) external;
}

contract AxelarBridge is AxelarExecutable {
    address public receiver;
    address public sender;
    // Tracks processed commandIds to prevent replay attacks
    mapping(bytes32 => bool) public executedCommands;
    event ReceivedAttestation(
        bytes32 indexed commandId,
        string sourceChain,
        string sourceAddress,
        bytes commP
    );
    using StringToAddress for string;

    constructor(address _gateway) AxelarExecutable(_gateway) {}

    function setSenderReceiver(address sender_, address receiver_) external {
        receiver = receiver_;
        sender = sender_;
    }

    function _execute(
        bytes32 commandId,
        string calldata _sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload_
    ) internal override{
        require(!executedCommands[commandId], "Command already executed");
        DataAttestation memory attestation = abi.decode(
            payload_,
            (DataAttestation)
        );
        //Updated the ReceivedAttestation event to include commandId,
        executedCommands[commandId] = true;
        emit ReceivedAttestation(
            commandId,
            _sourceChain_,
            sourceAddress_,
            attestation.commP
        );
        require(
            StringsEqual(_sourceChain_, "filecoin-2"),
            "Only filecoin supported"
        );
        require(
            sender == sourceAddress_.toAddress(),
            "Only registered sender addr can execute"
        );

        IReceiveAttestation(receiver).proveDataStored(attestation);
    }
}

// This contract forwards between contracts on the same chain
// Useful for integration tests of flows involving bridges
// It expects a DealAttestation struct as payload from
// an address with string encoding == senderHex and forwards to
// an L2 on ramp contract at receiver address
contract ForwardingProofMockBridge is IBridgeContract {
    address public receiver;
    string public senderHex;

    function setSenderReceiver(
        string calldata senderHex_,
        address receiver_
    ) external {
        receiver = receiver_;
        senderHex = senderHex_;
    }

    function _execute(
        string calldata _sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload_
    ) external override {
        require(
            StringsEqual(_sourceChain_, "filecoin-2"),
            "Only FIL proofs supported"
        );
        require(
            StringsEqual(senderHex, sourceAddress_),
            "Only sender can execute"
        );
        DataAttestation memory attestation = abi.decode(
            payload_,
            (DataAttestation)
        );
        IReceiveAttestation(receiver).proveDataStored(attestation);
    }
}

contract DebugMockBridge is IBridgeContract {
    event ReceivedAttestation(bytes commP, string sourceAddress);

    function _execute(
        string calldata _sourceChain_,
        string calldata sourceAddress_,
        bytes calldata payload_
    ) external override {
        require(
            StringsEqual(_sourceChain_, "filecoin-2") &&
                block.chainid == 314159,
            "Only FIL proofs supported"
        );
        DataAttestation memory attestation = abi.decode(
            payload_,
            (DataAttestation)
        );
        emit ReceivedAttestation(attestation.commP, sourceAddress_);
    }
}

contract AxelarBridgeDebug is AxelarExecutable {
    event ReceivedAttestation(bytes commP, string sourceAddress);
    //tracks whether a command has already been executed using the executedCommands mapping.
    mapping(bytes32 => bool) public executedCommands; 
    constructor(address _gateway) AxelarExecutable(_gateway) {}
    function _execute(
        bytes32 commandId,
        string calldata,
        string calldata sourceAddress_,
        bytes calldata payload_
    ) internal override{
        //Prevents replay attacks by ensuring that a command cannot be executed more than once.
        require(!executedCommands[commandId], "Command already executed");
        executedCommands[commandId] = true;
        DataAttestation memory attestation = abi.decode(
            payload_,
            (DataAttestation)
        );
        emit ReceivedAttestation(attestation.commP, sourceAddress_);
    }
}

contract DebugReceiver is IReceiveAttestation {
    event ReceivedAttestation(bytes Commp);

    function proveDataStored(DataAttestation calldata attestation_) external {
        emit ReceivedAttestation(attestation_.commP);
    }
}

function StringsEqual(string memory a, string memory b) pure returns (bool) {
    bytes memory aBytes = bytes(a);
    bytes memory bBytes = bytes(b);

    if (aBytes.length != bBytes.length) {
        return false;
    }

    for (uint i = 0; i < aBytes.length; i++) {
        if (aBytes[i] != bBytes[i]) {
            return false;
        }
    }

    return true;
}
