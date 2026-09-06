const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const admin = process.env.ALSANIA_ADMIN || "0xC8D6AB0928F9A8bAbB77B739401504f3354580cD";
  
  console.log("🚀 Deploying AED Minimal contract");
  console.log(`👤 Admin: ${admin}`);
  console.log(`💰 USDC: 0x8B0180f2101c8260d49339abfEe87927412494B4`);
  console.log("");

  const AEDMinimal = await ethers.getContractFactory("AEDMinimal", {
    libraries: {}
  });

  console.log("📦 Deploying proxy...");
  const aed = await upgrades.deployProxy(
    AEDMinimal,
    ["Alsania Enhanced Domains", "AED", admin],
    {
      initializer: "initialize",
      kind: "uups",
      timeout: 60000,
      pollingInterval: 10000,
    }
  );

  await aed.waitForDeployment();
  const proxyAddress = await aed.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("✅ AED deployed to:", proxyAddress);
  console.log("📦 Implementation:", implementationAddress);
  console.log("👤 Admin:", admin);
  console.log("💰 USDC:", "0x8B0180f2101c8260d49339abfEe87927412494B4");
  console.log("");
  console.log("📋 Next: Update frontend config with proxy address");

  const info = {
    network: "amoy",
    proxy: proxyAddress,
    implementation: implementationAddress,
    admin: admin,
    usdc: "0x8B0180f2101c8260d49339abfEe87927412494B4",
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync("./deployment-clean.json", JSON.stringify(info, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});