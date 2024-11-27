/* Autogenerated file. Do not edit manually. */

/* tslint:disable */

/* eslint-disable */
import type { NonPayableOverrides } from "../../common";
import type {
  SendMessage,
  SendMessageInterface,
} from "../../contracts/SendMessage";
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "gateway_",
        type: "address",
      },
      {
        internalType: "address",
        name: "gasReceiver_",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "InvalidAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "NotApprovedByGateway",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "commandId",
        type: "bytes32",
      },
      {
        internalType: "string",
        name: "sourceChain",
        type: "string",
      },
      {
        internalType: "string",
        name: "sourceAddress",
        type: "string",
      },
      {
        internalType: "bytes",
        name: "payload",
        type: "bytes",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "commandId",
        type: "bytes32",
      },
      {
        internalType: "string",
        name: "sourceChain",
        type: "string",
      },
      {
        internalType: "string",
        name: "sourceAddress",
        type: "string",
      },
      {
        internalType: "bytes",
        name: "payload",
        type: "bytes",
      },
      {
        internalType: "string",
        name: "tokenSymbol",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "executeWithToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "gasService",
    outputs: [
      {
        internalType: "contract IAxelarGasService",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "gateway",
    outputs: [
      {
        internalType: "contract IAxelarGateway",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "destinationChain",
        type: "string",
      },
      {
        internalType: "string",
        name: "destinationAddress",
        type: "string",
      },
      {
        internalType: "string",
        name: "value_",
        type: "string",
      },
    ],
    name: "sendMessage",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "sourceAddress",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "sourceChain",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "value",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60c060405234801561001057600080fd5b50604051610d86380380610d8683398101604081905261002f9161008b565b816001600160a01b0381166100575760405163e6c4247b60e01b815260040160405180910390fd5b6001600160a01b039081166080521660a052506100be565b80516001600160a01b038116811461008657600080fd5b919050565b6000806040838503121561009e57600080fd5b6100a78361006f565b91506100b56020840161006f565b90509250929050565b60805160a051610c886100fe6000396000818161016f01526101ea01526000818160a7015281816102770152818161032001526104a50152610c886000f3fe60806040526004361061007b5760003560e01c80633fa4f2451161004e5780633fa4f24514610128578063491606581461013d5780636a22d8cc1461015d578063b0fa84441461019157600080fd5b80630eabeffe14610080578063116191b6146100955780631a98b2e0146100e65780631c6ffa4614610106575b600080fd5b61009361008e366004610711565b6101a6565b005b3480156100a157600080fd5b506100c97f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020015b60405180910390f35b3480156100f257600080fd5b506100936101013660046107ab565b6102ef565b34801561011257600080fd5b5061011b6103d9565b6040516100dd91906108d2565b34801561013457600080fd5b5061011b610467565b34801561014957600080fd5b506100936101583660046108ec565b610474565b34801561016957600080fd5b506100c97f000000000000000000000000000000000000000000000000000000000000000081565b34801561019d57600080fd5b5061011b61056b565b600082826040516020016101bb9291906109b9565b60408051601f198184030181529190529050341561026057604051630c93e3bb60e01b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690630c93e3bb90349061022d9030908c908c908c908c908a9033906004016109d5565b6000604051808303818588803b15801561024657600080fd5b505af115801561025a573d6000803e3d6000fd5b50505050505b604051631c92115f60e01b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690631c92115f906102b4908a908a908a908a908890600401610a37565b600060405180830381600087803b1580156102ce57600080fd5b505af11580156102e2573d6000803e3d6000fd5b5050505050505050505050565b60008585604051610301929190610a7e565b604051908190038120631876eed960e01b825291506001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690631876eed990610365908e908e908e908e908e9089908d908d908d90600401610a8e565b602060405180830381600087803b15801561037f57600080fd5b505af1158015610393573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103b79190610aed565b6103d457604051631403112d60e21b815260040160405180910390fd5b6102e2565b600180546103e690610b0f565b80601f016020809104026020016040519081016040528092919081815260200182805461041290610b0f565b801561045f5780601f106104345761010080835404028352916020019161045f565b820191906000526020600020905b81548152906001019060200180831161044257829003601f168201915b505050505081565b600080546103e690610b0f565b60008282604051610486929190610a7e565b604051908190038120635f6970c360e01b825291506001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690635f6970c3906104e4908b908b908b908b908b908990600401610b4a565b602060405180830381600087803b1580156104fe57600080fd5b505af1158015610512573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105369190610aed565b61055357604051631403112d60e21b815260040160405180910390fd5b610561878787878787610578565b5050505050505050565b600280546103e690610b0f565b61058481830183610ba1565b8051610598916000916020909101906105bb565b506105a56001878761063f565b506105b26002858561063f565b50505050505050565b8280546105c790610b0f565b90600052602060002090601f0160209004810192826105e9576000855561062f565b82601f1061060257805160ff191683800117855561062f565b8280016001018555821561062f579182015b8281111561062f578251825591602001919060010190610614565b5061063b9291506106b3565b5090565b82805461064b90610b0f565b90600052602060002090601f01602090048101928261066d576000855561062f565b82601f106106865782800160ff1982351617855561062f565b8280016001018555821561062f579182015b8281111561062f578235825591602001919060010190610698565b5b8082111561063b57600081556001016106b4565b60008083601f8401126106da57600080fd5b50813567ffffffffffffffff8111156106f257600080fd5b60208301915083602082850101111561070a57600080fd5b9250929050565b6000806000806000806060878903121561072a57600080fd5b863567ffffffffffffffff8082111561074257600080fd5b61074e8a838b016106c8565b9098509650602089013591508082111561076757600080fd5b6107738a838b016106c8565b9096509450604089013591508082111561078c57600080fd5b5061079989828a016106c8565b979a9699509497509295939492505050565b60008060008060008060008060008060c08b8d0312156107ca57600080fd5b8a35995060208b013567ffffffffffffffff808211156107e957600080fd5b6107f58e838f016106c8565b909b50995060408d013591508082111561080e57600080fd5b61081a8e838f016106c8565b909950975060608d013591508082111561083357600080fd5b61083f8e838f016106c8565b909750955060808d013591508082111561085857600080fd5b506108658d828e016106c8565b9150809450508092505060a08b013590509295989b9194979a5092959850565b6000815180845260005b818110156108ab5760208185018101518683018201520161088f565b818111156108bd576000602083870101525b50601f01601f19169290920160200192915050565b6020815260006108e56020830184610885565b9392505050565b60008060008060008060006080888a03121561090757600080fd5b87359650602088013567ffffffffffffffff8082111561092657600080fd5b6109328b838c016106c8565b909850965060408a013591508082111561094b57600080fd5b6109578b838c016106c8565b909650945060608a013591508082111561097057600080fd5b5061097d8a828b016106c8565b989b979a50959850939692959293505050565b81835281816020850137506000828201602090810191909152601f909101601f19169091010190565b6020815260006109cd602083018486610990565b949350505050565b600060018060a01b03808a16835260a060208401526109f860a08401898b610990565b8381036040850152610a0b81888a610990565b90508381036060850152610a1f8187610885565b92505080841660808401525098975050505050505050565b606081526000610a4b606083018789610990565b8281036020840152610a5e818688610990565b90508281036040840152610a728185610885565b98975050505050505050565b8183823760009101908152919050565b89815260c060208201526000610aa860c083018a8c610990565b8281036040840152610abb81898b610990565b90508660608401528281036080840152610ad6818688610990565b9150508260a08301529a9950505050505050505050565b600060208284031215610aff57600080fd5b815180151581146108e557600080fd5b600181811c90821680610b2357607f821691505b60208210811415610b4457634e487b7160e01b600052602260045260246000fd5b50919050565b868152608060208201526000610b64608083018789610990565b8281036040840152610b77818688610990565b915050826060830152979650505050505050565b634e487b7160e01b600052604160045260246000fd5b600060208284031215610bb357600080fd5b813567ffffffffffffffff80821115610bcb57600080fd5b818401915084601f830112610bdf57600080fd5b813581811115610bf157610bf1610b8b565b604051601f8201601f19908116603f01168101908382118183101715610c1957610c19610b8b565b81604052828152876020848701011115610c3257600080fd5b82602086016020830137600092810160200192909252509594505050505056fea26469706673582212206b61bc4c92d6c2a9eca0671b1f7d1a6fb7a3ec671fb96fc7d0551566aa6766e064736f6c63430008090033";

type SendMessageConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SendMessageConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SendMessage__factory extends ContractFactory {
  constructor(...args: SendMessageConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    gateway_: AddressLike,
    gasReceiver_: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(gateway_, gasReceiver_, overrides || {});
  }
  override deploy(
    gateway_: AddressLike,
    gasReceiver_: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(gateway_, gasReceiver_, overrides || {}) as Promise<
      SendMessage & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): SendMessage__factory {
    return super.connect(runner) as SendMessage__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SendMessageInterface {
    return new Interface(_abi) as SendMessageInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): SendMessage {
    return new Contract(address, _abi, runner) as unknown as SendMessage;
  }
}