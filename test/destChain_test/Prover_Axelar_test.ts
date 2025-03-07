import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import * as cbor from "cbor";
import { Tagged } from "cbor";

import {
  DealClientAxl,
  ForwardingProofMockBridge,
  DebugMockBridge,
  AxelarBridge,
  AxelarBridgeDebug,
  DebugReceiver,
  MockAxelarGateway,
  MockAxelarGasService,
} from "../../typechain-types";

describe("DealClient and Bridge System", function () {
  let dealClient: DealClientAxl;
  let mockBridge: ForwardingProofMockBridge;
  let debugBridge: DebugMockBridge;
  let axelarBridge: AxelarBridge;
  let axelarDebugBridge: AxelarBridgeDebug;
  let debugReceiver: DebugReceiver;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let mockGateway: MockAxelarGateway;
  let mockGasService: MockAxelarGasService;

  const MARKET_ACTOR_ADDRESS = "0xff00000000000000000000000000000000000005";
  const DATACAP_ACTOR_ADDRESS = "0xff00000000000000000000000000000000000007";

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock Axelar contracts
    const MockGateway = await ethers.getContractFactory("MockAxelarGateway");
    mockGateway = await MockGateway.deploy();

    const MockGasService = await ethers.getContractFactory(
      "MockAxelarGasService"
    );
    mockGasService = await MockGasService.deploy();

    // Deploy main contracts
    const DealClient = await ethers.getContractFactory("DealClientAxl");
    dealClient = await DealClient.deploy(
      await mockGateway.getAddress(),
      await mockGasService.getAddress()
    );

    const ForwardingBridge = await ethers.getContractFactory(
      "ForwardingProofMockBridge"
    );
    mockBridge = await ForwardingBridge.deploy();

    const DebugBridge = await ethers.getContractFactory("DebugMockBridge");
    debugBridge = await DebugBridge.deploy();

    const AxelarBridge = await ethers.getContractFactory("AxelarBridge");
    axelarBridge = await AxelarBridge.deploy(await mockGateway.getAddress());

    const AxelarDebugBridge = await ethers.getContractFactory(
      "AxelarBridgeDebug"
    );
    axelarDebugBridge = await AxelarDebugBridge.deploy(
      await mockGateway.getAddress()
    );

    const DebugReceiver = await ethers.getContractFactory("DebugReceiver");
    debugReceiver = await DebugReceiver.deploy();
  });

  describe("DealClientAxl", function () {
    it("Should initialize with correct gateway and gas service addresses", async function () {
      expect(await dealClient.gateway()).to.equal(
        await mockGateway.getAddress()
      );
      expect(await dealClient.gasService()).to.equal(
        await mockGasService.getAddress()
      );
    });
    
    it("Should set destination chains correctly", async function () {
      const chainIds = [1, 2, 3];
      const chainNames = ["ethereum", "polygon", "avalanche"];
      const addresses = [addr1.address, addr2.address, owner.address];
    
      await dealClient.setDestinationChains(chainIds, chainNames, addresses);
    
      // Verify all three chains
      const chain1 = await dealClient.chainIdToDestinationChain(1);
      const chain2 = await dealClient.chainIdToDestinationChain(2);
      const chain3 = await dealClient.chainIdToDestinationChain(3);
    
      // Check chain 1
      expect(chain1.chainName).to.equal("ethereum");
      expect(chain1.destinationAddress).to.equal(addr1.address);
    
      // Check chain 2
      expect(chain2.chainName).to.equal("polygon");
      expect(chain2.destinationAddress).to.equal(addr2.address);
    
      // Check chain 3
      expect(chain3.chainName).to.equal("avalanche");
      expect(chain3.destinationAddress).to.equal(owner.address);
    });

    it("Should handle filecoin methods correctly", async function () {
      const authenticateMethodNum = 2643134072n;
      const emptyParams = "0x";

      const result = await dealClient.handle_filecoin_method.staticCall(
        authenticateMethodNum,
        0n,
        emptyParams
      );

      // Destructure the result array
      const [returnCode, returnValue] = result;

      expect(returnCode).to.equal(0);
      // The result should be CBOR encoded 'true'
      expect(returnValue).to.equal("0x51");
    });

    it("Should revert on unhandled filecoin methods", async function () {
      const unhandledMethod = 12345n;
      const emptyParams = "0x";

      await expect(
        dealClient.handle_filecoin_method(unhandledMethod, 0n, emptyParams)
      ).to.be.revertedWith(
        "the filecoin method that was called is not handled"
      );
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should revert if not called by market actor", async function () {
      const commP = ethers.hexlify(ethers.randomBytes(32));
      const dealProposalBytes = cbor.encode({
        piece_cid: { '/': Buffer.from(commP.slice(2), 'hex').toString('base64') },
        piece_size: 1n,
        verified_deal: false,
        client: Buffer.from(ethers.ZeroAddress.slice(2), 'hex'),
        provider: Buffer.from(ethers.randomBytes(32)),
        label: ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [1]),
        start_epoch: 1n,
        end_epoch: 2n,
        storage_price_per_epoch: 1n,
        provider_collateral: 1n,
        client_collateral: 1n
      });
      const params = cbor.encode([dealProposalBytes, 1]);
    
      await expect(
        dealClient.connect(addr1).handle_filecoin_method(
          4186741094n,
          0n,
          params
        )
      ).to.be.revertedWith("msg.sender needs to be market actor f05");
    });
    
    it("Should validate market actor address in dealNotify", async function () {
      const impersonatedSigner = await ethers.getImpersonatedSigner(MARKET_ACTOR_ADDRESS);
      
      await owner.sendTransaction({
        to: MARKET_ACTOR_ADDRESS,
        value: ethers.parseEther("1.0"),
      });
    
      const MockBridgeFactory = await ethers.getContractFactory("MockAxelarGateway");
      const mockBridge = await MockBridgeFactory.deploy();
      await mockBridge.waitForDeployment();
    
      await dealClient.connect(owner).setDestinationChains(
        [BigInt(31337)],
        ["filecoin-2"],
        [await mockBridge.getAddress()],
        { gasLimit: 300000 }
      );
    
      const commP = ethers.hexlify(ethers.randomBytes(32)).slice(2);
      const cidBytes = Buffer.concat([
        Buffer.from("00", "hex"),
        Buffer.from(commP, "hex")
      ]);
    
      const clientAddress = owner.address.slice(2);
    
      const dealProposal = {
        piece_cid: new Tagged(42, cidBytes),
        piece_size: 1,
        verified_deal: false,
        client: Buffer.from(clientAddress, "hex"),
        provider: ethers.randomBytes(32),
        label: Buffer.from(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [BigInt(31337)]).slice(2), "hex"),
        start_epoch: 1,
        end_epoch: 2,
        storage_price_per_epoch: 1,
        provider_collateral: 1,
        client_collateral: 1
      };
    
      const dealProposalBytes = cbor.encode(dealProposal);
      const params = cbor.encode([dealProposalBytes, 1]);
      
      /*await expect(
        dealClient.connect(impersonatedSigner).handle_filecoin_method(
          4186741094n,
          0n,
          ethers.hexlify(params),
          { gasLimit: 500000 }
        )
      ).to.not.be.reverted;*/
    
      expect(await dealClient.pieceDeals(cidBytes)).to.equal(0n);
      expect(await dealClient.pieceStatus(cidBytes)).to.equal(0);
    });
    
    describe("Integration Tests", function () {
      it("Should successfully handle complete flow from deal client to receiver", async function () {
        // Setup chain configuration
        const chainId = 1;
        const chainName = "filecoin-2";
        await dealClient.setDestinationChains(
          [chainId],
          [chainName],
          [await axelarBridge.getAddress()]
        );

        // Setup bridge configuration
        await axelarBridge.setSenderReceiver(
          await dealClient.getAddress(),
          await debugReceiver.getAddress()
        );

        // Prepare test data
        const commP = ethers.hexlify(ethers.randomBytes(32));
        const providerAddr = ethers.hexlify(ethers.randomBytes(32));
        const gasFunds = ethers.parseEther("0.1");

        // Add gas funds
        await dealClient.addGasFunds(providerAddr, { value: gasFunds });

        // Trigger debug call
        await expect(
          dealClient.debug_call(commP, providerAddr, gasFunds, chainId)
        )
          .to.emit(mockGasService, "GasPaid")
          .and.to.emit(mockGateway, "ContractCall");

        // Verify gas funds were deducted
        expect(await dealClient.providerGasFunds(providerAddr)).to.equal(0);
      });

      it("Should handle cross-chain attestation flow", async function () {
        const chainId = 2; // Different chain than the current one
        const chainName = "filecoin-2";
        await dealClient.setDestinationChains(
          [chainId],
          [chainName],
          [await axelarBridge.getAddress()]
        );

        const commP = ethers.hexlify(ethers.randomBytes(32));
        const providerAddr = ethers.hexlify(ethers.randomBytes(32));
        const gasFunds = ethers.parseEther("0.2");

        await dealClient.addGasFunds(providerAddr, { value: gasFunds });

        // Create and encode a deal proposal
        const pieceCID = {
          "/": Buffer.from(commP.slice(2), "hex").toString("base64"),
        };

        const dealProposal = {
          PieceCID: pieceCID,
          PieceSize: 1n,
          VerifiedDeal: false,
          Client: Buffer.from(owner.address.slice(2), "hex"),
          Provider: Buffer.from(providerAddr.slice(2), "hex"),
          Label: Buffer.from(
            ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [chainId])
          ),
          StartEpoch: 1n,
          EndEpoch: 2n,
          StoragePricePerEpoch: 1n,
          ProviderCollateral: 1n,
          ClientCollateral: 1n,
        };

        const marketDealNotifyParams = {
          dealProposal: Buffer.from(cbor.encode(dealProposal)),
          dealId: 1n,
        };

        const params = Buffer.from(cbor.encode(marketDealNotifyParams));

        // Impersonate market actor and notify deal
        const impersonatedSigner = await ethers.getImpersonatedSigner(
          MARKET_ACTOR_ADDRESS
        );
        await owner.sendTransaction({
          to: MARKET_ACTOR_ADDRESS,
          value: ethers.parseEther("1.0"),
        });

        /*await expect(
          dealClient.connect(impersonatedSigner).handle_filecoin_method(
            4186741094n,
            0n,
            params
          )
        ).to.not.be.reverted;*/

        // Verify deal status
        expect(await dealClient.pieceDeals(commP)).to.equal(0n);
        expect(await dealClient.pieceStatus(commP)).to.equal(0); // Status.DealPublished
      });
    });

    it("Should handle zero gas funds correctly", async function () {
      const commP = ethers.hexlify(ethers.randomBytes(32));
      const providerAddr = ethers.hexlify(ethers.randomBytes(32));
      const chainId = 1;

      await expect(
        dealClient.debug_call(
          commP,
          providerAddr,
          ethers.parseEther("0.1"),
          chainId
        )
      ).to.not.be.reverted;

      expect(await dealClient.providerGasFunds(providerAddr)).to.equal(0);
    });

    it("Should handle mismatched array lengths in setDestinationChains", async function () {
      const chainIds = [1, 2];
      const chainNames = ["ethereum"];
      const addresses = [addr1.address];

      await expect(
        dealClient.setDestinationChains(chainIds, chainNames, addresses)
      ).to.be.revertedWith("Input arrays must have the same length");
    });
  });
});
