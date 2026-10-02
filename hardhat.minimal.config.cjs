require('@nomicfoundation/hardhat-toolbox');

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
      accounts: process.env.PRIVATE_KEY_PROD ? [process.env.PRIVATE_KEY_PROD] : []
    }
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts'
  }
};