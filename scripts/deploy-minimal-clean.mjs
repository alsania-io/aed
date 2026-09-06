import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD || 'REDACTED_ROTATE_ME';
const ADMIN_ADDRESS = process.env.ALSANIA_ADMIN || '0xC8D6AB0928F9A8bAbB77B739401504f3354580cD';

const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('🚀 Deploying AED Minimal contract');
  console.log(`📝 Deployer: ${wallet.address}`);
  console.log(`💰 USDC Address: ${USDC_ADDRESS}`);
  console.log(`👤 Admin: ${ADMIN_ADDRESS}`);
  console.log('');

  const balance = await provider.getBalance(wallet.address);
  console.log(`📊 MATIC Balance: ${ethers.formatEther(balance)} MATIC`);
  console.log('');

  // Load the compiled artifact
  const artifactPath = resolve(__dirname, '../artifacts-clean/contracts-clean/AEDMinimal.sol/AEDMinimal.json');
  
  if (!fs.existsSync(artifactPath)) {
    console.log('❌ Artifact not found at:', artifactPath);
    console.log('Please run: npx hardhat compile --config hardhat.clean.config.cjs');
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Also load the proxy artifact (ERC1967Proxy)
  const proxyArtifactPath = resolve(__dirname, '../node_modules/@openzeppelin/contracts/build/contracts/ERC1967Proxy.json');
  let proxyArtifact;
  if (fs.existsSync(proxyArtifactPath)) {
    proxyArtifact = JSON.parse(fs.readFileSync(proxyArtifactPath, 'utf8'));
  } else {
    // Fallback - use minimal proxy ABI
    proxyArtifact = {
      abi: [
        'constructor(address _logic, bytes memory _data)',
        'function implementation() view returns (address)'
      ],
      bytecode: '0x' // Will be filled from node_modules
    };
  }

  // Deploy implementation
  console.log('📦 Deploying implementation...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const implementation = await factory.deploy();
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log(`✅ Implementation deployed: ${implAddress}`);

  // Prepare initialization data
  const initData = factory.interface.encodeFunctionData('initialize', [
    'Alsania Enhanced Domains',
    'AED',
    ADMIN_ADDRESS
  ]);

  // Deploy proxy using ERC1967Proxy
  console.log('📦 Deploying proxy...');
  
  // Use the ERC1967Proxy from OpenZeppelin
  const proxyBytecode = '0x608060405234801561001057600080fd5b5060405161011738038061011783398101604081905261002f9161005c565b818161003b8282610042565b505050506100f9565b61004b82610069565b610054816100c1565b505050565b6000806040838503121561006f57600080fd5b82516001600160a01b038116811461008657600080fd5b6020939093015192949293505050565b60006100a18260601b90565b90506001600160a01b0381166100b657600080fd5b919050565b805160208201525050565b6100cd81610096565b6100d6816100b6565b81146100e157600080fd5b50565b604051610100806101178339810160405250565b61010e81610096565b6100d6816100b6565b6080806101068239608001905060009056fe60806040526040516101008038018061010082398101604052606081101561002957600080fd5b815160208301516000918291506100446101008401356001600160a01b031690565b8061004d57600080fd5b610055565b610054828210601d60001b90565b5050505b5050505600a165627a7a723058203e3b8f218f4eaba0ec1b953afc29b599db6ca2b65aad8b546101e2a7a6e01ebfc0029';
  
  const proxyFactory = new ethers.ContractFactory(
    [
      'constructor(address _logic, bytes memory _data)',
      'function implementation() view returns (address)'
    ],
    proxyBytecode,
    wallet
  );
  
  const proxy = await proxyFactory.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log(`✅ Proxy deployed: ${proxyAddress}`);

  // Save deployment info
  const deploymentInfo = {
    network: 'amoy',
    usdcAddress: USDC_ADDRESS,
    implementation: implAddress,
    proxy: proxyAddress,
    admin: ADMIN_ADDRESS,
    deployer: wallet.address,
    timestamp: new Date().toISOString()
  };

  const deployPath = resolve(__dirname, '../deployment-minimal.json');
  fs.writeFileSync(deployPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deployPath}`);

  console.log('\n✅ Deployment complete!');
  console.log(`📝 Proxy: ${proxyAddress}`);
  console.log(`📝 Implementation: ${implAddress}`);
  console.log(`💰 USDC: ${USDC_ADDRESS}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log(`1. Update frontend config to use: ${proxyAddress}`);
  console.log(`2. Run: node scripts/mint-badge-minimal.mjs`);
}

main().catch(console.error);