// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AED Constants
 * @dev Core constants used throughout the AED system
 */
contract AEDConstants {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant TLD_MANAGER_ROLE = keccak256("TLD_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    // Domain validation constants
    uint256 public constant MAX_DOMAIN_LENGTH = 63;
    uint256 public constant MIN_DOMAIN_LENGTH = 1;
    uint256 public constant MAX_SUBDOMAIN_LEVELS = 5;
    uint256 public constant MAX_SUBDOMAINS_PER_DOMAIN = 1000;
    
    // Pricing constants
    uint256 public constant DEFAULT_TLD_PRICE = 1 ether;
    uint256 public constant DEFAULT_SUBDOMAIN_PRICE = 2 ether;
    uint256 public constant DEFAULT_BYO_PRICE = 5 ether;
    
    // Feature flags
    uint256 public constant FEATURE_SUBDOMAIN = 1 << 0;
    uint256 public constant FEATURE_METADATA = 1 << 1;
    uint256 public constant FEATURE_REVERSE = 1 << 2;
    uint256 public constant FEATURE_ENHANCED = 1 << 3;
    uint256 public constant FEATURE_EXTERNAL = 1 << 4;
    
    // Error messages
    string public constant ERROR_INVALID_TLD = "AED: Invalid TLD";
    string public constant ERROR_DOMAIN_EXISTS = "AED: Domain already exists";
    string public constant ERROR_DOMAIN_NOT_FOUND = "AED: Domain not found";
    string public constant ERROR_INVALID_DOMAIN = "AED: Invalid domain name";
    string public constant ERROR_INSUFFICIENT_PAYMENT = "AED: Insufficient payment";
    string public constant ERROR_NOT_OWNER = "AED: Not token owner";
    string public constant ERROR_NOT_ADMIN = "AED: Not admin";
    string public constant ERROR_NOT_AUTHORIZED = "AED: Not authorized";
    string public constant ERROR_CONTRACT_PAUSED = "AED: Contract paused";
    string public constant ERROR_INVALID_LENGTH = "AED: Invalid length";
    string public constant ERROR_MAX_SUBDOMAINS = "AED: Max subdomains reached";
    string public constant ERROR_SUBDOMAINS_DISABLED = "AED: Subdomains disabled";
    string public constant ERROR_INVALID_FEATURE = "AED: Invalid feature";
    
    // Events
    event DomainRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        string domain,
        string tld,
        uint256 cost
    );
    
    event SubdomainCreated(
        uint256 indexed tokenId,
        uint256 indexed parentId,
        string subdomain,
        address indexed owner
    );
    
    event FeaturePurchased(
        uint256 indexed tokenId,
        string featureName,
        uint256 cost
    );
    
    event ReverseRecordSet(
        address indexed addr,
        string domain
    );
    
    event FeeUpdated(
        string feeType,
        uint256 oldAmount,
        uint256 newAmount
    );
    
    event TLDConfigured(
        string tld,
        bool isActive,
        uint256 price
    );
    
    event ContractPausedEvent(address indexed account);
    event ContractUnpausedEvent(address indexed account);
    
    event ImplementationUpgraded(
        address indexed previousImplementation,
        address indexed newImplementation
    );
}