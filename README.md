# On Ramp Contracts

Empowering developers to build dApps that write data to the filecoin network


## Installation

1. `forge install`
2. set up gvm and use go 1.22 `gvm install go1.22; gvm use go1.22`
3. download calibnet export `aria2c -x5 https://forest-archive.chainsafe.dev/latest/calibnet` or `wget https://forest-archive.chainsafe.dev/latest/calibnet`
./lotus daemon --remove-existing-chain --halt-after-import --import-snapshot ./forest_snapshot_calibnet_2024-10-01_height_2016336.forest.car.zst    && LOTUS_FEVM_ENABLEETHRPC=true ./lotus daemon


4. build onramp: `cd contract-tools/xchain; go build;`
5. download lotus and boost. if this repo is checked out to `~/dev/snissn/onramp-contracts/` then for the environment variables set in the next step check out boost and lotus in the folder `~/dev/filecoin-project/lotus` and `~/dev/filecoin-project/boost` 
6. build lotus for calibnet `cd ~/dev/filecoin-project/lotus; make calibnet`
7. build boost for calibnet `cd ~/dev/filecoin-project/boost; make calibnet`
8. create xchain keys
    a. install geth http://adam.schmideg.net/go-ethereum/install-and-build/Installing-Geth
    b. geth account new --keystore ~/dev/snissn/onramp-contracts/xchain_key.json
    ? /home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa

9. set environment variables



export ONRAMP_CODE_PATH=$(pwd)
export LOTUS_EXEC_PATH=$(pwd)/../../filecoin-project/lotus
export BOOST_EXEC_PATH=$(pwd)/../../filecoin-project/boost
export XCHAIN_KEY_PATH=/home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa
export XCHAIN_PASSPHRASE=password
export XCHAIN_ETH_API="http://127.0.0.1:1234/rpc/v1"


9. install fish
11. run fish shell
12. source fish install script: `cd contract-tools; source deploy-onramp.fish`
13. run deploy script `deploy-onramp`


## Setup with IPC 

1. Follow deployment script instructions https://github.com/consensus-shipyard/ipc/blob/main/scripts/deploy_subnet_under_calibration_net/README.md
Ensure you have the latest foundry and run make to set thing sup before running deploy.sh
```
~/ipc$ make
~/ipc/scripts/deploy_subnet_under_calibration_net$ bash deploy.sh local
```

2. 

setup ipc node

```
$ ./target/release/ipc-cli subnet create --parent /r314159 --min-validator-stake 1 --min-validators 1 --bottomup-check-period 300  --permission-mode collateral --supply-source-kind native 
2024-10-22T21:36:52.659563Z  INFO ipc_provider::manager::evm::manager: creating subnet on evm with params: ConstructorParams { min_activation_collateral: 1000000000000000000, min_validators: 1, bottom_up_check_period: 300, ipc_gateway_addr: 0x834fe63204e519ca6071b8a85cd5d279769e9563, active_validators_limit: 100, majority_percentage: 67, consensus: 0, power_scale: 3, permission_mode: 0, supply_source: Asset { kind: 0, token_address: 0x0000000000000000000000000000000000000000 }, collateral_source: Asset { kind: 0, token_address: 0x0000000000000000000000000000000000000000 }, parent_id: SubnetID { root: 314159, route: [] }, validator_gater: 0x0000000000000000000000000000000000000000 }
2024-10-22T21:38:01.183107Z  INFO ipc_cli::commands::subnet::create: created subnet actor with id: /r314159/t410f4taeev3geff6pmcjp6mhwyjycaq3o3fk66oin3q    
mikers@mikers-B560-DS3H-AC-Y1:~/ipc$ ./target/release/ipc-cli subnet join --subnet=/r314159/t410f4taeev3geff6pmcjp6mhwyjycaq3o3fk66oin3q --collateral=10 --initial-balance 1
2024-10-22T21:39:59.486057Z  INFO ipc_cli::commands::subnet::join: pre-funding address with 1    
2024-10-22T21:39:59.492285Z  INFO ipc_provider::manager::evm::manager: interacting with evm subnet contract: 0xe4c0…6caa with balance: 1000000000000000000
2024-10-22T21:40:01.933672Z  INFO ipc_provider: joining subnet with public key: "048c1d9a02d29f6ad10ee8c4ad92eb3eb7c5408e0e2e44a872eed7da281154546c6488f80fecde5eedb779a218a7c423a37d6b2fbf0dbd0a308ecf5cbc6d6a4ea8"    
2024-10-22T21:40:01.933687Z  INFO ipc_provider::manager::evm::manager: interacting with evm subnet contract: 0xe4c0…6caa with collateral: 10000000000000000000
joined at epoch: 2076895
mikers@mikers-B560-DS3H-AC-Y1:~/ipc$ ./target/release/ipc-cli wallet export --address 0xbcfa6e2c5db2900ffc300387ccd747e589a22d9a --wallet-type evm  --hex > ~/.ipc/validator_default.sk
```



cargo make --makefile infra/fendermint/Makefile.toml -e NODE_NAME=validator-default -e PRIVATE_KEY_PATH=/home/mikers/.ipc/validator_default.sk -e SUBNET_ID=/r314159/t410f4taeev3geff6pmcjp6mhwyjycaq3o3fk66oin3q -e CMT_P2P_HOST_PORT=26656     -e CMT_RPC_HOST_PORT=26657     -e ETHAPI_HOST_PORT=8545     -e RESOLVER_HOST_PORT=26655     -e PARENT_GATEWAY=0x834FE63204e519Ca6071b8A85Cd5D279769e9563 -e PARENT_REGISTRY=0x00Dd8143FE31D82c317cc7a2a6050cbEeFc33e0F -e FM_PULL_SKIP=1     child-validator




--- 


deploy contracts:

mikers@mikers-B560-DS3H-AC-Y1:~/dev/fil-builders/onramp-contracts$ npm run deploy

> @onramp_contract/hardhat@0.0.1 deploy
> npx hardhat deploy --tags Filecoin --network calibration

Nothing to compile
No need to generate any newer typings.
transaction 0xc5798f135124b6270579eea85e7d71230390bf2f96b2bf87090a6f419cf61ec5 still pending... It used a gas pricing config of maxPriorityFeePerGas: 126601 maxFeePerGas: 126727 ,
              current gas price is 199169 wei
              new baseFee is 100

✖ Choose what to do with the pending transaction: ·


stuck here

go to https://calibration.filscan.io/en/message/bafy2bzacecgescjgxav2ut345ahqpoxwrvnmmjm6fa3e5ishfwehkfegiknps/

find EthAddress: 0x169e6ca595dffe6b952786b097c422e863f587d7

update .env with PROVER_CONTRACT_ADDRESS_DEST_CHAIN=0x169e6ca595dffe6b952786b097c422e863f587d7


adding ipc submodule in contracts/lib

run 'make' in ipc in order to ensure appropriate pre-reqs are available to copmile and use sdk. may be more efficient method but this accomplishes goal of setting up ipc's submodules


## Shashank notes

https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718

https://github.com/lordshashank/filecoin-deals       



