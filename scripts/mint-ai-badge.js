const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

const CONTRACT_ADDRESS = '0x6452DCd7Bbee694223D743f09FF07c717Eeb34DF';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD || '5b1a2164f97843a748e638b98f20b864fbc6743eb1f33ef80f0facf28dff73e9';

const ABI = [
  'function createAISubdomain(string label, string parentDomain, string modelType) returns (uint256)',
  'function purchaseAICapability(uint256 tokenId, string capabilityType)',
  'function isAISubdomain(uint256 tokenId) view returns (bool)',
  'function getModelType(uint256 tokenId) view returns (string)',
  'function getActiveCapabilities(uint256 tokenId) view returns (string[])',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log(`🚀 Minting AI badges`);
  console.log(`📝 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`👤 Wallet: ${wallet.address}`);
  console.log('');

  const parentDomains = ['sigmasauer07.aed', 'echo.alsania'];
  const models = ['claude-3.5-sonnet', 'gpt-4o', 'gemini-pro'];

  let minted = [];

  for (const parentDomain of parentDomains) {
    for (let i = 0; i < 2; i++) {
      const label = `badge-${Date.now()}-${i}`;
      const modelType = models[(i + parentDomains.indexOf(parentDomain)) % models.length];
      
      try {
        console.log(`  🎯 Minting ${label}.${parentDomain} (${modelType})...`);
        const tx = await contract.createAISubdomain(label, parentDomain, modelType);
        const receipt = await tx.wait();
        
        // Find tokenId from event
        const tokenId = receipt.logs.find(log => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed && parsed.name === 'Transfer';
          } catch { return false; }
        });
        
        const tokenIdValue = tokenId ? tokenId.args.tokenId.toString() : 'unknown';
        console.log(`    ✅ Minted token #${tokenIdValue}`);
        minted.push({ label, parentDomain, modelType, tokenId: tokenIdValue });
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }
  }

  console.log('');
  console.log('📊 Minted badges:');
  for (const badge of minted) {
    console.log(`  #${badge.tokenId}: ${badge.label}.${badge.parentDomain} (${badge.modelType})`);
  }
}

main().catch(console.error);