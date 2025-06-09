// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {IPoolInitializer_v4} from "@uniswap/v4-periphery/src/interfaces/IPoolInitializer_v4.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SqrtPriceMath} from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";

/**
 * @title CreateV4PoolAndMintPosition
 * @author Jaskaran Singh
 * @notice Contract to construct a uniswap v4 pool and mint initial liquidity in it.
 * @dev Current created pools :
 * ARBITRUM SEPOLIA
 * Stargate USDC / ETH (0.30% fee)
 * ETH SEPOLIA
 * Stargate USDC / ETH (0.30% fee)
 */

contract CreateV4PoolAndMintPosition is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    HelperConfig public helperConfig;
    IPoolManager public poolManager;
    IPositionManager public positionManager;
    IAllowanceTransfer public permit2;

    // Pool configuration
    uint24 constant LP_FEE = 3000; // 0.30% fee
    int24 constant TICK_SPACING = 60; // Standard for 0.30% fee
    // uint160 constant SQRT_PRICE_2000_USDC_ETH =
    //     1506673274302120988651364689808458;
    uint128 LIQUIDITY_AMOUNT = 10000 ether; // 100,000 USDC

    function run() external {
        helperConfig = new HelperConfig();
        HelperConfig.UniswapConfig memory uniswapConfig = helperConfig
            .getBaseSepoliaConfig();

        address token0Address = 0x10CEA50486207f88AbC954690fE80783E73c3BfE; // mock USDC
        address token1Address = 0x8b39C6b0FB43D18Bf2b82f9D6BfD966c173dA42A; // mock UNI

        // Initialize contracts
        poolManager = IPoolManager(uniswapConfig.poolManager);
        positionManager = IPositionManager(
            0x4B2C77d209D3405F41a037Ec6c77F7F5b8e2ca80
        );
        permit2 = IAllowanceTransfer(uniswapConfig.permit2);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcast
        vm.startBroadcast(deployerPrivateKey);

        // Sort currencies
        Currency currency0 = Currency.wrap(token0Address);
        Currency currency1 = Currency.wrap(token1Address);

        if (
            uint160(Currency.unwrap(currency0)) >
            uint160(Currency.unwrap(currency1))
        ) {
            (currency0, currency1) = (currency1, currency0);
        }

        console2.log("Creating pool for:");
        console2.log("Currency0:", Currency.unwrap(currency0));
        console2.log("Currency1:", Currency.unwrap(currency1));

        // Configure the pool
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0)) // No hooks for this pool
        });

        // int24 tickLower = TickMath.minUsableTick(poolKey.tickSpacing);
        // int24 tickUpper = TickMath.maxUsableTick(poolKey.tickSpacing);

        int24 currentTick = TickMath.getTickAtSqrtPrice(
            Constants.SQRT_PRICE_1_2
        );

        // Use Uniswap's standard range percentages
        // Common ranges: 0.1%, 0.5%, 1%, 2%, 5%, 10%, 25%, 50%
        int24 tickSpacingMultiplier = 100; // e.g., 100 tick spacings = ~1% range

        int24 tickLower = ((currentTick -
            tickSpacingMultiplier *
            TICK_SPACING) / TICK_SPACING) * TICK_SPACING;
        int24 tickUpper = ((currentTick +
            tickSpacingMultiplier *
            TICK_SPACING) / TICK_SPACING) * TICK_SPACING;

        // Calculate amounts for the liquidity
        (uint256 amount0, uint256 amount1) = LiquidityAmounts
            .getAmountsForLiquidity(
                Constants.SQRT_PRICE_1_2,
                TickMath.getSqrtPriceAtTick(tickLower),
                TickMath.getSqrtPriceAtTick(tickUpper),
                LIQUIDITY_AMOUNT
            );

        console2.log("Amount0 required:", amount0);
        console2.log("Amount1 required:", amount1);

        // Prepare multicall parameters
        bytes[] memory params = new bytes[](2);

        // First call: Initialize the pool
        params[0] = abi.encodeWithSelector(
            IPoolInitializer_v4.initializePool.selector,
            poolKey,
            Constants.SQRT_PRICE_1_2
        );

        // Second call: Mint liquidity
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE_PAIR)
        );

        bytes[] memory mintParams = new bytes[](2);

        // MINT_POSITION parameters
        mintParams[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            LIQUIDITY_AMOUNT,
            amount0 * 2, // amount0Max with slippage
            amount1 * 2, // amount1Max with slippage
            msg.sender, // recipient
            bytes("") // hookData
        );

        // SETTLE_PAIR parameters
        mintParams[1] = abi.encode(currency0, currency1);

        // Encode modifyLiquidities call
        uint256 deadline = block.timestamp + 60;
        params[1] = abi.encodeWithSelector(
            IPositionManager.modifyLiquidities.selector,
            abi.encode(actions, mintParams),
            deadline
        );

        // Approve tokens for Permit2
        if (!currency0.isAddressZero()) {
            IERC20(Currency.unwrap(currency0)).approve(
                address(permit2),
                type(uint256).max
            );
            permit2.approve(
                Currency.unwrap(currency0),
                address(positionManager),
                type(uint160).max,
                type(uint48).max
            );
            console2.log("Approved currency0");
        }

        if (!currency1.isAddressZero()) {
            IERC20(Currency.unwrap(currency1)).approve(
                address(permit2),
                type(uint256).max
            );
            permit2.approve(
                Currency.unwrap(currency1),
                address(positionManager),
                type(uint160).max,
                type(uint48).max
            );
            console2.log("Approved currency1");
        }

        // Calculate ETH value if needed
        uint256 ethValue = 0;
        if (currency0.isAddressZero()) {
            ethValue += amount0 * 2;
        }
        if (currency1.isAddressZero()) {
            ethValue += amount1 * 2;
        }

        // Execute multicall to create pool and mint liquidity
        positionManager.multicall{value: ethValue}(params);

        // Log success
        console2.log(" Pool created and liquidity minted!");
        // console2.log("Pool ID:", poolKey.toId());

        vm.stopBroadcast();
    }
}
