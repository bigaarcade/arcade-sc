// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IBIGA.sol";
import "./utils/SafeCheck.sol";
import "./utils/VerifySignature.sol";

/*
    GB01: Address 0x00
    GB02: Not an ERC20 token address
    GB03: Invalid input
    GB03.1: Expired time must be greater than current time
    GB03.2: Withdrawal limit must be <= 10000 (100,00%)
    GB04: Invalid signature
    GB05: Signature already used
    GB06: Invalid signature length
    GB07: Token not whitelisted
    GB08: Withdrawal limit exceeded
    GB09: Transfer failed
*/
contract BIGA is IBIGA, Ownable2StepUpgradeable, ReentrancyGuardUpgradeable {
    using Address for address;
    using SafeCheck for address;
    using VerifySignature for bytes;
    using SafeERC20 for IERC20;

    uint256 public constant VERSION = 6;

    address public validator;
    mapping(bytes32 => bool) hashUsed;
    mapping(address => bool) public tokenWhitelist;

    // Withdrawal rate limit data
    uint256 public withdrawalLimit; // in % with 2 decimals
    uint256 public windowDuration; // in seconds

    mapping(address => uint256) public withdrawnTotal; // token address => amount
    uint256 public windowStartTime; // timestamp

    // Constructor & Initialize

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Set the owner of the contract at initialization.
     * @param _owner The address of the owner of contract. Should be multisig wallet address.
     * @param _validator The address of the backend validator.
     * @param _withdrawalLimit Withdrawal limit amount.
     * @param _windowDuration Window duration in seconds.
     */
    function initialize(
        address _owner,
        address _validator,
        uint256 _withdrawalLimit,
        uint256 _windowDuration
    ) public initializer {
        __Ownable2Step_init(_owner);
        _validator.checkEmptyAddress("GB01");
        require(_withdrawalLimit <= 10_000, "GB03.2");

        validator = _validator;
        withdrawalLimit = _withdrawalLimit;
        windowDuration = _windowDuration;
    }

    // Allow receive ETH directly
    receive() external payable {}

    /**
     * @dev Set the owner of the contract at initialization.
     * @param _owner The address of the owner.
     */
    function __Ownable2Step_init(address _owner) internal onlyInitializing {
        _transferOwnership(_owner);
    }

    // Owner functions

    /**
     * @dev Sets the validator address.
     * @param _validator The address of the validator.
     */
    function setValidator(address _validator) external onlyOwner {
        _validator.checkEmptyAddress("GB01");

        validator = _validator;

        emit ValidatorUpdated(_validator);
    }

    /**
     * @dev Sets the withdrawal limit.
     * @param _withdrawalLimit Withdrawal limit amount.
     */
    function setWithdrawalLimit(uint256 _withdrawalLimit) external onlyOwner {
        // Set withdraw limit = 0 => Disable withdraw entirely.
        // Set withdraw limit = 10000 (100%) => Allow withdraw all of available.
        require(_withdrawalLimit <= 10_000, "GB03.2");

        withdrawalLimit = _withdrawalLimit;

        emit WithdrawalLimitUpdated(_withdrawalLimit);
    }

    /**
     * @dev Sets the window duration.
     * @param _windowDuration Window duration in seconds.
     */
    function setWindowDuration(uint256 _windowDuration) external onlyOwner {
        // Set window duration = 0 => Ignore the window time check, and only check total amount only.
        windowDuration = _windowDuration;

        emit WindowDurationUpdated(_windowDuration);
    }

    /**
     * @dev Adds a token to the whitelist.
     * @param _tokens The list address of the ERC20 token to add to the whitelist.
     */
    function addToWhitelist(address[] calldata _tokens) external onlyOwner {
        for (uint i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0)) {
                _tokens[i].checkERC20("GB02");
            }
            tokenWhitelist[_tokens[i]] = true;
        }

        emit TokenAddedToWhitelist(_tokens);
    }

    /**
     * @dev Removes a token from the whitelist.
     * @param _tokens The list address of the ERC20 token to remove from the whitelist.
     */
    function removeFromWhitelist(address[] calldata _tokens) external onlyOwner {
        for (uint i = 0; i < _tokens.length; i++) {
            tokenWhitelist[_tokens[i]] = false;
        }

        emit TokenRemovedFromWhitelist(_tokens);
    }

    // User functions

    /**
     * @dev Deposits token for the calling user.
     * @param _tokenIn The address of the token used for deposit.
     * @param _amountIn The amount of token to deposit.
     * @param _tokenOut The address of the game arcade token to receive.
     * For networks other than ETH, address 0 represents arcade game tokens.
     */
    function deposit(address _tokenIn, address _tokenOut, uint _amountIn) external payable nonReentrant {
        require(tokenWhitelist[_tokenIn], "GB07");
        address user = msg.sender;

        require(_amountIn > 0, "GB03");
        if (_tokenOut != address(0)) {
            _tokenOut.checkERC20("GB02");
        }

        // Check + Deposit token from user
        if (_tokenIn == address(0)) {
            require(msg.value == _amountIn, "GB03");
        } else {
            _tokenIn.checkERC20("GB02");
            IERC20(_tokenIn).safeTransferFrom(user, address(this), _amountIn);
        }

        emit Deposited(user, _tokenIn, _tokenOut, _amountIn);
    }

    /**
     * @dev Withdraws token for the calling user.
     * @param _tokenIn The address of the game arcade token used for withdraw.
     * For networks other than ETH, address 0 represents arcade game tokens.
     * @param _tokenOut The address of the token receive.
     * @param _amountOut The amount of token to receive.
     * @param _nonce The unique nonce for each withdraw request.
     * @param _signature Signature signed by validator.
     */
    function withdraw(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _nonce,
        bytes calldata _signature
    ) external nonReentrant {
        require(tokenWhitelist[_tokenOut], "GB07");
        address user = msg.sender;

        require(_amountOut > 0, "GB03");
        if (_tokenIn != address(0)) {
            _tokenIn.checkERC20("GB02");
        }

        _validateWithdrawData(_signature, user, _tokenIn, _tokenOut, _amountOut, _nonce);

        // Validate withdraw limit + Update total withdrawal
        // Reset window start time if exceed window
        if (checkWindow()) {
            require(withdrawnTotal[_tokenOut] + _amountOut <= withdrawalLimitAmount(_tokenOut), "GB08");
            withdrawnTotal[_tokenOut] += _amountOut;
        } else {
            require(_amountOut <= withdrawalLimitAmount(_tokenOut), "GB08");
            withdrawnTotal[_tokenOut] = _amountOut;
            windowStartTime = block.timestamp;
        }

        // Withdraw token to user
        if (_tokenOut == address(0)) {
            (bool result, ) = payable(user).call{ value: _amountOut }("");
            require(result, "GB09");
        } else {
            _tokenOut.checkERC20("GB02");
            IERC20(_tokenOut).safeTransfer(user, _amountOut);
        }

        emit Withdrawn(user, _tokenIn, _tokenOut, _amountOut, _nonce, block.chainid);
    }

    /**
     * @dev Get the withdraw limit amount of a specific token in the current window.
     * @param _token Address of the token to be withdraw.
     */
    function withdrawalLimitAmount(address _token) public view returns (uint256) {
        return
            checkWindow()
                ? (withdrawalLimit * (_contractAssetBalance(_token) + withdrawnTotal[_token])) / 1e4
                : (withdrawalLimit * (_contractAssetBalance(_token))) / 1e4;
    }

    /**
     * @dev Check if the current window is still active. True = Current time <= Window start time + Window duration
     */
    function checkWindow() public view returns (bool) {
        return block.timestamp <= windowStartTime + windowDuration;
    }

    // Internal functions

    /**
     * @dev Validates the provided signature to confirm verification from provider against user request
     * for withdraw token
     * @param _signature Signature signed by validator.
     * @param _user The address of the user.
     * @param _tokenIn The address of the game arcade token used for withdraw.
     * @param _tokenOut The address of the token receive.
     * @param _amountOut The amount of token to receive.
     * @param _nonce The unique nonce for each withdraw request.
     */
    function _validateWithdrawData(
        bytes calldata _signature,
        address _user,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _nonce
    ) private {
        bytes memory data = abi.encodePacked(block.chainid, _user, _tokenIn, _tokenOut, _amountOut, _nonce);
        data.verifySignature(_signature, validator, "GB04");

        bytes32 dataHash = keccak256(data);
        require(!hashUsed[dataHash], "GB05");

        hashUsed[dataHash] = true;
    }

    function _contractAssetBalance(address _token) private view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }
}
