// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {TradeHandlerV4} from "../src/TradeHandlerV4.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    function run() external returns (TradeHandlerV4) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.UniswapConfig memory uniswapConfig = helperConfig
            .getBaseSepoliaConfig();

        vm.startBroadcast();
        TradeHandlerV4 tradeHandler = new TradeHandlerV4(
            uniswapConfig.universalRouter,
            uniswapConfig.poolManager,
            uniswapConfig.permit2,
            uniswapConfig.quoter
        );
        vm.stopBroadcast();

        return tradeHandler;
    }
}
