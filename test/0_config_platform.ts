import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';
import { BIGA, MockToken__factory } from '../typechain';
import { ZERO_ADDRESS, bigDecimal, usdcDecimal, wbtcDecimal } from './utils';

export let [owner, user, validator, newValidator]: HardhatEthersSigner[] = [];

describe('BIGA config platform', () => {
  before(async () => {
    [owner, user, validator, newValidator] = await ethers.getSigners();
  });

  describe('Deploy', () => {
    it('Deploy fail - Validator is 0x0', async () => {
      const input = new PlatformConfig();
      input.validator = ZERO_ADDRESS;

      await expect(deployBIGA(input)).revertedWith('GB01');
    });

    it('Deploy fail - Withdrawal limit > 100%', async () => {
      const input = new PlatformConfig();
      input.withdrawalLimit = 10_001;

      await expect(deployBIGA(input)).revertedWith('GB03.2');
    });

    it('Deploy success', async () => {
      const { biga } = await loadFixture(deploy);
      const input = new PlatformConfig();

      const validator = await biga.validator();

      expect(validator).equal(input.validator);
    });
  });

  describe('Set platform config', () => {
    it('Set platform validator fail - Non owner call', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();

      await expect(setPlatformValidator(biga, input, user)).revertedWith('Ownable: caller is not the owner');
    });

    it('Set platform validator fail - Validator is 0x0', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();
      input.validator = ZERO_ADDRESS;

      await expect(setPlatformValidator(biga, input)).revertedWith('GB01');
    });

    it('Set platform withdrawal limit fail - Non owner call', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();

      await expect(setPlatformWithdrawalLimit(biga, input, user)).revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('Set platform withdrawal limit fail - Withdrawal limit > 100%', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();
      input.withdrawalLimit = 10_001;

      await expect(setPlatformWithdrawalLimit(biga, input)).revertedWith('GB03.2');
    });

    it('Set platform window duration fail - Non owner call', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();

      await expect(setPlatformWindwoDuration(biga, input, user)).revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('Set platform config success', async () => {
      const { biga } = await loadFixture(deploy);

      const input = new PlatformConfig();
      input.validator = user.address;

      await setPlatformValidator(biga, input);
      const validator = await biga.validator();

      expect(validator).equal(user.address);
    });
  });
});

async function deployBIGA(input: PlatformConfig) {
  const Biga = await ethers.getContractFactory('BIGA');
  const biga = (await upgrades.deployProxy(Biga, input.asParams())) as unknown as BIGA;
  return biga;
}

async function deployTokenBIGA(biga: BIGA) {
  const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
  const bigaToken = await Token.deploy('BIGA Token', 'BIGA', 18);
  await bigaToken.mint(user, bigDecimal(10_000));
  await bigaToken.mint(biga, bigDecimal(10_000));
  await bigaToken.connect(user).approve(biga, bigDecimal(10_000));
  return bigaToken;
}

async function deployUSDC(biga: BIGA) {
  const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
  const usdc = await Token.deploy('USD Coin', 'USDC', 6);
  await usdc.mint(user, usdcDecimal(1000));
  await usdc.mint(biga, usdcDecimal(1000));
  await usdc.connect(user).approve(biga, usdcDecimal(1000));
  return usdc;
}

async function deployWBTC(biga: BIGA) {
  const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
  const wbtc = await Token.deploy('Wrapped BTC', 'WBTC', 8);
  await wbtc.mint(user, wbtcDecimal(10));
  await wbtc.mint(biga, wbtcDecimal(10));
  await wbtc.connect(user).approve(biga, wbtcDecimal(10));
  return wbtc;
}

export async function deploy() {
  const biga = await deployBIGA(new PlatformConfig());
  const bigaToken = await deployTokenBIGA(biga);
  const usdc = await deployUSDC(biga);
  const wbtc = await deployWBTC(biga);
  await biga.addToWhitelist([usdc, bigaToken]);
  return { biga, bigaToken, usdc, wbtc };
}

async function setPlatformValidator(biga: BIGA, input: PlatformConfig, from?: HardhatEthersSigner) {
  if (!from) from = owner;
  const tx = await biga.connect(from).setValidator(input.validator);
  await tx.wait();
}

async function setPlatformWithdrawalLimit(biga: BIGA, input: PlatformConfig, from?: HardhatEthersSigner) {
  if (!from) from = owner;
  const tx = await biga.connect(from).setWithdrawalLimit(input.withdrawalLimit);
  await tx.wait();
}

async function setPlatformWindwoDuration(biga: BIGA, input: PlatformConfig, from?: HardhatEthersSigner) {
  if (!from) from = owner;
  const tx = await biga.connect(from).setWindowDuration(input.windowDuration);
  await tx.wait();
}

export class PlatformConfig {
  validator: string;
  chainId: number;
  withdrawalLimit: number;
  windowDuration: number;

  constructor() {
    this.validator = validator.address;
    this.chainId = network.config.chainId;
    this.withdrawalLimit = 10000;
    this.windowDuration = 0;
  }

  asParams() {
    return [this.validator, this.chainId, this.withdrawalLimit, this.windowDuration];
  }
}
