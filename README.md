# BIGA Project

This project contains BIGA smart contract in Solidity and running on Hardhat framework.

## 1. Prerequisites

- Node.js: https://nodejs.org/en/download/package-manager
- Install dependencies:

```shell
npm install
```

## 2. BIGA deployment

### 2.1. Deployment configuration

- Rename file .env.example to .env then update it's configs.
- Rename file config.example.json to config.json in directory /scripts/configs then update it's configs.

### 2.2. Deployment script

- Run the following script to build and deploy BIGA smart contract.

```shell
npm run build
npm run deployBigA
```
