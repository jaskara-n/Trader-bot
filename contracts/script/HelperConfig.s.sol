// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
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

    function getSepoliaConfig() public pure returns (UniswapConfig memory) {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b,
            quoter: 0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227,
            poolManager: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238,
            uni: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984,
            dai: 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357
        });

        return (uniswapConfig);
    }

    function getBaseSepoliaConfig() public pure returns (UniswapConfig memory) {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0x492E6456D9528771018DeB9E87ef7750EF184104,
            quoter: 0x492E6456D9528771018DeB9E87ef7750EF184104,
            poolManager: 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });

        return (uniswapConfig);
    }

    function getBaseMainnetConfig() public pure returns (UniswapConfig memory) {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0x6fF5693b99212Da76ad316178A184AB56D299b43,
            quoter: 0x0d5e0F971ED27FBfF6c2837bf31316121532048D,
            poolManager: 0x498581fF718922c3f8e6A244956aF099B2652b2b,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });
        return (uniswapConfig);
    }

    function getOptimismSepoliaConfig()
        public
        pure
        returns (UniswapConfig memory)
    {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: 0x5fd84259d66Cd46123540766Be93DFE6D43130D7,
            uni: address(0),
            dai: address(0)
        });

        return (uniswapConfig);
    }

    function getArbitrumSepoliaConfig()
        public
        pure
        returns (UniswapConfig memory)
    {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0xeFd1D4bD4cf1e86Da286BB4CB1B8BcED9C10BA47,
            quoter: address(0),
            poolManager: 0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d,
            uni: address(0),
            dai: address(0)
        });

        return (uniswapConfig);
    }

    function getMantleSepoliaConfig()
        public
        pure
        returns (UniswapConfig memory)
    {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });

        return (uniswapConfig);
    }

    function getUniChainMainnetConfig()
        public
        pure
        returns (UniswapConfig memory)
    {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: 0xEf740bf23aCaE26f6492B10de645D6B98dC8Eaf3,
            quoter: 0x333E3C607B141b18fF6de9f258db6e77fE7491E0,
            poolManager: 0x4529A01c7A0410167c5740C487A8DE60232617bf,
            permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3,
            usdc: 0x078D782b760474a361dDA0AF3839290b0EF57AD6,
            uni: 0x8f187aA05619a017077f5308904739877ce9eA21,
            dai: 0x20CAb320A855b39F724131C69424240519573f81
        });
        return (uniswapConfig);
    }

    function getOrCreateAnvilConfig()
        public
        pure
        returns (UniswapConfig memory)
    {
        UniswapConfig memory uniswapConfig = UniswapConfig({
            universalRouter: address(0),
            quoter: address(0),
            poolManager: address(0),
            permit2: address(0),
            usdc: address(0),
            uni: address(0),
            dai: address(0)
        });

        return (uniswapConfig);
    }
}
