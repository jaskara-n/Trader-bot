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
import {PathKey} from "@uniswap/v4-periphery/src/libraries/PathKey.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract TradeHandlerV4ForkTest is Test {
    TradeHandlerV4 public tradeHandler;
    TradeHandlerV4 public implementation;

    HelperConfig helperConfig;
    HelperConfig.UniswapConfig activeConfig;
    string ETH_SEPOLIA_RPC_URL = vm.envString("ETH_SEPOLIA_RPC_URL");
    string ARBITRUM_SEPOLIA_RPC_URL = vm.envString("ARBITRUM_SEPOLIA_RPC_URL");
    string UNICHAIN_MAINNET_RPC_URL = vm.envString("UNICHAIN_MAINNET_RPC_URL");
    string BASE_SEPOLIA_RPC_URL = vm.envString("BASE_SEPOLIA_RPC_URL");
    uint256 fork;
    address USER = makeAddr("USER");

    function setUp() public {
        helperConfig = new HelperConfig();
        (activeConfig) = helperConfig.getUniChainMainnetConfig();
        // Create and select fork
        fork = vm.createSelectFork(UNICHAIN_MAINNET_RPC_URL);

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
        // assertEq(vm.activeFork(), fork);
    }

    function test__approveTokenWithPermit2() public {
        deal(activeConfig.usdc, USER, 1000e6);
        vm.prank(USER);
        tradeHandler.approveTokenWithPermit2(
            activeConfig.usdc,
            1000e6,
            uint48(block.timestamp) + 30 days
        );
        (uint256 allowance, , ) = IPermit2(activeConfig.permit2).allowance(
            address(tradeHandler),
            activeConfig.usdc,
            address(activeConfig.universalRouter)
        );
        assertGt(allowance, 999e6);
    }

    function test__conductTradeETHToUSDCExactInputSingle() public {
        uint128 amountIn = 1000e6;
        vm.deal(USER, amountIn);
        PoolKey memory key = getPoolKey(address(0), activeConfig.usdc, 3000);
        bool zeroToOne = true;
        vm.startPrank(USER);
        uint256 amountOut = tradeHandler.conductTradeExactInputSingle{
            value: amountIn
        }(key, USER, amountIn, 0, uint48(block.timestamp) + 1, zeroToOne);
        vm.stopPrank();
        assertGt(amountOut, 0);
        console2.log(IERC20(activeConfig.usdc).balanceOf(USER));
        assertGt(IERC20(activeConfig.usdc).balanceOf(USER), 0);
    }

    /**
     * @dev This test only for base sepolia hence commented, tests our custom deployed pool.
     */
    // function test__conductTradeUSDCToUNIMockExactInputSingle() public {
    //     address usdcMock = 0x10CEA50486207f88AbC954690fE80783E73c3BfE;
    //     address uniMock = 0x8b39C6b0FB43D18Bf2b82f9D6BfD966c173dA42A;

    //     uint128 amountIn = 1 ether;

    //     PoolKey memory key = getPoolKey(usdcMock, uniMock, 3000);
    //     bool zeroToOne = true;
    //     deal(usdcMock, USER, amountIn);

    //     vm.startPrank(USER);
    //     IERC20(usdcMock).approve(address(tradeHandler), amountIn);
    //     uint256 amountOut = tradeHandler.conductTradeExactInputSingle(
    //         key,
    //         USER,
    //         amountIn,
    //         0,
    //         uint48(block.timestamp) + 1,
    //         zeroToOne
    //     );
    //     vm.stopPrank();
    //     assertGt(amountOut, 0);
    //     console2.log(IERC20(usdcMock).balanceOf(USER));
    //     assertGt(IERC20(uniMock).balanceOf(USER), 0);
    // }

    function test__conductTradeUSDCToETHExactInputSingle() public {
        uint128 amountIn = 1000e6;
        deal(activeConfig.usdc, USER, amountIn);
        PoolKey memory key = getPoolKey(address(0), activeConfig.usdc, 3000);
        bool zeroToOne = false;
        vm.startPrank(USER);
        IERC20(activeConfig.usdc).approve(address(tradeHandler), amountIn);
        uint256 amountOut = tradeHandler.conductTradeExactInputSingle(
            key,
            USER,
            amountIn,
            0,
            uint48(block.timestamp) + 1,
            zeroToOne
        );
        vm.stopPrank();
        assertGt(amountOut, 0);
        assertGt(USER.balance, 0);
        console2.log(USER.balance);
    }

    function test__swapUSDCForETHDirectExactInputSingle() public {
        uint128 amountIn = 1000e6;
        uint128 minAmountOut = 0;

        deal(activeConfig.usdc, address(this), amountIn);

        IERC20(activeConfig.usdc).approve(activeConfig.permit2, amountIn);
        console2.log(
            IERC20(activeConfig.usdc).allowance(
                address(this),
                activeConfig.permit2
            )
        );
        IPermit2(activeConfig.permit2).approve(
            activeConfig.usdc,
            activeConfig.universalRouter,
            amountIn,
            uint48(block.timestamp) + 1
        );

        PoolKey memory key = getPoolKey(address(0), activeConfig.usdc, 3000);

        bytes memory commands = abi.encodePacked(uint8(0x10)); // V4_SWAP
        bytes[] memory inputs = new bytes[](1);
        bytes[] memory params = new bytes[](3);

        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: false,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: bytes("")
            })
        );
        params[1] = abi.encode(key.currency1, amountIn);
        params[2] = abi.encode(key.currency0, minAmountOut);
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        inputs[0] = abi.encode(actions, params);

        IUniversalRouter(activeConfig.universalRouter).execute(
            commands,
            inputs,
            block.timestamp
        );

        assertGt(address(this).balance, minAmountOut);
    }

    function test__threeWayDirectExactOutput() public {
        // USDC -> ETH -> UNI
        address usdc = activeConfig.usdc;
        address uni = activeConfig.uni;

        uint128 amountOut = 10e18;
        Currency currencyOut = Currency.wrap(uni);

        bytes memory commands = abi.encodePacked(uint8(0x10));

        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_OUT),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        PathKey[] memory path = new PathKey[](2);

        path[0] = PathKey({
            intermediateCurrency: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0)),
            hookData: ""
        });

        path[1] = PathKey({
            intermediateCurrency: Currency.wrap(address(0)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0)),
            hookData: ""
        });

        IV4Quoter.QuoteExactParams memory quoteParams = IV4Quoter
            .QuoteExactParams({
                exactCurrency: currencyOut,
                path: path,
                exactAmount: amountOut
            });

        (uint256 amountIn, ) = IV4Quoter(activeConfig.quoter).quoteExactOutput(
            quoteParams
        );

        bytes[] memory params = new bytes[](3);

        params[0] = abi.encode(
            IV4Router.ExactOutputParams({
                currencyOut: currencyOut,
                path: path,
                amountOut: amountOut,
                amountInMaximum: uint128(amountIn)
            })
        );

        params[1] = abi.encode(Currency.wrap(usdc), amountIn);
        params[2] = abi.encode(currencyOut, amountOut);

        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, params);

        uint256 deadline = block.timestamp + 20;

        deal(usdc, address(this), 100000e6);

        IERC20(usdc).approve(activeConfig.permit2, type(uint160).max);
        IPermit2(activeConfig.permit2).approve(
            usdc,
            activeConfig.universalRouter,
            type(uint160).max, // max USDC to spend
            uint48(block.timestamp) + 20
        );

        IUniversalRouter(activeConfig.universalRouter).execute(
            commands,
            inputs,
            deadline
        );

        uint256 finalUniBalance = IERC20(uni).balanceOf(address(this));
        assertEq(finalUniBalance, amountOut);
    }

    function test__executeV4TradeExactOutputUSDCToETH() public {
        PathKey[] memory path = new PathKey[](1);
        uint24 feeTier = 3000;
        path[0] = getPathKey(activeConfig.usdc, feeTier);
        deal(activeConfig.usdc, USER, 1000e18);
        vm.deal(USER, 1000e18);
        vm.startPrank(USER);
        IERC20(activeConfig.usdc).approve(address(tradeHandler), 1000e18);
        tradeHandler.executeV4TradeExactOutput(USER, path, 1000, address(0));
        vm.stopPrank();
        assertGt(USER.balance, 0);
    }

    function test__exactOutputQuoteUSDCToETHToUNI() public {
        PathKey[] memory path = new PathKey[](2);
        uint24 feeTier = 3000;

        path[0] = getPathKey(activeConfig.usdc, feeTier);
        path[1] = getPathKey(address(0), feeTier);
        (uint256 amountIn, ) = tradeHandler.getExactOutputQuote(
            path,
            10e18,
            Currency.wrap(activeConfig.uni)
        );
        assertGt(amountIn, 0);
    }

    function test__executeV4TradeExactOutputUSDCToETHToUNI() public {
        // USDC -> ETH -> UNI

        address uni = activeConfig.uni;
        PathKey[] memory path = new PathKey[](2);
        uint24 feeTier = 3000;
        uint128 amountOut = 10e18;

        path[0] = getPathKey(activeConfig.usdc, feeTier);
        path[1] = getPathKey(address(0), feeTier);
        (uint256 amountIn, ) = tradeHandler.getExactOutputQuote(
            path,
            amountOut,
            Currency.wrap(uni)
        );
        deal(activeConfig.usdc, USER, amountIn);

        vm.startPrank(USER);
        IERC20(activeConfig.usdc).approve(address(tradeHandler), amountIn);
        tradeHandler.executeV4TradeExactOutput(USER, path, amountOut, uni);
        vm.stopPrank();
        assertEq(IERC20(activeConfig.usdc).balanceOf(USER), 0);
        assertEq(IERC20(uni).balanceOf(address(USER)), amountOut);
    }

    function test__executeV4TradeExactOutputUSDCToETHToDAI() public {
        PathKey[] memory path = new PathKey[](2);
        uint24 feeTier = 3000;
        uint128 amountOut = 10e18;

        path[0] = getPathKey(activeConfig.usdc, feeTier);
        path[1] = getPathKey(address(0), feeTier);
        (uint256 amountIn, ) = tradeHandler.getExactOutputQuote(
            path,
            amountOut,
            Currency.wrap(activeConfig.dai)
        );
        deal(activeConfig.usdc, USER, amountIn);

        vm.startPrank(USER);
        IERC20(activeConfig.usdc).approve(address(tradeHandler), amountIn);
        tradeHandler.executeV4TradeExactOutput(
            USER,
            path,
            amountOut,
            activeConfig.dai
        );
        vm.stopPrank();
        assertEq(IERC20(activeConfig.usdc).balanceOf(USER), 0);
        assertEq(IERC20(activeConfig.dai).balanceOf(address(USER)), amountOut);
    }

    function getPoolKey(
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal pure returns (PoolKey memory) {
        Currency currencyA = Currency.wrap(tokenA);
        Currency currencyB = Currency.wrap(tokenB);

        return
            PoolKey({
                currency0: currencyA,
                currency1: currencyB,
                fee: fee,
                tickSpacing: 60,
                hooks: IHooks(address(0))
            });
    }

    function getPathKey(
        address intermediateCurrency,
        uint24 fee
    ) internal pure returns (PathKey memory pathKey) {
        pathKey = PathKey({
            intermediateCurrency: Currency.wrap(intermediateCurrency),
            fee: fee,
            tickSpacing: 60,
            hooks: IHooks(address(0)),
            hookData: ""
        });
    }

    receive() external payable {}
}
