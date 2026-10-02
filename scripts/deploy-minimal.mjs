import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD;
const DEPLOYER = '0xC8D6AB0928F9A8bAbB77B739401504f3354580cD';

// USDC address from Alchemy faucet
const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4';

// Minimal ABI for deployment
const IMPLEMENTATION_ABI = [
  'function initialize(string name, string symbol, address paymentWallet, address admin) external',
  'function createAISubdomain(string label, string parentDomain, string modelType) returns (uint256)',
  'function purchaseAICapability(uint256 tokenId, string capabilityType)',
  'function isAISubdomain(uint256 tokenId) view returns (bool)',
  'function getModelType(uint256 tokenId) view returns (string)',
  'function getActiveCapabilities(uint256 tokenId) view returns (string[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getDomainByTokenId(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function getEvolutionLevel(uint256 tokenId) view returns (uint256)',
  'function getFragmentCount(uint256 tokenId) view returns (uint256)',
  'function getTokenFragments(uint256 tokenId) view returns (tuple(string fragmentType, uint256 earnedAt, bytes32 eventHash)[])'
];

const PROXY_ABI = [
  'function upgradeTo(address newImplementation) external',
  'function implementation() view returns (address)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('🚀 Deploying AED contract with correct USDC address');
  console.log(`📝 Deployer: ${wallet.address}`);
  console.log(`💰 USDC Address: ${USDC_ADDRESS}`);
  console.log('');

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`📊 MATIC Balance: ${ethers.formatEther(balance)} MATIC`);
  console.log('');

  // Read the compiled contract artifact
  const artifactPath = resolve(__dirname, '../artifacts/contracts/AEDImplementation.sol/AEDImplementation.json');
  
  if (!fs.existsSync(artifactPath)) {
    console.log('⚠️  Artifact not found. Trying to compile...');
    console.log('   Run: npx hardhat compile');
    console.log('   Then run this script again.');
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode;

  // Deploy implementation
  console.log('📦 Deploying implementation...');
  const factory = new ethers.ContractFactory(artifact.abi, bytecode, wallet);
  const implementation = await factory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log(`✅ Implementation deployed: ${implAddress}`);

  // Prepare initialization data
  const initData = implementation.interface.encodeFunctionData('initialize', [
    'Alsania Enhanced Domains',
    'AED',
    wallet.address, // fee collector
    wallet.address  // admin
  ]);

  // Deploy proxy
  console.log('📦 Deploying proxy...');
  const proxyArtifactPath = resolve(__dirname, '../artifacts/contracts/AED.sol/AED.json');
  
  if (!fs.existsSync(proxyArtifactPath)) {
    console.log('⚠️  Proxy artifact not found.');
    return;
  }

  const proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
  const proxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
  const proxy = await proxyFactory.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log(`✅ Proxy deployed: ${proxyAddress}`);

  // Get the contract instance
  const contract = new ethers.Contract(proxyAddress, IMPLEMENTATION_ABI, wallet);

  // Save deployment info
  const deploymentInfo = {
    network: 'amoy',
    usdcAddress: USDC_ADDRESS,
    implementation: implAddress,
    proxy: proxyAddress,
    deployer: wallet.address,
    timestamp: new Date().toISOString()
  };

  const deployPath = resolve(__dirname, '../deployment.json');
  fs.writeFileSync(deployPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deployPath}`);

  console.log('\n✅ Deployment complete!');
  console.log(`📝 Proxy: ${proxyAddress}`);
  console.log(`📝 Implementation: ${implAddress}`);
  console.log(`💰 USDC: ${USDC_ADDRESS}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log(`1. Update frontend config to use: ${proxyAddress}`);
  console.log(`2. Run: node scripts/mint-badge-full.mjs`);
}

main().catch(console.error);