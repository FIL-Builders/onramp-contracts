import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config();

const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // Use the first account as deployer
    },
  },
  defaultNetwork: "calibration",
  networks: {
    calibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1",
      accounts: [deployerPrivateKey],
    },
    linea: {
      url: "https://rpc.sepolia.linea.build",
      chainId: 59141,
      accounts: [deployerPrivateKey],
    },
    ipc: {
      url: "http://localhost:8545/",
      accounts: [deployerPrivateKey],
    }
  }
};

export default config;
