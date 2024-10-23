import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import path from 'path';
import { BIGAStaking__factory, MockBIGAStaking__factory } from '../typechain';

import { BigaStakingConfigs } from './configs';
import { NETWORK } from './constant/network';
const configPath = path.resolve(__dirname, 'configs/staking.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const chainName = NETWORK[Number(chainId)] ?? 'unknown';

  console.log(`\nDeploying BIGAStaking at ${chainName} (${chainId})`);
  console.log('Deployer:', deployer.address);

  const owner = BigaStakingConfigs.STAKING_OWNER;
  const staking_token = BigaStakingConfigs.STAKING_TOKEN;

  const BigaStaking = process.env.IS_MOCK
    ? new MockBIGAStaking__factory(deployer)
    : new BIGAStaking__factory(deployer);
  if (BigaStakingConfigs.BIGA_STAKING) {
    const proxy = await upgrades.forceImport(BigaStakingConfigs.BIGA_STAKING, BigaStaking);
    const bigaStaking = await upgrades.upgradeProxy(proxy, BigaStaking, { redeployImplementation: 'always' });
    await bigaStaking.waitForDeployment();
    console.log('\nUpgrade BIGAStaking tx', (bigaStaking.deployTransaction as any).hash);
  } else {
    const bigaStaking = await upgrades.deployProxy(BigaStaking, [owner, staking_token]);
    BigaStakingConfigs.BIGA_STAKING = await bigaStaking.getAddress();
    console.log(`\nBIGAStaking deployed to ${BigaStakingConfigs.BIGA_STAKING}`);
    fs.writeFileSync(configPath, JSON.stringify(BigaStakingConfigs, null, 2));
  }
}

main()
  .then(() => {
    console.log('\nDeployment completed successfully ✓');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\nDeployment failed ✗');
    console.error(error);
    process.exitCode = 1;
  });
