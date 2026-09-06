import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const CONTRACT_ADDRESS = '0x6452DCd7Bbee694223D743f09FF07c717Eeb34DF';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const PRIVATE_KEY = process.env.PRIVATE_KEY_PROD || 'REDACTED_ROTATE_ME';

const ABI = [
  'function updateFee(string feeType, uint256 newAmount)',
  'function FEE_MANAGER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log(`🔧 Setting badge fee to 0 for testing`);
  console.log(`📝 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`👤 Wallet: ${wallet.address}`);

  // Check if wallet has FEE_MANAGER_ROLE
  const feeManagerRole = '0x6c0757dc3e6b28b2580c03fd9e96c274acf4f99d91fbec9b418fa1d70604ff1c';
  const hasRole = await contract.hasRole(feeManagerRole, wallet.address);
  console.log(`Has FEE_MANAGER_ROLE: ${hasRole}`);

  if (!hasRole) {
    console.log('⚠️  Wallet does not have FEE_MANAGER_ROLE. Granting...');
    try {
      const tx = await contract.grantRole(feeManagerRole, wallet.address);
      await tx.wait();
      console.log('✅ FEE_MANAGER_ROLE granted');
    } catch (error) {
      console.error('❌ Failed to grant role:', error.message);
      console.log('Make sure wallet has DEFAULT_ADMIN_ROLE');
      return;
    }
  }

  // Set badgeBase fee to 0
  console.log('\n📊 Setting badgeBase fee to 0...');
  try {
    const tx = await contract.updateFee('badgeBase', 0);
    const receipt = await tx.wait();
    console.log(`✅ badgeBase set to 0 (tx: ${receipt.hash})`);
  } catch (error) {
    console.error('❌ Failed to set fee:', error.message);
  }

  // Also set capabilityBase to 0 for demo
  console.log('\n📊 Setting capabilityBase fee to 0...');
  try {
    const tx = await contract.updateFee('capabilityBase', 0);
    const receipt = await tx.wait();
    console.log(`✅ capabilityBase set to 0 (tx: ${receipt.hash})`);
  } catch (error) {
    console.error('❌ Failed to set fee:', error.message);
  }

  console.log('\n✅ Done! Badge minting and capabilities are now free for testing.');
}

main().catch(console.error);