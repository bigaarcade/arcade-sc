import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import crypto from 'crypto';
import { ContractTransactionResponse } from 'ethers';
import { ethers } from 'hardhat';
import { BIGA, MockToken } from '../typechain';
import { deploy, owner, user, validator } from './0_config_platform';
import { bigDecimal, usdcDecimal, wbtcDecimal } from './utils';
import { createWithdrawSignature } from './verify_signature';

describe('BIGA Deposit & Withdraw', () => {
  describe('Deposit', () => {
    it('Deposit WBTC fail - Not whitelisted', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(deploy);

      const tokenIn = await wbtc.getAddress();
      const tokenOut = await bigaToken.getAddress();
      const amountIn = wbtcDecimal(1);

      await expect(biga.connect(user).deposit(tokenIn, tokenOut, amountIn)).revertedWith('GB07');
    });

    it('Deposit USDC success ', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(deploy);

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
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(deploy);

      const tokenInInstance = bigaToken;
      const tokenIn = await tokenInInstance.getAddress();
      const tokenOut = await usdc.getAddress();
      const amountIn = bigDecimal(100);

      const balanceBefore = await tokenInInstance.balanceOf(user.address);

      await biga.connect(user).deposit(tokenIn, tokenOut, amountIn);

      const balanceAfter = await tokenInInstance.balanceOf(user.address);

      expect(balanceBefore - amountIn).eq(balanceAfter);
    });

    it('Deposit ETH success', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(deploy);

      const tokenIn = eth;
      const tokenOut = await usdc.getAddress();
      const amountIn = bigDecimal(1);

      const balanceBefore = await ethers.provider.getBalance(user.address);

      const tx = await biga.connect(user).deposit(tokenIn, tokenOut, amountIn, { value: amountIn });
      const gasFee = await getGasFee(tx);

      const balanceAfter = await ethers.provider.getBalance(user.address);

      expect(balanceBefore - amountIn - gasFee).eq(balanceAfter);
    });
  });

  describe('Withdraw', () => {
    it('Withdraw WBTC fail - Not whitelisted', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);

      const amountOut = usdcDecimal(10);

      await expect(withdraw(biga, bigaToken, wbtc, amountOut)).revertedWith('GB07');
    });

    it('Withdraw ETH once success', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut = bigDecimal(1);

      const balanceBefore = await ethers.provider.getBalance(user.address);

      const { tx } = await withdraw(biga, bigaToken, eth, amountOut);
      const gasFee = await getGasFee(tx);

      const balanceAfter = await ethers.provider.getBalance(user.address);

      expect(balanceBefore + amountOut - gasFee).eq(balanceAfter);
    });

    it('Withdraw USDC once success', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut = usdcDecimal(500);

      const balanceBefore = await usdc.balanceOf(user.address);

      await withdraw(biga, bigaToken, usdc, amountOut);

      const balanceAfter = await usdc.balanceOf(user.address);

      expect(balanceBefore + amountOut).eq(balanceAfter);
    });

    it('Withdraw USDC once fail - Over withdrawal limit', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut = usdcDecimal(500) + 1n;

      await expect(withdraw(biga, bigaToken, usdc, amountOut)).revertedWith('GB08');
    });

    it('Withdraw USDC twice success', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut1 = usdcDecimal(250);
      const amountOut2 = usdcDecimal(250);

      const balanceBefore = await usdc.balanceOf(user.address);

      await withdraw(biga, bigaToken, usdc, amountOut1);
      await withdraw(biga, bigaToken, usdc, amountOut2);

      const balanceAfter = await usdc.balanceOf(user.address);

      expect(balanceBefore + amountOut1 + amountOut2).eq(balanceAfter);
    });

    it('Withdraw USDC twice fail - Over withdrawal limit', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut1 = usdcDecimal(250);
      const amountOut2 = usdcDecimal(250) + 1n;

      await withdraw(biga, bigaToken, usdc, amountOut1);
      await expect(withdraw(biga, bigaToken, usdc, amountOut2)).revertedWith('GB08');
    });

    it('Withdraw USDC twice success - Withdraw reach limit after wait for window duration', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut1 = usdcDecimal(250);
      const amountOut2 = usdcDecimal(375); // (1000 - 250) / 2

      const balanceBefore = await usdc.balanceOf(user.address);

      await withdraw(biga, bigaToken, usdc, amountOut1);
      await time.increase(3600);
      await withdraw(biga, bigaToken, usdc, amountOut2);

      const balanceAfter = await usdc.balanceOf(user.address);

      expect(balanceBefore + amountOut1 + amountOut2).eq(balanceAfter);
    });

    it('Withdraw USDC twice success - Withdraw over limit after wait for window duration', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut1 = usdcDecimal(250);
      const amountOut2 = usdcDecimal(375) + 1n; // (1000 - 250) / 2 + 1 wei

      await withdraw(biga, bigaToken, usdc, amountOut1);
      await time.increase(3600);
      await expect(withdraw(biga, bigaToken, usdc, amountOut2)).revertedWith('GB08');
    });

    it('Withdraw USDC twice fail - Reuse signature', async () => {
      const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(updateWithdrawalConfig);
      const amountOut = usdcDecimal(250);

      const { nonce } = await withdraw(biga, bigaToken, usdc, amountOut);
      await expect(withdraw(biga, bigaToken, usdc, amountOut, nonce)).revertedWith('GB05');
    });
  });

  async function updateWithdrawalConfig() {
    const { biga, bigaToken, usdc, wbtc, eth } = await loadFixture(deploy);
    await biga.connect(owner).setWithdrawalLimit(5000);
    await biga.connect(owner).setWindowDuration(3600);
    return { biga, bigaToken, usdc, wbtc, eth };
  }

  const withdraw = async (
    biga: BIGA,
    tokenInInstance: MockToken,
    tokenOutInstance: MockToken | string,
    amountOut: bigint,
    nonce?: bigint,
  ) => {
    const tokenIn = await tokenInInstance.getAddress();
    const tokenOut =
      typeof tokenOutInstance == 'string' ? tokenOutInstance : await tokenOutInstance.getAddress();

    nonce = nonce ?? generateNonce();
    const data = { user, tokenIn, tokenOut, amountOut, nonce };
    const signature = await createWithdrawSignature(data, validator);

    return {
      tx: await biga.connect(user).withdraw(tokenIn, tokenOut, amountOut, nonce, signature),
      nonce,
    };
  };
});

function generateNonce() {
  return BigInt(parseInt(crypto.randomBytes(16).toString('hex'), 16));
}

async function getGasFee(tx: ContractTransactionResponse) {
  const { gasUsed, gasPrice } = await tx.wait();
  return gasUsed * gasPrice;
}
