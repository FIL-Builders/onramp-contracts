import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import {
  OnRampContract,
  PODSIVerifier,
  MockERC20,
} from "../../typechain-types";

describe("OnRampContract", function () {
  let onRamp: OnRampContract;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let aggregator: HardhatEthersSigner;

  function createValidCID(commitment: string): string {
    const header = "0x0181e203922020";
    const cleanCommitment = commitment.replace("0x", "").padStart(64, "0");
    return header + cleanCommitment;
  }

  // Create test commitments and CIDs
  const sourceCommitment = ethers.hexlify(ethers.randomBytes(32));
  const mockCommP = createValidCID(sourceCommitment);
  const aggregateCommitment = ethers.hexlify(ethers.randomBytes(32));
  const mockAggregate = createValidCID(aggregateCommitment);

  beforeEach(async function () {
    [owner, oracle, user, aggregator] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock Token", "MTK");
    await token.waitForDeployment();

    const OnRampContract = await ethers.getContractFactory("OnRampContract");
    onRamp = await OnRampContract.deploy();
    await onRamp.waitForDeployment();

    await onRamp.setOracle(oracle.address);

    await token.mint(user.address, ethers.parseEther("1000"));
    await token
      .connect(user)
      .approve(await onRamp.getAddress(), ethers.parseEther("1000"));
  });

  describe("Basic Setup", function () {
    it("Should set the oracle address correctly", async function () {
      expect(await onRamp.dataProofOracle()).to.equal(oracle.address);
    });

    it("Should not allow setting oracle twice", async function () {
      await expect(onRamp.setOracle(oracle.address)).to.be.revertedWith(
        "Oracle already set"
      );
    });
  });

  describe("Offering Data", function () {
    const offerAmount = ethers.parseEther("100");
    const size = 1000n;

    it("Should allow users to offer data", async function () {
      const offer = {
        commP: mockCommP,
        size: size,
        location: "ipfs://QmTest",
        amount: offerAmount,
        token: await token.getAddress(),
      };
      //@ts-ignore
      const tx = await onRamp.connect(user).offerData(offer);
      await expect(tx).to.emit(onRamp, "DataReady");

      const storedOffer = await onRamp.offers(1n);
      expect(storedOffer.commP).to.equal(offer.commP);
      expect(storedOffer.size).to.equal(offer.size);
      expect(storedOffer.location).to.equal(offer.location);
      expect(storedOffer.amount).to.equal(offer.amount);
      expect(storedOffer.token).to.equal(offer.token);
    });

    it("Should transfer tokens when offering data", async function () {
      const initialBalance = await token.balanceOf(user.address);

      const offer = {
        commP: mockCommP,
        size: size,
        location: "ipfs://QmTest",
        amount: offerAmount,
        token: await token.getAddress(),
      };
      await onRamp.connect(user).offerData(offer);

      expect(await token.balanceOf(user.address)).to.equal(
        initialBalance - offerAmount
      );
      expect(await token.balanceOf(await onRamp.getAddress())).to.equal(
        offerAmount
      );
    });
  });
});
