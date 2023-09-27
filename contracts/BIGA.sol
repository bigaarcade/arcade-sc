// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
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
    GB04: Invalid signature
    GB05: Signature already used
    GB06: Invalid signature length
*/
contract BIGA is IBIGA, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using Address for address;
    using SafeCheck for address;
    using VerifySignature for bytes;
    using SafeERC20 for IERC20;

    uint public constant VERSION = 3;

    address public validator;
    mapping(bytes32 => bool) hashUsed;

    // Constructor
    function initialize(address _validator) public initializer {
        __Ownable_init();

        _validator.checkEmptyAddress("GB01");

        validator = _validator;
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

    // User functions
    /**
     * @dev Deposits token for the calling user.
     * @param _tokenIn The address of the token used for deposit.
     * @param _amountIn The amount of token to deposit.
     * @param _tokenOut The address of the game arcade token to receive.
     */
    function deposit(address _tokenIn, address _tokenOut, uint _amountIn) external nonReentrant {
        address user = msg.sender;

        _tokenIn.checkERC20("GB02");
        _tokenOut.checkERC20("GB02");
        require(_amountIn > 0, "GB03");

        IERC20(_tokenIn).safeTransferFrom(user, address(this), _amountIn);

        emit Deposited(user, _tokenIn, _tokenOut, _amountIn);
    }

    /**
     * @dev Withdraws token for the calling user.
     * @param _tokenIn The address of the game arcade token used for withdraw.
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
        address user = msg.sender;

        _tokenIn.checkERC20("GB02");
        _tokenOut.checkERC20("GB02");
        require(_amountOut > 0, "GB03");

        _validateWithdrawData(_signature, user, _tokenIn, _tokenOut, _amountOut, _nonce);

        IERC20(_tokenOut).safeTransfer(user, _amountOut);

        emit Withdrawn(user, _tokenIn, _tokenOut, _amountOut, _nonce);
    }

    // Internal functions
    /**
     * @dev Validates the provided signature to confirm verification from provider against user request
     * for withdraw token
     */
    function _validateWithdrawData(
        bytes calldata _signature,
        address _user,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _nonce
    ) private {
        bytes memory data = abi.encodePacked(_user, _tokenIn, _tokenOut, _amountOut, _nonce);
        data.verifySignature(_signature, validator, "GB04");

        bytes32 dataHash = keccak256(data);
        require(!hashUsed[dataHash], "GB05");

        hashUsed[dataHash] = true;
    }
}
