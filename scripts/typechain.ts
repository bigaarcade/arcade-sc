import { execSync } from 'child_process';

async function main() {
  const typechainCmd = 'typechain --target ethers-v6 --out-dir typechain';
  const contractPaths = [
    'artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json',
    'artifacts/contracts/BIGA.sol/BIGA.json',
    'artifacts/contracts/BIGAStaking.sol/BIGAStaking.json',
  ];
  if (process.argv[2] == 'mock') {
    contractPaths.push('artifacts/contracts/mocks/MockToken.sol/MockToken.json');
    contractPaths.push('artifacts/contracts/mocks/MockBIGAStaking.sol/MockBIGAStaking.json');
  }

  execSync(`${typechainCmd} ${contractPaths.join(' ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
