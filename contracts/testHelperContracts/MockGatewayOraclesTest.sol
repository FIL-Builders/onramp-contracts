// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


contract MockGateway {
    address public receiver;
    address public sender;

    event ReceivedAttestation(
        string sourceChain,
        string sourceAddress,
        bytes commP
    );

    function validateContractCall() external pure returns (bool) {
        return true;
    }

    function validateContractCallAndMint() external pure returns (bool) {
        return true;
    }

    function StringsEqual(string memory a, string memory b) public pure returns (bool) {
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
}