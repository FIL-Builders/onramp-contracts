import { expect } from "chai";

import { ethers } from "hardhat";

describe("ERC20 Token Contracts", function () {
  let deployer: any;
  let user: any;
  let nickle: any;
  let bronzeCowry: any;
  let athenianDrachma: any;
  let debasedTowerPoundSterling: any;

  const TOTAL_SUPPLY = ethers.parseUnits(
    "10000000000000000000000000000000000000000000000000000000000000000",
    0
  );

  before(async function () {
    this.timeout(200000);

    // Get signers
    [deployer, user] = await ethers.getSigners();

    if (!deployer || !user) {
      throw new Error("Failed to get signers");
    }

    // Deploy Nickle contract
    const Nickle = await ethers.getContractFactory("Nickle");
    nickle = await Nickle.deploy();
    await nickle.waitForDeployment();

    // Deploy BronzeCowry contract
    const BronzeCowry = await ethers.getContractFactory("BronzeCowry");
    bronzeCowry = await BronzeCowry.deploy();
    await bronzeCowry.waitForDeployment();

    // Deploy AthenianDrachma contract
    const AthenianDrachma = await ethers.getContractFactory("AthenianDrachma");
    athenianDrachma = await AthenianDrachma.deploy();
    await athenianDrachma.waitForDeployment();

    // Deploy DebasedTowerPoundSterling contract
    const DebasedTowerPoundSterling = await ethers.getContractFactory(
      "DebasedTowerPoundSterling"
    );
    debasedTowerPoundSterling = await DebasedTowerPoundSterling.deploy();
    await debasedTowerPoundSterling.waitForDeployment();
  });

  describe("Nickle Token", function () {
    it("should have the correct name and symbol", async function () {
      expect(await nickle.name()).to.equal("Nickle");
      expect(await nickle.symbol()).to.equal("NICKLE");
    });

    it("should mint the total supply to the deployer", async function () {
      const deployerBalance = await nickle.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("1000", 0);

      // Transfer tokens from deployer to user
      await nickle.transfer(user.address, transferAmount);

      // Check balances
      const deployerBalance = await nickle.balanceOf(deployer.address);
      const userBalance = await nickle.balanceOf(user.address);

      expect(deployerBalance).to.equal(TOTAL_SUPPLY - transferAmount);
      expect(userBalance).to.equal(transferAmount);
    });
  });

  describe("BronzeCowry Token", function () {
    it("should have the correct name and symbol", async function () {
      expect(await bronzeCowry.name()).to.equal("Bronze Cowry");
      expect(await bronzeCowry.symbol()).to.equal("SHELL");
    });

    it("should mint the total supply to the deployer", async function () {
      const deployerBalance = await bronzeCowry.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("1000", 0);

      // Transfer tokens from deployer to user
      await bronzeCowry.transfer(user.address, transferAmount);

      // Check balances
      const deployerBalance = await bronzeCowry.balanceOf(deployer.address);
      const userBalance = await bronzeCowry.balanceOf(user.address);

      expect(deployerBalance).to.equal(TOTAL_SUPPLY - transferAmount);
      expect(userBalance).to.equal(transferAmount);
    });
  });

  describe("AthenianDrachma Token", function () {
    it("should have the correct name and symbol", async function () {
      expect(await athenianDrachma.name()).to.equal("Athenian Drachma");
      expect(await athenianDrachma.symbol()).to.equal("ATH");
    });

    it("should mint the total supply to the deployer", async function () {
      const deployerBalance = await athenianDrachma.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("1000", 0);

      // Transfer tokens from deployer to user
      await athenianDrachma.transfer(user.address, transferAmount);

      // Check balances
      const deployerBalance = await athenianDrachma.balanceOf(deployer.address);
      const userBalance = await athenianDrachma.balanceOf(user.address);

      expect(deployerBalance).to.equal(TOTAL_SUPPLY - transferAmount);
      expect(userBalance).to.equal(transferAmount);
    });
  });

  describe("DebasedTowerPoundSterling Token", function () {
    it("should have the correct name and symbol", async function () {
      expect(await debasedTowerPoundSterling.name()).to.equal(
        "DebasedTowerPoundSterling"
      );
      expect(await debasedTowerPoundSterling.symbol()).to.equal("NEWTON");
    });

    it("should mint the total supply to the deployer", async function () {
      const deployerBalance = await debasedTowerPoundSterling.balanceOf(
        deployer.address
      );
      expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("1000", 0);

      // Transfer tokens from deployer to user
      await debasedTowerPoundSterling.transfer(user.address, transferAmount);

      // Check balances
      const deployerBalance = await debasedTowerPoundSterling.balanceOf(
        deployer.address
      );
      const userBalance = await debasedTowerPoundSterling.balanceOf(
        user.address
      );

      expect(deployerBalance).to.equal(TOTAL_SUPPLY - transferAmount);
      expect(userBalance).to.equal(transferAmount);
    });
  });
});
