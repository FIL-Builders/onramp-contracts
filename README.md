<h1 align="center">
  On Ramp Contracts 🚀
</h1>

Bringing decentralized storage to every blockchain! This project enables **dApps to store data on Filecoin** from **multiple L1/L2 networks** using cross-chain smart contracts.

## 📚 Table of Contents
- [Overview](#overview)
  - [What is a Cross-Chain Data Bridge?](#what-is-a-cross-chain-data-bridge)
  - [What are Onramp Contracts?](#what-are-onramp-contracts)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
- [Deployment Instructions](#deployment-instructions)
- [Configuration](#configuration)
- [Setting up xChain Client](#setting-up-xchain-client)
- [Usage](#usage)
- [Additional Resources](#additional-resources)
- [Contributing](#contributing)
- [License](#license)

## 🌍 Overview

### What is a Cross-Chain Data Bridge?
A cross-chain data bridge allows applications on one blockchain (source chain) to interact with and store data on another blockchain (destination chain). In the context of Onramp Contracts, this means enabling any blockchain to leverage Filecoin's decentralized storage capabilities.

### What are Onramp Contracts?
Our smart contracts act as a **bridge** between various blockchains (like Linea, Avalanche, and Arbitrum) and **Filecoin** storage. The framework consists of:

✅ **Source Chains (L1/L2 networks)**
- **`OnRampContract`** – Handles user deposits & cross-chain messaging
- **`AxelarBridge`** – Bridges messages via **Axelar**

✅ **Filecoin (Storage Destination)**
- **`DealClientAxl`** – Receives data & initiates storage deals

## Architecture

The system works through three main components deployed across chains:

1. **Source Chain Contracts**: 
   - OnRampContract from `Onramp.sol`: Manages data submissions and payment
   - AxelarBridge from `Oracle.sol`: Handles cross-chain communication
2. **Destination Chain Contract (Filecoin)**:
   - DealClientAxl from `Prover-Axelar.sol`: Processes storage deals and manages data verification
3. **xChain Client**: Coordinates the data transfer and deal-making process

## Project Structure
```
OnRamp-Contracts/
├── contract-tools
|   │── xchain
|   │── client.bash
|   │── deploy-onramp.fish
|   │── easy-host.bash
|   │── rand-files.bash
├── contracts
|   │── destChain
|   │── sourceChain
|   │── testHelperContracts
|   │── Cid.sol
|   │── Const.sol
|   │── Token.sol
├── deploy
├── lib
├── test
├── .env.example
├── README.md
├── package.json
└── ...
```

## Getting Started

### Prerequisites
- Node.js and npm installed
- Go 1.22.7 or later
- Geth
- Access to test tokens for your chosen source chain
- Test FIL for Filecoin Calibration network

### Installation Steps

#### 1️⃣ Clone & Install Dependencies
```bash
git clone https://github.com/FIL-Builders/onramp-contracts.git
cd onramp-contracts
npm install --force
```

#### 2️⃣ Configure Environment Variables
- Copy `.env.example` to `.env`
- Set the private key of your deployer wallet:
```bash
DEPLOYER_PRIVATE_KEY=your-private-key
NETWORK=testnet   # Change to "mainnet" if deploying to mainnet
```

#### 3️⃣ Compile Smart Contracts
```bash
npx hardhat compile
```

## 🚀 Deployment Instructions

### Step 1: Deploy Filecoin Contracts
💾 Deploys the **DealClientAxl** contract on Filecoin to handle storage transactions.
```bash
npx hardhat deploy --tags Filecoin --network filecoin
```

### Step 2: Deploy Source Chain Contracts
🌉 Deploys `OnRampContract` & `AxelarBridge` on **your chosen L1/L2 source chain**.

**Example for Linea:**
```bash
npx hardhat deploy --tags SourceChain --network linea-sepolia
```

**Other supported networks:**
```bash
npx hardhat deploy --tags SourceChain --network arbitrum-sepolia
npx hardhat deploy --tags SourceChain --network avalanche
```

## 🔧 Configuration

### Step 3: Wire Filecoin with Source Chains
👀 **Automatically detects all deployed source chains** and configures **DealClientAxl**:
```bash
npx hardhat deploy --tags ConfigFilecoin --network filecoin
```

### Step 4: Configure Source Chains
🏗 **Sets up cross-chain messaging**:
```bash
npx hardhat deploy --tags ConfigSourceChain --network linea-sepolia
```

### Running Full Deployment in One Command
```bash
npx hardhat deploy --tags Filecoin --network filecoin && \
npx hardhat deploy --tags SourceChain --network linea-sepolia && \
npx hardhat deploy --tags ConfigFilecoin --network filecoin && \
npx hardhat deploy --tags ConfigSourceChain --network linea-sepolia
```

## 🛠 Setting Up xChain Client

### 1️⃣ Set Up Forge
```bash
forge install
```

### 2️⃣ Install & Use Go 1.22.7
```bash
gvm install go1.22.7
gvm use go1.22.7
```

### 3️⃣ Build OnRamp Tools
```bash
cd contract-tools/xchain
go build
```

### 4️⃣ Generate Cross-Chain Keys
```bash
geth account new --keystore ~/onramp-contracts/xchain_key.json
```

Configure environment:
```bash
export XCHAIN_KEY_PATH=~/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--your-address
export XCHAIN_PASSPHRASE=password
export XCHAIN_ETH_API="ws://127.0.0.1:1234/rpc/v1"
export MINER_ADDRESS=t01013
```

## Usage

1. Start the xChain server:
```bash
./contract-tools/xchain/xchain_server
```

2. Upload data using the client tool:
```bash
./contract-tools/client.bash <file> <token_address> <token_id>
```

## Additional Resources

- [Demo Application Repository](https://github.com/FIL-Builders/onrampDemo)
- [xChain Client Documentation](https://docs.xchainjs.org/xchain-client/)
- [Shashank's Guide](https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718)
- [Filecoin Deals Repo](https://github.com/lordshashank/filecoin-deals)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.