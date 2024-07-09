import BigNumber from 'bignumber.js';
import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import path from 'path';
import { BIGA, BIGA__factory } from '../typechain';

import { BigaConfigs } from './configs';
import { NETWORK } from './constant/network';
const configPath = path.resolve(__dirname, 'configs/config.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const chainName = NETWORK[Number(chainId)] ?? 'unknown';

  console.log(`\nDeploying BIGA at ${chainName} (${chainId})`);
  console.log('Deployer:', deployer.address);

  const validator = BigaConfigs.VALIDATOR;
  const withdrawalLimit = new BigNumber(BigaConfigs.WITHDRAWAL_LIMIT).multipliedBy(1e18).toFixed();
  const windowDuration = BigaConfigs.WINDOW_DURATION;

  const Biga = new BIGA__factory(deployer);
  if (BigaConfigs.BIGA) {
    const proxy = await upgrades.forceImport(BigaConfigs.BIGA, Biga);
    const biga = await upgrades.upgradeProxy(proxy, Biga, { redeployImplementation: 'always' });
    await biga.waitForDeployment();
    const bigaInstance = biga as unknown as BIGA;
    console.log('\nUpgrade BIGA tx', (biga.deployTransaction as any).hash);

    const currentWithdrawalLimit = await bigaInstance.withdrawalLimit();
    if (BigInt(withdrawalLimit) != BigInt(currentWithdrawalLimit)) {
      const tx = await bigaInstance.setWithdrawalLimit(withdrawalLimit);
      await tx.wait();
      console.log('Set withdrawal limit tx', tx.hash);
    }

    const currentWindowDuration = await bigaInstance.windowDuration();
    if (BigInt(windowDuration) != BigInt(currentWindowDuration)) {
      const tx = await bigaInstance.setWindowDuration(windowDuration);
      await tx.wait();
      console.log('Set window duration tx', tx.hash);
    }
  } else {
    const biga = await upgrades.deployProxy(Biga, [validator, chainId, withdrawalLimit, windowDuration]);
    BigaConfigs.BIGA = await biga.getAddress();
    console.log(`\nBIGA deployed to ${BigaConfigs.BIGA}`);
    fs.writeFileSync(configPath, JSON.stringify(BigaConfigs, null, 2));
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
