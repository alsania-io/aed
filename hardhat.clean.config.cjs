require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');

module.exports = {
  solidity: {
    version: '0.8.30',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    amoy: {
      url: 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO',
      accounts: ['REDACTED_ROTATE_ME'],
      timeout: 60000
    }
  },
  paths: {
    sources: './contracts-clean',
    artifacts: './artifacts-clean'
  }
};