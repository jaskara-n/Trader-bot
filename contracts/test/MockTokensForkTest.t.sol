// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {TradeHandlerV4} from "../src/TradeHandlerV4.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {CurrencyLibrary, Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPermit2} from "@uniswap/permit2/src/interfaces/IPermit2.sol";
import {Commands} from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IUniversalRouter} from "@uniswap/universal-router/contracts/interfaces/IUniversalRouter.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockTokensForkTest is Test {
    TradeHandlerV4 public tradeHandler;
    TradeHandlerV4 public implementation;

    HelperConfig helperConfig;
    HelperConfig.UniswapConfig activeConfig;
    string BASE_SEPOLIA_RPC_URL = vm.envString("BASE_SEPOLIA_RPC_URL");

    uint256 fork;
    address USER = makeAddr("USER");

    // Mock token addresses on Base Sepolia
    address constant MOCK_USDC = 0x10CEA50486207f88AbC954690fE80783E73c3BfE;
    address constant MOCK_UNI = 0x8b39C6b0FB43D18Bf2b82f9D6BfD966c173dA42A;

    // Pool configuration
    uint24 constant FEE_TIER = 3000;
    int24 constant TICK_SPACING = 60;

    function setUp() public {
        // Create and select Base Sepolia fork
        fork = vm.createSelectFork(BASE_SEPOLIA_RPC_URL);

        // Get Base Sepolia config from HelperConfig
        helperConfig = new HelperConfig();
        (activeConfig) = helperConfig.getBaseSepoliaConfig();

        // Deploy implementation
        implementation = new TradeHandlerV4();

        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            TradeHandlerV4.initialize.selector,
            activeConfig.universalRouter,
            activeConfig.poolManager,
            activeConfig.permit2,
            activeConfig.quoter
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        // Set tradeHandler to proxy
        tradeHandler = TradeHandlerV4(payable(address(proxy)));

        // Ensure we're on the right fork
        assertEq(vm.activeFork(), fork);
    }

    function test__conductTradeMockUSDCToMockUNIExactInputSingle() public {
        uint128 amountIn = 10e18; // 1000 USDC (assuming 18 decimals for mock)

        // Get pool key for USDC/UNI pool
        PoolKey memory key = getPoolKey(MOCK_USDC, MOCK_UNI, FEE_TIER);
        bool zeroToOne = MOCK_USDC < MOCK_UNI; // Determine swap direction based on token addresses

        // Deal USDC to user
        deal(MOCK_USDC, USER, amountIn);

        vm.startPrank(USER);

        // Approve TradeHandler to spend USDC
        IERC20(MOCK_USDC).approve(address(tradeHandler), amountIn);

        // Execute the swap
        uint256 amountOut = tradeHandler.conductTradeExactInputSingle(
            key,
            USER,
            amountIn,
            0, // minAmountOut - set to 0 for testing, should be calculated in production
            uint48(block.timestamp) + 1,
            zeroToOne
        );

        vm.stopPrank();

        // Assertions
        assertGt(amountOut, 0, "Amount out should be greater than 0");
        assertEq(
            IERC20(MOCK_USDC).balanceOf(USER),
            0,
            "User should have 0 USDC after swap"
        );
        assertGt(
            IERC20(MOCK_UNI).balanceOf(USER),
            0,
            "User should have UNI after swap"
        );

        // Log the output for debugging
        console2.log("USDC swapped:", amountIn);
        console2.log("UNI received:", IERC20(MOCK_UNI).balanceOf(USER));

        // With 1:2 price ratio, expect approximately 500 UNI for 1000 USDC (minus fees)
        // This is just a rough check - actual amount depends on pool liquidity and slippage
        assertGt(
            IERC20(MOCK_UNI).balanceOf(USER),
            450e18,
            "Should receive approximately 500 UNI minus fees"
        );
    }

    function test__conductTradeMockUNIToMockUSDCExactInputSingle() public {
        uint128 amountIn = 500e18; // 500 UNI (assuming 18 decimals for mock)

        // Get pool key for USDC/UNI pool
        PoolKey memory key = getPoolKey(MOCK_USDC, MOCK_UNI, FEE_TIER);
        bool zeroToOne = MOCK_UNI < MOCK_USDC; // Determine swap direction based on token addresses

        // Deal UNI to user
        deal(MOCK_UNI, USER, amountIn);

        vm.startPrank(USER);

        // Approve TradeHandler to spend UNI
        IERC20(MOCK_UNI).approve(address(tradeHandler), amountIn);

        // Execute the swap
        uint256 amountOut = tradeHandler.conductTradeExactInputSingle(
            key,
            USER,
            amountIn,
            0, // minAmountOut - set to 0 for testing
            uint48(block.timestamp) + 1,
            zeroToOne
        );

        vm.stopPrank();

        // Assertions
        assertGt(amountOut, 0, "Amount out should be greater than 0");
        assertEq(
            IERC20(MOCK_UNI).balanceOf(USER),
            0,
            "User should have 0 UNI after swap"
        );
        assertGt(
            IERC20(MOCK_USDC).balanceOf(USER),
            0,
            "User should have USDC after swap"
        );

        // Log the output for debugging
        console2.log("UNI swapped:", amountIn);
        console2.log("USDC received:", IERC20(MOCK_USDC).balanceOf(USER));

        // With 1:2 price ratio, expect approximately 1000 USDC for 500 UNI (minus fees)
        assertGt(
            IERC20(MOCK_USDC).balanceOf(USER),
            900e18,
            "Should receive approximately 1000 USDC minus fees"
        );
    }

    function test__swapMockUSDCForMockUNIDirectExactInputSingle() public {
        uint128 amountIn = 1000e18;
        uint128 minAmountOut = 0;

        // Deal USDC to test contract
        deal(MOCK_USDC, address(this), amountIn);

        // Approve Permit2
        IERC20(MOCK_USDC).approve(activeConfig.permit2, amountIn);

        // Approve Universal Router through Permit2
        IPermit2(activeConfig.permit2).approve(
            MOCK_USDC,
            activeConfig.universalRouter,
            amountIn,
            uint48(block.timestamp) + 1
        );

        // Get pool key
        PoolKey memory key = getPoolKey(MOCK_USDC, MOCK_UNI, FEE_TIER);
        bool zeroToOne = MOCK_USDC < MOCK_UNI;

        // Prepare Universal Router execution
        bytes memory commands = abi.encodePacked(uint8(0x10)); // V4_SWAP
        bytes[] memory inputs = new bytes[](1);
        bytes[] memory params = new bytes[](3);

        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroToOne,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: bytes("")
            })
        );
        params[1] = abi.encode(key.currency0, amountIn);
        params[2] = abi.encode(key.currency1, minAmountOut);

        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        inputs[0] = abi.encode(actions, params);

        // Execute swap
        IUniversalRouter(activeConfig.universalRouter).execute(
            commands,
            inputs,
            block.timestamp
        );

        // Verify results
        assertGt(IERC20(MOCK_UNI).balanceOf(address(this)), minAmountOut);
        console2.log(
            "UNI received:",
            IERC20(MOCK_UNI).balanceOf(address(this))
        );
    }

    // Helper function to create PoolKey
    function getPoolKey(
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal pure returns (PoolKey memory) {
        // Sort tokens to ensure correct ordering
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        Currency currency0 = Currency.wrap(token0);
        Currency currency1 = Currency.wrap(token1);

        return
            PoolKey({
                currency0: currency0,
                currency1: currency1,
                fee: fee,
                tickSpacing: TICK_SPACING,
                hooks: IHooks(address(0))
            });
    }

    // Receive function to handle any ETH transfers
    receive() external payable {}
}
