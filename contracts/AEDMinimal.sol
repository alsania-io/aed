// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// USDC address on Amoy (from Alchemy faucet)
address constant USDC_ADDRESS = 0x8B0180f2101c8260d49339abfEe87927412494B4;

contract AEDMinimal is UUPSUpgradeable, ERC721Upgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Storage
    mapping(uint256 => address) public owners;
    mapping(address => uint256) public balances;
    mapping(string => uint256) public domainToTokenId;
    mapping(uint256 => string) public tokenIdToDomain;
    mapping(string => bool) public domainExists;
    mapping(address => string[]) public userDomains;
    
    mapping(string => bool) public validTlds;
    mapping(string => bool) public freeTlds;
    mapping(string => uint256) public tldPrices;
    
    uint256 public nextTokenId;
    address public feeCollector;
    uint256 public totalRevenue;
    bool public paused;
    
    // AI Badge data
    mapping(uint256 => string) public aiModelType;
    mapping(uint256 => bool) public isAISubdomain;
    mapping(uint256 => mapping(string => bool)) public aiCapabilities;
    
    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }
    
    // Initialize
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        
        feeCollector = admin;
        nextTokenId = 1;
        
        // Free TLDs
        freeTlds["aed"] = true;
        freeTlds["alsa"] = true;
        freeTlds["07"] = true;
        validTlds["aed"] = true;
        validTlds["alsa"] = true;
        validTlds["07"] = true;
        validTlds["alsania"] = true;
        validTlds["fx"] = true;
        validTlds["echo"] = true;
        
        // TLD prices (in USDC 6 decimals)
        tldPrices["alsania"] = 1000000; // $1.00
        tldPrices["fx"] = 1000000;
        tldPrices["echo"] = 1000000;
    }
    
    function _authorizeUpgrade(address) internal override onlyAdmin {}
    
    // ===== DOMAIN FUNCTIONS =====
    
    function registerDomain(string calldata name, string calldata tld) external whenNotPaused nonReentrant returns (uint256) {
        require(validTlds[tld], "Invalid TLD");
        string memory fullDomain = string(abi.encodePacked(name, ".", tld));
        require(!domainExists[fullDomain], "Domain exists");
        
        uint256 cost = freeTlds[tld] ? 0 : tldPrices[tld];
        if (cost > 0) {
            collectPayment(cost);
        }
        
        uint256 tokenId = nextTokenId++;
        owners[tokenId] = msg.sender;
        balances[msg.sender]++;
        domainToTokenId[fullDomain] = tokenId;
        tokenIdToDomain[tokenId] = fullDomain;
        domainExists[fullDomain] = true;
        userDomains[msg.sender].push(fullDomain);
        
        emit Transfer(address(0), msg.sender, tokenId);
        return tokenId;
    }
    
    // ===== AI BADGE FUNCTIONS =====
    
    function createAISubdomain(string calldata label, string calldata parentDomain, string calldata modelType) 
        external whenNotPaused nonReentrant returns (uint256) 
    {
        require(domainExists[parentDomain], "Parent not found");
        uint256 parentTokenId = domainToTokenId[parentDomain];
        require(owners[parentTokenId] == msg.sender, "Not parent owner");
        
        string memory badgeName = string(abi.encodePacked(label, ".", parentDomain));
        require(!domainExists[badgeName], "Badge exists");
        
        // Collect fee (badge creation)
        collectPayment(1000000); // $1.00
        
        uint256 tokenId = nextTokenId++;
        owners[tokenId] = msg.sender;
        balances[msg.sender]++;
        domainToTokenId[badgeName] = tokenId;
        tokenIdToDomain[tokenId] = badgeName;
        domainExists[badgeName] = true;
        userDomains[msg.sender].push(badgeName);
        
        aiModelType[tokenId] = modelType;
        isAISubdomain[tokenId] = true;
        
        emit Transfer(address(0), msg.sender, tokenId);
        return tokenId;
    }
    
    function purchaseAICapability(uint256 tokenId, string calldata capabilityType) external whenNotPaused nonReentrant {
        require(owners[tokenId] == msg.sender, "Not owner");
        require(isAISubdomain[tokenId], "Not a badge");
        require(!aiCapabilities[tokenId][capabilityType], "Already unlocked");
        
        // Collect fee (capability unlock)
        collectPayment(1000000); // $1.00
        
        aiCapabilities[tokenId][capabilityType] = true;
    }
    
    // ===== PAYMENT =====
    
    function collectPayment(uint256 amount) internal {
        if (amount == 0) return;
        IERC20 usdc = IERC20(USDC_ADDRESS);
        require(usdc.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        require(usdc.transferFrom(msg.sender, feeCollector, amount), "Transfer failed");
        totalRevenue += amount;
    }
    
    // ===== VIEW FUNCTIONS =====
    
    function getDomainByTokenId(uint256 tokenId) external view returns (string memory) {
        return tokenIdToDomain[tokenId];
    }
    
    function getModelType(uint256 tokenId) external view returns (string memory) {
        return aiModelType[tokenId];
    }
    
    function getActiveCapabilities(uint256 tokenId) external view returns (string[] memory) {
        string[] memory caps = new string[](4);
        string[4] memory allCaps = ["ai_vision", "ai_communication", "ai_memory", "ai_reasoning"];
        uint256 count = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (aiCapabilities[tokenId][allCaps[i]]) {
                caps[count] = allCaps[i];
                count++;
            }
        }
        // Resize array
        string[] memory result = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = caps[i];
        }
        return result;
    }
    
    function hasAICapability(uint256 tokenId, string calldata capabilityType) external view returns (bool) {
        return aiCapabilities[tokenId][capabilityType];
    }
    
    // ===== ERC721 OVERRIDES =====
    
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "Token not found");
        return owner;
    }
    
    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "Zero address");
        return balances[owner];
    }
    
    function approve(address, uint256) public pure override {
        revert("Not supported");
    }
    
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("Not supported");
    }
    
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(owners[tokenId] == from, "Wrong owner");
        require(to != address(0), "Zero address");
        require(msg.sender == from, "Only owner");
        
        balances[from]--;
        balances[to]++;
        owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        transferFrom(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        transferFrom(from, to, tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    function setFeeCollector(address newCollector) external onlyAdmin {
        feeCollector = newCollector;
    }
    
    function togglePause() external onlyAdmin {
        paused = !paused;
    }
    
    function withdrawUSDC(uint256 amount) external onlyAdmin {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
    }
}

// Proxy contract for deployment
contract AEDMinimalProxy is ERC1967Proxy {
    constructor(address implementation, bytes memory data) ERC1967Proxy(implementation, data) {}
}