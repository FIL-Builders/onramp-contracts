import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const proverAddressFilecoin = process.env.PROVER_CONTRACT_ADDRESS_DEST_CHAIN;
  const oracleAddressSource = process.env.ORACLE_CONTRACT_ADDRESS_SRC_CHAIN; 

  console.log("***** Start wiring Oracle Contract on Filecoin *****");
  // Get the deployed contract instance by name
  const proverContract = await ethers.getContractAt("DealClientAxl", proverAddressFilecoin);
  const setProverTx = await proverContract.setSourceChains([314159],['filecoin-2'],[oracleAddressSource]);
  
  // Wait for the transaction to be mined
  console.log("~*~*~ Connect Oracle to ProverContract at:", setProverTx.hash);
  await setProverTx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
