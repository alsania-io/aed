// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

struct Fragment {
    string fragmentType;
    uint256 earnedAt;
    bytes32 eventHash;
}

struct Domain {
    string name;
    string tld;
    string profileURI;
    string imageURI;
    uint256 subdomainCount;
    uint256 mintFee;
    uint256 expiresAt;
    bool feeEnabled;
    bool isSubdomain;
    address owner;
}

struct Reputation {
    uint256 totalScore;
    uint256 totalRatings;
    uint256 averageScore;
}

struct FeedbackRecord {
    address rater;
    uint8 score;
    string comment;
    uint256 timestamp;
    bool isActive;
}

struct BadgeReputationData {
    Reputation reputation;
    mapping(address => bool) hasRated;
    mapping(address => uint256) stakedAmount;
    mapping(address => uint256) stakeReleaseTime;
    FeedbackRecord[] feedbackHistory;
    uint256 lastFeedbackTimestamp;
}

struct BridgeInfo {
    uint256 sourceChainId;
    uint256 targetChainId;
    uint256 sourceTokenId;
    address sourceOwner;
    uint256 timestamp;
    bool isBridgedOut;
    string targetDomain;
}

struct BridgeConfig {
    address bridgeRouter;
    address bridgeToken;
    uint256 minBridgeAmount;
    uint256 maxBridgeAmount;
    bool isActive;
}

struct ModuleInfo {
    address moduleAddress;
    string name;
    uint256 version;
    bool isActive;
}

struct AppStorage {
    // Roles (for AccessControl compatibility)
    mapping(bytes32 => mapping(address => bool)) roles;
    // Core token data
    mapping(uint256 => address) owners;
    mapping(address => uint256) balances;
    mapping(uint256 => address) tokenApprovals;
    mapping(address => mapping(address => bool)) operatorApprovals;
    uint256 nextTokenId;
    
    // Domain data
    mapping(string => uint256) domainToTokenId;
    mapping(uint256 => string) tokenIdToDomain;
    mapping(string => bool) domainExists;
    mapping(string => bool) enhancedDomains;
    mapping(string => uint256) subdomainCounts;
    mapping(uint256 => Domain) domains;
    mapping(address => string[]) userDomains;
    
    // TLD configuration
    mapping(string => bool) validTlds;
    mapping(string => bool) freeTlds;
    mapping(string => uint256) tldPrices;
    
    // Features & enhancements
    mapping(string => bool) featureExists;
    mapping(string => uint256) enhancementPrices;
    mapping(string => uint256) featureFlags;
    string[] availableFeatures;
    mapping(uint256 => mapping(string => bool)) featureEnabled;
    
    // Fees
    mapping(string => uint256) fees;
    address feeCollector;
    uint256 totalRevenue;
    
    // Reverse records
    mapping(address => string) reverseRecords;
    mapping(string => address) reverseOwners;
    
    // Metadata
    string name;
    string baseURI;
    string globalDescription;
    mapping(uint256 => string) profileURIs;
    mapping(uint256 => string) imageURIs;
    
    // Subdomain tracking
    mapping(string => string[]) domainSubdomains;
    mapping(string => address) subdomainOwners;
    
     // Evolution & fragments
    mapping(uint256 => Fragment[]) tokenFragments;
    mapping(uint256 => mapping(string => bool)) hasFragment;

    // Feature flags (dynamic key-value store for enhancement metadata)
    mapping(uint256 => uint256) futureUint256;
    mapping(uint256 => uint256) domainFeatures;
    mapping(uint256 => uint256) evolutionLevels;
    
    // Admin
    mapping(address => bool) admins;
    mapping(address => bool) feeManagers;
    mapping(address => bool) tldManagers;
    bool paused;
    
    // AI Badge (subdomain) data
    mapping(uint256 => string) aiModelType;
    mapping(uint256 => bool) isAISubdomain;
    mapping(uint256 => bool) badgeTransferLocked;
    mapping(uint256 => mapping(string => bool)) aiCapabilities;
    
    // Reputation system
    mapping(uint256 => BadgeReputationData) badgeReputation;
    
    // ALSA token address (for staking)
    address alsaTokenAddress;
    
    // Reputation constants (storage variables, not constants)
    uint256 alsaStakeAmount;
    uint256 reputationDecayDays;
    uint256 minRatingsForDisplay;
    
    // Bridge data
    mapping(uint256 => BridgeInfo) bridgedDomains;
    mapping(uint256 => BridgeConfig) bridgeConfigs;
    
    // Module registry
    mapping(bytes32 => ModuleInfo) moduleRegistry;
}