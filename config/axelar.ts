const env = process.env.NETWORK || "testnet";

if (env !== "testnet" && env !== "mainnet") {
  throw new Error(`❌ Invalid NETWORK value: ${env}. Must be 'testnet' or 'mainnet'.`);
}

const chains = require(`${__dirname}/../node_modules/@axelar-network/axelar-chains-config/info/${env}.json`);

export function getAxelarAddresses(chainName: string) {
  if (!chains.chains[chainName]) {
    throw new Error(`❌ Chain '${chainName}' not found in Axelar config`);
  }
  return {
    axelarGateway: chains.chains[chainName].contracts.AxelarGateway.address,
    axelarGasService: chains.chains[chainName].contracts.AxelarGasService.address,
  };
}

export function getSourceChain() {
  const sourceChain = process.env.SOURCE_CHAIN || "linea"; // Default to Linea
  if (!chains.chains[sourceChain]) {
    throw new Error(`❌ SOURCE_CHAIN '${sourceChain}' not found in Axelar config`);
  }
  return sourceChain;
}

