import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers,upgrades } from "hardhat";

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
  const { axelarGateway: filecoinAxelarGateway } = hre.config.networks.filecoin.axelar as any;

  console.log(`Axelar Gateway (Source - ${networkName}): ${sourceAxelarGateway}`);
  console.log(`Axelar Gateway (Destination - Filecoin): ${filecoinAxelarGateway}`);

  const onramp= await upgrades.deployProxy(
    await ethers.getContractFactory("OnRampContract"),
    [],
    {kind:'transparent'}
  );
  await onramp.waitForDeployment();
  const onrampAddress = await onramp.getAddress();
  console.log("🚀 OnRamp Contract Deployed at: ", onrampAddress);


  const oracle = await upgrades.deployProxy(
    await ethers.getContractFactory("AxelarBridge"), 
    [sourceAxelarGateway],
    {kind:'transparent'}
  );
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("🚀 Oracle Contract Deployed at: ", oracleAddress);
};

export default deployContractsOnSrcChain;
deployContractsOnSrcChain.tags = ["SourceChain"];

