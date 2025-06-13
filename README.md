# Automated Trading Agent with XMTP Integration

## Overview

This project creates an AI-powered trading agent that automatically executes trades based on market opportunities. Built on Base with XMTP messaging, it enables:

- Autonomous trading via AI agent with its own wallet
- Secure communication between users and agent via XMTP
- Uniswap v4 swaps, Compound staking, and DeFi Llama price feeds

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   XMTP Messaging                     │
└──────────────────────────┬───────────────────────────┘
                           │
               ┌───────────▼───────────┐
               │    Trading Agent      │
               │                       │
               │  ┌─────────────────┐  │
               │  │    AI Engine    │  │
               │  └────────┬────────┘  │
               │           │           │
               │  ┌────────▼────────┐  │
               │  │ Agent Wallet    │  │
               │  └────────┬────────┘  │
               └───────────┼───────────┘
                           │
               ┌───────────▼───────────┐
               │    Onchain Services    │
               │                       │
               │  ┌─────┐  ┌─────────┐ │
               │  │Swap │  │ Staking │ │
               │  └─────┘  └─────────┘ │
               │        ┌─────┐        │
               │        │Price│        │
               │        └─────┘        │
               └───────────────────────┘
                           │
               ┌───────────▼───────────┐
               │        Base L2        │
               └───────────────────────┘
```

## Key Components

### 1. Trading Agent Core

- **AI Engine**: Processes natural language commands via XMTP and converts to trading actions
- **Wallet Integration**: Securely interacts with Coinbase Wallet for transaction signing
- **Action Providers**: Modular system for different operations (swap, stake)

### 2. Smart Contracts

- **TradeHandlerV4**: Main contract handling Uniswap v4 operations
  - Address: `0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08` (Base Sepolia)
- **Staking**: Compound-based staking integration
- **Price Feeds**: DeFi Llama oracle integration

### 3. Messaging Layer

- XMTP integration for secure, private messaging
- Message parsing and command recognition
- Transaction confirmation flows via chat

## How It Works

1. User deposits funds into agent's wallet and requests trading via XMTP
2. AI Agent continuously monitors for opportunities using:
   - DeFi Llama price feeds
   - Market conditions analysis
3. When opportunities are found:
   - Agent calculates optimal trades (swaps/staking)
   - Automatically executes transactions using its wallet
4. All actions and confirmations are communicated via XMTP:
   - Trade executions
   - Portfolio updates/ dashboard with analytics
   - Performance reports

## Key Features

1. **Autonomous Trading**: Agent executes trades automatically based on market conditions
2. **Secure Communication**: All interactions via XMTP for end-to-end encrypted messaging
3. **Onchain Operations**:
   - Uniswap v4 swaps
   - Compound staking
   - DeFi Llama price feeds integration
4. **Non-Custodial**: Users maintain control through their own wallets
5. **Transparent**: All actions and results communicated via XMTP
6. **Portfolio Dashboard with Analysis**: Full AI powered analysis for current portfolio investments

## Technical Documentation

### Contracts

Foundry-based smart contract development environment.

#### Key Contracts:

- `TradeHandlerV4.sol`: Main trading logic
- Interfaces:
  - `ITradeHandlerV4.sol`: Contract interface
- Tests:
  - `TradeHandlerV4Fork.t.sol`: Fork tests

#### Deployment

```shell
forge script script/DeployTradeHandlerV4.s.sol --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Agent API

Next.js API routes for agent operations:

- `/api/agent/create-agent`: Agent initialization
- `/api/agent/actions/stake`: Staking operations

#### Environment Variables

Configure in `.env`:

```env
PRIVATE_KEY=0x...
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
```

## Getting Started

1. Install dependencies:

```bash
npm install
cd contracts && npm install
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your keys
```

3. Run development server:

```bash
npm run dev
```

4. Deploy contracts:

```bash
cd contracts
forge build
forge script script/DeployTradeHandlerV4.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Foundry (Original Documentation)

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

### Usage

#### Build

```shell
$ forge build
```

#### Test

```shell
$ forge test
```

#### Format

```shell
$ forge fmt
```

#### Gas Snapshots

```shell
$ forge snapshot
```

#### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Deployments

#### Base Sepolia

- Trade handler v4: `0x00116c0965D08f284A50EcCbCB0bDDC7A9E75b08`
