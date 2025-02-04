# **On Ramp Contracts 🚀**
Bringing decentralized storage to every blockchain! This project enables **dApps to store data on Filecoin** from **multiple L1/L2 networks** using cross-chain smart contracts.

## **🌍 Overview**
Our smart contracts act as a **bridge** between various blockchains (like Linea, Avalanche, and Arbitrum) and **Filecoin** storage.

✅ **Source Chains (L1/L2 networks)**
- **`OnRampContract`** – Handles user deposits & cross-chain messaging
- **`AxelarBridge`** – Bridges messages via **Axelar**

✅ **Filecoin (Storage Destination)**
- **`DealClientAxl`** – Receives data & initiates storage deals

---

## **📦 Installation & Setup**

### **1️⃣ Clone & Install Dependencies**
```sh
git clone https://github.com/FIL-Builders/onramp-contracts.git
cd onramp-contracts
npm install --force
```

### **2️⃣ Configure Environment Variables**
- Copy `.env.example` to `.env`
- Set the private key of your deployer wallet:
```sh
DEPLOYER_PRIVATE_KEY=your-private-key
NETWORK=testnet   # Change to "mainnet" if deploying to mainnet
```

### **3️⃣ Compile Smart Contracts**
```sh
npx hardhat compile
```

---

## **🚀 Deployment Instructions**

### **Step 1: Deploy Filecoin Contracts**
💾 Deploys the **DealClientAxl** contract on Filecoin to handle storage transactions.
```sh
npx hardhat deploy --tags Filecoin --network filecoin
```

### **Step 2: Deploy Source Chain Contracts**
🌉 Deploys `OnRampContract` & `AxelarBridge` on **your chosen L1/L2 source chain**.

**Example for Linea:**
```sh
npx hardhat deploy --tags SourceChain --network linea-sepolia
```

**Other supported networks:**
```sh
npx hardhat deploy --tags SourceChain --network arbitrum-sepolia
npx hardhat deploy --tags SourceChain --network avalanche
```

---

## **🔧 Configuration**
Once contracts are deployed, we need to **connect them**.

### **Step 3: Wire Filecoin with Source Chains**
👀 **Automatically detects all deployed source chains** and configures **DealClientAxl** to accept cross-chain requests.
```sh
npx hardhat deploy --tags ConfigFilecoin --network filecoin
```
📌 This scans the `deployments/` folder and links **valid** chains dynamically.

### **Step 4: Configure Source Chains**
🏗 **Sets up cross-chain messaging between OnRamp, AxelarBridge, and Filecoin.**
```sh
npx hardhat deploy --tags ConfigSourceChain --network linea-sepolia
```
(Replace `linea-sepolia` with your actual source chain.)

---

## **📜 Running the Full Deployment in One Command**
```sh
npx hardhat deploy --tags Filecoin --network filecoin && \
npx hardhat deploy --tags SourceChain --network linea-sepolia && \
npx hardhat deploy --tags ConfigFilecoin --network filecoin && \
npx hardhat deploy --tags ConfigSourceChain --network linea-sepolia
```
🎉 **Done! Your cross-chain storage system is now fully operational!** 🚀

---

## **🛠 Setting Up the Off-Chain Components**
This project requires additional tooling to send & retrieve data.

### **1️⃣ Set Up Forge**
```sh
forge install
```

### **2️⃣ Install & Use Go 1.22.7**
```sh
gvm install go1.22.7
gvm use go1.22.7
```

### **3️⃣ Build OnRamp Tools**
```sh
cd contract-tools/xchain
go build
```

### **4️⃣ Generate Cross-Chain Keys**
🔑 **Install Geth & create an Ethereum account for signing transactions**
```sh
geth account new --keystore ~/onramp-contracts/xchain_key.json
```
Example output:
```
/home/user/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa
```

Set environment variables:
```sh
export XCHAIN_KEY_PATH=~/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--your-address
export XCHAIN_PASSPHRASE=password
export XCHAIN_ETH_API="http://127.0.0.1:1234/rpc/v1"
export MINER_ADDRESS=t01013
```

---

## **🚀 Running XChain**
Set environment variables as above, then:
```sh
./contract-tools/xchain/xchain_server
```
Use the XChain client to upload data:
```sh
./contract-tools/client.bash screenshot.png 0xaEE9C9E8E4b40665338BD8374D8D473Bd014D1A1 1
```

---

## **🔍 Additional Notes & References**
- [Shashank's Guide](https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718)
- [Filecoin Deals Repo](https://github.com/lordshashank/filecoin-deals)
