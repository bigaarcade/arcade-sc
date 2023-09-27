// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

///@title VerifySignature
///@dev Library for verifying signatures in Ethereum signed messages.
library VerifySignature {
    using ECDSA for bytes32;

    function verifySignature(
        bytes memory data,
        bytes memory signature,
        address validator,
        string memory errorMsg
    ) internal pure {
        address signer = keccak256(data).toEthSignedMessageHash().recover(signature);
        require(signer == validator, errorMsg);
    }
}
