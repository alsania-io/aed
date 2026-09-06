import { ethers } from 'ethers';

const RPC = 'https://polygon-amoy.g.alchemy.com/v2/YuiO_sWS_53rF2oOHjVL5OvrKvOxXWwO';
const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4';
const provider = new ethers.JsonRpcProvider(RPC);
const abi = ['function balanceOf(address) view returns (uint256)'];
const usdc = new ethers.Contract(USDC_ADDRESS, abi, provider);
const addresses = [
  '0xC8D6AB0928F9A8bAbB77B739401504f3354580cD'
];

async function main() {
  for (const addr of addresses) {
    const bal = await usdc.balanceOf(addr);
    console.log(addr, 'USDC balance:', bal.toString());
  }
}
main().catch(console.error);