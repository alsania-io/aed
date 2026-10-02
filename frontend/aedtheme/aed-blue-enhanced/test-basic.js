const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("Starting basic AED Enhanced test...");
    
    const [owner, user1, feeCollector] = await ethers.getSigners();
    console.log("Accounts loaded:", {
        owner: owner.address,
        user1: user1.address,
        feeCollector: feeCollector.address
    });
    
    console.log("Loading contract factory...");
    const AEDEnhancedImplementation = await ethers.getContractFactory("AEDEnhancedImplementationFixed");
    
    console.log("Deploying proxy...");
    const aed = await upgrades.deployProxy(AEDEnhancedImplementation, [
        "Alsania Enhanced Domains",
        "AED",
        feeCollector.address,
        owner.address
    ], {
        initializer: "initialize",
        kind: "uups"
    });
    
    console.log("Waiting for deployment...");
    await aed.waitForDeployment();
    
    const address = await aed.getAddress();
    console.log("AED Enhanced deployed to:", address);
    
    console.log("Testing basic functions...");
    
    // Test name and symbol
    const name = await aed.name();
    const symbol = await aed.symbol();
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    
    // Test domain registration
    console.log("Testing domain registration...");
    const tx = await aed.registerDomain("test", "eth", false, "", {
        value: ethers.parseEther("1.0")
    });
    await tx.wait();
    console.log("Domain registered successfully!");
    
    // Check domain exists
    const tokenId = await aed.domainToTokenId("test.eth");
    console.log("Token ID for test.eth:", tokenId.toString());
    
    console.log("All basic tests passed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });