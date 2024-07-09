import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import crypto from 'crypto';
import { deploy, user, validator } from './0_config_platform';
import { bigDecimal, usdcDecimal, wbtcDecimal } from './utils';
import { createWithdrawSignature } from './verify_signature';

describe('BIGA Deposit & Withdraw', () => {
  describe('Deposit', () => {
    it('Deposit WBTC fail', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(deploy);

      const tokenIn = await wbtc.getAddress();
      const tokenOut = await bigaToken.getAddress();
      const amountIn = wbtcDecimal(1);

      await expect(biga.connect(user).deposit(tokenIn, tokenOut, amountIn)).revertedWith('GB07');
    });

    it('Deposit USDC success ', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(deploy);

      const tokenInInstance = usdc;
      const tokenIn = await tokenInInstance.getAddress();
      const tokenOut = await bigaToken.getAddress();
      const amountIn = usdcDecimal(10);

      const balanceBefore = await tokenInInstance.balanceOf(user.address);

      await biga.connect(user).deposit(tokenIn, tokenOut, amountIn);

      const balanceAfter = await tokenInInstance.balanceOf(user.address);

      expect(balanceBefore - amountIn).eq(balanceAfter);
    });

    it('Deposit BIGA success', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(deploy);

      const tokenInInstance = bigaToken;
      const tokenIn = await tokenInInstance.getAddress();
      const tokenOut = await usdc.getAddress();
      const amountIn = bigDecimal(100);

      const balanceBefore = await tokenInInstance.balanceOf(user.address);

      await biga.connect(user).deposit(tokenIn, tokenOut, amountIn);

      const balanceAfter = await tokenInInstance.balanceOf(user.address);

      expect(balanceBefore - amountIn).eq(balanceAfter);
    });
  });

  describe('Withdraw', () => {
    it('Withdraw WBTC fail', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = wbtc;
      const tokenOut = await tokenOutInstance.getAddress();
      const amountOut = usdcDecimal(10);
      const nonce = generateNonce();
      const data = { user, tokenIn, tokenOut, amountOut, nonce };
      const signature = await createWithdrawSignature(data, validator);

      await expect(biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature)).revertedWith(
        'GB07',
      );
    });

    it('Withdraw USDC once success', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = usdc;
      const tokenOut = await tokenOutInstance.getAddress();
      const amountOut = usdcDecimal(500);
      const nonce = generateNonce();
      const data = { user, tokenIn, tokenOut, amountOut, nonce };
      const signature = await createWithdrawSignature(data, validator);

      const balanceBefore = await tokenOutInstance.balanceOf(user.address);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature);

      const balanceAfter = await tokenOutInstance.balanceOf(user.address);

      expect(balanceBefore + amountOut).eq(balanceAfter);
    });

    it('Withdraw USDC once fail - Over withdrawal limit', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = usdc;
      const tokenOut = await tokenOutInstance.getAddress();
      const amountOut = usdcDecimal(500) + 1n;
      const nonce = generateNonce();
      const data = { user, tokenIn, tokenOut, amountOut, nonce };
      const signature = await createWithdrawSignature(data, validator);

      await expect(biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature)).revertedWith(
        'GB08',
      );
    });

    it('Withdraw USDC multiple success', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = usdc;
      const tokenOut = await tokenOutInstance.getAddress();

      const amountOut1 = usdcDecimal(250);
      const nonce1 = generateNonce();
      const data1 = { user, tokenIn, tokenOut, amountOut: amountOut1, nonce: nonce1 };
      const signature1 = await createWithdrawSignature(data1, validator);

      const amountOut2 = usdcDecimal(250);
      const nonce2 = generateNonce();
      const data2 = { user, tokenIn, tokenOut, amountOut: amountOut2, nonce: nonce2 };
      const signature2 = await createWithdrawSignature(data2, validator);

      const balanceBefore = await tokenOutInstance.balanceOf(user.address);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut1, nonce1, signature1);
      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut2, nonce2, signature2);

      const balanceAfter = await tokenOutInstance.balanceOf(user.address);

      expect(balanceBefore + amountOut1 + amountOut2).eq(balanceAfter);
    });

    it('Withdraw USDC multiple fail - Over withdrawal limit', async () => {
      const { biga, tokenIn, tokenOut, amountOut2, nonce2, signature2 } = await withdrawOnce();

      await expect(
        biga.connect(user).withdraw(tokenIn, tokenOut, amountOut2, nonce2, signature2),
      ).revertedWith('GB08');
    });

    const withdrawOnce = async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = usdc;
      const tokenOut = await tokenOutInstance.getAddress();

      const amountOut1 = usdcDecimal(250);
      const nonce1 = generateNonce();
      const data1 = { user, tokenIn, tokenOut, amountOut: amountOut1, nonce: nonce1 };
      const signature1 = await createWithdrawSignature(data1, validator);

      const amountOut2 = usdcDecimal(250) + 1n;
      const nonce2 = generateNonce();
      const data2 = { user, tokenIn, tokenOut, amountOut: amountOut2, nonce: nonce2 };
      const signature2 = await createWithdrawSignature(data2, validator);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut1, nonce1, signature1);

      return { biga, tokenIn, tokenOutInstance, tokenOut, amountOut2, nonce2, signature2 };
    };

    it('Withdraw USDC again success - After wait for window duration', async () => {
      const { biga, tokenIn, tokenOutInstance, tokenOut, amountOut2, nonce2, signature2 } = await loadFixture(
        withdrawOnce,
      );

      await time.increase(3600);
      const balanceBefore = await tokenOutInstance.balanceOf(user.address);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut2, nonce2, signature2);

      const balanceAfter = await tokenOutInstance.balanceOf(user.address);
      expect(balanceBefore + amountOut2).eq(balanceAfter);
    });

    it('Withdraw USDC multiple fail - Reuse signature', async () => {
      const { biga, bigaToken, usdc, wbtc } = await loadFixture(updateWithdrawalConfig);

      const tokenIn = await bigaToken.getAddress();
      const tokenOutInstance = usdc;
      const tokenOut = await tokenOutInstance.getAddress();
      const amountOut = usdcDecimal(250);
      const nonce = generateNonce();
      const data = { user, tokenIn, tokenOut, amountOut, nonce };
      const signature = await createWithdrawSignature(data, validator);

      await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature);
      await expect(biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature)).revertedWith(
        'GB05',
      );
    });
  });

  async function updateWithdrawalConfig() {
    const { biga, bigaToken, usdc, wbtc } = await loadFixture(deploy);
    await biga.setWithdrawalLimit(5000);
    await biga.setWindowDuration(3600);
    return { biga, bigaToken, usdc, wbtc };
  }
});

function generateNonce() {
  return BigInt(parseInt(crypto.randomBytes(16).toString('hex'), 16));
}
