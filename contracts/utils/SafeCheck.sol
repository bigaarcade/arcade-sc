// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

///@title VerifySignature
///@dev Library for safe check procedure in contract.
library SafeCheck {
    using Address for address;

    function checkEmptyAddress(address addr, string memory errorMsg) internal pure {
        require(addr != address(0), errorMsg);
    }

    function checkERC20(address addr, string memory errorMsg) internal view {
        require(addr.isContract(), errorMsg);

        IERC20 token;
        address mock = address(0);
        addr.functionStaticCall(abi.encodeWithSelector(token.totalSupply.selector), errorMsg);
        addr.functionStaticCall(abi.encodeWithSelector(token.balanceOf.selector, mock), errorMsg);
        addr.functionStaticCall(abi.encodeWithSelector(token.allowance.selector, mock, mock), errorMsg);
    }
}
