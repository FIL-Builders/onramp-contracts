const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DealClientAxl", function () {
  this.timeout(120000);

  let dealClient;

  const GATEWAY_ADDRESS = "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D";
  const GAS_RECEIVER = "0xbe406f0189a0b4cf3a05c286473d23791dd44cc6";

    const dealRequest = {
      piece_cid: ethers.randomBytes(32),
      piece_size: 2048,
      verified_deal: false,
      label: "deal-123",
      start_epoch: 520000,
      end_epoch: 1555200,
      storage_price_per_epoch: ethers.parseEther("0.0000001"),
      provider_collateral: ethers.parseEther("0"),
      client_collateral: ethers.parseEther("0"),
      extra_params_version: 1,
      extra_params: {
        location_ref: "https://data.example.com/file.car",
        car_size: 1000,
        skip_ipni_announce: false,
        remove_unsealed_copy: false
      }
    };

  before(async function () {
    const DealClientAxl = await ethers.getContractFactory("DealClientAxl");
    dealClient = await DealClientAxl.deploy(GATEWAY_ADDRESS, GAS_RECEIVER);
    await dealClient.deploymentTransaction().wait();
  });

  describe("makeDealProposal", function () {
    it("should emit DealProposalCreate event", async function () {
      const tx = await dealClient.makeDealProposal(dealRequest);
      const receipt = await tx.wait();

      const events = await dealClient.queryFilter(
        dealClient.filters.DealProposalCreate(),
        receipt.blockNumber,
        receipt.blockNumber
      );
      
      const event = events[0];
      console.log("Event details:", {
        id: event.args[0],
        size: event.args[1],
        verified: event.args[2],
        price: event.args[3]
      });

      expect(event.args[1]).to.equal(dealRequest.piece_size);
      expect(event.args[2]).to.equal(dealRequest.verified_deal);
      expect(event.args[3]).to.equal(dealRequest.storage_price_per_epoch);
    });

    it("should store the deal request", async function () {
      const tx = await dealClient.makeDealProposal(dealRequest);
      const receipt = await tx.wait();
      
      const events = await dealClient.queryFilter(
        dealClient.filters.DealProposalCreate(),
        receipt.blockNumber,
        receipt.blockNumber
      );
      
      const event = events[0];
      const proposalId = event.args[0];
      
      const storedDeal = await dealClient.getDealRequest(proposalId);
      
      expect(ethers.hexlify(storedDeal.piece_cid)).to.equal(
        ethers.hexlify(dealRequest.piece_cid)
      );
      expect(storedDeal.piece_size).to.equal(dealRequest.piece_size);
      expect(storedDeal.verified_deal).to.equal(dealRequest.verified_deal);
      expect(storedDeal.label).to.equal(dealRequest.label);
      expect(storedDeal.start_epoch).to.equal(dealRequest.start_epoch);
      expect(storedDeal.end_epoch).to.equal(dealRequest.end_epoch);
      expect(storedDeal.storage_price_per_epoch).to.equal(dealRequest.storage_price_per_epoch);
      expect(storedDeal.provider_collateral).to.equal(dealRequest.provider_collateral);
      expect(storedDeal.client_collateral).to.equal(dealRequest.client_collateral);
      expect(storedDeal.extra_params_version).to.equal(dealRequest.extra_params_version);
      expect(storedDeal.extra_params.location_ref).to.equal(dealRequest.extra_params.location_ref);
      expect(storedDeal.extra_params.car_size).to.equal(dealRequest.extra_params.car_size);
      expect(storedDeal.extra_params.skip_ipni_announce).to.equal(dealRequest.extra_params.skip_ipni_announce);
      expect(storedDeal.extra_params.remove_unsealed_copy).to.equal(dealRequest.extra_params.remove_unsealed_copy);
    });
  });
}); 