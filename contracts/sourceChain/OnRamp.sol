// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Cid} from "../Cid.sol";
import {TRUNCATOR} from "../Const.sol";
import {DataAttestation} from "./Oracles.sol";

// Adapted from https://github.com/lighthouse-web3/raas-starter-kit/blob/main/contracts/data-segment/Proof.sol
// adapted rather than imported to
//  1) avoid build issues
//  2) avoid npm deps
//3)  avoid use of deprecated @zondax/filecoin-solidity
contract PODSIVerifier {
    // ProofData is a Merkle proof
    struct ProofData {
        uint64 index;
        bytes32[] path;
    }

    // verify verifies that the given leaf is present in the merkle tree with the given root.
    function verify(
        ProofData memory proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        return computeRoot(proof, leaf) == root;
    }

    // computeRoot computes the root of a Merkle tree given a leaf and a Merkle proof.
    function computeRoot(
        ProofData memory d,
        bytes32 subtree
    ) internal pure returns (bytes32) {
        require(
            d.path.length < 64,
            "merkleproofs with depths greater than 63 are not supported"
        );
        require(
            d.index >> d.path.length == 0,
            "index greater than width of the tree"
        );

        bytes32 carry = subtree;
        uint64 index = d.index;
        uint64 right = 0;

        for (uint64 i = 0; i < d.path.length; i++) {
            (right, index) = (index & 1, index >> 1);
            if (right == 1) {
                carry = computeNode(d.path[i], carry);
            } else {
                carry = computeNode(carry, d.path[i]);
            }
        }

        return carry;
    }

    // computeNode computes the parent node of two child nodes
    function computeNode(
        bytes32 left,
        bytes32 right
    ) internal pure returns (bytes32) {
        bytes32 digest = sha256(abi.encodePacked(left, right));
        return truncate(digest);
    }

    // truncate truncates a node to 254 bits.
    function truncate(bytes32 n) internal pure returns (bytes32) {
        // Set the two lowest-order bits of the last byte to 0
        return n & TRUNCATOR;
    }
}

contract OnRampContract is PODSIVerifier {
    struct Offer {
        bytes commP;
        uint64 size;
        string location;
        uint256 amount;
        IERC20 token;
    }
    // Possible rearrangement:
    // struct Hint {string location, uint64 size} ?
    // struct Payment {uint256 amount, IERC20 token}?

    event DataReady(Offer offer, uint64 id);
    event AggregationCommitted(
        uint64 aggId, 
        bytes commP,
        uint64[] offerIDs, 
        address payoutAddr);
    event ProveDataStored(bytes commP, uint64 dealID);

    uint64 private nextOfferId = 1;
    uint64 private nextAggregateID = 1;
    address public dataProofOracle;
    mapping(uint64 => Offer) public offers;
    mapping(uint64 => uint64[]) public aggregations;
    mapping(uint64 => address) public aggregationPayout;
    mapping(uint64 => bool) public provenAggregations;
    mapping(bytes => uint64) public commPToAggregateID;
    mapping(address => uint64[]) private clientOffers;
    mapping(uint64 => bool) public isOfferAggregated;
    mapping(uint64 => uint64) private offerToAggregationId;
    mapping(uint64 => uint64) public aggregationDealIds;

    function setOracle(address oracle_) external {
        if (dataProofOracle == address(0)) {
            dataProofOracle = oracle_;
        } else {
            revert("Oracle already set");
        }
    }

    function offerData(Offer calldata offer) external payable returns (uint64) {
        // NOTE: This require is commented out for testing purposes.
        // Make sure to uncomment before deploying!

        // require(
        //     offer.token.transferFrom(msg.sender, address(this), offer.amount),
        //     "Payment transfer failed"
        // );

        uint64 id = nextOfferId++;
        offers[id] = offer;
        clientOffers[msg.sender].push(id);

        emit DataReady(offer, id);
        return id;
    }

    function getClientOffers(address client) external view returns (uint64[] memory) {
        return clientOffers[client];
    }

    function getPendingOffers() external view returns (uint64[] memory) {
        uint64[] memory pending = new uint64[](nextOfferId - 1);
        uint64 count = 0;
        
        for (uint64 i = 1; i < nextOfferId; i++) {
            if (!isOfferAggregated[i]) {
                pending[count] = i;
                count++;
            }
        }
        
        assembly {
            mstore(pending, count)
        }
        return pending;
    }

    function getTotalOffers() external view returns (uint64) {
        return nextOfferId - 1;
    }

    function getOfferDetails(uint64 offerId) external view returns (
        bytes memory commP,
        uint64 size,
        string memory location,
        uint256 amount,
        IERC20 token,
        bool exists,
        bool isAggregated
    ) {
        Offer storage offer = offers[offerId];
        exists = offer.size != 0;
        isAggregated = isOfferAggregated[offerId];
        if (exists) {
            return (
                offer.commP,
                offer.size,
                offer.location,
                offer.amount,
                offer.token,
                true,
                isAggregated
            );
        }
    }

    function getOfferStatus(uint64 offerId) external view returns (
        bool exists,
        bool isAggregated,
        bool isProven
    ) {
        exists = offers[offerId].size != 0;
        isAggregated = isOfferAggregated[offerId];
        
        if (isAggregated) {
            uint64 aggId = offerToAggregationId[offerId];
            isProven = provenAggregations[aggId];
        }
    }

    function commitAggregate(
        bytes calldata commP,
        uint64[] calldata claimedIDs,
        ProofData[] calldata inclusionProofs,
        address payoutAddr
    ) external {
        uint64[] memory offerIDs = new uint64[](claimedIDs.length);
        uint64 aggId = nextAggregateID++;
        // Prove all offers are committed by aggregate commP
        for (uint64 i = 0; i < claimedIDs.length; i++) {
            uint64 offerID = claimedIDs[i];
            offerIDs[i] = offerID;
            require(
                verify(
                    inclusionProofs[i],
                    Cid.cidToPieceCommitment(commP),
                    Cid.cidToPieceCommitment(offers[offerID].commP)
                ),
                "Proof verification failed"
            );
            isOfferAggregated[offerID] = true;
            offerToAggregationId[offerID] = aggId;
        }
        aggregations[aggId] = offerIDs;
        aggregationPayout[aggId] = payoutAddr;
        commPToAggregateID[commP] = aggId;
        emit AggregationCommitted(aggId, commP,offerIDs, payoutAddr);
    }

    function getAggregationDetails(uint64 aggId) external view returns (
        address payoutAddress,
        bool isProven,
        uint64 offerCount
    ) {
        payoutAddress = aggregationPayout[aggId];
        isProven = provenAggregations[aggId];
        offerCount = uint64(aggregations[aggId].length);
    }

    function getAggregationOffers(uint64 aggId) external view returns (uint64[] memory) {
        return aggregations[aggId];
    }

    function verifyDataStored(
        uint64 aggID,
        uint idx,
        uint64 offerID
    ) external view returns (bool) {
        require(provenAggregations[aggID], "Provided aggregation not proven");
        require(
            aggregations[aggID][idx] == offerID,
            "Aggregation does not include offer"
        );

        return true;
    }

    // Called by oracle to prove the data is stored
    function proveDataStored(DataAttestation calldata attestation) external {
        require(
            msg.sender == dataProofOracle,
            "Only oracle can prove data stored"
        );
        uint64 aggID = commPToAggregateID[attestation.commP];
        require(aggID != 0, "Aggregate not found");
        emit ProveDataStored(attestation.commP, attestation.dealID);

        aggregationDealIds[aggID] = attestation.dealID;

        //transfer payment to the receiver if the payment amount > 0
        for (uint i = 0; i < aggregations[aggID].length; i++) {
            uint64 offerID = aggregations[aggID][i];
            if(offers[offerID].amount > 0){
                require(offers[offerID].token.transfer(
                            aggregationPayout[aggID],
                            offers[offerID].amount),
                "Payment transfer failed"
                );
            }
        }
        provenAggregations[aggID] = true;
    }

    function getOfferDealId(uint64 offerId) external view returns (uint64 dealId, bool exists) {
        if (isOfferAggregated[offerId]) {
            uint64 aggId = offerToAggregationId[offerId];
            dealId = aggregationDealIds[aggId];
            exists = dealId != 0;
        }
    }
}
