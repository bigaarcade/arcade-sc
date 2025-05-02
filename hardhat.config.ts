import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import '@nomicfoundation/hardhat-verify';
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
      accounts: [process.env.PRIVATE_KEY!],
    },
    mainnet: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      timeout: 600_000,
    },
    bsc: {
      url: process.env.BSC_RPC_URL || process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      timeout: 600_000,
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      timeout: 600_000,
    },
    base: {
      url: process.env.BASE_RPC_URL || process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      timeout: 600_000,
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
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY!,
      bsc: process.env.ETHERSCAN_API_KEY!,
      avalanche: process.env.ETHERSCAN_API_KEY!,
      base: process.env.ETHERSCAN_API_KEY!,
    },
  },
};

export default config;
