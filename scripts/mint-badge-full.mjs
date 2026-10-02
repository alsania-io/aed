import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x6452DCd7Bbee694223D743f09FF07c717Eeb34DF';
const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD;

const CONTRACT_ABI = [
  'function createAISubdomain(string label, string parentDomain, string modelType) returns (uint256)',
  'function purchaseAICapability(uint256 tokenId, string capabilityType)',
  'function isAISubdomain(uint256 tokenId) view returns (bool)',
  'function getModelType(uint256 tokenId) view returns (string)',
  'function getActiveCapabilities(uint256 tokenId) view returns (string[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getDomainByTokenId(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

  console.log(`🚀 AED Badge Minting`);
  console.log(`📝 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`👤 Wallet: ${wallet.address}`);
  console.log('');

  // Check USDC balance
  const usdcBal = await usdc.balanceOf(wallet.address);
  const decimals = await usdc.decimals();
  console.log(`💰 USDC Balance: ${ethers.formatUnits(usdcBal, decimals)} USDC`);

  if (usdcBal === 0n) {
    console.log('❌ No USDC balance. Please get USDC from faucet first.');
    console.log('   Faucet: https://faucet.polygon.technology/');
    return;
  }

  // Check allowance
  const allowance = await usdc.allowance(wallet.address, CONTRACT_ADDRESS);
  console.log(`📊 USDC Allowance: ${ethers.formatUnits(allowance, decimals)} USDC`);

  if (allowance < 1000000n) { // $1.00
    console.log('⚠️  Insufficient allowance. Approving USDC...');
    const approveTx = await usdc.approve(CONTRACT_ADDRESS, ethers.parseUnits('100', 6));
    await approveTx.wait();
    console.log(`✅ USDC approved (tx: ${approveTx.hash})`);
  }

  // Get existing domains owned by this wallet
  console.log('\n📋 Checking owned domains...');
  let tokenIds = [];
  for (let i = 1; i <= 20; i++) {
    try {
      const owner = await contract.ownerOf(i);
      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        const domain = await contract.getDomainByTokenId(i);
        tokenIds.push({ tokenId: i, domain });
        console.log(`   #${i}: ${domain}`);
      }
    } catch {}
  }

  if (tokenIds.length === 0) {
    console.log('❌ No domains owned by this wallet. Need to own a domain first.');
    return;
  }

  // Mint badges
  console.log('\n🎯 Minting AI badges...');
  const parentDomain = tokenIds[0].domain;
  const models = ['claude-3.5-sonnet', 'gpt-4o', 'gemini-pro'];
  let minted = [];

  for (let i = 0; i < 3; i++) {
    const label = `badge-${Date.now()}-${i}`;
    const modelType = models[i % models.length];
    
    try {
      console.log(`  🎯 Minting ${label}.${parentDomain} (${modelType})...`);
      const tx = await contract.createAISubdomain(label, parentDomain, modelType);
      const receipt = await tx.wait();
      
      let tokenIdValue = 'unknown';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'Transfer') {
            tokenIdValue = parsed.args.tokenId.toString();
            break;
          }
        } catch {}
      }
      
      console.log(`    ✅ Minted token #${tokenIdValue}`);
      minted.push({ label, parentDomain, modelType, tokenId: tokenIdValue });
    } catch (error) {
      console.error(`    ❌ Failed: ${error.message}`);
    }
  }

  console.log('');
  console.log('📊 Minted badges:');
  for (const badge of minted) {
    console.log(`  #${badge.tokenId}: ${badge.label}.${badge.parentDomain} (${badge.modelType})`);
  }

  // Purchase capabilities for first badge
  if (minted.length > 0) {
    console.log('\n🔓 Purchasing capabilities for first badge...');
    const firstBadge = minted[0];
    const capabilities = ['ai_vision', 'ai_communication', 'ai_memory', 'ai_reasoning'];
    
    for (const cap of capabilities) {
      try {
        console.log(`  🔓 Purchasing ${cap}...`);
        const tx = await contract.purchaseAICapability(firstBadge.tokenId, cap);
        await tx.wait();
        console.log(`    ✅ ${cap} unlocked`);
      } catch (error) {
        console.log(`    ❌ ${cap} failed: ${error.message}`);
      }
    }
  }

  console.log('');
  console.log('✅ Done!');
  console.log('📝 Test the AI demo:');
  console.log(`curl -X POST http://localhost:3001/api/chat \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"message":"Hello","walletAddress":"${wallet.address}","badgeTokenId":"${minted[0]?.tokenId || 'unknown'}"}'`);
}

main().catch(console.error);