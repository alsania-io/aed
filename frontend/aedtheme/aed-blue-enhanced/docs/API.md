# AED Enhanced Domains API Documentation

## Overview
The AED Enhanced Domains system provides a comprehensive API for domain registration, management, and enhancement through Ethereum smart contracts.

## Core Contract: AEDEnhancedImplementation

### Domain Registration

#### registerDomain
Register a new domain with optional features.

```solidity
function registerDomain(
    string calldata name,
    string calldata tld,
    bool enableSubdomains,
    string calldata metadataURI
) external payable returns (uint256 tokenId)
```

**Parameters:**
- `name`: Domain name (e.g., "mydomain")
- `tld`: Top-level domain (e.g., "aed", "alsania")
- `enableSubdomains`: Whether to enable subdomain creation
- `metadataURI`: Optional metadata URI for the domain

**Returns:**
- `tokenId`: Unique token ID for the registered domain

**Example:**
```javascript
const tx = await aed.registerDomain(
    "mydomain",
    "aed",
    true,
    "https://example.com/metadata.json",
    { value: ethers.parseEther("0.1") }
);
```

#### batchRegisterDomains
Register multiple domains in a single transaction.

```solidity
function batchRegisterDomains(
    string[] calldata names,
    string[] calldata tlds,
    bool[] calldata enableSubdomains,
    string[] calldata metadataURIs
) external payable returns (uint256[] memory tokenIds)
```

**Parameters:**
- `names`: Array of domain names
- `tlds`: Array of top-level domains
- `enableSubdomains`: Array of subdomain enable flags
- `metadataURIs`: Array of metadata URIs

**Returns:**
- `tokenIds`: Array of token IDs for registered domains

**Example:**
```javascript
const tx = await aed.batchRegisterDomains(
    ["domain1", "domain2", "domain3"],
    ["aed", "alsa", "07"],
    [true, false, true],
    ["", "", ""],
    { value: ethers.parseEther("2.0") }
);
```

### Subdomain Management

#### createSubdomain
Create a subdomain under an existing domain.

```solidity
function createSubdomain(
    uint256 parentId,
    string calldata label,
    string calldata metadataURI
) external payable returns (uint256 tokenId)
```

**Parameters:**
- `parentId`: Token ID of the parent domain
- `label`: Subdomain label (e.g., "sub")
- `metadataURI`: Optional metadata URI

**Returns:**
- `tokenId`: Token ID of the created subdomain

**Example:**
```javascript
const tx = await aed.createSubdomain(
    1, // parent domain ID
    "subdomain",
    "https://example.com/subdomain-metadata.json",
    { value: ethers.parseEther("0.1") }
);
```

### Feature Management

#### upgradeFeature
Upgrade domain features after registration.

```solidity
function upgradeFeature(
    uint256 tokenId,
    string calldata featureName
) external payable
```

**Parameters:**
- `tokenId`: Token ID of the domain
- `featureName`: Name of the feature to upgrade

**Available Features:**
- "subdomain": Enable subdomain creation
- "metadata": Enhanced metadata features
- "reverse": Reverse resolution features

**Example:**
```javascript
const tx = await aed.upgradeFeature(
    1,
    "subdomain",
    { value: ethers.parseEther("2.0") }
);
```

### Reverse Resolution

#### setReverseRecord
Set reverse resolution for an address.

```solidity
function setReverseRecord(string calldata domain) external
```

**Parameters:**
- `domain`: Full domain name (e.g., "mydomain.aed")

**Example:**
```javascript
await aed.setReverseRecord("mydomain.aed");
```

#### clearReverseRecord
Clear reverse resolution for the sender's address.

```solidity
function clearReverseRecord() external
```

**Example:**
```javascript
await aed.clearReverseRecord();
```

### View Functions

#### getDomainInfo
Get detailed information about a domain.

```solidity
function getDomainInfo(uint256 tokenId) external view returns (Domain memory)
```

**Returns:**
- `Domain` struct containing all domain information

**Example:**
```javascript
const domainInfo = await aed.getDomainInfo(1);
console.log(domainInfo.fullDomain); // "mydomain.aed"
console.log(domainInfo.owner); // owner's address
```

#### getUserDomains
Get all domains owned by a user.

```solidity
function getUserDomains(address user) external view returns (uint256[] memory)
```

**Returns:**
- Array of token IDs owned by the user

**Example:**
```javascript
const userDomains = await aed.getUserDomains(userAddress);
```

#### getDomainByName
Get domain information by name.

```solidity
function getDomainByName(string calldata domain) external view returns (uint256 tokenId, Domain memory domainInfo)
```

**Returns:**
- `tokenId`: Token ID of the domain
- `domainInfo`: Complete domain information

**Example:**
```javascript
const [tokenId, domainInfo] = await aed.getDomainByName("mydomain.aed");
```

#### getPricingSummary
Get current pricing information.

```solidity
function getPricingSummary() external view returns (
    string[] memory tlds,
    uint256[] memory tldPrices,
    string[] memory features,
    uint256[] memory featurePrices
)
```

**Returns:**
- `tlds`: Array of available TLDs
- `tldPrices`: Array of prices for each TLD
- `features`: Array of available features
- `featurePrices`: Array of prices for each feature

**Example:**
```javascript
const [tlds, tldPrices, features, featurePrices] = await aed.getPricingSummary();
```

### Administrative Functions

#### updateFeeCollector
Update the fee collection address.

```solidity
function updateFeeCollector(address newCollector) external
```

**Requirements:**
- Must have ADMIN_ROLE

**Example:**
```javascript
await aed.updateFeeCollector(newFeeCollectorAddress);
```

#### withdrawRevenue
Withdraw accumulated revenue.

```solidity
function withdrawRevenue(uint256 amount) external
```

**Requirements:**
- Must have ADMIN_ROLE

**Example:**
```javascript
await aed.withdrawRevenue(ethers.parseEther("1.0"));
```

#### pause
Pause all contract operations.

```solidity
function pause() external
```

**Requirements:**
- Must have PAUSER_ROLE

#### unpause
Resume contract operations.

```solidity
function unpause() external
```

**Requirements:**
- Must have PAUSER_ROLE

## Events

### DomainRegistered
Emitted when a new domain is registered.

```solidity
event DomainRegistered(
    uint256 indexed tokenId,
    address indexed owner,
    string domain,
    string tld,
    uint256 cost
)
```

### SubdomainCreated
Emitted when a subdomain is created.

```solidity
event SubdomainCreated(
    uint256 indexed tokenId,
    uint256 indexed parentId,
    string subdomain,
    address indexed owner
)
```

### FeaturePurchased
Emitted when a feature is purchased.

```solidity
event FeaturePurchased(
    uint256 indexed tokenId,
    string featureName,
    uint256 cost
)
```

### ReverseRecordSet
Emitted when reverse resolution is set.

```solidity
event ReverseRecordSet(address indexed addr, string domain)
```

## Error Handling

### Custom Errors

#### InvalidDomain
Thrown when domain validation fails.

```solidity
error InvalidDomain(string reason)
```

#### InsufficientPayment
Thrown when payment is insufficient.

```solidity
error InsufficientPayment(uint256 required, uint256 provided)
```

#### UnauthorizedAccess
Thrown when unauthorized access is attempted.

```solidity
error UnauthorizedAccess()
```

#### ContractPaused
Thrown when contract is paused.

```solidity
error ContractPaused()
```

#### DomainNotFound
Thrown when domain doesn't exist.

```solidity
error DomainNotFound()
```

#### FeatureNotAvailable
Thrown when feature is not available.

```solidity
error FeatureNotAvailable()
```

#### InvalidOperation
Thrown when operation is invalid.

```solidity
error InvalidOperation()
```

## Usage Examples

### Complete Registration Flow

```javascript
// 1. Connect to contract
const aed = await ethers.getContractAt("AEDEnhancedImplementation", contractAddress);

// 2. Check pricing
const [tlds, prices, features, featurePrices] = await aed.getPricingSummary();
console.log("Available TLDs:", tlds);
console.log("TLD prices:", prices);

// 3. Register a domain
const registrationTx = await aed.registerDomain(
    "myawesome",
    "aed",
    true, // enable subdomains
    "https://myawesome.aed/metadata.json",
    { value: ethers.parseEther("2.0") }
);
await registrationTx.wait();

// 4. Create subdomains
const subdomainTx = await aed.createSubdomain(
    1, // token ID of parent domain
    "blog",
    "https://blog.myawesome.aed/metadata.json",
    { value: ethers.parseEther("0.1") }
);
await subdomainTx.wait();

// 5. Set reverse resolution
await aed.setReverseRecord("myawesome.aed");

// 6. Verify ownership
const userDomains = await aed.getUserDomains(userAddress);
console.log("User domains:", userDomains);
```

### Batch Operations

```javascript
// Batch register multiple domains
const names = ["company1", "company2", "company3"];
const tlds = ["alsania", "alsania", "alsania"];
const enableSubdomains = [true, false, true];
const metadataURIs = [
    "https://company1.alsania/metadata.json",
    "https://company2.alsania/metadata.json",
    "https://company3.alsania/metadata.json"
];

const batchTx = await aed.batchRegisterDomains(
    names,
    tlds,
    enableSubdomains,
    metadataURIs,
    { value: ethers.parseEther("6.0") } // 3 domains × 2 ETH each
);
await batchTx.wait();
```

## Integration Examples

### Web3 Integration

```javascript
// Web3.js example
const Web3 = require('web3');
const web3 = new Web3('https://rpc-amoy.polygon.technology');

const contractABI = [...]; // Contract ABI
const contractAddress = '0x...'; // Contract address

const contract = new web3.eth.Contract(contractABI, contractAddress);

// Register domain
const accounts = await web3.eth.getAccounts();
await contract.methods.registerDomain(
    "mydomain",
    "aed",
    true,
    "https://example.com/metadata.json"
).send({
    from: accounts[0],
    value: web3.utils.toWei('2', 'ether')
});
```

### React Integration

```javascript
// React Hook example
import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { parseEther } from 'viem';

function useDomainRegistration() {
    const { config } = usePrepareContractWrite({
        address: contractAddress,
        abi: contractABI,
        functionName: 'registerDomain',
        args: ['mydomain', 'aed', true, 'https://example.com/metadata.json'],
        value: parseEther('2'),
    });

    const { write } = useContractWrite(config);

    return { registerDomain: write };
}
```

## Best Practices

### Error Handling
```javascript
try {
    const tx = await aed.registerDomain("test", "aed", false, "");
    await tx.wait();
} catch (error) {
    if (error.errorName === "InvalidDomain") {
        console.log("Invalid domain name");
    } else if (error.errorName === "InsufficientPayment") {
        console.log("Insufficient payment");
    }
}
```

### Gas Optimization
```javascript
// Use batch operations for multiple registrations
const batchTx = await aed.batchRegisterDomains(
    names,
    tlds,
    enableSubdomains,
    metadataURIs,
    { value: totalCost }
);

// Check gas estimates
const gasEstimate = await aed.estimateGas.registerDomain(
    "test",
    "aed",
    false,
    ""
);
```

## Support

For questions and support:
- GitHub Issues: [Create an issue](https://github.com/SigmaSauer07/aed/issues)
- Documentation: [Full documentation](https://docs.alsania.io)
- Community: [Discord/Slack channels]