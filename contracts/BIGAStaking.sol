// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IBIGAStaking.sol";
import "./utils/SafeCheck.sol";
import "./library/DateTimeLibrary.sol";

/*
    BS01: Address 0x00
    BS02: Not an ERC20 token address
    BS03: Invalid input
    BS03.1: Invalid staking term
    BS03.2: Already staked
    BS04: No active stake
    BS05: Staking term not ended
*/
contract BIGAStaking is IBIGAStaking, Ownable2StepUpgradeable, ReentrancyGuardUpgradeable {
    using Address for address;
    using SafeCheck for address;
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;

    mapping(address => StakeInfo) public stakes;

    // Constructor & Initialize

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract, setting the owner and staking token.
     * @dev The staking token must be verified as an ERC20 token.
     * @param _owner The address of the owner of contract. Should be multisig wallet address.
     * @param _stakingToken The address of the ERC20 staking token.
     */
    function initialize(address _owner, address _stakingToken) public initializer {
        __Ownable2Step_init(_owner);

        _stakingToken.checkERC20("BS02");
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @dev Internal function to set the contract owner.
     * @param _owner The address of the owner.
     */
    function __Ownable2Step_init(address _owner) internal onlyInitializing {
        _transferOwnership(_owner);
    }

    /**
     * @notice Modifier to check if the staker has inactive stake.
     * @dev Reverts if the staker has active stake.
     * @param staker The address of the staker.
     */
    modifier hasInactiveStake(address staker) {
        require(stakes[staker].amount == 0, "BS03.2");
        _;
    }

    /**
     * @notice Modifier to check if the staker has an active stake.
     * @dev Reverts if the staker has no active stake.
     * @param staker The address of the staker.
     */
    modifier hasActiveStake(address staker) {
        require(stakes[staker].amount > 0, "BS04");
        _;
    }

    /**
     * @notice Allows a user to stake a specified amount for a given term.
     * @dev The staking amount must be greater than zero, and the term must be 6, 12, or 24 months.
     * Reverts if the user already has an active stake.
     * @param amount The amount of tokens to stake.
     * @param term The duration of the stake in months (6, 12, or 24).
     */
    function stake(uint256 amount, uint8 term) external nonReentrant hasInactiveStake(msg.sender) {
        require(amount > 0, "BS03");
        require(term == 6 || term == 12 || term == 24, "BS03.1");

        stakes[msg.sender] = StakeInfo({ amount: amount, term: term, startTime: block.timestamp });
        stakingToken.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, term);
    }

    /**
     * @notice Withdraws the staked tokens after the staking term has ended.
     * @dev Reverts if the staking term has not ended or if there is no active stake.
     */
    function withdrawStake() external nonReentrant hasActiveStake(msg.sender) {
        StakeInfo memory stakeInfo = stakes[msg.sender];

        uint256 termDeadline = getTermDeadline(stakeInfo.startTime, stakeInfo.term);
        require(block.timestamp >= termDeadline, "BS05");

        delete stakes[msg.sender];
        stakingToken.transfer(msg.sender, stakeInfo.amount);

        emit WithdrawnStake(msg.sender, stakeInfo.amount);
    }

    /**
     * @notice Returns the deadline of the staking term in timestamp.
     * @dev The term must be 6, 12, or 24 months.
     * @param startTime The timestamp of staking start time .
     * @param term The staking term in months.
     * @return The staking deadlin in timestamp.
     */
    function getTermDeadline(uint256 startTime, uint8 term) public pure virtual returns (uint256) {
        return DateTimeLibrary.addMonths(startTime, term);
    }
}
