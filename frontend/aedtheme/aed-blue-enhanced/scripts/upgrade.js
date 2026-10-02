const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔄 Upgrading AED Enhanced Domains...\n");
    
    const [upgrader] = await ethers.getSigners();
    console.log("Upgrading with account:", upgrader.address);
    console.log("Account balance:", (await ethers.provider.getBalance(upgrader.address)).toString());
    
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "(chainId:", network.chainId, ")\n");
    
    // Get proxy address from environment or previous deployment
    const proxyAddress = process.env.PROXY_ADDRESS;
    if (!proxyAddress) {
        console.error("❌ PROXY_ADDRESS environment variable is required");
        console.log("Usage: PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade.js --network <network>");
        process.exit(1);
    }
    
    console.log("📋 Upgrading proxy at:", proxyAddress);
    
    // Check current implementation
    const currentImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("🔧 Current implementation:", currentImplementation);
    
    // Deploy new implementation
    const AEDEnhancedImplementation = await ethers.getContractFactory("AEDEnhancedImplementation");
    console.log("📦 Deploying new implementation...");
    
    const upgraded = await upgrades.upgradeProxy(proxyAddress, AEDEnhancedImplementation, {
        timeout: 0 // Disable timeout for slow networks
    });
    
    await upgraded.waitForDeployment();
    
    // Get new implementation address
    const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("✅ Upgrade successful!");
    console.log("🔧 New implementation:", newImplementation);
    
    // Verify upgrade
    console.log("\n🔍 Verifying upgrade...");
    
    try {
        // Check basic functionality
        const name = await upgraded.name();
        console.log("- Name:", name);
        
        const totalDomains = await upgraded.totalDomains();
        console.log("- Total domains:", totalDomains.toString());
        
        const totalRevenue = await upgraded.totalRevenue();
        console.log("- Total revenue:", totalRevenue.toString());
        
        console.log("✅ Contract functionality verified");
    } catch (error) {
        console.error("⚠️  Verification failed:", error.message);
    }
    
    // Save upgrade info
    const upgradeInfo = {
        network: {
            name: network.name,
            chainId: network.chainId
        },
        upgrade: {
            proxy: proxyAddress,
            oldImplementation: currentImplementation,
            newImplementation: newImplementation,
            timestamp: new Date().toISOString(),
            upgrader: upgrader.address,
            transactionHash: upgraded.deploymentTransaction().hash
        }
    };
    
    // Create upgrades directory if it doesn't exist
    const upgradesDir = path.join(__dirname, "..", "upgrades");
    if (!fs.existsSync(upgradesDir)) {
        fs.mkdirSync(upgradesDir, { recursive: true });
    }
    
    // Save upgrade info to file
    const upgradeFile = path.join(
        upgradesDir,
        `upgrade-${network.chainId}-${Date.now()}.json`
    );
    fs.writeFileSync(upgradeFile, JSON.stringify(upgradeInfo, null, 2));
    
    console.log("\n💾 Upgrade info saved to:", upgradeFile);
    
    // Verify on block explorers (if not on local network)
    if (network.chainId !== 1337 && network.chainId !== 31337) {
        console.log("\n🔍 Waiting for block confirmations...");
        await upgraded.deploymentTransaction().wait(5);
        
        try {
            console.log("\n📋 Verifying new implementation on block explorer...");
            await hre.run("verify:verify", {
                address: newImplementation,
                constructorArguments: []
            });
            console.log("✅ New implementation verified successfully!");
        } catch (error) {
            console.log("⚠️  Verification failed:", error.message);
            console.log("You can verify manually using:");
            console.log(`npx hardhat verify --network ${network.name} ${newImplementation}`);
        }
    }
    
    console.log("\n🎉 Upgrade complete!");
    console.log("\nNext steps:");
    console.log("1. Test all contract functionality");
    console.log("2. Update any dependent contracts or frontends");
    console.log("3. Monitor for any issues");
    console.log("4. Document the upgrade in your changelog");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Upgrade failed:", error);
        process.exit(1);
    });