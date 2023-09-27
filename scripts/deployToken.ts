import { ethers } from 'hardhat';
import path from 'path';
import { MockToken__factory } from '../types';
import { TokenConfigs } from './configs';
const configPath = path.resolve(__dirname, 'configs/config.json');

async function main() {
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log(`\nDeploying Test Token at chain ${network.name} (${network.chainId})`);
  console.log('Deployer:', deployer.address);

  const Token = new MockToken__factory(deployer);
  const token = await Token.deploy(TokenConfigs.NAME, TokenConfigs.SYMBOL);
  await token.waitForDeployment();

  const amount = BigInt(TokenConfigs.SUPPLY) * 10n ** 18n;
  await token.mint(deployer.address, amount);

  console.log('\nTest Token deployed to', await token.getAddress());
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
