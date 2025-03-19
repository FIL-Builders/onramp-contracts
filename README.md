# 🚀 CrossChain Data Bridge

Bringing decentralized storage to every blockchain! This project enables **dApps to store data on Filecoin** from **multiple L1/L2 networks** using cross-chain data onramp smart contracts.

## 📚 Table of Contents
- [Overview](#overview)
  - [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Deployment](#deployment)
  - [Configuration](#configuration)
- [Setting up xChain Client](#setting-up-xchain-client)
  - [Usage](#usage)
- [Additional Resources](#additional-resources)
- [Contributing](#contributing)
- [License](#license)

## 🌍 Overview

The CrossChain Data Bridge(aka, onramp contracts) enables applications on various blockchains (source chains) to store and retrieve data directly on the Filecoin decentralized storage network.

**Features**

- ⚡ Cross-Chain Compatibility – Supports multiple L1 & L2 networks.
- 🔐 Verifiable Storage – Leverages Filecoin's decentralized storage with built-in verification.
- 🧩 Modular Design – Easily extendable to integrate additional blockchains and components.

Our contracts act as a bridge between source chains (e.g., Linea, Avalanche, Arbitrum) and Filecoin.

- **Source Chains (L1/L2 networks)**
  - **`OnRampContract`** – Handles cross-chain storage requests & verification, and user payments.
  - **`AxelarBridge`** – Bridges messages via **Axelar**

- **Filecoin (Storage Destination)**
  - **`DealClientAxl`** – Receives deal notification from Filecoin builtIn actor,  sends proof back to source chain. 

### Architecture

![image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*d10pFHzMRBv6mMOx4Z7Wbw.gif)

The cross-chain data bridge works through two main components deployed across chains:

1. **Onramp Contracts**: 

    - Source Chain Contracts: `Onramp.sol` & `Oracle.sol`
    - Destination Chain Contract (Filecoin): `Prover.sol`

2. **[xChain Client](https://github.com/FIL-Builders/xchainClient)**: 
Monitoring storage requests from the source chain, aggregating data, and facilitating deal-making with storage providers or deal engines.

You can refer to a [dataBridgeDemo](https://github.com/FIL-Builders/dataBridgeDemo) to learn how to interact with onramp contract to onboard data from other L1 to Filecoin.

## 🚀 Getting Started

#### Prerequisites
- Node.js and npm installed
- Go 1.22.7 or later
- Access to test tokens for your chosen source chain
- Test FIL for Filecoin Calibration network

---
### Installation

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
---
###  Deployment
⚠️ Ensure you have sufficient test tokens on both chains before deploying.

#### Step 1: Deploy Filecoin Contracts
Deploys the **DealClientAxl** contract on Filecoin to handle storage transactions.
```bash
npx hardhat deploy --tags Filecoin --network filecoin
```

#### Step 2: Deploy Source Chain Contracts
Deploys `OnRampContract` & `AxelarBridge` on **your chosen L1/L2 source chain**.

**Example for Linea:**
```bash
npx hardhat deploy --tags SourceChain --network avalanche
```

**Other supported networks:**
```bash
npx hardhat deploy --tags SourceChain --network arbitrum-sepolia
npx hardhat deploy --tags SourceChain --network linea-sepolia
```
---
### Configuration

#### Step 3: Wire Filecoin with Source Chains
Automatically detects all deployed source chains and configures `DealClientAxl`:
```bash
npx hardhat deploy --tags ConfigFilecoin --network filecoin
```

#### Step 4: Configure Source Chains
Sets up cross-chain messaging:
```bash
npx hardhat deploy --tags ConfigSourceChain --network avalanche
```

#### Running Full Deployment in One Command
```bash
npx hardhat deploy --tags Filecoin --network filecoin && \
npx hardhat deploy --tags SourceChain --network avalanche && \
npx hardhat deploy --tags ConfigFilecoin --network filecoin && \
npx hardhat deploy --tags ConfigSourceChain --network avalanche
```

## **🛠 Setting Up the Off-Chain Components (xChain Client)**

The bridge requires running the [xChain client](https://github.com/FIL-Builders/xchainClient) to process storage requests and proofs between chains.

👉 Follow the [installation guide]((https://github.com/FIL-Builders/xchainClient?tab=readme-ov-file#-installation)) to build and run it. 


### Usage

1️⃣ Start the xChain server:
```bash
./xchainClient daemon --config ./config/config.json --chain avalanche --buffer-service --aggregation-service
```

2️⃣ Upload data using the client tool:
```bash
./xchainclient client offer-file --chain avalanche --config ./config/config.json <file_path> <payment-addr> <payment-amount>
```

3️⃣ Check deal status:
```bash
./xchainClient client dealStatus <cid> <offerId>
```

## 📖 Additional Resources

- [Under the Hood: Architecture and Prototype of Cross-Chain Data Storage](https://medium.com/@filoz/under-the-hood-architecture-and-prototype-of-cross-chain-data-storage-6f8ba2c480d6)
- [Demo app on Avalanche](https://github.com/FIL-Builders/dataBridgeDemo)
- [xChain Client Documentation](https://docs.xchainjs.org/xchain-client/)
- [Shashank's Guide](https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718)
- [Filecoin Deals Repo](https://github.com/lordshashank/filecoin-deals)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
