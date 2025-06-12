## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

### Deployments

## Base Sepolia

- Trade handler v4: 0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08
- Mock USDC : 0x10CEA50486207f88AbC954690fE80783E73c3BfE
- Mock UNI : 0x8b39C6b0FB43D18Bf2b82f9D6BfD966c173dA42A
- Mock USDT : 0x8CF1Aa2c13366c82767972B1AE35677dCfF28F52
- Also deployed USDC/UNI uniswap v4 pool, fee tier 3000 with tick spacing 60, price ratio 1:2
- deployed USDT/UNI uniswap v4 pool, fee tier 3000 with tick spacing 60, price ration 1:1

## Base Mainnet

=== Deployment Summary ===
TradeHandlerV4 Proxy: 0x2A31468B5ef8d89e016e20a51bCF26b56C4fe39A
TradeHandlerV4 Implementation: 0xBbf4E494AFA78Bb2F8D580D99A9559861589d21e
Universal Router: 0x6fF5693b99212Da76ad316178A184AB56D299b43
Pool Manager: 0x498581fF718922c3f8e6A244956aF099B2652b2b
Permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3
Quoter: 0x0d5e0F971ED27FBfF6c2837bf31316121532048D
