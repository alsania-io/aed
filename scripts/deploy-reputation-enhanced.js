// Deploy Enhanced Reputation Module with Weighted Scoring & Fee Discounts
const hre = require("hardhat");

async function main() {
    console.log("Deploying Enhanced ReputationModuleUpgradeable...");
    
    // Configuration
    const ALSA_TOKEN = "0x1630fE468B414A964ed974b9F5Dd69d950E1Eb74"; // Amoy testnet ALSA
    const BADGE_CONTRACT = "0x3Bf795D47f7B32f36cbB1222805b0E0c5EF066f1"; // AED contract
    const FEE_RECIPIENT = "0xYourWalletAddress"; // TODO: Replace with actual address
    
    console.log(`ALSA Token: ${ALSA_TOKEN}`);
    console.log(`Badge Contract: ${BADGE_CONTRACT}`);
    console.log(`Fee Recipient: ${FEE_RECIPIENT}`);
    
    // Deploy implementation
    const ReputationModule = await hre.ethers.getContractFactory("ReputationModuleUpgradeable");
    const implementation = await ReputationModule.deploy();
    await implementation.waitForDeployment();
    
    const implementationAddress = await implementation.getAddress();
    console.log(`Implementation deployed to: ${implementationAddress}`);
    
    // Deploy proxy
    const Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const initializeData = ReputationModule.interface.encodeFunctionData("initialize", [
        ALSA_TOKEN,
        BADGE_CONTRACT,
        FEE_RECIPIENT
    ]);
    
    const proxy = await Proxy.deploy(implementationAddress, initializeData);
    await proxy.waitForDeployment();
    
    const proxyAddress = await proxy.getAddress();
    console.log(`Proxy deployed to: ${proxyAddress}`);
    
    // Get contract instance
    const reputationModule = await hre.ethers.getContractAt("ReputationModuleUpgradeable", proxyAddress);
    
    // Verify configuration
    const alsaToken = await reputationModule.alsaToken();
    const badgeContract = await reputationModule.badgeContract();
    const houseFee = await reputationModule.houseFeeBps();
    
    console.log("\n✅ Deployment Complete!");
    console.log(`ALSA Token: ${alsaToken}`);
    console.log(`Badge Contract: ${badgeContract}`);
    console.log(`House Fee: ${houseFee / 100}%`);
    console.log(`\nProxy Address: ${proxyAddress}`);
    console.log(`Implementation Address: ${implementationAddress}`);
    
    // Save deployment info
    const fs = require("fs");
    const deploymentInfo = {
        proxy: proxyAddress,
        implementation: implementationAddress,
        alsaToken: alsaToken,
        badgeContract: badgeContract,
        houseFeeBps: houseFee.toString(),
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        features: [
            "Weighted scoring by rater reputation",
            "Fee discounts for high reputation badge owners",
            "1 ALSA stake requirement",
            "7-day dispute window",
            "90-day reputation decay",
            "Min 5 ratings for display"
        ]
    };
    
    fs.writeFileSync(
        `deployment-reputation-enhanced-${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment info saved to deployment-reputation-enhanced-${hre.network.name}.json`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
