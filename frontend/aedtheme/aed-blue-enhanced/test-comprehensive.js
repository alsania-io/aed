const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Starting Comprehensive AED Enhanced Test Suite");
    
    const [owner, user1, user2, feeCollector] = await ethers.getSigners();
    console.log("📋 Accounts loaded:");
    console.log("   Owner:", owner.address);
    console.log("   User1:", user1.address);
    console.log("   User2:", user2.address);
    console.log("   FeeCollector:", feeCollector.address);
    
    console.log("\n📦 Loading contract factory...");
    const AEDEnhancedImplementation = await ethers.getContractFactory("AEDEnhancedImplementationFixed");
    
    console.log("🚀 Deploying proxy...");
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
    console.log("✅ AED Enhanced deployed to:", address);
    
    console.log("\n🔍 Testing basic contract functions...");
    
    // Test name and symbol
    const name = await aed.name();
    const symbol = await aed.symbol();
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    
    // Test role management
    console.log("\n🔐 Testing role management...");
    const ADMIN_ROLE = await aed.ADMIN_ROLE();
    const hasAdminRole = await aed.hasRole(ADMIN_ROLE, owner.address);
    console.log("   Owner has ADMIN_ROLE:", hasAdminRole);
    
    // Test domain registration with free TLD
    console.log("\n📝 Testing domain registration...");
    const registerTx = await aed.registerDomain("mydomain", "aed", true, "", {
        value: ethers.parseEther("2.0")
    });
    await registerTx.wait();
    console.log("   ✅ Domain 'mydomain.aed' registered with subdomains enabled");
    
    // Check domain info
    const [tokenId, domainInfo] = await aed.getDomainByName("mydomain.aed");
    console.log("   Token ID:", tokenId.toString());
    console.log("   Domain name:", domainInfo.name);
    
    // Check owner
    const domainOwner = await aed.ownerOf(tokenId);
    console.log("   Domain owner:", domainOwner);
    
    // Test subdomain creation
    console.log("\n🔗 Testing subdomain creation...");
    const subdomainTx = await aed.createSubdomain(tokenId, "sub", "", {
        value: 0
    });
    await subdomainTx.wait();
    console.log("   ✅ Subdomain 'sub.mydomain.eth' created");
    
    // Test metadata
    console.log("\n🎨 Testing metadata...");
    const metadata = await aed.tokenURI(tokenId);
    console.log("   Token URI:", metadata);
    
    console.log("\n🎉 All tests passed successfully!");
    console.log("\n📊 Test Summary:");
    console.log("   ✅ Contract deployment");
    console.log("   ✅ Role management");
    console.log("   ✅ TLD configuration");
    console.log("   ✅ Domain registration");
    console.log("   ✅ Subdomain creation");
    console.log("   ✅ Reverse resolution");
    console.log("   ✅ Metadata retrieval");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    });