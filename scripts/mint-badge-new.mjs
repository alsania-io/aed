import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const PROXY_ADDRESS = '0xDEFD133db8671b2B7ceAe98384902a157DbcB197';
const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD;

const ABI = [
  'function registerDomain(string name, string tld) returns (uint256)',
  'function createAISubdomain(string label, string parentDomain, string modelType) returns (uint256)',
  'function purchaseAICapability(uint256 tokenId, string capabilityType)',
  'function isAISubdomain(uint256 tokenId) view returns (bool)',
  'function getModelType(uint256 tokenId) view returns (string)',
  'function getActiveCapabilities(uint256 tokenId) view returns (string[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getDomainByTokenId(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function hasAICapability(uint256 tokenId, string capabilityType) view returns (bool)',
  'function domainToTokenId(string) view returns (uint256)',
  'function domainExists(string) view returns (bool)'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(PROXY_ADDRESS, ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

  console.log('🚀 AED Badge Minting');
  console.log(`📝 Contract: ${PROXY_ADDRESS}`);
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
  const allowance = await usdc.allowance(wallet.address, PROXY_ADDRESS);
  console.log(`📊 USDC Allowance: ${ethers.formatUnits(allowance, decimals)} USDC`);

  if (allowance < 1000000n) {
    console.log('⚠️  Insufficient allowance. Approving USDC...');
    const approveTx = await usdc.approve(PROXY_ADDRESS, ethers.parseUnits('100', 6));
    await approveTx.wait();
    console.log(`✅ USDC approved (tx: ${approveTx.hash})`);
  }

  // Check if we own a domain
  console.log('\n📋 Checking domains...');
  let parentDomain = null;
  let parentTokenId = null;
  
  // Check if 'aegis' domain exists
  const testDomains = ['aegis.aed', 'sigma.aed', 'test.aed'];
  for (const domain of testDomains) {
    try {
      const exists = await contract.domainExists(domain);
      if (exists) {
        const tokenId = await contract.domainToTokenId(domain);
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() === wallet.address.toLowerCase()) {
          parentDomain = domain;
          parentTokenId = tokenId;
          console.log(`   ✅ Own ${domain} (Token #${tokenId})`);
          break;
        }
      }
    } catch {}
  }

  // If no domain, register one
  if (!parentDomain) {
    console.log('   No domain found. Registering aegis.aed...');
    try {
      const tx = await contract.registerDomain('aegis', 'aed');
      const receipt = await tx.wait();
      parentDomain = 'aegis.aed';
      parentTokenId = await contract.domainToTokenId(parentDomain);
      console.log(`   ✅ Registered ${parentDomain} (Token #${parentTokenId})`);
    } catch (error) {
      console.error(`   ❌ Failed to register: ${error.message}`);
      return;
    }
  }

  // Mint badges
  console.log('\n🎯 Minting AI badges...');
  const models = ['claude-3.5-sonnet', 'gpt-4o', 'gemini-pro'];
  let minted = [];

  for (let i = 0; i < 2; i++) {
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
  
  console.log('\n📝 Contract deployed at:', PROXY_ADDRESS);
}

main().catch(console.error);