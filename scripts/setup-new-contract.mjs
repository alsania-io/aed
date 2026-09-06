import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const PROXY = '0x9276f78c574b737d914704D9096777C1929ec1cB';
const USDC_ADDR = '0x8B0180f2101c8260d49339abfEe87927412494B4';
const RPC = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD || 'REDACTED_ROTATE_ME';

const ABI = [
  'function registerDomain(string name, string tld) returns (uint256)',
  'function createAISubdomain(string label, string parentDomain, string modelType) returns (uint256)',
  'function purchaseAICapability(uint256 tokenId, string capabilityType)',
  'function setReverse(string domain)',
  'function getReverse(address) view returns (string)',
  'function getReverseOwner(string) view returns (address)',
  'function domainExists(string) view returns (bool)',
  'function domainToTokenId(string) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function getDomainByTokenId(uint256) view returns (string)',
  'function isAISubdomain(uint256) view returns (bool)',
  'function getModelType(uint256) view returns (string)',
  'function getActiveCapabilities(uint256) view returns (string[])'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(PROXY, ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet);

  console.log('🚀 Setting up new contract');
  console.log('📝 Contract:', PROXY);
  console.log('👤 Wallet:', wallet.address);
  console.log('');

  // Check USDC allowance
  const allowance = await usdc.allowance(wallet.address, PROXY);
  if (allowance < 1000000n) {
    console.log('⏳ Approving USDC...');
    const tx = await usdc.approve(PROXY, ethers.parseUnits('100', 6));
    await tx.wait();
    console.log('✅ USDC approved');
  }

  // Register domain
  const domain = 'aegis.aed';
  if (!(await contract.domainExists(domain))) {
    console.log('📝 Registering', domain);
    const tx = await contract.registerDomain('aegis', 'aed');
    await tx.wait();
    console.log('✅ Registered', domain);
  }

  // Mint badge
  const badgeLabel = 'echo';
  const badgeName = badgeLabel + '.' + domain;
  if (!(await contract.domainExists(badgeName))) {
    console.log('🎯 Minting badge:', badgeName);
    const tx = await contract.createAISubdomain(badgeLabel, domain, 'claude-3.5-sonnet');
    await tx.wait();
    console.log('✅ Minted', badgeName);
  }

  // Set reverse resolution
  console.log('');
  console.log('🔗 Setting reverse resolution...');
  const tx2 = await contract.setReverse(domain);
  await tx2.wait();
  console.log('✅ Reverse record set for', domain);

  // Verify
  console.log('');
  console.log('📊 Verification:');
  const tokenId = await contract.domainToTokenId(domain);
  console.log('  Domain token ID:', tokenId.toString());
  
  const reverse = await contract.getReverse(wallet.address);
  console.log('  Reverse record:', reverse);
  
  if (reverse) {
    const revOwner = await contract.getReverseOwner(reverse);
    console.log('  Reverse owner:', revOwner);
  }

  console.log('');
  console.log('✅ Setup complete!');
}

main().catch(console.error);