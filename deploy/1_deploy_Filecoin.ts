import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers,upgrades } from "hardhat";

const deployContractOnFilecoin: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  if (hre.network.name !== "filecoin") {
    throw new Error(`❌ Deployment aborted: Must be deployed on 'filecoin', but got '${hre.network.name}'.`);
  }

  console.log(`***** Deploying Contracts on Filecoin *****`);
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const { axelarGateway, axelarGasService } = hre.network.config.axelar as any;

  console.log(`Axelar Gateway (Filecoin): ${axelarGateway}`);
  console.log(`Axelar Gas Service (Filecoin): ${axelarGasService}`);

  const prover = await upgrades.deployProxy(
    await ethers.getContractFactory("DealClientAxl"),
    [axelarGateway, axelarGasService],
    {kind:'transparent'}
  );

  await prover.waitForDeployment();
  const proverAddress = await prover.getAddress();
  console.log("🚀 Prover_Axelar Contract Deployed at: ", proverAddress);
  
};

export default deployContractOnFilecoin;
deployContractOnFilecoin.tags = ["Filecoin"];

