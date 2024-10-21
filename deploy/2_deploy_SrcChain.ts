import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployContractsOnSrcChain: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Start Deloying Contracts on Source Chain*****");
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const axelarGatewayAddressLinea = "0xe432150cce91c13a887f7D836923d5597adD8E31";

  const onramp =  await deploy("OnRampContract", {
    from: deployer,
    args: [],
    log: true,
  });
  const onrampAddress = onramp.address;
  console.log("🚀 OnRamp Contract Deployed at: ", onrampAddress);

  const oracle =  await deploy("AxelarBridge", {
    from: deployer,
    args: [axelarGatewayAddressLinea],
    log: true,
  });
  const oracleAddress = oracle.address;
  console.log("🚀 Oracle Contract Deployed at: ", oracleAddress);
};

export default deployContractsOnSrcChain;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OnRampSource
deployContractsOnSrcChain.tags = ["SoureChain"];