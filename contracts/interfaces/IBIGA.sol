// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

interface IBIGA {
    function validator() external returns (address);

    function setValidator(address _validator) external; // only owner

    function deposit(address _tokenIn, address _tokenOut, uint _amountIn) external payable;

    function withdraw(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _nonce,
        bytes calldata _signature
    ) external;

    event ValidatorUpdated(address _validator);
    event WithdrawalLimitUpdated(uint256 _withdrawalLimit);
    event WindowDurationUpdated(uint256 _windowDuration);
    event Deposited(address _user, address _tokenIn, address _tokenOut, uint256 _amountIn);
    event Withdrawn(
        address _user,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _nonce,
        uint256 _chainId
    );
    event TokenRemovedFromWhitelist(address[] _tokens);
    event TokenAddedToWhitelist(address[] _tokens);
}
