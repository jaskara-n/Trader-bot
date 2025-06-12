// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TradeHandlerV4} from "../src/TradeHandlerV4.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployTradeHandlerV4 is Script {
    function run() external returns (TradeHandlerV4, address) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.UniswapConfig memory uniswapConfig = helperConfig
            .getBaseMainnetConfig();

        console.log("Deploying TradeHandlerV4 Upgradeable...");
        console.log("Network: Base Sepolia");

        vm.startBroadcast();

        // Deploy implementation
        TradeHandlerV4 implementation = new TradeHandlerV4();
        console.log("Implementation deployed at:", address(implementation));

        // Encode initialization data
        bytes memory initData = abi.encodeWithSelector(
            TradeHandlerV4.initialize.selector,
            uniswapConfig.universalRouter,
            uniswapConfig.poolManager,
            uniswapConfig.permit2,
            uniswapConfig.quoter
        );

        // Deploy proxy with initialization
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed at:", address(proxy));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("TradeHandlerV4 Proxy:", address(proxy));
        console.log("TradeHandlerV4 Implementation:", address(implementation));
        console.log("Universal Router:", uniswapConfig.universalRouter);
        console.log("Pool Manager:", uniswapConfig.poolManager);
        console.log("Permit2:", uniswapConfig.permit2);
        console.log("Quoter:", uniswapConfig.quoter);
        console.log("========================\n");

        // Return both proxy (as TradeHandlerV4) and implementation address
        return (
            TradeHandlerV4(payable(address(proxy))),
            address(implementation)
        );
    }
}
