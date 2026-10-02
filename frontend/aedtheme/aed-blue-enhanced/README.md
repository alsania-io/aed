# AED Enhanced Domains - v2.0.0

A comprehensive, upgradeable, and optimized domain system built on Ethereum with advanced features, security, and user experience enhancements.

## 🌟 Features

### Core Features
- **UUPS Upgradeable Architecture**: Future-proof design with transparent upgrade mechanism
- **Modular Contract Structure**: Clean separation of concerns with reusable components
- **Enhanced Security**: Comprehensive access control, reentrancy protection, and emergency pause
- **Gas Optimization**: Optimized for cost efficiency with batch operations and efficient storage

### Domain Management
- **Multi-TLD Support**: Support for various TLDs (.aed, .alsa, .07, .alsania, .fx, .echo)
- **Subdomain Creation**: Hierarchical domain structure with progressive pricing
- **Batch Operations**: Register multiple domains in a single transaction
- **Feature Upgrades**: Add features like subdomain support post-registration

### User Experience
- **Reverse Resolution**: Map addresses to human-readable domains
- **Enhanced Metadata**: Rich JSON metadata with SVG images
- **Flexible Pricing**: Configurable pricing per TLD and feature
- **Refund Mechanism**: Automatic refunds for overpayments

### Security & Governance
- **Role-Based Access Control**: Granular permissions with multiple roles
- **Emergency Pause**: Circuit breaker for critical situations
- **Revenue Management**: Transparent revenue collection and withdrawal
- **Upgrade Authorization**: Secure upgrade mechanism

## 🏗️ Architecture

### Contract Structure
```
contracts/
├── AEDEnhancedImplementation.sol    # Main implementation
├── core/
│   └── AEDConstants.sol            # Constants and events
├── storage/
│   └── AEDStorage.sol              # Storage layout
├── libraries/
│   ├── LibValidation.sol           # Domain validation
│   └── LibPricing.sol              # Pricing calculations
├── interfaces/                     # Interface definitions
├── modules/                        # Modular components
└── utils/                          # Utility contracts
```

### Storage Layout
- **EIP-1967 Compliant**: Standardized storage pattern
- **Modular Storage**: Separate storage for different concerns
- **Upgrade Safe**: Storage structure designed for upgrades

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- Hardhat

### Installation
```bash
# Clone repository
git clone <repository-url>
cd aed-enhanced

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Configuration
Create `.env` file:
```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here
AMOY_RPC=https://rpc-amoy.polygon.technology
POLYGONSCAN_API_KEY=your_api_key_here

# Deployment Configuration
FEE_COLLECTOR=0x...your_fee_collector_address
ADMIN_ADDRESS=0x...your_admin_address

# Optional
COINMARKETCAP_API_KEY=your_api_key_here
```

### Deployment
```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet
```

## 📋 Contract Methods

### User Methods
- `registerDomain(name, tld, enableSubdomains, metadataURI)` - Register a new domain
- `batchRegisterDomains(names, tlds, enableSubdomains, metadataURIs)` - Register multiple domains
- `createSubdomain(parentId, label, metadataURI)` - Create a subdomain
- `upgradeFeature(tokenId, featureName)` - Upgrade domain features
- `setReverseRecord(domain)` - Set reverse resolution
- `clearReverseRecord()` - Clear reverse resolution

### Admin Methods
- `updateFeeCollector(newCollector)` - Update fee collection address
- `withdrawRevenue(amount)` - Withdraw accumulated revenue
- `pause()` - Pause contract operations
- `unpause()` - Resume contract operations

### View Methods
- `getDomainInfo(tokenId)` - Get domain details
- `getUserDomains(user)` - Get user's domains
- `getPricingSummary()` - Get current pricing
- `totalDomains()` - Get total registered domains
- `totalRevenue()` - Get total revenue collected

## 💰 Pricing Structure

### TLD Pricing
| TLD | Price | Status |
|-----|--------|--------|
| .aed | Free | Active |
| .alsa | Free | Active |
| .07 | Free | Active |
| .alsania | 1 ETH | Active |
| .fx | 1 ETH | Active |
| .echo | 1 ETH | Active |

### Feature Pricing
| Feature | Price | Description |
|---------|--------|-------------|
| Subdomain | 2 ETH | Enable subdomain creation |
| BYO (Bring Your Own) | 5 ETH | External domain integration |

## 🔒 Security Features

### Access Control
- **DEFAULT_ADMIN_ROLE**: Full administrative access
- **ADMIN_ROLE**: Administrative functions
- **FEE_MANAGER_ROLE**: Fee management
- **TLD_MANAGER_ROLE**: TLD configuration
- **UPGRADER_ROLE**: Contract upgrades
- **PAUSER_ROLE**: Emergency pause
- **MINTER_ROLE**: Domain minting

### Security Measures
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **AccessControl**: Role-based permissions
- **Input Validation**: Comprehensive input validation
- **Overflow Protection**: Safe math operations

## 🧪 Testing

### Test Coverage
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run gas reporter
npm run test:gas

# Run specific test file
npx hardhat test test/AEDEnhanced.test.js
```

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: Multi-function scenarios
- **Security Tests**: Security vulnerability testing
- **Gas Tests**: Gas consumption analysis
- **Upgrade Tests**: Upgrade mechanism testing

## 📊 Gas Optimization

### Optimization Features
- **Efficient Storage**: Packed storage slots
- **Batch Operations**: Reduced per-transaction costs
- **Optimized Loops**: Minimized gas consumption
- **Caching**: Reduced storage reads

### Gas Usage Examples
- **Single Domain Registration**: ~150,000 gas
- **Batch Registration (3 domains)**: ~300,000 gas
- **Subdomain Creation**: ~80,000 gas
- **Feature Upgrade**: ~50,000 gas

## 🔄 Upgrade Process

### Prerequisites
- Deployer must have UPGRADER_ROLE
- New implementation must be compatible
- Storage layout must be preserved

### Upgrade Steps
1. Deploy new implementation
2. Verify new implementation
3. Execute upgrade transaction
4. Test all functionality

### Upgrade Script
```bash
# Set environment variables
export PROXY_ADDRESS=0x...your_proxy_address

# Run upgrade
npm run upgrade:testnet
```

## 📈 Monitoring & Analytics

### Key Metrics
- **Total Domains Registered**
- **Total Revenue Collected**
- **Average Registration Cost**
- **Feature Upgrade Rate**
- **Subdomain Creation Rate**

### Monitoring Tools
- **Hardhat Gas Reporter**: Gas usage analysis
- **Contract Sizer**: Contract size monitoring
- **Coverage Reports**: Test coverage tracking

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
npm install

# Set up pre-commit hooks
npm run prepare

# Run linter
npm run lint

# Format code
npm run format
```

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Documentation**: [docs](./docs)
- **Deployments**: [deployments](./deployments)
- **Tests**: [test](./test)
- **Issues**: [GitHub Issues](https://github.com/SigmaSauer07/aed/issues)

## 📞 Support

For support and questions:
- **GitHub Issues**: Create an issue for bug reports
- **Documentation**: Check the docs directory
- **Community**: Join our Discord/Slack channels

---

**Built with ❤️ by the Alsania team**