import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("***** Start Deloying Contracts *****");
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("Deploying with account:", deployer);

  const NickleToken =  await deploy("Nickle", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log("🚀 Nickle Contract Deployed at: ", NickleToken.address);
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OnRampSource
deployYourContract.tags = ["Nickle"];