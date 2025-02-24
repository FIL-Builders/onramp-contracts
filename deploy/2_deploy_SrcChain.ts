import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployContractsOnSrcChain: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const networkName = hre.network.name;
  const networkConfig = hre.network.config as any;

  if (!networkConfig.isSourceChain) {
    throw new Error(`❌ Deployment aborted: ${networkName} is not marked as a source chain in Hardhat config.`);
  }

  console.log(`***** Deploying Contracts on Source Chain: ${networkName} *****`);
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const { axelarGateway: sourceAxelarGateway } = networkConfig.axelar;
  const { axelarGateway: filecoinAxelarGateway } = hre.config.networks.filecoin.axelar;

  console.log(`Axelar Gateway (Source - ${networkName}): ${sourceAxelarGateway}`);
  console.log(`Axelar Gateway (Destination - Filecoin): ${filecoinAxelarGateway}`);

  const onramp = await deploy("OnRampContract", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 2,
  });

  console.log("🚀 OnRamp Contract Deployed at: ", onramp.address);

  const oracle = await deploy("AxelarBridge", {
    from: deployer,
    args: [sourceAxelarGateway],
    log: true,
    waitConfirmations: 2,
  });

  console.log("🚀 Oracle Contract Deployed at: ", oracle.address);
};

export default deployContractsOnSrcChain;
deployContractsOnSrcChain.tags = ["SourceChain"];

