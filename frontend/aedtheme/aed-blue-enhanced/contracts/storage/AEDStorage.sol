// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AED Storage Layout
 * @dev Defines the storage layout for the AED system using EIP-1967 pattern
 */
contract AEDStorage {
    /// @dev Storage position for the AED app storage
    bytes32 internal constant AED_STORAGE_POSITION = 
        keccak256("aed.enhanced.domains.storage.v2");

    /// @dev Storage position for the AED implementation storage
    bytes32 internal constant AED_IMPLEMENTATION_POSITION = 
        keccak256("aed.enhanced.domains.implementation.v2");

    /// @dev Domain structure
    struct Domain {
        string name;
        string tld;
        string fullDomain;
        address owner;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 parentId;
        uint256 features;
        bool isSubdomain;
        string metadataURI;
        string imageURI;
    }

    /// @dev Feature pricing structure
    struct FeaturePricing {
        uint256 price;
        bool active;
        string description;
    }

    /// @dev TLD configuration structure
    struct TLDConfig {
        bool active;
        uint256 price;
        bool isFree;
        uint256 maxLength;
        uint256 minLength;
    }

    /// @dev User domain data structure
    struct UserDomainData {
        uint256[] tokenIds;
        mapping(string => uint256) domainToTokenId;
    }

    /// @dev Main storage structure
    struct AEDAppStorage {
        // Core state
        uint256 nextTokenId;
        uint256 totalDomains;
        uint256 totalRevenue;
        bool paused;
        address feeCollector;
        
        // Domain mappings
        mapping(uint256 => Domain) domains;
        mapping(string => uint256) domainToTokenId;
        mapping(uint256 => string) tokenIdToDomain;
        mapping(address => uint256[]) userDomains;
        mapping(uint256 => uint256[]) subdomains;
        
        // TLD management
        mapping(string => TLDConfig) tldConfigs;
        string[] validTLDs;
        
        // Pricing
        mapping(string => FeaturePricing) featurePricing;
        mapping(string => uint256) enhancementPricing;
        
        // Reverse resolution
        mapping(address => string) reverseRecords;
        mapping(string => address) reverseOwners;
        
        // Security and access
        mapping(address => bool) authorizedMinters;
        mapping(address => bool) authorizedUpgraders;
        
        // Statistics
        mapping(address => uint256) userDomainCount;
        mapping(string => uint256) tldUsage;
        
        // Enhanced features
        mapping(uint256 => mapping(string => bytes)) customData;
        mapping(uint256 => string[]) domainTags;
        mapping(uint256 => bool) domainVerification;
        
        // Gas optimization
        mapping(bytes32 => uint256) cachedDomainHashes;
        mapping(uint256 => bytes32) cachedTokenHashes;
    }

    /// @dev Returns the main storage struct
    function _getAEDStorage() internal pure returns (AEDAppStorage storage $) {
        assembly {
            $.slot := 0x8f2034b2c3a8e6c8f9e8d4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
        }
    }

    /// @dev Returns the implementation storage struct
    function _getImplementationStorage() internal pure returns (ImplementationStorage storage $) {
        assembly {
            $.slot := 0x9f3045c3d4b9f7d9f0e9e5b4c3d2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e
        }
    }

    /// @dev Implementation storage for upgrade tracking
    struct ImplementationStorage {
        address implementation;
        uint256 version;
        uint256 upgradeCount;
        mapping(uint256 => UpgradeRecord) upgrades;
    }

    /// @dev Upgrade record structure
    struct UpgradeRecord {
        address oldImplementation;
        address newImplementation;
        uint256 timestamp;
        string description;
    }
}