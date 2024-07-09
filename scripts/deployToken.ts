import { ethers } from 'hardhat';
import path from 'path';
import { MockToken__factory } from '../typechain';
import { TokenConfigs } from './configs';
import { NETWORK } from './constant/network';
const configPath = path.resolve(__dirname, 'configs/config.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const chainName = NETWORK[Number(chainId)] ?? 'unknown';

  console.log(`\nDeploying Test Token at chain ${chainName} (${chainId})`);
  console.log('Deployer:', deployer.address);

  const Token = new MockToken__factory(deployer);
  const token = await Token.deploy(TokenConfigs.NAME, TokenConfigs.SYMBOL, 18);
  await token.waitForDeployment();

  const amount = BigInt(TokenConfigs.SUPPLY);
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
