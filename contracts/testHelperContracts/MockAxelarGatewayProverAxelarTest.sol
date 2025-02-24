// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockAxelarGateway {
    event ContractCall(
        address indexed sender,
        string destinationChain,
        string destinationContractAddress,
        bytes payload
    );

    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external pure returns (bool) {
        return true;
    }

    function callContract(
        string calldata destinationChain,
        string calldata destinationContractAddress,
        bytes calldata payload
    ) external {
        emit ContractCall(
            msg.sender,
            destinationChain,
            destinationContractAddress,
            payload
        );
    }
}

contract MockAxelarGasService {
    event GasPaid(
        address indexed sender,
        string destinationChain,
        string destinationAddress,
        bytes payload,
        address refundAddress
    );

    function payNativeGasForContractCall(
        address sender,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        address refundAddress
    ) external payable {
        emit GasPaid(
            sender,
            destinationChain,
            destinationAddress,
            payload,
            refundAddress
        );
    }
}