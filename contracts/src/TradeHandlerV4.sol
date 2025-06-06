// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import {UniversalRouter} from "@uniswap/universal-router/contracts/UniversalRouter.sol";
import {IUniversalRouter} from "@uniswap/universal-router/contracts/interfaces/IUniversalRouter.sol";
import {Commands} from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IPermit2} from "@uniswap/permit2/src/interfaces/IPermit2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CurrencyLibrary, Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";
import {PathKey} from "@uniswap/v4-periphery/src/libraries/PathKey.sol";
import {Commands} from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import {ITradeHandlerV4} from "./interfaces/ITradeHandlerV4.sol";

contract TradeHandlerV4 is ITradeHandlerV4 {
    IUniversalRouter public immutable router;
    IPoolManager public immutable poolManager;
    IPermit2 public immutable permit2;
    IV4Quoter public immutable quoter;

    constructor(
        address _router,
        address _poolManager,
        address _permit2,
        address _quoter
    ) {
        router = IUniversalRouter(_router);
        poolManager = IPoolManager(_poolManager);
        permit2 = IPermit2(_permit2);
        quoter = IV4Quoter(_quoter);
    }

    function approveTokenWithPermit2(
        address token,
        uint160 amount,
        uint48 expiration
    ) public {
        IERC20(token).approve(address(permit2), type(uint256).max);
        uint256 allowance1 = IERC20(token).allowance(
            address(this),
            address(permit2)
        );
        permit2.approve(token, address(router), amount, expiration);
        (uint256 allowance2, , ) = permit2.allowance(
            address(this),
            token,
            address(router)
        );
    }

    function executeV4TradeExactOutput(
        address _payer,
        PathKey[] calldata _path,
        uint128 _amountOut,
        address _tokenOut
    ) external payable {
        address inputToken = Currency.unwrap(_path[0].intermediateCurrency);

        (uint256 amountIn, ) = getExactOutputQuote(
            _path,
            _amountOut,
            Currency.wrap(_tokenOut)
        );

        _pullFundsFromUser(_payer, inputToken, amountIn);

        _swapExactOutput(_path, _amountOut, Currency.wrap(_tokenOut));

        _transferFundsToUser(_tokenOut, _payer, _amountOut);

        emit SwapExecuted(_payer, inputToken, amountIn, _tokenOut, _amountOut);
    }

    function conductTradeExactInputSingle(
        PoolKey calldata key,
        address payer,
        uint128 amountIn,
        uint128 minAmountOut,
        uint256 deadline,
        bool zeroForOne
    ) external payable returns (uint256 amountOut) {
        /// @dev Pull transfer funds from payer
        if (zeroForOne == true) {
            address token = Currency.unwrap(key.currency0);

            _pullFundsFromUser(payer, token, amountIn);
            if (token != address(0)) {
                approveTokenWithPermit2(token, amountIn, uint48(deadline));
            }
            amountOut = _swapExactInputSingle(
                key,
                amountIn,
                minAmountOut,
                zeroForOne
            );
            _transferFundsToUser(
                Currency.unwrap(key.currency1),
                payer,
                amountOut
            );
        } else {
            address token = Currency.unwrap(key.currency1);
            _pullFundsFromUser(payer, Currency.unwrap(key.currency1), amountIn);
            if (token != address(0)) {
                approveTokenWithPermit2(token, amountIn, uint48(deadline));
            }
            amountOut = _swapExactInputSingle(
                key,
                amountIn,
                minAmountOut,
                zeroForOne
            );
            _transferFundsToUser(
                Currency.unwrap(key.currency0),
                payer,
                amountOut
            );
        }
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

    function _pullFundsFromUser(
        address _user,
        address _token,
        uint256 _amount
    ) internal {
        if (_token != address(0)) {
            if (IERC20(_token).allowance(_user, address(this)) < _amount)
                revert InsufficientAllowance();
            bool success = IERC20(_token).transferFrom(
                _user,
                address(this),
                _amount
            );
            if (!success) revert ERC20TransferFailed();
        } else if (_token == address(0)) {
            if (msg.value < _amount) revert InsufficientETHSent();
        }
        emit FundsReceivedForSwap(_user, _token, _amount);
    }

    function _transferFundsToUser(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_token != address(0)) {
            IERC20(_token).approve(_to, _amount);
            IERC20(_token).transfer(_to, _amount);
        } else {
            (bool success, ) = payable(_to).call{value: _amount}("");
        }
        emit SwapOutputFundsTransfered(_to, _token, _amount);
    }

    function _prepareExactOutputSwapParams(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        uint128 amountIn,
        Currency currencyOut
    ) internal pure returns (bytes memory commands, bytes[] memory inputs) {
        // Encode the Universal Router command
        commands = abi.encodePacked(uint8(0x10)); /// @dev V4_SWAP command
        inputs = new bytes[](1);

        // Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_OUT),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        // Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactOutputParams({
                currencyOut: currencyOut,
                path: pathKey,
                amountOut: amountOut,
                amountInMaximum: amountIn
            })
        );

        params[1] = abi.encode(pathKey[0].intermediateCurrency, amountIn);

        params[2] = abi.encode(currencyOut, amountOut);

        inputs[0] = abi.encode(actions, params);
    }

    function _prepareExactInputSingleSwapParams(
        PoolKey calldata key,
        uint128 amountIn,
        uint128 minAmountOut,
        bool zeroForOne
    ) internal pure returns (bytes memory commands, bytes[] memory inputs) {
        // Encode the Universal Router command
        commands = abi.encodePacked(uint8(0x10)); /// @dev V4_SWAP command
        inputs = new bytes[](1);

        // Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        // Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: bytes("")
            })
        );

        // Set the correct currencies based on swap direction
        if (zeroForOne) {
            params[1] = abi.encode(key.currency0, amountIn);
            params[2] = abi.encode(key.currency1, minAmountOut);
        } else {
            params[1] = abi.encode(key.currency1, amountIn);
            params[2] = abi.encode(key.currency0, minAmountOut);
        }

        // Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);
    }

    function _swapExactOutput(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        Currency currencyOut
    ) internal {
        (uint256 amountIn, ) = getExactOutputQuote(
            pathKey,
            amountOut,
            currencyOut
        );
        (
            bytes memory commands,
            bytes[] memory inputs
        ) = _prepareExactOutputSwapParams(
                pathKey,
                amountOut,
                uint128(amountIn),
                currencyOut
            );

        if (Currency.unwrap(pathKey[0].intermediateCurrency) == address(0)) {
            router.execute{value: amountIn}(commands, inputs, block.timestamp);
        } else {
            approveTokenWithPermit2(
                Currency.unwrap(pathKey[0].intermediateCurrency),
                uint128(amountIn),
                uint48(block.timestamp) + 1
            );
            router.execute(commands, inputs, block.timestamp);
        }
    }

    function getExactOutputQuote(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        Currency currencyOut
    ) public returns (uint256 amountIn, uint256 gasEstimate) {
        IV4Quoter.QuoteExactParams memory quoteParams = IV4Quoter
            .QuoteExactParams({
                exactCurrency: currencyOut,
                path: pathKey,
                exactAmount: amountOut
            });

        (amountIn, gasEstimate) = quoter.quoteExactOutput(quoteParams);
    }

    function _swapExactInputSingle(
        PoolKey calldata key,
        uint128 amountIn,
        uint128 minAmountOut,
        bool zeroForOne
    ) internal returns (uint256 amountOut) {
        /// @dev Prepare the swap parameters
        (
            bytes memory commands,
            bytes[] memory inputs
        ) = _prepareExactInputSingleSwapParams(
                key,
                amountIn,
                minAmountOut,
                zeroForOne
            );

        /// @dev Execute the swap handling ETH cases
        if (
            (zeroForOne && (Currency.unwrap(key.currency0) == address(0))) ||
            (!zeroForOne && (Currency.unwrap(key.currency1) == address(0)))
        ) {
            router.execute{value: amountIn}(commands, inputs, block.timestamp);
        } else {
            router.execute(commands, inputs, block.timestamp);
        }
        if (zeroForOne) {
            amountOut = key.currency1.balanceOf(address(this));
        } else {
            amountOut = key.currency0.balanceOf(address(this));
        }

        /// @dev Validate the output amount
        if (amountOut < minAmountOut) revert InsufficientOutputAmount();
    }

    receive() external payable {}

    fallback() external payable {}
}
