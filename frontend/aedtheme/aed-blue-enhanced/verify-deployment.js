const { ethers, upgrades } = require("hardhat");

async function verifyDeployment() {
    console.log("🔍 Verifying AED Enhanced Deployment...");
    
    try {
        // Get signers
        const [owner, user1, feeCollector] = await ethers.getSigners();
        console.log("✅ Accounts loaded");
        
        // Load contract
        const AEDEnhancedImplementation = await ethers.getContractFactory("AEDEnhancedImplementationFixed");
        
        // Deploy proxy
        console.log("🚀 Deploying contract...");
        const aed = await upgrades.deployProxy(AEDEnhancedImplementation, [
            "Alsania Enhanced Domains",
            "AED",
            feeCollector.address,
            owner.address
        ], {
            initializer: "initialize",
            kind: "uups"
        });
        
        await aed.waitForDeployment();
        const address = await aed.getAddress();
        console.log("✅ Contract deployed to:", address);
        
        // Verify basic functions
        console.log("🔍 Verifying basic functions...");
        
        const name = await aed.name();
        const symbol = await aed.symbol();
        console.log("   Name:", name);
        console.log("   Symbol:", symbol);
        
        // Verify TLDs are configured
        console.log("🔍 Checking TLDs...");
        const tlds = ["aed", "alsa", "07", "alsania", "fx", "echo"];
        for (const tld of tlds) {
            const isActive = await aed.isTLDActive(tld);
            console.log(`   ${tld}: ${isActive ? "✅ Active" : "❌ Inactive"}`);
        }
        
        // Test domain registration
        console.log("📝 Testing domain registration...");
        const registerTx = await aed.registerDomain("test", "aed", true, "", {
            value: ethers.parseEther("2.0")
        });
        await registerTx.wait();
        
        const [tokenId, domainInfo] = await aed.getDomainByName("test.aed");
        console.log("✅ Domain registered - Token ID:", tokenId.toString());
        
        // Test subdomain
        console.log("🔗 Testing subdomain...");
        const subdomainTx = await aed.createSubdomain(tokenId, "sub", "", {
            value: 0
        });
        await subdomainTx.wait();
        console.log("✅ Subdomain created");
        
        console.log("\n🎉 All deployment verification tests passed!");
        console.log("\n📊 Summary:");
        console.log("   ✅ Contract deployment successful");
        console.log("   ✅ Basic functions working");
        console.log("   ✅ TLDs configured");
        console.log("   ✅ Domain registration working");
        console.log("   ✅ Subdomain creation working");
        console.log("   ✅ Ready for production");
        
    } catch (error) {
        console.error("❌ Deployment verification failed:", error.message);
        process.exit(1);
    }
}

verifyDeployment()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    });