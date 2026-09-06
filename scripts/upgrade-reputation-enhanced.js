// Upgrade existing Reputation Module to Enhanced version
// Preserves all existing state while adding new features
const hre = require("hardhat");

async function main() {
    console.log("Upgrading Reputation Module to Enhanced Version...");
    
    // Replace with your actual proxy address from previous deployment
    const PROXY_ADDRESS = "0xYourProxyAddress"; // TODO: Replace
    
    console.log(`Proxy Address: ${PROXY_ADDRESS}`);
    
    // Get existing contract to verify state
    const existingModule = await hre.ethers.getContractAt("ReputationModuleUpgradeable", PROXY_ADDRESS);
    
    // Check current state
    const alsaToken = await existingModule.alsaToken();
    const badgeContract = await existingModule.badgeContract();
    const houseFee = await existingModule.houseFeeBps();
    const feeRecipient = await existingModule.feeRecipient();
    
    console.log("\nCurrent State:");
    console.log(`ALSA Token: ${alsaToken}`);
    console.log(`Badge Contract: ${badgeContract}`);
    console.log(`House Fee: ${houseFee / 100}%`);
    console.log(`Fee Recipient: ${feeRecipient}`);
    
    // Deploy new implementation
    console.log("\nDeploying new implementation...");
    const ReputationModule = await hre.ethers.getContractFactory("ReputationModuleUpgradeable");
    const newImplementation = await ReputationModule.deploy();
    await newImplementation.waitForDeployment();
    
    const newImplementationAddress = await newImplementation.getAddress();
    console.log(`New implementation deployed to: ${newImplementationAddress}`);
    
    // Upgrade proxy
    console.log("\nUpgrading proxy...");
    const proxy = await hre.ethers.getContractAt("UUPSUpgradeable", PROXY_ADDRESS);
    
    // Note: The upgrade function name depends on your implementation
    // If using UUPS, call upgradeTo on the proxy
    const upgradeTx = await proxy.upgradeTo(newImplementationAddress);
    await upgradeTx.wait();
    
    console.log("✅ Upgrade complete!");
    
    // Verify new features are available
    const upgradedModule = await hre.ethers.getContractAt("ReputationModuleUpgradeable", PROXY_ADDRESS);
    
    // Check if new features exist
    const hasNewFeatures = await upgradedModule.getRaterReputation(await hre.ethers.getSigners()[0].getAddress());
    console.log(`\nNew features available: Weighted scoring & fee discounts`);
    console.log(`Default rater reputation: ${hasNewFeatures}`);
    
    // Get effective fee for a badge (if any exist)
    try {
        // Try to get fee for badge 1 if it exists
        const effectiveFee = await upgradedModule.getEffectiveFeeBps(1);
        console.log(`Effective fee for badge 1: ${effectiveFee / 100}%`);
    } catch (e) {
        console.log("No badges with ratings yet");
    }
    
    // Save upgrade info
    const fs = require("fs");
    const upgradeInfo = {
        proxy: PROXY_ADDRESS,
        newImplementation: newImplementationAddress,
        previousState: {
            alsaToken: alsaToken,
            badgeContract: badgeContract,
            houseFeeBps: houseFee.toString(),
            feeRecipient: feeRecipient
        },
        newFeatures: [
            "Weighted scoring by rater reputation",
            "Fee discounts based on badge reputation (Tiers: 3.5★/0.5%, 4.0★/1.0%, 4.5★/2.0%)",
            "Rater reputation tracking (0-500 scale, default 250)",
            "Cached fee discounts per badge",
            "Enhanced feedback history with rater reputation snapshots"
        ],
        network: hre.network.name,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
        `upgrade-reputation-enhanced-${hre.network.name}.json`,
        JSON.stringify(upgradeInfo, null, 2)
    );
    console.log(`\nUpgrade info saved to upgrade-reputation-enhanced-${hre.network.name}.json`);
    
    console.log("\n📋 Next Steps:");
    console.log("1. Update frontend to use new getBadgeReputation() which returns effectiveFeeBps");
    console.log("2. Use calculateDiscountedFee() when charging platform fees");
    console.log("3. Set initial rater reputations for existing users via updateRaterReputation()");
    console.log("4. Monitor FeeDiscountUpdated events to track discount changes");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
