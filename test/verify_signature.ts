import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { toBeArray } from 'ethers';
import { ethers, network } from 'hardhat';

export function createWithdrawSignature(data: WithdrawData, validator: HardhatEthersSigner) {
  const { user, tokenIn, tokenOut, amountOut, nonce } = data;
  const hash = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'address', 'address', 'uint256', 'uint256'],
    [network.config.chainId, user.address, tokenIn, tokenOut, amountOut, nonce],
  );
  return signMessage(hash, validator);
}

function signMessage(message: string, validator: HardhatEthersSigner) {
  const hashBytes = toBeArray(message);
  return validator.signMessage(hashBytes);
}

export class WithdrawData {
  user: HardhatEthersSigner;
  tokenIn: string;
  tokenOut: string;
  amountOut: BigInt;
  nonce: BigInt;

  constructor(input: WithdrawData) {
    this.user = input.user;
    this.tokenIn = input.tokenIn;
    this.tokenOut = input.tokenOut;
    this.amountOut = input.amountOut;
    this.nonce = input.nonce;
  }
}
