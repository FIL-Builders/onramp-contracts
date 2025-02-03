// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Nickle is ERC20Upgradeable {
    function initialize() public initializer {
        __ERC20_init("Nickle", "NICKLE");
        _mint(
            msg.sender,
            10000000000000000000000000000000000000000000000000000000000000000
        );
    }
}

contract BronzeCowry is ERC20Upgradeable {
    function initialize() public initializer {
        __ERC20_init("Bronze Cowry", "SHELL");
        _mint(
            msg.sender,
            10000000000000000000000000000000000000000000000000000000000000000
        );
    }
}

contract AthenianDrachma is ERC20Upgradeable {
    function initialize() public initializer {
        __ERC20_init("Athenian Drachma", "ATH");
        _mint(
            msg.sender,
            10000000000000000000000000000000000000000000000000000000000000000
        );
    }
}

contract DebasedTowerPoundSterling is ERC20Upgradeable {
    function initialize() public initializer {
        __ERC20_init("DebasedTowerPoundSterling", "NEWTON");
        _mint(
            msg.sender,
            10000000000000000000000000000000000000000000000000000000000000000
        );
    }
}
