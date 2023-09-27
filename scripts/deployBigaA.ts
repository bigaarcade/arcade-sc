import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import path from 'path';
import { BIGA__factory } from '../types';
import BigAConfigs from './configs/config.json';
const configPath = path.resolve(__dirname, 'configs/config.json');

async function main() {
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log(`\nDeploying BIGA at chain ${network.name} (${network.chainId})`);
  console.log('Deployer:', deployer.address);

  const BigA = new BIGA__factory(deployer);
  if (BigAConfigs.BIGA) {
    const proxy = await upgrades.forceImport(BigAConfigs.BIGA, BigA);
    const biga = await upgrades.upgradeProxy(proxy, BigA, { redeployImplementation: 'always' });
    console.log('\nUpgrade BIGA tx', (biga.deployTransaction as any).hash);
  } else {
    const biga = await upgrades.deployProxy(BigA, [BigAConfigs.VALIDATOR]);
    BigAConfigs.BIGA = await biga.getAddress();
    console.log(`\nBIGA deployed to ${BigAConfigs.BIGA}`);
    fs.writeFileSync(configPath, JSON.stringify(BigAConfigs, null, 2));
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
