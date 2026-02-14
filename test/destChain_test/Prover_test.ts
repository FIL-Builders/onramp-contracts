import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import {
  DealClient,
  ForwardingProofMockBridge,
  DebugMockBridge,
  DebugReceiver,
} from "../../typechain-types";

describe("DealClient Contract", function () {
  let dealClient: DealClient;
  let mockBridge: ForwardingProofMockBridge;
  let debugBridge: DebugMockBridge;
  let debugReceiver: DebugReceiver;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  const MARKET_ACTOR_ETH_ADDRESS = "0xff00000000000000000000000000000000000005";
  const MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
  const AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;

  function createMarketDealNotifyParams(dealId: number = 1) {
    // Tag 42 for FilecoinAddress type
    const clientAddress = new Uint8Array([
      0xd8,
      0x2a, // tag 42
      0x58,
      0x20, // bytes of length 32
      ...ethers.randomBytes(32), // random address bytes
    ]);

    // Create provider address similarly
    const providerAddress = new Uint8Array([
      0xd8,
      0x2a, // tag 42
      0x58,
      0x20, // bytes of length 32
      ...ethers.randomBytes(32), // random address bytes
    ]);

    // Deal proposal array
    const dealProposal = new Uint8Array([
      0x88, // array of 8 elements
      ...clientAddress, // client address
      ...providerAddress, // provider address
      0x42, // 2 bytes for label
      0x12,
      0x34, // some label data
      0x00, // verified deal (false)
      0x1a,
      0x00,
      0x00,
      0x00,
      0x01, // start epoch
      0x1a,
      0x00,
      0x00,
      0x00,
      0x02, // end epoch
      0x1a,
      0x00,
      0x00,
      0x00,
      0x03, // storage price per epoch
    ]);

    // Combine dealId and proposal into final params
    const params = new Uint8Array([
      0x82, // array of 2 elements
      0x18,
      dealId, // unsigned int 8
      0x58,
      dealProposal.length, // bytes with length prefix
      ...dealProposal, // deal proposal data
    ]);

    return ethers.hexlify(params);
  }

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const DealClient = await ethers.getContractFactory("DealClient");
    dealClient = await DealClient.deploy();

    const ForwardingProofMockBridge = await ethers.getContractFactory(
      "ForwardingProofMockBridge"
    );
    mockBridge = await ForwardingProofMockBridge.deploy();

    const DebugMockBridge = await ethers.getContractFactory("DebugMockBridge");
    debugBridge = await DebugMockBridge.deploy();

    const DebugReceiver = await ethers.getContractFactory("DebugReceiver");
    debugReceiver = await DebugReceiver.deploy();

    await dealClient.setBridgeContract(await mockBridge.getAddress());
    await mockBridge.setSenderReceiver(
      ethers.hexlify(await dealClient.getAddress()).toLowerCase(),
      await debugReceiver.getAddress()
    );
  });

  describe("Initialization", function () {
    it("Should set the bridge contract address correctly", async function () {
      expect(await dealClient.bridgeContract()).to.equal(
        await mockBridge.getAddress()
      );
    });

    it("Should not allow setting bridge contract address twice", async function () {
      await expect(
        dealClient.setBridgeContract(mockBridge.getAddress())
      ).to.be.revertedWith("Bridge contract already set");
    });
  });

  describe("handle_filecoin_method", function () {
    it("Should handle authentication method correctly", async function () {
      const emptyParams = "0x80"; // CBOR encoding for an empty array

      const tx = await dealClient.handle_filecoin_method(
        AUTHENTICATE_MESSAGE_METHOD_NUM,
        0,
        emptyParams
      );

      // Get the transaction receipt
      const receipt = await tx.wait();
      //@ts-ignore
      expect(receipt.status).to.equal(1); // Check if transaction was successful
    });

    it("Should revert for unhandled methods", async function () {
      const emptyParams = "0x80"; // CBOR encoding for an empty array
      await expect(
        dealClient.handle_filecoin_method(999999, 0, emptyParams)
      ).to.be.revertedWith(
        "the filecoin method that was called is not handled"
      );
    });
  });

  describe("dealNotify", function () {
    it("Should only accept calls from market actor", async function () {
      const params = createMarketDealNotifyParams();

      await owner.sendTransaction({
        to: MARKET_ACTOR_ETH_ADDRESS,
        value: ethers.parseEther("1.0"),
      });

      const marketActor = await ethers.getImpersonatedSigner(
        MARKET_ACTOR_ETH_ADDRESS
      );

      // Should fail when called from non-market actor
      await expect(
        dealClient
          .connect(addr1)
          .handle_filecoin_method(MARKET_NOTIFY_DEAL_METHOD_NUM, 0, params)
      ).to.be.revertedWith("msg.sender needs to be market actor f05");
    });
  });

  describe("Integration tests", function () {
    it("Should revert if cbor is invalid", async function () {
      // 1. Deploy fresh contracts
      const newDealClient = await (
        await ethers.getContractFactory("DealClient")
      ).deploy();
      const newDebugBridge = await (
        await ethers.getContractFactory("DebugMockBridge")
      ).deploy();

      // 2. Set up bridge
      await newDealClient.setBridgeContract(await newDebugBridge.getAddress());

      // 3. Create deal notification
      const params = createMarketDealNotifyParams();

      // 4. Fund and get market actor
      await owner.sendTransaction({
        to: MARKET_ACTOR_ETH_ADDRESS,
        value: ethers.parseEther("1.0"),
      });
      const marketActor = await ethers.getImpersonatedSigner(
        MARKET_ACTOR_ETH_ADDRESS
      );

      // 5. Execute deal notification
      await expect(
        newDealClient
          .connect(marketActor)
          .handle_filecoin_method(MARKET_NOTIFY_DEAL_METHOD_NUM, 0, params)
      ).to.be.revertedWith("invalid cbor");
    });
  });
});
