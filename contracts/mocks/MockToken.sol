// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 immutable _decimals;

    constructor(string memory name, string memory symbol, uint8 decimal) ERC20(name, symbol) {
        _decimals = decimal;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address _to, uint256 _amount) external {
        require(_amount > 0, "ERC20: required amount > 0");
        _mint(_to, _amount);
    }
}
