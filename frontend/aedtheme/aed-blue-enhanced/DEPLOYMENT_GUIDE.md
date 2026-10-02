# AED Enhanced Domains - Complete Deployment Guide

## 🚀 Overview
This guide provides step-by-step instructions for deploying and testing domains and subdomains through the AED frontend, including configuration, security best practices, and performance optimization.

## 📋 Prerequisites

### **System Requirements**
- Node.js v18+ and npm
- MetaMask or compatible Web3 wallet
- Git for version control
- Modern web browser (Chrome, Firefox, Safari, Edge)

### **Knowledge Requirements**
- Basic understanding of Web3/Blockchain
- Familiarity with Ethereum transactions
- Understanding of domain registration concepts

## 🔧 Step 1: Environment Setup

### **1.1 Clone and Setup Repository**
```bash
# Clone the enhanced frontend
git clone <your-repository-url> aed-frontend
cd aed-frontend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env
```

### **1.2 Configure Environment Variables**
Edit `.env` file with your specific configuration:

```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here_without_0x_prefix
AMOY_RPC=https://rpc-amoy.polygon.technology
POLYGON_RPC=https://polygon-rpc.com

# API Keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here

# Deployment Configuration
FEE_COLLECTOR=0x...your_fee_collector_address
ADMIN_ADDRESS=0x...your_admin_address
CONTRACT_ADDRESS=0x...your_deployed_contract_address

# Frontend Configuration
REACT_APP_CONTRACT_ADDRESS=0x...your_contract_address
REACT_APP_NETWORK_ID=80002
REACT_APP_RPC_URL=https://rpc-amoy.polygon.technology
```

### **1.3 Build Frontend**
```bash
# Compile contracts (if needed)
npx hardhat compile

# Build frontend
npm run build

# Start development server
npm run dev
```

## 🎯 Step 2: Contract Configuration

### **2.1 Load Contract ABI**
Ensure your contract ABI is properly loaded in the frontend:

```javascript
// In contract-interface.js
const CONTRACT_ABI = [
  // Your complete contract ABI here
  "function registerDomain(string name, string tld, bool enableSubdomains, string metadataURI) payable returns (uint256)",
  "function createSubdomain(uint256 parentId, string label, string metadataURI) payable returns (uint256)",
  "function getDomainInfo(uint256 tokenId) view returns (tuple)",
  // ... other functions
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
```

### **2.2 Verify Contract Deployment**
```javascript
// Test contract connection
async function verifyContract() {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log(`✅ Contract connected: ${name} (${symbol})`);
    return true;
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    return false;
  }
}
```

## 🌐 Step 3: Domain Deployment

### **3.1 Connect Wallet**
1. Open the frontend in your browser
2. Click "Connect Wallet" button
3. Select your preferred wallet (MetaMask, etc.)
4. Approve connection and switch to correct network

### **3.2 Domain Registration Process**

#### **Single Domain Registration**
```javascript
// Example registration flow
async function registerDomain() {
  try {
    // 1. Validate inputs
    const domainName = "mydomain";
    const tld = "aed";
    const enableSubdomains = true;
    const metadataURI = "https://mydomain.aed/metadata.json";
    
    // 2. Calculate cost
    const cost = await contract.calculateDomainCost(domainName, tld, enableSubdomains);
    console.log(`Domain cost: ${ethers.utils.formatEther(cost)} MATIC`);
    
    // 3. Register domain
    const tx = await contract.registerDomain(
      domainName,
      tld,
      enableSubdomains,
      metadataURI,
      { value: cost }
    );
    
    console.log(`📝 Transaction sent: ${tx.hash}`);
    
    // 4. Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Domain registered! Token ID: ${receipt.events[0].args.tokenId}`);
    
    return receipt;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
}
```

#### **Batch Domain Registration**
```javascript
// Batch registration for multiple domains
async function registerBatchDomains() {
  const domains = [
    { name: "domain1", tld: "aed", enableSubdomains: false },
    { name: "domain2", tld: "alsania", enableSubdomains: true },
    { name: "domain3", tld: "fx", enableSubdomains: false }
  ];
  
  try {
    const contract = window.web3Provider.getContract();
    
    // Prepare batch data
    const names = domains.map(d => d.name);
    const tlds = domains.map(d => d.tld);
    const features = domains.map(d => d.enableSubdomains);
    const metadata = domains.map(() => "");
    
    // Calculate total cost
    let totalCost = ethers.BigNumber.from(0);
    for (let i = 0; i < domains.length; i++) {
      const cost = await contract.calculateDomainCost(names[i], tlds[i], features[i]);
      totalCost = totalCost.add(cost);
    }
    
    // Execute batch registration
    const tx = await contract.batchRegisterDomains(
      names,
      tlds,
      features,
      metadata,
      { value: totalCost }
    );
    
    console.log(`📦 Batch transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Extract token IDs
    const tokenIds = receipt.events
      .filter(e => e.event === 'DomainRegistered')
      .map(e => e.args.tokenId);
    
    console.log(`✅ Batch registration complete! Token IDs: ${tokenIds}`);
    return { receipt, tokenIds };
    
  } catch (error) {
    console.error('❌ Batch registration failed:', error);
    throw error;
  }
}
```

## 🏠 Step 4: Subdomain Deployment

### **4.1 Create Subdomain**
```javascript
async function createSubdomain() {
  try {
    // 1. Get parent domain info
    const parentDomainId = 1; // Token ID of parent domain
    const subdomainLabel = "blog";
    const metadataURI = "https://blog.mydomain.aed/metadata.json";
    
    // 2. Verify parent domain has subdomain feature
    const parentInfo = await contract.getDomainInfo(parentDomainId);
    if (!parentInfo.features.includes('subdomain')) {
      throw new Error('Parent domain does not have subdomain feature enabled');
    }
    
    // 3. Calculate subdomain cost
    const subCost = await contract.calculateSubdomainCost(parentDomainId);
    console.log(`Subdomain cost: ${ethers.utils.formatEther(subCost)} MATIC`);
    
    // 4. Create subdomain
    const tx = await contract.createSubdomain(
      parentDomainId,
      subdomainLabel,
      metadataURI,
      { value: subCost }
    );
    
    console.log(`🏠 Subdomain transaction sent: ${tx.hash}`);
    
    // 5. Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Subdomain created! Full domain: ${subdomainLabel}.${parentInfo.fullDomain}`);
    
    return receipt;
    
  } catch (error) {
    console.error('❌ Subdomain creation failed:', error);
    throw error;
  }
}
```

## 🧪 Step 5: Testing & Validation

### **5.1 Domain Verification**
```javascript
// Verify domain registration
async function verifyDomain(tokenId) {
  try {
    const domainInfo = await contract.getDomainInfo(tokenId);
    
    console.log('📋 Domain Information:');
    console.log(`  Name: ${domainInfo.name}`);
    console.log(`  TLD: ${domainInfo.tld}`);
    console.log(`  Full Domain: ${domainInfo.fullDomain}`);
    console.log(`  Owner: ${domainInfo.owner}`);
    console.log(`  Features: ${domainInfo.features}`);
    console.log(`  Created: ${new Date(domainInfo.createdAt * 1000)}`);
    
    // Verify ownership
    const owner = await contract.ownerOf(tokenId);
    console.log(`✅ Verified owner: ${owner}`);
    
    return domainInfo;
    
  } catch (error) {
    console.error('❌ Domain verification failed:', error);
    throw error;
  }
}

// Verify subdomain
async function verifySubdomain(subdomainTokenId) {
  try {
    const subdomainInfo = await contract.getDomainInfo(subdomainTokenId);
    const parentInfo = await contract.getDomainInfo(subdomainInfo.parentId);
    
    console.log('🏠 Subdomain Information:');
    console.log(`  Name: ${subdomainInfo.name}`);
    console.log(`  Full Domain: ${subdomainInfo.fullDomain}`);
    console.log(`  Parent: ${parentInfo.fullDomain}`);
    console.log(`  Is Subdomain: ${subdomainInfo.isSubdomain}`);
    
    return subdomainInfo;
    
  } catch (error) {
    console.error('❌ Subdomain verification failed:', error);
    throw error;
  }
}
```

### **5.2 Reverse Resolution Testing**
```javascript
// Test reverse resolution
async function testReverseResolution() {
  try {
    const userAddress = window.web3Provider.userAddress;
    const domainName = "mydomain.aed";
    
    // Set reverse record
    const tx = await contract.setReverseRecord(domainName);
    await tx.wait();
    
    // Verify reverse resolution
    const reverseDomain = await contract.getReverse(userAddress);
    console.log(`🔄 Reverse resolution set: ${reverseDomain}`);
    
    // Verify reverse owner
    const reverseOwner = await contract.getReverseOwner(domainName);
    console.log(`✅ Reverse owner verified: ${reverseOwner}`);
    
  } catch (error) {
    console.error('❌ Reverse resolution test failed:', error);
    throw error;
  }
}
```

## 🔒 Step 6: Security Best Practices

### **6.1 Input Validation**
```javascript
// Comprehensive input validation
function validateDomainInput(name, tld) {
  const errors = [];
  
  // Name validation
  if (!name || name.length < 1 || name.length > 63) {
    errors.push('Domain name must be 1-63 characters');
  }
  
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push('Domain name can only contain lowercase letters, numbers, and hyphens');
  }
  
  if (name.startsWith('-') || name.endsWith('-')) {
    errors.push('Domain name cannot start or end with a hyphen');
  }
  
  // TLD validation
  const validTLDs = ['aed', 'alsa', '07', 'alsania', 'fx', 'echo'];
  if (!validTLDs.includes(tld)) {
    errors.push('Invalid TLD selected');
  }
  
  return errors;
}

// Real-time validation
function setupRealTimeValidation() {
  const domainInput = document.getElementById('domainNameInput');
  
  domainInput.addEventListener('input', (e) => {
    const name = e.target.value;
    const validation = validateDomainInput(name, selectedTLD);
    
    const validationIcon = document.getElementById('nameValidationIcon');
    const validationText = document.getElementById('nameValidationText');
    
    if (validation.length === 0) {
      validationIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
      validationIcon.className = 'validation-icon valid';
      validationText.textContent = 'Valid domain name';
    } else {
      validationIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
      validationIcon.className = 'validation-icon invalid';
      validationText.textContent = validation[0];
    }
  });
}
```

### **6.2 Transaction Security**
```javascript
// Secure transaction handling
async function secureTransaction(functionName, params, options = {}) {
  try {
    // 1. Estimate gas with buffer
    const gasEstimate = await contract.estimateGas[functionName](...params);
    const gasLimit = gasEstimate.mul(110).div(100); // 10% buffer
    
    // 2. Get current gas price
    const gasPrice = await provider.getGasPrice();
    
    // 3. Validate sufficient balance
    const balance = await signer.getBalance();
    const txCost = gasLimit.mul(gasPrice).add(options.value || 0);
    
    if (balance.lt(txCost)) {
      throw new Error('Insufficient balance for transaction');
    }
    
    // 4. Execute transaction with security parameters
    const tx = await contract[functionName](...params, {
      gasLimit,
      gasPrice,
      ...options
    });
    
    console.log(`🔒 Secure transaction sent: ${tx.hash}`);
    console.log(`⛽ Gas limit: ${gasLimit.toString()}`);
    console.log(`💰 Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
    
    return tx;
    
  } catch (error) {
    console.error('❌ Secure transaction failed:', error);
    throw error;
  }
}
```

### **6.3 Network Validation**
```javascript
// Network validation
async function validateNetwork() {
  try {
    const network = await provider.getNetwork();
    const expectedChainId = 80002; // Polygon Amoy
    
    if (network.chainId !== expectedChainId) {
      throw new Error(`Please switch to Polygon Amoy network (Chain ID: ${expectedChainId})`);
    }
    
    console.log(`✅ Network validated: ${network.name} (${network.chainId})`);
    return true;
    
  } catch (error) {
    console.error('❌ Network validation failed:', error);
    throw error;
  }
}
```

## ⚡ Step 7: Performance Optimization

### **7.1 Gas Optimization**
```javascript
// Optimize gas usage
async function optimizeGasUsage() {
  try {
    const contract = window.web3Provider.getContract();
    
    // Batch operations when possible
    if (domains.length > 1) {
      return await contract.batchRegisterDomains(names, tlds, features, metadata);
    }
    
    // Use off-peak hours for transactions
    const gasPrice = await provider.getGasPrice();
    const currentTime = new Date().getHours();
    
    // Adjust gas price based on network congestion
    let adjustedGasPrice = gasPrice;
    if (currentTime >= 9 && currentTime <= 17) {
      // Peak hours - use standard gas price
      adjustedGasPrice = gasPrice;
    } else {
      // Off-peak hours - reduce gas price slightly
      adjustedGasPrice = gasPrice.mul(95).div(100);
    }
    
    return adjustedGasPrice;
    
  } catch (error) {
    console.error('❌ Gas optimization failed:', error);
    throw error;
  }
}
```

### **7.2 Frontend Performance**
```javascript
// Optimize frontend performance
function optimizeFrontend() {
  // Lazy load heavy components
  const lazyComponents = document.querySelectorAll('[data-lazy]');
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('loaded');
        lazyObserver.unobserve(entry.target);
      }
    });
  });
  
  lazyComponents.forEach(comp => lazyObserver.observe(comp));
  
  // Debounce expensive operations
  const debouncedSearch = debounce((query) => {
    performSearch(query);
  }, 300);
  
  // Optimize animations
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.6s ease-out';
        animationObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  animatedElements.forEach(el => animationObserver.observe(el));
}
```

## 🐛 Step 8: Troubleshooting Guide

### **8.1 Common Issues and Solutions**

#### **Wallet Connection Issues**
```javascript
// Wallet connection troubleshooting
async function troubleshootWallet() {
  console.log('🔍 Troubleshooting wallet connection...');
  
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    console.error('❌ MetaMask not detected');
    window.glassUI.showNotification('Please install MetaMask extension', 'error');
    return;
  }
  
  // Check if wallet is connected
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  if (accounts.length === 0) {
    console.log('ℹ️ Wallet not connected, requesting connection...');
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('✅ Wallet connected successfully');
    } catch (error) {
      console.error('❌ User rejected wallet connection:', error);
      window.glassUI.showNotification('Please connect your wallet to continue', 'warning');
    }
  }
  
  // Check network
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== '0x13882') { // Polygon Amoy
    console.log('ℹ️ Wrong network detected, requesting switch...');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }]
      });
      console.log('✅ Network switched successfully');
    } catch (error) {
      console.error('❌ Failed to switch network:', error);
      window.glassUI.showNotification('Please switch to Polygon Amoy network', 'warning');
    }
  }
}
```

#### **Transaction Failures**
```javascript
// Transaction failure troubleshooting
async function troubleshootTransaction(error, txHash) {
  console.error('🔍 Troubleshooting transaction failure:', error);
  
  // Common error patterns
  const errorPatterns = {
    'insufficient funds': 'Insufficient MATIC balance for transaction',
    'user denied': 'Transaction was rejected by user',
    'network error': 'Network connection issue',
    'timeout': 'Transaction timed out',
    'revert': 'Smart contract execution failed'
  };
  
  // Identify error type
  let userMessage = 'Transaction failed';
  for (const [pattern, message] of Object.entries(errorPatterns)) {
    if (error.message.toLowerCase().includes(pattern)) {
      userMessage = message;
      break;
    }
  }
  
  // Provide specific guidance
  if (error.message.includes('insufficient funds')) {
    const balance = await provider.getBalance(signer.getAddress());
    const requiredGas = ethers.utils.parseEther('0.01'); // Estimate
    userMessage = `Insufficient balance. You need at least ${ethers.utils.formatEther(requiredGas)} MATIC for gas fees`;
  }
  
  if (error.message.includes('revert')) {
    // Extract revert reason if available
    const revertReason = await extractRevertReason(txHash);
    if (revertReason) {
      userMessage = `Transaction failed: ${revertReason}`;
    }
  }
  
  window.glassUI.showNotification(userMessage, 'error');
}
```

#### **Gas Estimation Issues**
```javascript
// Gas estimation troubleshooting
async function troubleshootGasEstimation() {
  try {
    const gasPrice = await provider.getGasPrice();
    const balance = await signer.getBalance();
    
    console.log(`⛽ Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} MATIC`);
    
    // Check if gas price is unusually high
    const normalGasPrice = ethers.utils.parseUnits('50', 'gwei');
    if (gasPrice.gt(normalGasPrice.mul(2))) {
      console.warn('⚠️ Gas price is unusually high');
      window.glassUI.showNotification('Network is busy. Consider waiting for lower gas prices', 'warning');
    }
    
    // Estimate transaction cost
    const estimatedGas = 200000; // Rough estimate
    const estimatedCost = gasPrice.mul(estimatedGas);
    
    if (balance.lt(estimatedCost)) {
      console.error('❌ Insufficient balance for estimated gas cost');
      window.glassUI.showNotification(`Insufficient balance. Need ~${ethers.utils.formatEther(estimatedCost)} MATIC for gas`, 'error');
    }
    
  } catch (error) {
    console.error('❌ Gas estimation troubleshooting failed:', error);
  }
}
```

### **8.2 Performance Issues**
```javascript
// Performance monitoring
function monitorPerformance() {
  // Monitor Core Web Vitals
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`📊 ${entry.name}: ${entry.duration}ms`);
      
      if (entry.duration > 1000) {
        console.warn(`⚠️ Slow ${entry.name}: ${entry.duration}ms`);
        window.glassUI.showNotification(`Slow loading detected for ${entry.name}`, 'warning');
      }
    }
  }).observe({ entryTypes: ['measure', 'navigation'] });
  
  // Monitor memory usage
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // Convert to MB
      if (memoryUsage > 100) { // 100MB threshold
        console.warn(`⚠️ High memory usage: ${memoryUsage.toFixed(2)}MB`);
      }
    }, 30000); // Check every 30 seconds
  }
}
```

## 📊 Step 9: Testing Checklist

### **9.1 Functional Testing**
```markdown
- [ ] Wallet connection and network switching
- [ ] Single domain registration with various TLDs
- [ ] Batch domain registration (multiple domains)
- [ ] Subdomain creation and management
- [ ] Reverse resolution setup and verification
- [ ] Domain transfer functionality
- [ ] Metadata updates and retrieval
- [ ] Portfolio management and filtering
- [ ] Search functionality and results
- [ ] Admin functions and permissions
- [ ] Emergency controls and logging
- [ ] Analytics and reporting features
```

### **9.2 Security Testing**
```markdown
- [ ] Input validation for all forms
- [ ] Transaction confirmation dialogs
- [ ] Network validation and switching
- [ ] Permission checks for admin functions
- [ ] Emergency action confirmations
- [ ] Gas estimation accuracy
- [ ] Balance validation before transactions
- [ ] Address validation and checksums
- [ ] XSS prevention in all inputs
- [ ] CSRF protection implementation
```

### **9.3 Performance Testing**
```markdown
- [ ] Page load times (< 3 seconds)
- [ ] Transaction processing speed
- [ ] Animation smoothness (60 FPS)
- [ ] Memory usage monitoring
- [ ] Mobile performance optimization
- [ ] Network throttling tests
- [ ] Concurrent user handling
- [ ] Large dataset performance
- [ ] Animation performance on low-end devices
- [ ] Battery usage optimization
```

### **9.4 Cross-browser Testing**
```markdown
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Tablet browsers (iPad Safari, Android Chrome)
```

## 🎯 Step 10: Production Deployment

### **10.1 Pre-deployment Checklist**
```bash
# 1. Security audit
npm audit
npm audit fix

# 2. Code quality check
npm run lint
npm run format

# 3. Build optimization
npm run build
npm run optimize

# 4. Performance audit
npm run lighthouse
npm run analyze
```

### **10.2 Deployment Configuration**
```bash
# Production environment variables
NODE_ENV=production
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ANALYTICS_ID=your_analytics_id
REACT_APP_SENTRY_DSN=your_sentry_dsn
```

### **10.3 Deployment Commands**
```bash
# Build for production
npm run build

# Deploy to hosting service
npm run deploy:production

# Verify deployment
npm run verify:deployment
```

## 📈 Post-Deployment Monitoring

### **11.1 Performance Monitoring**
```javascript
// Set up monitoring
function setupMonitoring() {
  // Error tracking
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Send to error tracking service
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Send to error tracking service
  });
  
  // Performance monitoring
  setInterval(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    console.log(`📊 Page load time: ${navigation.loadEventEnd - navigation.fetchStart}ms`);
    console.log(`📊 First paint: ${paint.find(p => p.name === 'first-paint')?.startTime}ms`);
  }, 60000); // Every minute
}
```

## 🎉 Conclusion

You now have a complete, production-ready deployment guide for the AED Enhanced Domains frontend. The system provides:

- ✅ **Complete Domain Deployment**: Single and batch registration
- ✅ **Subdomain Management**: Hierarchical domain structure
- ✅ **Security Best Practices**: Input validation and transaction security
- ✅ **Performance Optimization**: Gas efficiency and frontend optimization
- ✅ **Comprehensive Testing**: Complete testing checklist
- ✅ **Production Ready**: Deployment and monitoring procedures

The frontend is designed to provide an exceptional user experience while maintaining the highest standards of security and performance. Follow this guide step-by-step for a successful deployment.

---

**Status**: ✅ **Ready for Production Deployment**  
**Last Updated**: October 2025  
**Compatibility**: Modern browsers and Web3 wallets  
**Security**: Industry best practices implemented  
**Performance**: Optimized for production use