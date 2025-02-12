import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import fs from "fs";

const configureSourceChainContracts: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Running Source Chain Configuration *****");

  const networkName = hre.network.name;
  const networkConfig = hre.network.config as any;

  const { get } = hre.deployments;
  const deployer = (await hre.getNamedAccounts()).deployer;

  // Get deployed contracts
  const onrampDeployment = await get("OnRampContract");
  const oracleDeployment = await get("AxelarBridge");

  const onrampContract = await ethers.getContractAt("OnRampContract", onrampDeployment.address);
  const oracleContract = await ethers.getContractAt("AxelarBridge", oracleDeployment.address);

  // Verify Filecoin deployment exists
  const filecoinDeploymentDir = `${__dirname}/../../deployments/filecoin/`;
  if (!fs.existsSync(`${filecoinDeploymentDir}/DealClientAxl.json`)) {
    throw new Error("❌ DealClientAxl contract not found in Filecoin deployment.");
  }

  // Read Filecoin contract address
  const proverDeployment = JSON.parse(
    fs.readFileSync(`${filecoinDeploymentDir}/DealClientAxl.json`, "utf-8")
  );
  const proverAddress = proverDeployment.address;

  console.log(`🚀 Configuring OnRampContract at ${onrampDeployment.address}...`);

  const tx1 = await onrampContract.setOracle(oracleDeployment.address);
  console.log(`✅ OnRamp Oracle set: ${tx1.hash}`);
  await tx1.wait();

  console.log(`🚀 Configuring AxelarBridge at ${oracleDeployment.address}...`);

  const tx2 = await oracleContract.setSenderReceiver(proverAddress, onrampDeployment.address);
  console.log(`✅ AxelarBridge sender/receiver set: ${tx2.hash}`);
  await tx2.wait();
};

export default configureSourceChainContracts;

// Run this only after `SourceChain` deployment
configureSourceChainContracts.tags = ["ConfigSourceChain"];
configureSourceChainContracts.dependencies = ["SourceChain"];

