import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import {
  ForwardingProofMockBridge,
  DebugMockBridge,
  AxelarBridgeDebug,
  AxelarBridge,
  DebugReceiver,
  MockGateway,
} from "../../typechain-types";

describe("Bridge Contracts", function () {
  // Contract instances
  let forwardingBridge: ForwardingProofMockBridge;
  let debugMockBridge: DebugMockBridge;
  let axelarBridgeDebug: AxelarBridgeDebug;
  let axelarBridge: AxelarBridge;
  let debugReceiver: DebugReceiver;
  let mockGateway: MockGateway;

  // Signers
  let owner: HardhatEthersSigner;
  let sender: HardhatEthersSigner;
  let receiver: HardhatEthersSigner;

  // Test data
  const sourceChain = "filecoin-2";
  const sampleCommP = "0x1234567890abcdef";
  const sampleDuration = 1234567;
  const sampleFILID = 987654;
  const sampleStatus = 1;

  beforeEach(async function () {
    // Get signers
    [owner, sender, receiver] = await ethers.getSigners();

    // Deploy mock gateway for Axelar contracts
    const MockGateway = await ethers.getContractFactory("MockGateway");
    mockGateway = await MockGateway.deploy();

    // Deploy all contracts
    const ForwardingBridge = await ethers.getContractFactory(
      "ForwardingProofMockBridge"
    );
    forwardingBridge = await ForwardingBridge.deploy();

    const DebugMockBridge = await ethers.getContractFactory("DebugMockBridge");
    debugMockBridge = await DebugMockBridge.deploy();

    const AxelarBridgeDebug = await ethers.getContractFactory(
      "AxelarBridgeDebug"
    );
    axelarBridgeDebug = await AxelarBridgeDebug.deploy(
      await mockGateway.getAddress()
    );

    const AxelarBridge = await ethers.getContractFactory("AxelarBridge");
    axelarBridge = await AxelarBridge.deploy(await mockGateway.getAddress());

    const DebugReceiver = await ethers.getContractFactory("DebugReceiver");
    debugReceiver = await DebugReceiver.deploy();
  });

  describe("ForwardingProofMockBridge", function () {
    it("should set sender and receiver correctly", async function () {
      const senderHex = "0x1234";
      await forwardingBridge.setSenderReceiver(
        senderHex,
        await receiver.getAddress()
      );

      expect(await forwardingBridge.receiver()).to.equal(
        await receiver.getAddress()
      );
      expect(await forwardingBridge.senderHex()).to.equal(senderHex);
    });

    it("should forward attestation correctly", async function () {
      const senderHex = "0x1234";
      await forwardingBridge.setSenderReceiver(
        senderHex,
        await debugReceiver.getAddress()
      );

      const attestation = {
        commP: ethers.toUtf8Bytes(sampleCommP),
        duration: sampleDuration,
        FILID: sampleFILID,
        status: sampleStatus,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint status)"],
        [attestation]
      );

      await expect(forwardingBridge._execute(sourceChain, senderHex, payload))
        .to.emit(debugReceiver, "ReceivedAttestation")
        .withArgs(attestation.commP);
    });

    it("should revert if source chain is not filecoin-2", async function () {
      const senderHex = "0x1234";
      await forwardingBridge.setSenderReceiver(
        senderHex,
        await debugReceiver.getAddress()
      );

      const attestation = {
        commP: ethers.toUtf8Bytes(sampleCommP),
        duration: sampleDuration,
        FILID: sampleFILID,
        status: sampleStatus,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint status)"],
        [attestation]
      );

      await expect(
        forwardingBridge._execute("ethereum", senderHex, payload)
      ).to.be.revertedWith("Only FIL proofs supported");
    });
  });

  describe("AxelarBridge", function () {
    it("should set sender and receiver correctly", async function () {
      await axelarBridge.setSenderReceiver(
        await sender.getAddress(),
        await receiver.getAddress()
      );

      expect(await axelarBridge.receiver()).to.equal(
        await receiver.getAddress()
      );
      expect(await axelarBridge.sender()).to.equal(await sender.getAddress());
    });
  });

  describe("DebugMockBridge", function () {
    it("should emit event with correct attestation data when conditions are met", async function () {
      const attestation = {
        commP: ethers.toUtf8Bytes(sampleCommP),
        duration: sampleDuration,
        FILID: sampleFILID,
        status: sampleStatus,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint status)"],
        [attestation]
      );

      const sourceAddress = await sender.getAddress();

      await expect(
        debugMockBridge._execute(sourceChain, sourceAddress, payload)
      )
        .to.emit(debugMockBridge, "ReceivedAttestation")
        .withArgs(attestation.commP, sourceAddress);
    });

    it("should revert if source chain is not filecoin-2", async function () {
      const attestation = {
        commP: ethers.toUtf8Bytes(sampleCommP),
        duration: sampleDuration,
        FILID: sampleFILID,
        status: sampleStatus,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint status)"],
        [attestation]
      );

      // Use wrong source chain
      await expect(
        debugMockBridge._execute("ethereum", await sender.getAddress(), payload)
      ).to.be.revertedWith("Only FIL proofs supported");
    });

    it("should revert if executing from wrong chain ID", async function () {
      const attestation = {
        commP: ethers.toUtf8Bytes(sampleCommP),
        duration: sampleDuration,
        FILID: sampleFILID,
        status: sampleStatus,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint status)"],
        [attestation]
      );

      await expect(
        debugMockBridge._execute("ethereum", await sender.getAddress(), payload)
      ).to.be.revertedWith("Only FIL proofs supported");
    });
  });

  describe("StringsEqual function", function () {
    it("should return true for identical strings", async function () {
      expect(await mockGateway.StringsEqual("test", "test")).to.be.true;
      expect(await mockGateway.StringsEqual("", "")).to.be.true;
      expect(await mockGateway.StringsEqual("abc123", "abc123")).to.be.true;
    });

    it("should return false for different strings", async function () {
      expect(await mockGateway.StringsEqual("test", "test2")).to.be.false;
      expect(await mockGateway.StringsEqual("", "test")).to.be.false;
      expect(await mockGateway.StringsEqual("ABC", "abc")).to.be.false;
    });
  });
});
