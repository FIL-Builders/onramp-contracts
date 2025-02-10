import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers,upgrades } from "hardhat";

/**
 * Deploys an upgradaeble contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployContractOnFilecoin: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Start Deloying Contracts on Filecoin*****");
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const axelarGatewayAddressFilecoin = "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D";
  const axelarGasReceiverFilecoin = "0xbe406f0189a0b4cf3a05c286473d23791dd44cc6";

  const prover = await upgrades.deployProxy(
    await ethers.getContractFactory("DealClientAxl"),
    [axelarGatewayAddressFilecoin, axelarGasReceiverFilecoin],
    {kind:'transparent'}
  );

  await prover.waitForDeployment();
  const proverAddress = await prover.getAddress();
  console.log("🚀 Prover_Axelar Contract Deployed at: ", proverAddress);
  
};

export default deployContractOnFilecoin;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OnRampSource
deployContractOnFilecoin.tags = ["Filecoin"];