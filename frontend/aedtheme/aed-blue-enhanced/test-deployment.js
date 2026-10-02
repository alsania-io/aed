/**
 * AED Enhanced Domains - Deployment Testing Script
 * Comprehensive testing for domain and subdomain deployment
 */

const { ethers } = require('ethers');
require('dotenv').config();

class AEDDeploymentTester {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.deploymentResults = [];
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing AED Deployment Tester...');
            
            // Setup provider
            this.provider = new ethers.providers.JsonRpcProvider(process.env.AMOY_RPC);
            
            // Setup signer
            if (process.env.PRIVATE_KEY) {
                this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            } else {
                console.log('⚠️  No private key provided, using read-only mode');
                this.signer = this.provider;
            }
            
            // Load contract
            await this.loadContract();
            
            this.isInitialized = true;
            console.log('✅ Deployment tester initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize deployment tester:', error);
            throw error;
        }
    }

    async loadContract() {
        try {
            const contractAddress = process.env.CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('CONTRACT_ADDRESS not configured in environment');
            }

            // Load ABI (you'll need to replace this with your actual ABI)
            const contractABI = [
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function registerDomain(string name, string tld, bool enableSubdomains, string metadataURI) payable returns (uint256)",
                "function createSubdomain(uint256 parentId, string label, string metadataURI) payable returns (uint256)",
                "function getDomainInfo(uint256 tokenId) view returns (tuple)",
                "function calculateDomainCost(string name, string tld, bool enableSubdomains) view returns (uint256)",
                "function calculateSubdomainCost(uint256 parentId) view returns (uint256)",
                "function ownerOf(uint256 tokenId) view returns (address)",
                "function totalDomains() view returns (uint256)",
                "function totalRevenue() view returns (uint256)",
                "function paused() view returns (bool)"
            ];

            this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
            
            // Verify contract
            const name = await this.contract.name();
            const symbol = await this.contract.symbol();
            console.log(`📋 Contract loaded: ${name} (${symbol})`);
            
        } catch (error) {
            console.error('❌ Failed to load contract:', error);
            throw error;
        }
    }

    /**
     * Test 1: Single Domain Registration
     */
    async testSingleDomainRegistration() {
        console.log('\n🧪 Test 1: Single Domain Registration');
        
        try {
            const testData = {
                name: "testdomain",
                tld: "aed",
                enableSubdomains: true,
                metadataURI: "https://testdomain.aed/metadata.json"
            };

            console.log(`📝 Registering: ${testData.name}.${testData.tld}`);
            
            // Calculate cost
            const cost = await this.contract.calculateDomainCost(
                testData.name,
                testData.tld,
                testData.enableSubdomains
            );
            console.log(`💰 Estimated cost: ${ethers.utils.formatEther(cost)} MATIC`);

            // Check balance
            const balance = await this.signer.getBalance();
            console.log(`💳 Account balance: ${ethers.utils.formatEther(balance)} MATIC`);

            if (balance.lt(cost)) {
                console.log('⚠️  Insufficient balance for test. Skipping transaction.');
                return { success: false, error: 'Insufficient balance', estimatedCost: cost };
            }

            // Register domain
            console.log('🚀 Sending registration transaction...');
            const tx = await this.contract.registerDomain(
                testData.name,
                testData.tld,
                testData.enableSubdomains,
                testData.metadataURI,
                { value: cost }
            );

            console.log(`📤 Transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            console.log('⏳ Waiting for confirmation...');
            const receipt = await tx.wait();
            console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

            // Extract token ID
            const tokenId = this.extractTokenId(receipt);
            console.log(`🎯 Domain registered! Token ID: ${tokenId}`);

            // Verify registration
            const verification = await this.verifyDomain(tokenId, testData);
            
            return {
                success: true,
                tokenId: tokenId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                verification: verification,
                cost: cost
            };

        } catch (error) {
            console.error('❌ Single domain registration test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test 2: Batch Domain Registration
     */
    async testBatchDomainRegistration() {
        console.log('\n🧪 Test 2: Batch Domain Registration');
        
        try {
            const testDomains = [
                { name: "batch1", tld: "aed", enableSubdomains: false },
                { name: "batch2", tld: "alsania", enableSubdomains: true },
                { name: "batch3", tld: "fx", enableSubdomains: false }
            ];

            console.log('📝 Preparing batch registration...');
            testDomains.forEach((domain, index) => {
                console.log(`  ${index + 1}. ${domain.name}.${domain.tld} (subdomains: ${domain.enableSubdomains})`);
            });

            // Calculate individual costs
            let totalCost = ethers.BigNumber.from(0);
            for (let i = 0; i < testDomains.length; i++) {
                const cost = await this.contract.calculateDomainCost(
                    testDomains[i].name,
                    testDomains[i].tld,
                    testDomains[i].enableSubdomains
                );
                totalCost = totalCost.add(cost);
                console.log(`  ${testDomains[i].name}.${testDomains[i].tld}: ${ethers.utils.formatEther(cost)} MATIC`);
            }
            console.log(`💰 Total estimated cost: ${ethers.utils.formatEther(totalCost)} MATIC`);

            // Check balance
            const balance = await this.signer.getBalance();
            if (balance.lt(totalCost)) {
                console.log('⚠️  Insufficient balance for batch test. Skipping transaction.');
                return { success: false, error: 'Insufficient balance', estimatedCost: totalCost };
            }

            // Prepare batch data
            const names = testDomains.map(d => d.name);
            const tlds = testDomains.map(d => d.tld);
            const features = testDomains.map(d => d.enableSubdomains);
            const metadata = testDomains.map(() => "");

            // Execute batch registration
            console.log('🚀 Sending batch registration transaction...');
            const tx = await this.contract.batchRegisterDomains(
                names,
                tlds,
                features,
                metadata,
                { value: totalCost }
            );

            console.log(`📤 Batch transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            console.log('⏳ Waiting for confirmation...');
            const receipt = await tx.wait();
            console.log(`✅ Batch transaction confirmed in block ${receipt.blockNumber}`);

            // Extract token IDs
            const tokenIds = this.extractBatchTokenIds(receipt);
            console.log(`🎯 Batch registration complete! Token IDs:`, tokenIds);

            return {
                success: true,
                tokenIds: tokenIds,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                cost: totalCost
            };

        } catch (error) {
            console.error('❌ Batch domain registration test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test 3: Subdomain Creation
     */
    async testSubdomainCreation(parentTokenId) {
        console.log(`\n🧪 Test 3: Subdomain Creation (Parent: ${parentTokenId})`);
        
        try {
            // Verify parent domain has subdomain feature
            const parentInfo = await this.contract.getDomainInfo(parentTokenId);
            console.log(`📋 Parent domain: ${parentInfo.fullDomain}`);
            
            const testData = {
                parentId: parentTokenId,
                label: "blog",
                metadataURI: `https://blog.${parentInfo.fullDomain}/metadata.json`
            };

            console.log(`📝 Creating subdomain: ${testData.label}.${parentInfo.fullDomain}`);

            // Calculate subdomain cost
            const cost = await this.contract.calculateSubdomainCost(testData.parentId);
            console.log(`💰 Subdomain cost: ${ethers.utils.formatEther(cost)} MATIC`);

            // Check balance
            const balance = await this.signer.getBalance();
            if (balance.lt(cost)) {
                console.log('⚠️  Insufficient balance for subdomain test. Skipping transaction.');
                return { success: false, error: 'Insufficient balance', estimatedCost: cost };
            }

            // Create subdomain
            console.log('🚀 Sending subdomain creation transaction...');
            const tx = await this.contract.createSubdomain(
                testData.parentId,
                testData.label,
                testData.metadataURI,
                { value: cost }
            );

            console.log(`📤 Subdomain transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            console.log('⏳ Waiting for confirmation...');
            const receipt = await tx.wait();
            console.log(`✅ Subdomain creation confirmed in block ${receipt.blockNumber}`);

            // Extract subdomain token ID
            const subdomainTokenId = this.extractTokenId(receipt);
            console.log(`🎯 Subdomain created! Token ID: ${subdomainTokenId}`);

            // Verify subdomain
            const verification = await this.verifySubdomain(subdomainTokenId, testData, parentInfo);
            
            return {
                success: true,
                tokenId: subdomainTokenId,
                fullDomain: `${testData.label}.${parentInfo.fullDomain}`,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                verification: verification,
                cost: cost
            };

        } catch (error) {
            console.error('❌ Subdomain creation test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test 4: Domain Verification
     */
    async verifyDomain(tokenId, expectedData) {
        console.log(`\n🔍 Verifying domain ${tokenId}...`);
        
        try {
            const domainInfo = await this.contract.getDomainInfo(tokenId);
            
            console.log('📋 Domain Information:');
            console.log(`  Name: ${domainInfo.name}`);
            console.log(`  TLD: ${domainInfo.tld}`);
            console.log(`  Full Domain: ${domainInfo.fullDomain}`);
            console.log(`  Owner: ${domainInfo.owner}`);
            console.log(`  Features: ${domainInfo.features}`);
            console.log(`  Is Subdomain: ${domainInfo.isSubdomain}`);
            console.log(`  Created At: ${new Date(domainInfo.createdAt * 1000)}`);

            // Verify ownership
            const owner = await this.contract.ownerOf(tokenId);
            console.log(`👤 Verified owner: ${owner}`);

            // Validation checks
            const validations = {
                name: domainInfo.name === expectedData.name,
                tld: domainInfo.tld === expectedData.tld,
                fullDomain: domainInfo.fullDomain === `${expectedData.name}.${expectedData.tld}`,
                owner: domainInfo.owner.toLowerCase() === this.signer.address.toLowerCase(),
                features: domainInfo.features === (expectedData.enableSubdomains ? 1 : 0),
                isSubdomain: domainInfo.isSubdomain === false
            };

            const allValid = Object.values(validations).every(v => v === true);
            console.log(`✅ Domain verification: ${allValid ? 'PASSED' : 'FAILED'}`);

            return {
                success: allValid,
                domainInfo: domainInfo,
                owner: owner,
                validations: validations
            };

        } catch (error) {
            console.error('❌ Domain verification failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test 5: System Health Check
     */
    async testSystemHealth() {
        console.log('\n🔍 System Health Check');
        
        try {
            const results = {};
            
            // Test contract state
            try {
                const totalDomains = await this.contract.totalDomains();
                const totalRevenue = await this.contract.totalRevenue();
                const isPaused = await this.contract.paused();
                
                results.contractState = {
                    totalDomains: totalDomains.toString(),
                    totalRevenue: ethers.utils.formatEther(totalRevenue),
                    isPaused: isPaused,
                    success: true
                };
                
                console.log(`📊 Total domains: ${totalDomains}`);
                console.log(`💰 Total revenue: ${ethers.utils.formatEther(totalRevenue)} MATIC`);
                console.log(`⏸️  Contract paused: ${isPaused}`);
                
            } catch (error) {
                results.contractState = { success: false, error: error.message };
                console.error('❌ Contract state check failed:', error);
            }
            
            // Test network connectivity
            try {
                const blockNumber = await this.provider.getBlockNumber();
                const gasPrice = await this.provider.getGasPrice();
                
                results.network = {
                    blockNumber: blockNumber,
                    gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
                    success: true
                };
                
                console.log(`🌐 Current block: ${blockNumber}`);
                console.log(`⛽ Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
                
            } catch (error) {
                results.network = { success: false, error: error.message };
                console.error('❌ Network check failed:', error);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ System health check failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run All Tests
     */
    async runAllTests() {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 AED ENHANCED DOMAINS - COMPLETE TEST SUITE');
        console.log('='.repeat(60) + '\n');
        
        const results = {
            timestamp: new Date().toISOString(),
            network: await this.provider.getNetwork(),
            signer: this.signer.address,
            tests: {}
        };
        
        try {
            // System health check
            results.tests.systemHealth = await this.testSystemHealth();
            
            // Single domain registration
            results.tests.singleDomain = await this.testSingleDomainRegistration();
            
            // Batch domain registration (if single was successful)
            if (results.tests.singleDomain.success) {
                results.tests.batchDomain = await this.testBatchDomainRegistration();
            }
            
            // Subdomain creation (if we have a parent domain)
            if (results.tests.singleDomain.success && results.tests.singleDomain.tokenId) {
                results.tests.subdomain = await this.testSubdomainCreation(results.tests.singleDomain.tokenId);
            }
            
            // Generate test report
            this.generateTestReport(results);
            
            return results;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            results.error = error.message;
            return results;
        }
    }

    /**
     * Helper Functions
     */
    extractTokenId(receipt) {
        // Extract token ID from transaction receipt
        const domainRegisteredEvent = receipt.events?.find(e => e.event === 'DomainRegistered');
        return domainRegisteredEvent?.args?.tokenId?.toString() || 'unknown';
    }

    extractBatchTokenIds(receipt) {
        // Extract multiple token IDs from batch transaction
        const events = receipt.events?.filter(e => e.event === 'DomainRegistered') || [];
        return events.map(e => e.args?.tokenId?.toString());
    }

    generateTestReport(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        
        let passedTests = 0;
        let totalTests = 0;
        
        Object.entries(results.tests).forEach(([testName, result]) => {
            totalTests++;
            if (result.success) {
                passedTests++;
                console.log(`✅ ${testName}: PASSED`);
            } else {
                console.log(`❌ ${testName}: FAILED - ${result.error}`);
            }
        });
        
        console.log(`\n📈 Success Rate: ${passedTests}/${totalTests} (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
        console.log('='.repeat(60));
    }
}

/**
 * Run the test suite
 */
async function runTests() {
    const tester = new AEDDeploymentTester();
    
    try {
        await tester.init();
        const results = await tester.runAllTests();
        
        // Save results to file
        const fs = require('fs');
        const resultsFile = `test-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log(`\n💾 Test results saved to: ${resultsFile}`);
        
        // Exit with appropriate code
        process.exit(results.tests.systemHealth?.success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = AEDDeploymentTester;