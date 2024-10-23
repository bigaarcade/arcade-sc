// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "../BIGAStaking.sol";

contract MockBIGAStaking is BIGAStaking {
    function getTermDeadline(uint256 startTime, uint8 term) public pure override returns (uint256) {
        return DateTimeLibrary.addMinutes(startTime, term);
    }
}
