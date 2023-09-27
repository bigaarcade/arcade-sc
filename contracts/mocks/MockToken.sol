// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address _to, uint _amount) external {
        require(_amount > 0, "ERC20: required amount > 0");
        _mint(_to, _amount * 10 ** decimals());
    }
}
