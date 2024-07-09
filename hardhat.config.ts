import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';
dotenv.config();

const config: HardhatUserConfig = {
  contractSizer: {
    runOnCompile: true,
    only: ['BIGA'],
  },
  networks: {
    default: {
      url: process.env.RPC_URL ?? 'http://127.0.0.1:8545',
      accounts: [process.env.PRIVATE_KEY ?? undefined],
    },
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  solidity: {
    version: '0.8.21',
    settings: {
      // viaIR: true,
      metadata: {
        bytecodeHash: 'none',
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
  },
};

export default config;
