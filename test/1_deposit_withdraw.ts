import { expect } from 'chai';
import crypto from 'crypto';
import { biga, bigaToken, usdc, user, validator } from './0_config_platform';
import { bigDecimal } from './utils';
import { createWithdrawSignature } from './verify_signature';

describe('BIGA Deposit & Withdraw', () => {
  describe('Deposit', () => {
    it('Deposit success', async () => {
      const tokenIn = await bigaToken.getAddress();
      const tokenOut = await usdc.getAddress();
      const amountIn = bigDecimal(1000);

      const balanceBefore = await bigaToken.balanceOf(user.address);

      await biga.connect(user).deposit(tokenIn, tokenOut, amountIn);

      const balanceAfter = await bigaToken.balanceOf(user.address);

      expect(balanceBefore - amountIn).eq(balanceAfter);
    });
  });

  describe('Withdraw', () => {
    it('Withdraw success', async () => {
      const tokenOutInstance = bigaToken;
      const tokenIn = await usdc.getAddress();
      const tokenOut = await tokenOutInstance.getAddress();
      const amountOut = bigDecimal(1000);
      const nonce = generateNonce();
      const data = { user, tokenIn, tokenOut, amountOut, nonce };
      const signature = await createWithdrawSignature(data, validator);

      const balanceBefore = await tokenOutInstance.balanceOf(user.address);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature);

      const balanceAfter = await tokenOutInstance.balanceOf(user.address);

      expect(balanceBefore + amountOut).eq(balanceAfter);
    });
  });
});
function generateNonce() {
  return BigInt(parseInt(crypto.randomBytes(16).toString('hex'), 16));
}
