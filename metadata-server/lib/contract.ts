import { ethers } from 'ethers';

export const ABI = [
  // Core view functions
  'function tokenURI(uint256) view returns (string)',
  'function ownerOf(uint256) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  
  // Domain functions
  'function getDomainByTokenId(uint256) view returns (string)',
  'function domainExists(string) view returns (bool)',
  'function domainToTokenId(string) view returns (uint256)',
  'function tokenIdToDomain(uint256) view returns (string)',
  
  // Badge functions
  'function isAISubdomain(uint256) view returns (bool)',
  'function getModelType(uint256) view returns (string)',
  'function getActiveCapabilities(uint256) view returns (string[])',
  'function hasAICapability(uint256, string) view returns (bool)',
  'function aiModelType(uint256) view returns (string)',
  
  // Balance & ownership
  'function balanceOf(address) view returns (uint256)'
];

const RPC_URL = process.env.AMOY_RPC || 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x9276f78c574b737d914704D9096777C1929ec1cB';

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let globalDescription = 'Alsania Enhanced Domain';

export function initializeContract() {
  if (!RPC_URL || !CONTRACT_ADDRESS) {
    console.error('Missing RPC_URL/CONTRACT_ADDRESS environment variables');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    return true;
  } catch (error) {
    console.error('Failed to initialize contract:', error);
    return false;
  }
}

export async function loadGlobalDescription() {
  // Minimal contract doesn't have getGlobalDescription, use default
  globalDescription = 'Alsania Enhanced Domain';
}

export function getContract() {
  if (!contract) {
    initializeContract();
  }
  return contract;
}

export function getGlobalDescription() {
  return globalDescription;
}

// Initialize on module load
if (!contract) {
  initializeContract();
  loadGlobalDescription();
}