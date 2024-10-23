// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.21;

interface IBIGAStaking {
    struct StakeInfo {
        uint256 amount;
        uint8 term;
        uint256 startTime;
    }

    function stake(uint256 amount, uint8 term) external;

    function withdrawStake() external;

    event Staked(address indexed user, uint256 amount, uint8 term);
    event WithdrawnStake(address indexed user, uint256 amount);
}
