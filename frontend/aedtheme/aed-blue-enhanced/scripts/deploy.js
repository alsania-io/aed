const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying AED Enhanced Domains...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "(chainId:", network.chainId, ")\n");
    
    // Deploy AED Enhanced Implementation
    const AEDEnhancedImplementation = await ethers.getContractFactory("AEDEnhancedImplementation");
    console.log("📋 Deploying AED Enhanced Implementation...");
    
    // Configuration
    const name = "Alsania Enhanced Domains";
    const symbol = "AED";
    const feeCollector = process.env.FEE_COLLECTOR || deployer.address;
    const admin = process.env.ADMIN_ADDRESS || deployer.address;
    
    console.log("Configuration:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Fee Collector:", feeCollector);
    console.log("- Admin:", admin);
    
    // Deploy proxy
    const aed = await upgrades.deployProxy(AEDEnhancedImplementation, [
        name,
        symbol,
        feeCollector,
        admin
    ], {
        initializer: "initialize",
        kind: "uups",
        timeout: 0 // Disable timeout for slow networks
    });
    
    await aed.waitForDeployment();
    const proxyAddress = await aed.getAddress();
    
    console.log("\n✅ AED Enhanced Domains deployed successfully!");
    console.log("📍 Proxy Address:", proxyAddress);
    
    // Get implementation address
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("🔧 Implementation Address:", implementationAddress);
    
    // Get admin address
    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("🔐 Admin Address:", adminAddress);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check basic info
    console.log("- Name:", await aed.name());
    console.log("- Symbol:", await aed.symbol());
    console.log("- Total domains:", (await aed.totalDomains()).toString());
    console.log("- Total revenue:", (await aed.totalRevenue()).toString());
    
    // Check roles
    const ADMIN_ROLE = await aed.ADMIN_ROLE();
    const FEE_MANAGER_ROLE = await aed.FEE_MANAGER_ROLE();
    const TLD_MANAGER_ROLE = await aed.TLD_MANAGER_ROLE();
    
    console.log("- Admin role granted:", await aed.hasRole(ADMIN_ROLE, admin));
    console.log("- Fee manager role granted:", await aed.hasRole(FEE_MANAGER_ROLE, admin));
    console.log("- TLD manager role granted:", await aed.hasRole(TLD_MANAGER_ROLE, admin));
    
    // Save deployment info
    const deploymentInfo = {
        network: {
            name: network.name,
            chainId: network.chainId
        },
        contracts: {
            proxy: proxyAddress,
            implementation: implementationAddress,
            admin: adminAddress
        },
        configuration: {
            name,
            symbol,
            feeCollector,
            admin
        },
        deployment: {
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            transactionHash: aed.deploymentTransaction().hash
        }
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info to file
    const deploymentFile = path.join(
        deploymentsDir, 
        `deployment-${network.chainId}-${Date.now()}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n💾 Deployment info saved to:", deploymentFile);
    
    // Verify on block explorers (if not on local network)
    if (network.chainId !== 1337 && network.chainId !== 31337) {
        console.log("\n🔍 Waiting for block confirmations...");
        await aed.deploymentTransaction().wait(5);
        
        try {
            console.log("\n📋 Verifying contract on block explorer...");
            await hre.run("verify:verify", {
                address: implementationAddress,
                constructorArguments: []
            });
            console.log("✅ Contract verified successfully!");
        } catch (error) {
            console.log("⚠️  Verification failed:", error.message);
            console.log("You can verify manually using:");
            console.log(`npx hardhat verify --network ${network.name} ${implementationAddress}`);
        }
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Update your frontend with the new contract address");
    console.log("2. Test the contract functionality");
    console.log("3. Configure TLDs and pricing as needed");
    console.log("4. Set up monitoring and alerts");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });