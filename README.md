# On Ramp Contracts

Empowering developers to build dApps that write data from different blockchain to the filecoin network.

The following diagram shows the workflow of data onramp running on other L1/L2 (we are using Linea as an example). 


## Installation

### Deploying smart contracts with Hardhat
The data onramp project port Filecoin storage capacity to any other blockchain using smart contracts. To achieve this cross-chain storage solution, we need to deploy a set of contracts on Filecoin and any other L1/L2 source chain. 

Overal, contracts should be deployed on the source chain and Filecoin are listed as below.
- Source Chain
    - OnRampContract from `Onramp.sol`
    - AxelarBridge from `Oracle.sol`
- Filecoin
    - DealClientAxl from `Prover-Axelar.sol`

We will use hardhat to deploy contracts on both Filecoin & Linea. 
1. clone this repo & install all dependencies
    ```
    git clone https://github.com/FIL-Builders/onramp-contracts.git

    cd onramp-contracts
    npm intall --force
    ```
1. re-name `.env.example` to `.env` and add the private key of the deployer wallet.
1. make sure the chain configs are correct in `hardhat.config.ts`. If the your desired chain config is missing, you will need to add it in the `hardhat.config.ts`.
1. compile smart contracts.
    ```
    npx hardhat compile
    ```
1. deploy DealClientAxl contract to the Filecoin network. Ensure you have enought tFIL to cover the gas fee for smart contract deployment in your wallet.
    ```
    npx hardhat deploy --tags Filecoin --network calibration
    ```
1. deploy OnRampContract & AxelarBridge to the Linea network. Make sure you have test token LineaETH in your wallet.
    ```
    npx hardhat deploy --tags SoureChain --network linea
    ```
1. After the contracts are successfully deploy on both networks. You need to add three smart contracts address in `.env` for the following configuration.
    ```
    DEPLOYER_PRIVATE_KEY=
    PROVER_CONTRACT_ADDRESS_DEST_CHAIN=
    ONRAMP_CONTRACT_ADDRESS_SRC_CHAIN=
    ORACLE_CONTRACT_ADDRESS_SRC_CHAIN=
    ```
1. Wire those contracts together to process cross-chain calls. 
    - **On Filecoin**: setting up the supported source chains. 
        ```
        npx hardhat run scripts/3_config_Filecoin.ts --network calibration
        ```
    - **On source chain**: connecting Oracle & Onramp contracts; Then config crosss-chain messages sender and receiver so Oracle contracts knows how to process cross-chain calls.
        ```
        npx hardhat run scripts/4_config_Srcchain.ts --network linea
        ```
Once you finished the above steps, you have deployed a set of onramp contracts to support cross-chain storage process from Linea to Filecoin.
### Setting up projects
1. `forge install`
2. set up gvm and use go 1.22.7 `gvm install go1.22.7; gvm use go1.22.7`
3. download calibnet export `aria2c -x5 https://forest-archive.chainsafe.dev/latest/calibnet -o calibnet.car.zst` or `wget https://forest-archive.chainsafe.dev/latest/calibnet -o calibnet.car.zst` and run the following command to start calibration:
    ```
    ./lotus daemon --remove-existing-chain --halt-after-import --import-snapshot ./calibnet.car.zst && LOTUS_FEVM_ENABLEETHRPC=true LOTUS_EVENTS_ENABLEACTOREVENTSAPI=true ./lotus daemon
    ```
4. build onramp: `cd contract-tools/xchain; go build;`
5. download lotus and boost. if this repo is checked out to `~/dev/snissn/onramp-contracts/` then for the environment variables set in the next step check out boost and lotus in the folder `~/dev/filecoin-project/lotus` and `~/dev/filecoin-project/boost` 
6. build lotus for calibnet `cd ~/dev/filecoin-project/lotus; make calibnet`
7. build boost for calibnet `cd ~/dev/filecoin-project/boost; make calibnet`
8. create xchain keys
    - [Installing geth](http://adam.schmideg.net/go-ethereum/install-and-build/Installing-Geth) 
    - creating new account
        ```
        geth account new --keystore ~/dev/snissn/onramp-contracts/xchain_key.json
        
        /home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa
        ```

9. set environment variables
    ```
    export ONRAMP_CODE_PATH=$(pwd)
    export LOTUS_EXEC_PATH=$(pwd)/../../filecoin-project/lotus
    export BOOST_EXEC_PATH=$(pwd)/../../filecoin-project/boost
    export XCHAIN_KEY_PATH=/home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa
    export XCHAIN_PASSPHRASE=password
    export XCHAIN_ETH_API="http://127.0.0.1:1234/rpc/v1"
    export MINER_ADDRESS=t01013
    ```
9. install fish
11. run fish shell
12. source fish install script: `cd contract-tools; source deploy-onramp.fish`
13. run deploy script `deploy-onramp`

This should create a config written to `~/.xchain/config.json`

### Running xchain

set environment variables like above but change
```
export XCHAIN_ETH_API="ws://127.0.0.1:1234/rpc/v1"
update xhcain config with ws url
```

modify xchain config to set TargetAggSize to a value larger than the files you are testing with ie 327680 for 10 files x 32k each


set up car utility
```
go install github.com/ipld/go-car/cmd/car@latest
```

set up stream-commp util
```
go install github.com/filecoin-project/go-fil-commp-hashhash/cmd/stream-commp@latest
```


Building xchain
- `cd contract-tools/xchain` 
- build xchain `go build`
- run xchain server `./xchain`
- use xchain client to upload data using one of the test token
    ```
    /onramp-contracts/contract-tools$ ./client.bash screenshot.png 0xaEE9C9E8E4b40665338BD8374D8D473Bd014D1A1 1
    ```




## Shashank notes

https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718

https://github.com/lordshashank/filecoin-deals       
