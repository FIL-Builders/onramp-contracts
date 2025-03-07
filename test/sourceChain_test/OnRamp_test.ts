import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import {
  OnRampContract,
  MockERC20,
} from "../../typechain-types";

describe("OnRampContract", function () {
  // Declare variables for contracts and signers
  let onRamp: OnRampContract;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let aggregator: HardhatEthersSigner;

  // Constants for test data
  const OFFER_AMOUNT = ethers.parseEther("100");
  const SIZE = 1000n;
  const LOCATION = "ipfs://QmTest";

  // Helper function to create a valid CID
  function createValidCID(commitment: string): string {
    const header = "0x0181e203922020";
    const cleanCommitment = commitment.replace("0x", "").padStart(64, "0");
    return header + cleanCommitment;
  }

  // Predefined commitments and CIDs
  const sourceCommitment = ethers.hexlify(ethers.randomBytes(32));
  const mockCommP = createValidCID(sourceCommitment);
  const aggregateCommitment = ethers.hexlify(ethers.randomBytes(32));
  const mockAggregate = createValidCID(aggregateCommitment);

  // Setup before each test
  beforeEach(async function () {
    [owner, oracle, user, aggregator] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock Token", "MTK");
    await token.waitForDeployment();

    // Deploy OnRampContract
    const OnRampContract = await ethers.getContractFactory("OnRampContract");
    onRamp = await OnRampContract.deploy();
    await onRamp.waitForDeployment();

    // Set oracle
    await onRamp.setOracle(oracle.address);

    // Mint tokens and approve spending
    await token.mint(user.address, ethers.parseEther("1000"));
    await token
      .connect(user)
      .approve(await onRamp.getAddress(), ethers.parseEther("1000"));
  });

  // Test suite for basic setup
  describe("Basic Setup", function () {
    it("Should set the oracle address correctly", async function () {
      expect(await onRamp.dataProofOracle()).to.equal(oracle.address);
    });

    it("Should revert if oracle is set twice", async function () {
      await expect(onRamp.setOracle(oracle.address)).to.be.revertedWith(
        "Oracle already set"
      );
    });
  });

  // Test suite for offering data
  describe("Offering Data", function () {
    const offer = {
      commP: mockCommP,
      size: SIZE,
      location: LOCATION,
      amount: OFFER_AMOUNT,
      token: "" as string, // Will be set in beforeEach
    };

    beforeEach(async function () {
      offer.token = await token.getAddress();
    });

    it("Should allow users to offer data and emit DataReady", async function () {
      const tx = await onRamp.connect(user).offerData(offer);
      await expect(tx)
        .to.emit(onRamp, "DataReady")
        .withArgs(
          [offer.commP, offer.size, offer.location, offer.amount, offer.token],
          1n
        );

      const storedOffer = await onRamp.offers(1n);
      expect(storedOffer.commP).to.equal(offer.commP);
      expect(storedOffer.size).to.equal(offer.size);
      expect(storedOffer.location).to.equal(offer.location);
      expect(storedOffer.amount).to.equal(offer.amount);
      expect(storedOffer.token).to.equal(offer.token);
    });

    it("Should not transfer tokens when offering data (current implementation)", async function () {
      const initialUserBalance = await token.balanceOf(user.address);
      await onRamp.connect(user).offerData(offer);
      expect(await token.balanceOf(user.address)).to.equal(initialUserBalance - ethers.parseEther("100"));
    });

    // Note: This test is commented out but shows how it should work with transfer enabled
    /*
    it("Should transfer tokens when offering data (expected implementation)", async function () {
      const initialUserBalance = await token.balanceOf(user.address);
      const initialContractBalance = await token.balanceOf(await onRamp.getAddress());

      await onRamp.connect(user).offerData(offer);

      expect(await token.balanceOf(user.address)).to.equal(initialUserBalance - OFFER_AMOUNT);
      expect(await token.balanceOf(await onRamp.getAddress())).to.equal(initialContractBalance + OFFER_AMOUNT);
    });
    */
  });

  // Test suite for aggregation
  describe("Aggregation", function () {
    let offerId: bigint;

    beforeEach(async function () {
      const offer = {
        commP: mockCommP,
        size: SIZE,
        location: LOCATION,
        amount: OFFER_AMOUNT,
        token: await token.getAddress(),
      };
      const tx = await onRamp.connect(user).offerData(offer);
      await tx.wait();
      offerId = 1n;
    });

    it("Should allow committing an aggregate", async function () {
      const claimedIDs = [offerId];
      const mockCommP = createValidCID(sourceCommitment);
      const mockAggregate = mockCommP; // Single-leaf tree, so aggregate = leaf
      const inclusionProofs = [{ index: 0, path: [] }];
    
      await onRamp.connect(aggregator).commitAggregate(
        mockAggregate,
        claimedIDs,
        inclusionProofs,
        aggregator.address
      );
    
      const aggId = 1n;
      expect(await onRamp.aggregationPayout(aggId)).to.equal(aggregator.address);
      expect(await onRamp.commPToAggregateID(mockAggregate)).to.equal(aggId);
    });
  });

   // Test suite for proving data stored
   describe("Proving Data Stored", function () {
    let aggId: bigint;
    let mockAggregate: string; // Declare mockAggregate here to share across the test
  
    beforeEach(async function () {
      const offer = {
        commP: mockCommP,
        size: SIZE,
        location: LOCATION,
        amount: OFFER_AMOUNT,
        token: await token.getAddress(),
      };
      await onRamp.connect(user).offerData(offer);
      const offerId = 1n;
  
      const claimedIDs = [offerId];
      mockAggregate = mockCommP; // Assign here for consistency
      const inclusionProofs = [{ index: 0, path: [] }];
      await onRamp.connect(aggregator).commitAggregate(
        mockAggregate,
        claimedIDs,
        inclusionProofs,
        aggregator.address
      );
      aggId = 1n;
    });
  
    it("Should allow oracle to prove data stored and transfer tokens", async function () {
      const attestation = {
        commP: mockAggregate, // Use the same mockAggregate
        duration: 0,
        FILID: 0,
        status: 0,
      };
  
      const initialAggregatorBalance = await token.balanceOf(aggregator.address);
  
      await onRamp.connect(oracle).proveDataStored(attestation);
  
      expect(await onRamp.provenAggregations(aggId)).to.be.true;
      expect(await token.balanceOf(aggregator.address)).to.equal(
        initialAggregatorBalance + OFFER_AMOUNT
      );
    });
  
    it("Should revert if non-oracle tries to prove data stored", async function () {
      const attestation = {
        commP: mockAggregate, // Use the same mockAggregate
        duration: 0,
        FILID: 0,
        status: 0,
      };
  
      await expect(
        onRamp.connect(user).proveDataStored(attestation)
      ).to.be.revertedWith("Only oracle can prove data stored");
    });
  });

  // Test suite for verifying data stored
  describe("Verifying Data Stored", function () {
    let aggId: bigint;

    beforeEach(async function () {
      const offer = {
        commP: mockCommP,
        size: SIZE,
        location: LOCATION,
        amount: OFFER_AMOUNT,
        token: await token.getAddress(),
      };
      await onRamp.connect(user).offerData(offer);

      const claimedIDs = [1n];
      const mockAggregate = mockCommP; // Use the same CID as the offer
      const inclusionProofs = [{ index: 0, path: [] }]; // Empty path for single leaf
      await onRamp.connect(aggregator).commitAggregate(
        mockAggregate,
        claimedIDs,
        inclusionProofs,
        aggregator.address
      );
      aggId = 1n;

      const attestation = {
        commP: mockAggregate,
        duration: 0,
        FILID: 0,
        status: 0,
      };
      await onRamp.connect(oracle).proveDataStored(attestation);
    });

    it("Should verify data stored correctly", async function () {
      expect(await onRamp.verifyDataStored(aggId, 0, 1n)).to.be.true;
    });

    it("Should revert if aggregation not proven", async function () {
      await expect(
        onRamp.verifyDataStored(2n, 0, 1n)
      ).to.be.revertedWith("Provided aggregation not proven");
    });

    it("Should revert if offer not in aggregation", async function () {
      await expect(
        onRamp.verifyDataStored(aggId, 1, 1n)
      ).to.be.reverted;
    });
  });
});