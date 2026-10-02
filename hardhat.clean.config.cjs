require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');

module.exports = {
  solidity: {
    version: '0.8.30',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'cancun'
    }
  },
  networks: {
    hardhat: {},
    amoy: {
      url: process.env.AMOY_RPC || 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO',
      accounts: process.env.PRIVATE_KEY_PROD ? [process.env.PRIVATE_KEY_PROD] : [],
      timeout: 60000
    }
  },
  paths: {
    sources: './contracts-clean',
    artifacts: './artifacts-clean'
  }
};