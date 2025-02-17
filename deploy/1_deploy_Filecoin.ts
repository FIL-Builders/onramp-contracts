import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

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

  const prover = await deploy("DealClientAxl", {
    from: deployer,
    args: [axelarGateway, axelarGasService],
    log: true,
    waitConfirmations: 2,
  });

  console.log("🚀 Prover_Axelar Contract Deployed at: ", prover.address);
};

export default deployContractOnFilecoin;
deployContractOnFilecoin.tags = ["Filecoin"];

