import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BIGAStaking, MockToken, MockToken__factory } from '../typechain';
import { bigDecimal } from './utils';

let [deployer, owner, user]: HardhatEthersSigner[] = [];

describe('Staking', () => {
  before(async () => {
    [deployer, owner, user] = await ethers.getSigners();
  });

  describe('Deploy', () => {
    it('Deploy success', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const stakingToken = await bigaStaking.stakingToken();

      expect(stakingToken).equal(await bigaToken.getAddress());
    });
  });

  describe('Stake', () => {
    it('Stake 1 months', async () => {
      const { bigaStaking } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 1;

      await expect(bigaStaking.connect(user).stake(amount, term)).revertedWith('BS03.1');
    });

    it('Stake 6 months', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;

      await stakeTest(bigaStaking, bigaToken, amount, term);
    });

    it('Stake 12 months', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 24;

      await stakeTest(bigaStaking, bigaToken, amount, term);
    });

    it('Stake 24 months', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 24;

      await stakeTest(bigaStaking, bigaToken, amount, term);
    });

    async function stakeTest(bigaStaking: BIGAStaking, bigaToken: MockToken, amount: bigint, term: number) {
      const userBalanceBefore = await bigaToken.balanceOf(user);
      const contractbalanceBefore = await bigaToken.balanceOf(bigaStaking);

      await bigaStaking.connect(user).stake(amount, term);

      const userBalanceAfter = await bigaToken.balanceOf(user);
      const contractbalanceAfter = await bigaToken.balanceOf(bigaStaking);

      const stakeInfo = await bigaStaking.stakes(user);

      expect(stakeInfo.amount).eq(amount);
      expect(stakeInfo.term).eq(term);
      expect(userBalanceAfter - userBalanceBefore).eq(-amount);
      expect(contractbalanceAfter - contractbalanceBefore).eq(amount);
    }
  });

  describe('Withdraw', () => {
    it('Witdhraw after 1 month', async () => {
      const { bigaStaking } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;
      await bigaStaking.connect(user).stake(amount, term);

      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');
    });

    it('Witdhraw after 6 months term: 1/1 -> 1/7 - 2025', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;

      await time.increaseTo(Date.UTC(2025, 0, 1) / 1000); // 1/1/2025
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2025, 5, 30) / 1000); // 30/6/2025
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2025, 6, 1) / 1000); // 1/7/2025
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 6 months term - 31/3 -> 30/9 - 2025', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;

      await time.increaseTo(Date.UTC(2025, 2, 31) / 1000); // 31/3/2025
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2025, 8, 29) / 1000); // 29/9/2025
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2025, 8, 30) / 1000); // 30/9/2025
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 6 months term - 30/3 -> 30/9 - 2025', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;

      await time.increaseTo(Date.UTC(2025, 2, 30) / 1000); // 30/3/2025
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2025, 8, 29) / 1000); // 29/9/2025
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2025, 8, 30) / 1000); // 1/10/2025
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 6 months term - 1/4 -> 1/10 - 2025', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 6;

      await time.increaseTo(Date.UTC(2025, 3, 1) / 1000); // 31/3/2025
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2025, 8, 30) / 1000); // 30/9/2025
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2025, 9, 1) / 1000); // 1/10/2025
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 12 months term - 1/1/2025 -> 1/1/2026', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 12;

      await time.increaseTo(Date.UTC(2025, 0, 1) / 1000); // 1/1/2025
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2025, 11, 31) / 1000); // 31/12/2025
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2026, 0, 1) / 1000); // 1/1/2026
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 12 months term - 29/2/2028 -> 28/2/2029', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 12;

      await time.increaseTo(Date.UTC(2028, 1, 29) / 1000); // 29/2/2028
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2029, 1, 27) / 1000); // 27/2/2029
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2029, 1, 28) / 1000); // 28/2/2029
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 12 months term - 28/2/2028 -> 28/2/2029', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 12;

      await time.increaseTo(Date.UTC(2028, 1, 28) / 1000); // 28/2/2028
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2029, 1, 27) / 1000); // 27/2/2029
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2029, 1, 28) / 1000); // 28/2/2029
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    it('Witdhraw after 12 months term - 1/3/2028 -> 1/3/2029', async () => {
      const { bigaStaking, bigaToken } = await loadFixture(deploy);

      const amount = bigDecimal(1000);
      const term = 12;

      await time.increaseTo(Date.UTC(2028, 2, 1) / 1000); // 1/3/2028
      await bigaStaking.connect(user).stake(amount, term);

      await time.increaseTo(Date.UTC(2029, 1, 28) / 1000); // 28/2/2029
      await expect(bigaStaking.connect(user).withdrawStake()).revertedWith('BS05');

      await time.increaseTo(Date.UTC(2029, 2, 1) / 1000); // 1/3/2029
      await withdrawTest(bigaStaking, bigaToken, amount);
    });

    async function withdrawTest(bigaStaking: BIGAStaking, bigaToken: MockToken, amount: bigint) {
      const userBalanceBefore = await bigaToken.balanceOf(user);
      const contractbalanceBefore = await bigaToken.balanceOf(bigaStaking);

      await bigaStaking.connect(user).withdrawStake();

      const userBalanceAfter = await bigaToken.balanceOf(user);
      const contractbalanceAfter = await bigaToken.balanceOf(bigaStaking);

      const stakeInfo = await bigaStaking.stakes(user);

      expect(stakeInfo.amount).eq(0);
      expect(stakeInfo.term).eq(0);
      expect(userBalanceAfter - userBalanceBefore).eq(amount);
      expect(contractbalanceAfter - contractbalanceBefore).eq(-amount);
    }
  });

  async function deploy() {
    const bigaToken = await deployTokenBIGA();
    const bigaStaking = await deployBIGAStaking(owner.address, await bigaToken.getAddress());
    await bigaToken.connect(user).approve(bigaStaking, bigDecimal(10_000));
    return { bigaStaking, bigaToken };
  }

  async function deployBIGAStaking(owner: string, token: string) {
    const BigaStaking = await ethers.getContractFactory('BIGAStaking');
    const bigaStaking = (await upgrades.deployProxy(BigaStaking, [owner, token])) as unknown as BIGAStaking;
    return bigaStaking;
  }

  async function deployTokenBIGA() {
    const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
    const bigaToken = await Token.deploy('BIGA Token', 'BIGA', 18);
    await bigaToken.mint(user, bigDecimal(10_000));
    return bigaToken;
  }
});
