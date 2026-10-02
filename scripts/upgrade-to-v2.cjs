const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
require('dotenv').config();

const PROXY = process.env.AED_PROXY || '0x9276f78c574b737d914704D9096777C1929ec1cB';
const USDC = process.env.AED_USDC || '0x8B0180f2101c8260d49339abfEe87927412494B4';
const METADATA_BASE = process.env.AED_METADATA_BASE || 'https://aed-metadata.vercel.app/api/';

async function main() {
  console.log('🚀 Upgrading AED proxy to V2');
  console.log('   proxy:', PROXY);
  console.log('   usdc:', USDC);
  console.log('   metadataBase:', METADATA_BASE);

  const AEDV2 = await ethers.getContractFactory('AEDMinimalV2');

  // 1. Validate + upgrade (OZ checks storage layout compatibility)
  const upgraded = await upgrades.upgradeProxy(PROXY, AEDV2, {
    kind: 'uups',
    call: { fn: 'initializeV2', args: [USDC, METADATA_BASE] },
    timeout: 120000,
    pollingInterval: 10000,
  });
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(PROXY);
  console.log('✅ Upgraded. new implementation:', newImpl);

  // 2. Verify state survived
  console.log('\n🔎 Post-upgrade state check:');
  console.log('   name:', await upgraded.name());
  console.log('   nextTokenId:', (await upgraded.nextTokenId()).toString());
  console.log('   ownerOf(1):', await upgraded.ownerOf(1));
  console.log('   getDomainByTokenId(1):', await upgraded.getDomainByTokenId(1));
  console.log('   usdcAddress:', await upgraded.usdcAddress());
  console.log('   metadataBaseURI:', await upgraded.metadataBaseURI());
  console.log('   validCapabilities(ai_vision):', await upgraded.validCapabilities('ai_vision'));

  // 3. Persist new deployment record
  const info = {
    network: 'amoy',
    proxy: PROXY,
    implementation: newImpl,
    usdc: USDC,
    metadataBaseURI: METADATA_BASE,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    status: 'active'
  };
  fs.writeFileSync('./deployment-v2.json', JSON.stringify(info, null, 2));
  console.log('\n📝 Wrote ./deployment-v2.json');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
