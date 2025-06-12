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
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title TradeHandlerV4
 * @author [Your Organization Name]
 * @notice Advanced trade execution handler for Uniswap V4 protocol with integrated Permit2 support
 * @dev This contract facilitates secure token swaps through Uniswap V4 pools with enhanced safety features
 * including pull payment patterns, slippage protection, and comprehensive event logging.
 * Designed for mainnet deployment with gas optimization and security best practices.
 */
contract TradeHandlerV4 is ITradeHandlerV4, Initializable {
    /**
     * @notice Uniswap Universal Router instance for executing multi-protocol swaps
     * @dev Immutable to ensure router cannot be changed post-deployment
     */
    IUniversalRouter public router;

    /**
     * @notice Uniswap V4 Pool Manager for pool interactions
     * @dev Core V4 component managing all pool state and operations
     */
    IPoolManager public poolManager;

    /**
     * @notice Permit2 contract for gasless token approvals
     * @dev Enables signature-based approvals reducing transaction count
     */
    IPermit2 public permit2;

    /**
     * @notice V4 Quoter for accurate swap quotes and gas estimations
     * @dev Essential for calculating optimal swap amounts and paths
     */
    IV4Quoter public quoter;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;

    /**
     * @notice Initializes the TradeHandlerV4 contract with required protocol addresses
     * @dev All parameters are immutable post-deployment ensuring protocol integrity
     * @param _router Address of the Uniswap Universal Router contract
     * @param _poolManager Address of the Uniswap V4 Pool Manager contract
     * @param _permit2 Address of the Permit2 contract for gasless approvals
     * @param _quoter Address of the V4 Quoter contract for price quotes
     */
    function initialize(
        address _router,
        address _poolManager,
        address _permit2,
        address _quoter
    ) external initializer {
        router = IUniversalRouter(_router);
        poolManager = IPoolManager(_poolManager);
        permit2 = IPermit2(_permit2);
        quoter = IV4Quoter(_quoter);
    }

    /**
     * @notice Approves token spending through Permit2 system
     * @dev First approves Permit2 to spend tokens, then approves router through Permit2
     * @param token The ERC20 token address to approve
     * @param amount The amount to approve (as uint160 for Permit2 compatibility)
     * @param expiration The timestamp when the approval expires
     */
    function approveTokenWithPermit2(
        address token,
        uint160 amount,
        uint48 expiration
    ) public {
        /// @dev Grant Permit2 contract maximum allowance for efficiency
        IERC20(token).approve(address(permit2), type(uint256).max);
        /// @dev Verify the approval was successful
        uint256 allowance1 = IERC20(token).allowance(
            address(this),
            address(permit2)
        );
        /// @dev Approve router to spend tokens through Permit2
        permit2.approve(token, address(router), amount, expiration);
        /// @dev Verify Permit2 approval state
        (uint256 allowance2, , ) = permit2.allowance(
            address(this),
            token,
            address(router)
        );
    }

    /**
     * @notice Executes an exact output swap across multiple V4 pools
     * @dev Pulls exact input amount calculated from quote, ensures exact output delivery
     * @param _payer Address paying for the swap input tokens
     * @param _path Array of PathKey structs defining the swap route
     * @param _amountOut Exact amount of output tokens to receive
     * @param _tokenOut Address of the output token
     */
    function executeV4TradeExactOutput(
        address _payer,
        PathKey[] calldata _path,
        uint128 _amountOut,
        address _tokenOut
    ) external payable {
        /// @dev Extract input token from first path segment
        address inputToken = Currency.unwrap(_path[0].intermediateCurrency);

        /// @dev Calculate required input amount using quoter
        (uint256 amountIn, ) = getExactOutputQuote(
            _path,
            _amountOut,
            Currency.wrap(_tokenOut)
        );

        /// @dev Transfer input tokens from user to contract
        _pullFundsFromUser(_payer, inputToken, amountIn);

        /// @dev Execute the exact output swap through Universal Router
        _swapExactOutput(_path, _amountOut, Currency.wrap(_tokenOut));

        /// @dev Transfer output tokens to user
        _transferFundsToUser(_tokenOut, _payer, _amountOut);

        /// @dev Emit comprehensive swap event for tracking
        emit SwapExecuted(_payer, inputToken, amountIn, _tokenOut, _amountOut);
    }

    /**
     * @notice Executes a single-hop exact input swap with slippage protection
     * @dev Handles both token0->token1 and token1->token0 swaps with proper fund management
     * @param key Pool key containing currency pair and fee configuration
     * @param payer Address providing the input tokens
     * @param amountIn Exact amount of input tokens to swap
     * @param minAmountOut Minimum acceptable output amount (slippage protection)
     * @param deadline Transaction deadline timestamp
     * @param zeroForOne Direction flag: true for token0->token1, false for token1->token0
     * @return amountOut Actual amount of output tokens received
     */
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
            /// @dev Handle token0 -> token1 swap
            address token = Currency.unwrap(key.currency0);

            /// @dev Pull input tokens from user
            _pullFundsFromUser(payer, token, amountIn);
            /// @dev Approve tokens through Permit2 if not ETH
            if (token != address(0)) {
                approveTokenWithPermit2(token, amountIn, uint48(deadline));
            }
            /// @dev Execute swap and get output amount
            amountOut = _swapExactInputSingle(
                key,
                amountIn,
                minAmountOut,
                zeroForOne
            );
            /// @dev Transfer output tokens to user
            _transferFundsToUser(
                Currency.unwrap(key.currency1),
                payer,
                amountOut
            );
        } else {
            /// @dev Handle token1 -> token0 swap
            address token = Currency.unwrap(key.currency1);
            /// @dev Pull input tokens from user
            _pullFundsFromUser(payer, Currency.unwrap(key.currency1), amountIn);
            /// @dev Approve tokens through Permit2 if not ETH
            if (token != address(0)) {
                approveTokenWithPermit2(token, amountIn, uint48(deadline));
            }
            /// @dev Execute swap and get output amount
            amountOut = _swapExactInputSingle(
                key,
                amountIn,
                minAmountOut,
                zeroForOne
            );
            /// @dev Transfer output tokens to user
            _transferFundsToUser(
                Currency.unwrap(key.currency0),
                payer,
                amountOut
            );
        }
    }

    /**
     * @notice Constructs a PoolKey for V4 pool identification
     * @dev Creates standardized pool key with default tick spacing and no hooks
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param fee Pool fee tier in basis points
     * @return PoolKey struct with sorted currencies and pool parameters
     */
    function getPoolKey(
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal pure returns (PoolKey memory) {
        /// @dev Wrap addresses into Currency type
        Currency currencyA = Currency.wrap(tokenA);
        Currency currencyB = Currency.wrap(tokenB);

        /// @dev Return constructed pool key with standard parameters
        return
            PoolKey({
                currency0: currencyA,
                currency1: currencyB,
                fee: fee,
                tickSpacing: 60,
                hooks: IHooks(address(0))
            });
    }

    /**
     * @notice Safely pulls tokens or ETH from user to contract
     * @dev Implements pull payment pattern with comprehensive validation
     * @param _user Address to pull funds from
     * @param _token Token address (address(0) for ETH)
     * @param _amount Amount to pull
     */
    function _pullFundsFromUser(
        address _user,
        address _token,
        uint256 _amount
    ) internal {
        if (_token != address(0)) {
            /// @dev Handle ERC20 token transfer
            if (IERC20(_token).allowance(_user, address(this)) < _amount)
                revert InsufficientAllowance();
            /// @dev Execute transferFrom with success check
            bool success = IERC20(_token).transferFrom(
                _user,
                address(this),
                _amount
            );
            if (!success) revert ERC20TransferFailed();
        } else if (_token == address(0)) {
            /// @dev Handle ETH transfer validation
            if (msg.value < _amount) revert InsufficientETHSent();
        }
        /// @dev Emit event for fund receipt tracking
        emit FundsReceivedForSwap(_user, _token, _amount);
    }

    /**
     * @notice Safely transfers tokens or ETH from contract to user
     * @dev Implements push payment pattern with proper approval handling
     * @param _token Token address (address(0) for ETH)
     * @param _to Recipient address
     * @param _amount Amount to transfer
     */
    function _transferFundsToUser(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_token != address(0)) {
            /// @dev Handle ERC20 token transfer with approval
            IERC20(_token).approve(_to, _amount);
            IERC20(_token).transfer(_to, _amount);
        } else {
            /// @dev Handle ETH transfer with call
            (bool success, ) = payable(_to).call{value: _amount}("");
        }
        /// @dev Emit event for output tracking
        emit SwapOutputFundsTransfered(_to, _token, _amount);
    }

    /**
     * @notice Prepares Universal Router commands for exact output swaps
     * @dev Encodes V4_SWAP command with SWAP_EXACT_OUT, SETTLE_ALL, and TAKE_ALL actions
     * @param pathKey Array of path segments for multi-hop swap
     * @param amountOut Exact output amount desired
     * @param amountIn Maximum input amount willing to pay
     * @param currencyOut Output currency
     * @return commands Encoded command bytes for Universal Router
     * @return inputs Array of encoded parameters for each command
     */
    function _prepareExactOutputSwapParams(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        uint128 amountIn,
        Currency currencyOut
    ) internal pure returns (bytes memory commands, bytes[] memory inputs) {
        /// @dev Encode the Universal Router command
        commands = abi.encodePacked(uint8(0x10)); /// @dev V4_SWAP command
        inputs = new bytes[](1);

        /// @dev Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_OUT),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        /// @dev Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        /// @dev Encode exact output swap parameters
        params[0] = abi.encode(
            IV4Router.ExactOutputParams({
                currencyOut: currencyOut,
                path: pathKey,
                amountOut: amountOut,
                amountInMaximum: amountIn
            })
        );

        /// @dev Encode settlement parameters
        params[1] = abi.encode(pathKey[0].intermediateCurrency, amountIn);

        /// @dev Encode take parameters
        params[2] = abi.encode(currencyOut, amountOut);

        /// @dev Combine actions and parameters
        inputs[0] = abi.encode(actions, params);
    }

    /**
     * @notice Prepares Universal Router commands for exact input single swaps
     * @dev Encodes V4_SWAP command with SWAP_EXACT_IN_SINGLE, SETTLE_ALL, and TAKE_ALL actions
     * @param key Pool key identifying the liquidity pool
     * @param amountIn Exact input amount to swap
     * @param minAmountOut Minimum output amount (slippage protection)
     * @param zeroForOne Swap direction flag
     * @return commands Encoded command bytes for Universal Router
     * @return inputs Array of encoded parameters for each command
     */
    function _prepareExactInputSingleSwapParams(
        PoolKey calldata key,
        uint128 amountIn,
        uint128 minAmountOut,
        bool zeroForOne
    ) internal pure returns (bytes memory commands, bytes[] memory inputs) {
        /// @dev Encode the Universal Router command
        commands = abi.encodePacked(uint8(0x10)); /// @dev V4_SWAP command
        inputs = new bytes[](1);

        /// @dev Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        /// @dev Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        /// @dev Encode exact input swap parameters
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: bytes("")
            })
        );

        /// @dev Set the correct currencies based on swap direction
        if (zeroForOne) {
            /// @dev Token0 -> Token1 swap parameters
            params[1] = abi.encode(key.currency0, amountIn);
            params[2] = abi.encode(key.currency1, minAmountOut);
        } else {
            /// @dev Token1 -> Token0 swap parameters
            params[1] = abi.encode(key.currency1, amountIn);
            params[2] = abi.encode(key.currency0, minAmountOut);
        }

        /// @dev Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);
    }

    /**
     * @notice Executes exact output swap through Universal Router
     * @dev Handles both ETH and token inputs with proper approvals
     * @param pathKey Multi-hop path for the swap
     * @param amountOut Exact output amount to receive
     * @param currencyOut Output currency
     */
    function _swapExactOutput(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        Currency currencyOut
    ) internal {
        /// @dev Get quote for required input amount
        (uint256 amountIn, ) = getExactOutputQuote(
            pathKey,
            amountOut,
            currencyOut
        );
        /// @dev Prepare swap execution parameters
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
            /// @dev Execute swap with ETH value
            router.execute{value: amountIn}(commands, inputs, block.timestamp);
        } else {
            /// @dev Approve tokens and execute swap
            approveTokenWithPermit2(
                Currency.unwrap(pathKey[0].intermediateCurrency),
                uint128(amountIn),
                uint48(block.timestamp) + 1
            );
            router.execute(commands, inputs, block.timestamp);
        }
    }

    /**
     * @notice Gets quote for exact output swap including gas estimation
     * @dev Interfaces with V4 Quoter for accurate pricing
     * @param pathKey Array of path segments defining swap route
     * @param amountOut Desired output amount
     * @param currencyOut Output currency
     * @return amountIn Required input amount for exact output
     * @return gasEstimate Estimated gas cost for the swap
     */
    function getExactOutputQuote(
        PathKey[] calldata pathKey,
        uint128 amountOut,
        Currency currencyOut
    ) public returns (uint256 amountIn, uint256 gasEstimate) {
        /// @dev Construct quote parameters
        IV4Quoter.QuoteExactParams memory quoteParams = IV4Quoter
            .QuoteExactParams({
                exactCurrency: currencyOut,
                path: pathKey,
                exactAmount: amountOut
            });

        /// @dev Get quote from V4 Quoter
        (amountIn, gasEstimate) = quoter.quoteExactOutput(quoteParams);
    }

    /**
     * @notice Executes exact input single-hop swap with output validation
     * @dev Core swap execution function with ETH handling and slippage protection
     * @param key Pool key for the swap
     * @param amountIn Input amount to swap
     * @param minAmountOut Minimum acceptable output
     * @param zeroForOne Swap direction flag
     * @return amountOut Actual output amount received
     */
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
            /// @dev Execute with ETH value
            router.execute{value: amountIn}(commands, inputs, block.timestamp);
        } else {
            /// @dev Execute token swap
            router.execute(commands, inputs, block.timestamp);
        }
        /// @dev Measure output based on direction
        if (zeroForOne) {
            amountOut = key.currency1.balanceOf(address(this));
        } else {
            amountOut = key.currency0.balanceOf(address(this));
        }

        /// @dev Validate the output amount
        if (amountOut < minAmountOut) revert InsufficientOutputAmount();
    }

    /**
     * @notice Fallback function to receive ETH
     * @dev Required for ETH swaps and refunds
     */
    receive() external payable {}

    /**
     * @notice Fallback function for unmatched calls
     * @dev Accepts ETH to prevent transaction failures
     */
    fallback() external payable {}
}
