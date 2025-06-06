// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface ITradeHandlerV4 {
    error InsufficientAllowance();
    error InsufficientETHSent();
    error ERC20TransferFailed();
    error InsufficientOutputAmount();

    event FundsReceivedForSwap(
        address indexed sender,
        address token,
        uint256 amount
    );

    event SwapOutputFundsTransfered(
        address indexed recipient,
        address token,
        uint256 amount
    );

    event SwapExecuted(
        address indexed sender,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    // function executeV4TradeExactOutput(
    //     address _payer,
    //     PathKey[] calldata _path,
    //     uint128 _amountOut,
    //     address _tokenOut
    // ) external payable;
}
