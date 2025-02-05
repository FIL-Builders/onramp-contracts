import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";

/**
 * Deploys an upgradeable contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTokenContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Start Deloying Contracts *****");
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const NickleToken = await upgrades.deployProxy(
    await ethers.getContractFactory("Nickle"),
    [],
    {kind: 'transparent'}
  );
  const deployedContract = await NickleToken.waitForDeployment();

    // Additional verification of deployment
    const code = await hre.ethers.provider.getCode(deployedContract);
    if (code === '0x') throw new Error('Contract not deployed');

  console.log("🚀 Nickle Contract Deployed at: ", deployedContract.getAddress() );

};

export default deployTokenContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OnRampSource
deployTokenContract.tags = ["Nickle"];