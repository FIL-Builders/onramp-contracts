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

  let axelarGatewayAddress;
  const networkName = hre.network.name;

  if(networkName == "linea"){
    axelarGatewayAddress= '0xe432150cce91c13a887f7D836923d5597adD8E31';
  } else if(networkName == 'avalanceFuji'){
    axelarGatewayAddress = '0xC249632c2D40b9001FE907806902f63038B737Ab';
  } else {
    console.error(
      "Unsupported network. Use 'calibnet' for Filecoin, 'linea' for Linear, 'hedera' for Hedera, or 'flow' for Flow."
    );
    process.exit(1);
  }

  const onramp =  await deploy("OnRampContract", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 2,
  });
  const onrampAddress = onramp.address;
  console.log("🚀 OnRamp Contract Deployed at: ", onrampAddress);

  const oracle =  await deploy("AxelarBridge", {
    from: deployer,
    args: [axelarGatewayAddress],
    log: true,
    waitConfirmations: 2,
  });
  const oracleAddress = oracle.address;
  console.log("🚀 Oracle Contract Deployed at: ", oracleAddress);
};

export default deployContractsOnSrcChain;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OnRampSource
deployContractsOnSrcChain.tags = ["SoureChain"];