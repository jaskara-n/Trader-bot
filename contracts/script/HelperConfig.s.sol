// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    struct ChainAbstractionConfig {
        address stargatePoolUSDC; /// @param stargatePoolUSDC Stargate USDC bridge/ pool address
        address stargatePoolUSDT;
        address stargatePoolNative;
        address stargateUSDC;
        address stargateUSDT;
        uint32 endpointId; /// @param endpointId Layerzero endpoint id
        address endpointAddress; /// @param endpointAddress Layerzero endpoint address
    }
    struct UniswapConfig {
        address universalRouter; /// @param universalRouter Universal router address uniswap v4
        address quoter;
        address poolManager; /// @param poolManager Pool manager address uniswap v4
        address permit2; /// @param permit2 Permit2 address for uniswap V4
        address usdc;
        address uni;
        address dai;
    }

    // ChainAbstractionConfig public chainAbstractionConfig;
    // UniswapConfig public uniswapConfig;

    // constructor() {
    //     if (block.chainid == 11155111) {
    //         activeNetworkConfig = getSepoliaConfig();
    //     } else if (block.chainid == 11155420) {
    //         activeNetworkConfig = getOptimismSepoliaConfig();
    //     } else {
    //         activeNetworkConfig = getOrCreateAnvilConfig();
    //     }
    // }

    function getSepoliaConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: 0x4985b8fcEA3659FD801a5b857dA1D00e985863F0, // Sepolia Stargate Router
            stargatePoolUSDT: 0x9D819CcAE96d41d8F775bD1259311041248fF980,
            stargatePoolNative: 0x9Cc7e185162Aa5D1425ee924D97a87A0a34A0706,
            stargateUSDC: 0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590, // Stargate USDC token
            stargateUSDT: 0xF3F2b4815A58152c9BE53250275e8211163268BA, // Stargate USDT token
            endpointId: 40161,
            endpointAddress: 0x6EDCE65403992e310A62460808c4b910D972f10f
        });

        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b,
            quoter: 0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227,
            poolManager: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238,
            uni: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984,
            dai: 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357
        });

        return (chainConfig, uniswapConfig);
    }

    function getOptimismSepoliaConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: 0x314B753272a3C79646b92A87dbFDEE643237033a,
            stargatePoolUSDT: 0x6bD6De24CA0756698e3F2B706bBe717c2209633b,
            stargatePoolNative: 0xa31dCc5C71E25146b598bADA33E303627D7fC97e,
            stargateUSDC: 0x488327236B65C61A6c083e8d811a4E0D3d1D4268, // Stargate USDC token
            stargateUSDT: address(0), // Stargate USDT token
            endpointId: 40232,
            endpointAddress: 0x6EDCE65403992e310A62460808c4b910D972f10f
        });

        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: 0x5fd84259d66Cd46123540766Be93DFE6D43130D7,
            uni: address(0),
            dai: address(0)
        });

        return (chainConfig, uniswapConfig);
    }

    function getArbitrumSepoliaConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: 0x543BdA7c6cA4384FE90B1F5929bb851F52888983,
            stargatePoolUSDT: 0xB956d6FDFB235636DE7885C5166756823bb27e3a,
            stargatePoolNative: 0x6fddB6270F6c71f31B62AE0260cfa8E2e2d186E0,
            stargateUSDC: 0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773, // Stargate USDC token
            stargateUSDT: address(0), // Stargate USDT token
            endpointId: 40231,
            endpointAddress: 0x6EDCE65403992e310A62460808c4b910D972f10f
        });

        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0xeFd1D4bD4cf1e86Da286BB4CB1B8BcED9C10BA47,
            quoter: address(0),
            poolManager: 0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d,
            uni: address(0),
            dai: address(0)
        });

        return (chainConfig, uniswapConfig);
    }

    function getMantleSepoliaConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: 0x6D205337F45D6850c3c3006e28d5b52c8a432c35,
            stargatePoolUSDT: 0xd9492653457A69E9f4987DB43D7fa0112E620Cb4,
            stargatePoolNative: 0xE1AD845D93853fff44990aE0DcecD8575293681e,
            stargateUSDC: address(0), // Stargate USDC token
            stargateUSDT: address(0), // Stargate USDT token
            endpointId: 40246,
            endpointAddress: 0x6EDCE65403992e310A62460808c4b910D972f10f
        });

        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });

        return (chainConfig, uniswapConfig);
    }

    function getUniChainMainnetConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: address(0),
            stargatePoolUSDT: address(0),
            stargatePoolNative: address(0),
            stargateUSDC: address(0), // Stargate USDC token
            stargateUSDT: address(0), // Stargate USDT token
            endpointId: 0,
            endpointAddress: address(0)
        });
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0xEf740bf23aCaE26f6492B10de645D6B98dC8Eaf3,
            quoter: 0x333E3C607B141b18fF6de9f258db6e77fE7491E0,
            poolManager: 0x4529A01c7A0410167c5740C487A8DE60232617bf,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x078D782b760474a361dDA0AF3839290b0EF57AD6,
            uni: 0x8f187aA05619a017077f5308904739877ce9eA21,
            dai: 0x20CAb320A855b39F724131C69424240519573f81
        });
        return (chainConfig, uniswapConfig);
    }

    function getOrCreateAnvilConfig()
        public
        pure
        returns (ChainAbstractionConfig memory, UniswapConfig memory)
    {
        // These are mock addresses for local testing
        ChainAbstractionConfig memory chainConfig = ChainAbstractionConfig({
            stargatePoolUSDC: address(0),
            stargatePoolUSDT: address(0),
            stargatePoolNative: address(0),
            stargateUSDC: address(0), // Stargate USDC token
            stargateUSDT: address(0), // Stargate USDT token
            endpointId: 0,
            endpointAddress: address(0)
        });

        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });

        return (chainConfig, uniswapConfig);
    }
}
