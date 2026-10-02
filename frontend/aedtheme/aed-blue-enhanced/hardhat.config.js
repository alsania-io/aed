require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

// Custom task for contract size analysis
task("size-contracts", "Print contract sizes").setAction(async () => {
  const { run } = require("hardhat");
  await run("compile");
  
  const artifacts = await hre.artifacts.readArtifactPaths();
  const contractSizes = [];
  
  for (const artifactPath of artifacts) {
    const artifact = require(artifactPath);
    if (artifact.bytecode) {
      const size = Math.ceil(artifact.bytecode.length / 2);
      contractSizes.push({
        name: artifact.contractName,
        size: size,
        percentage: ((size / 24576) * 100).toFixed(2) // 24.576 KB limit
      });
    }
  }
  
  console.log("\n📊 Contract Sizes:");
  console.log("==================");
  contractSizes
    .sort((a, b) => b.size - a.size)
    .forEach(contract => {
      console.log(`${contract.name.padEnd(30)} ${contract.size.toString().padStart(6)} bytes (${contract.percentage}%)`);
    });
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      },
      viaIR: true,
      evmVersion: "cancun",
      metadata: {
        bytecodeHash: "none",
        useLiteralContent: true,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: false,
      mining: {
        auto: true,
        interval: 0,
      },
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    amoy: {
      url: process.env.AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: 50000000000, // 50 gwei
      gasMultiplier: 1.2,
      timeout: 60000,
    },
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 300000000000, // 300 gwei
      gasMultiplier: 1.2,
      timeout: 120000,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    gasPrice: 50,
    showTimeSpent: true,
    showMethodSig: true,
    maxMethodDiff: 10,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
    reporter: "spec",
    reporterOptions: {
      colors: true,
    },
  },
};