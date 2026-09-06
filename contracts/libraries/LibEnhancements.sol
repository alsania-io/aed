// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../core/AppStorage.sol";
import "./LibAppStorage.sol";
import "./LibPayment.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

error FeatureUnavailable(string featureName);
error FeeTransferFailed();

library LibEnhancements {
    using LibAppStorage for AppStorage;
    using Strings for uint256;

    // Constants from AEDConstants (hardcoded since it's a contract)
    uint256 constant FEATURE_SUBDOMAINS = 1 << 0;
    uint256 constant FEATURE_METADATA = 1 << 1;
    uint256 constant FEATURE_REVERSE = 1 << 2;
    uint256 constant FEATURE_BRIDGE = 1 << 3;

    // Storage keys for dynamic feature registry (leverages reserved slots)
    uint256 constant FEATURE_COUNT_KEY = uint256(keccak256("aed.enhancements.count"));

    event FeatureCatalogued(string indexed featureName, uint256 flag);
    event FeaturePurchased(uint256 indexed tokenId, string indexed featureName, uint256 price);
    event FeatureEnabled(uint256 indexed tokenId, uint256 feature);
    event FeatureDisabled(uint256 indexed tokenId, uint256 feature);
    
    function purchaseFeature(uint256 tokenId, string calldata featureName) internal {
        AppStorage storage s = LibAppStorage.appStorage();

        require(s.owners[tokenId] == msg.sender, "Not token owner");

        uint256 flag = _featureFlag(s, featureName);
        require(flag != 0, "Feature not supported");

        uint256 priceUSDC = s.enhancementPrices[featureName];
        
        if (priceUSDC > 0) {
            // Collect USDC payment
            LibPayment.collectPayment(priceUSDC, featureName);
        }

        s.domainFeatures[tokenId] |= flag;
        string memory domain = s.tokenIdToDomain[tokenId];
        if (bytes(domain).length > 0) {
            s.enhancedDomains[domain] = true;
        }

        emit FeaturePurchased(tokenId, featureName, priceUSDC);
        emit FeatureEnabled(tokenId, flag);
    }

    function getFeaturePrice(string calldata featureName) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.appStorage();
        require(s.featureExists[featureName], "Feature not found");
        return s.enhancementPrices[featureName];
    }

    function isFeatureEnabled(uint256 tokenId, string calldata featureName) internal view returns (bool) {
        AppStorage storage s = LibAppStorage.appStorage();
        uint256 flag = _featureFlag(s, featureName);
        if (flag == 0) {
            return false;
        }
        return (s.domainFeatures[tokenId] & flag) != 0;
    }

    function getAvailableFeatures() internal view returns (string[] memory) {
        AppStorage storage s = LibAppStorage.appStorage();
        uint256 length = s.availableFeatures.length;
        string[] memory features = new string[](length);

        for (uint256 i = 0; i < length; i++) {
            features[i] = s.availableFeatures[i];
        }

        return features;
    }

    function setFeaturePrice(string calldata featureName, uint256 price) internal {
        require(bytes(featureName).length != 0, "Feature required");
        AppStorage storage s = LibAppStorage.appStorage();
        require(s.featureExists[featureName], "Feature not found");
        s.enhancementPrices[featureName] = price;
    }

    function addFeature(string calldata featureName, uint256 price, uint256 flag) internal {
        AppStorage storage s = LibAppStorage.appStorage();
        require(bytes(featureName).length != 0, "Feature required");
        require(flag != 0 && (flag & (flag - 1)) == 0, "Flag must be power of two");

        s.enhancementPrices[featureName] = price;
        _setFeatureFlag(s, featureName, flag);

        if (!_featureExists(s, featureName)) {
            s.availableFeatures.push(featureName);
            s.featureExists[featureName] = true;
        }

        emit FeatureCatalogued(featureName, flag);
    }

    /**
     * @dev Enable subdomains for a token without payment.
     *      The caller must be the current token owner.
     *      Sets the FEATURE_SUBDOMAINS flag on the token's domainFeatures
     *      and marks the domain as enhanced in storage.
     */
    function enableSubdomains(uint256 tokenId) internal {
        AppStorage storage s = LibAppStorage.appStorage();

        require(s.owners[tokenId] == msg.sender, "Not token owner");

        uint256 flag = FEATURE_SUBDOMAINS;
        s.domainFeatures[tokenId] |= flag;

        string memory domain = s.tokenIdToDomain[tokenId];
        if (bytes(domain).length > 0) {
            s.enhancedDomains[domain] = true;
        }

        emit FeatureEnabled(tokenId, flag);
    }

    function ensureDefaultFeatures() internal {
        AppStorage storage s = LibAppStorage.appStorage();
        _ensureFeature(s, "subdomain", FEATURE_SUBDOMAINS, 0);
        _ensureFeature(s, "metadata", FEATURE_METADATA, 0);
        _ensureFeature(s, "reverse", FEATURE_REVERSE, 0);
        _ensureFeature(s, "bridge", FEATURE_BRIDGE, 0);
    }

    // ===== Internal helpers =====

    function _featureFlag(AppStorage storage s, string memory featureName) private view returns (uint256) {
        return s.futureUint256[uint256(keccak256(abi.encodePacked("aed.enhancements.flag:", featureName)))];
    }

    function _setFeatureFlag(AppStorage storage s, string memory featureName, uint256 flag) private {
        s.futureUint256[uint256(keccak256(abi.encodePacked("aed.enhancements.flag:", featureName)))] = flag;
    }

    function _featureNameKey(uint256 index) private pure returns (string memory) {
        return string(abi.encodePacked("aed.enhancements.name:", index.toString()));
    }

    function _featureExists(AppStorage storage s, string memory featureName) private view returns (bool) {
        for (uint256 i = 0; i < s.availableFeatures.length; i++) {
            if (keccak256(bytes(s.availableFeatures[i])) == keccak256(bytes(featureName))) {
                return true;
            }
        }
        return false;
    }

    function _ensureFeature(AppStorage storage s, string memory featureName, uint256 flag, uint256 price) private {
        if (_featureFlag(s, featureName) == 0) {
            _setFeatureFlag(s, featureName, flag);

            if (!_featureExists(s, featureName)) {
                s.availableFeatures.push(featureName);
                s.featureExists[featureName] = true;
            }

            s.enhancementPrices[featureName] = price;
            emit FeatureCatalogued(featureName, flag);
        }
    }
}