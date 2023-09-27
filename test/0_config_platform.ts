import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BIGA, MockToken, MockToken__factory } from '../types';
import { ZERO_ADDRESS } from './utils';

export let biga: BIGA, bigaToken: MockToken, usdc: MockToken;
export let [owner, user, validator, newValidator]: HardhatEthersSigner[] = [];

export const indexSession = 0;

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

    it('Deploy success', async () => {
      const input = new PlatformConfig();

      await deployBIGA(input);
      const validator = await biga.validator();

      expect(validator).equal(input.validator);
    });

    after(async () => {
      await deployUSDC();
      await deployTokenBIGA();
    });
  });

  describe('Set platform config', () => {
    it('Set platform config fail - Non owner call', async () => {
      const input = new PlatformConfig();

      await expect(setPlatformConfig(input, user)).revertedWith('Ownable: caller is not the owner');
    });

    it('Set platform config fail - Validator is 0x0', async () => {
      const input = new PlatformConfig();
      input.validator = ZERO_ADDRESS;

      await expect(setPlatformConfig(input)).revertedWith('GB01');
    });

    it('Set platform config success', async () => {
      const input = new PlatformConfig();
      const _validator = (input.validator = user.address);

      await setPlatformConfig(input);
      const validator = await biga.validator();

      expect(validator).equal(_validator);
    });

    after(async () => {
      const input = new PlatformConfig();
      await setPlatformConfig(input);
    });
  });
});

async function deployTokenBIGA() {
  const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
  bigaToken = await Token.deploy('BIGA Token', 'BIGA');
  await bigaToken.mint(user.address, 1000000);
  await bigaToken.mint(biga.getAddress(), 1000000);
  await bigaToken.connect(user).approve(biga.getAddress(), '10000000000000000000000000000');
}

async function deployUSDC() {
  const Token = (await ethers.getContractFactory('MockToken')) as unknown as MockToken__factory;
  usdc = await Token.deploy('USD Coin', 'USDC');
  await usdc.mint(user.address, 1000000);
  await usdc.mint(biga.getAddress(), 1000000);
  await usdc.connect(user).approve(biga.getAddress(), '10000000000000000000000000000');
}

async function deployBIGA(input: PlatformConfig) {
  const Biga = await ethers.getContractFactory('BIGA');
  biga = (await upgrades.deployProxy(Biga, [input.validator])) as unknown as BIGA;
}

async function setPlatformConfig(input: PlatformConfig, from?: HardhatEthersSigner) {
  if (!from) from = owner;
  const tx = await biga.connect(from).setValidator(input.validator);
  await tx.wait();
}

export class PlatformConfig {
  validator: string;

  constructor() {
    this.validator = validator.address;
  }
}
