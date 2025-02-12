import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import fs from "fs";

const configureFilecoinContracts: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Running Filecoin Configuration *****");

  const networkName = hre.network.name;
  if (networkName !== "filecoin") {
    throw new Error(`❌ Script must be run on 'filecoin', but got '${networkName}'.`);
  }

  const { get } = hre.deployments;
  const deployer = (await hre.getNamedAccounts()).deployer;

  // Get deployed Filecoin contract
  const proverDeployment = await get("DealClientAxl");
  const proverContract = await ethers.getContractAt("DealClientAxl", proverDeployment.address);

  // Find valid source chains by checking the `deployments/` directory
  const deploymentDir = `${__dirname}/../../deployments/`;
  const sourceChains = fs.readdirSync(deploymentDir).filter((chain) =>
    fs.existsSync(`${deploymentDir}${chain}/OnRampContract.json`) &&
    fs.existsSync(`${deploymentDir}${chain}/AxelarBridge.json`)
  );

  if (sourceChains.length === 0) {
    throw new Error("❌ No valid source chain deployments found.");
  }

  console.log(`🔗 Detected source chains: ${sourceChains.join(", ")}`);

  for (const sourceChain of sourceChains) {
    // Read deployment addresses dynamically
    const onrampDeployment = JSON.parse(
      fs.readFileSync(`${deploymentDir}${sourceChain}/OnRampContract.json`, "utf-8")
    );
    const oracleDeployment = JSON.parse(
      fs.readFileSync(`${deploymentDir}${sourceChain}/AxelarBridge.json`, "utf-8")
    );

    console.log(`🚀 Configuring DealClientAxl for source chain: ${sourceChain}`);

    // Call correct function with dynamically fetched contract addresses
    const tx = await proverContract.setDestinationChains(
      [(hre.config.networks[sourceChain] as any).chainId],
      [sourceChain],
      [oracleDeployment.address]
    );

    console.log(`✅ Destination chain ${sourceChain} configured: ${tx.hash}`);
    await tx.wait();
  }
};

export default configureFilecoinContracts;

// Ensure script runs only after `Filecoin` deployment
configureFilecoinContracts.tags = ["ConfigFilecoin"];
configureFilecoinContracts.dependencies = ["Filecoin"];

