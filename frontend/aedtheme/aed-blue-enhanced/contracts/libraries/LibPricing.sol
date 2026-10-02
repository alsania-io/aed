// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AEDStorage} from "../storage/AEDStorage.sol";
import {AEDConstants} from "../core/AEDConstants.sol";

/**
 * @title LibPricing
 * @dev Library for managing domain pricing and calculations
 */
library LibPricing {
    // Note: Direct struct access - no using statement needed

    /// @dev Calculates total cost for domain registration
    function calculateDomainCost(
        AEDStorage.AEDAppStorage storage $,
        string memory name,
        string memory tld,
        bool enableSubdomains
    ) internal view returns (uint256 totalCost, uint256 breakdown) {
        uint256 tldCost = 0;
        uint256 subdomainCost = 0;
        
        // Get TLD cost
        AEDStorage.TLDConfig memory tldConfig = $.tldConfigs[tld];
        if (!tldConfig.isFree) {
            tldCost = tldConfig.price;
        }
        
        // Add subdomain feature cost
        if (enableSubdomains) {
            subdomainCost = $.enhancementPricing["subdomain"];
        }
        
        totalCost = tldCost + subdomainCost;
        breakdown = (tldCost << 128) | subdomainCost; // Pack both values
        
        return (totalCost, breakdown);
    }

    /// @dev Calculates subdomain creation cost
    function calculateSubdomainCost(
        AEDStorage.AEDAppStorage storage $,
        uint256 parentId
    ) internal view returns (uint256) {
        AEDStorage.Domain storage parent = $.domains[parentId];
        
        // First 2 subdomains are free
        if ($.subdomains[parentId].length < 2) {
            return 0;
        }
        
        // Progressive pricing: 0.1 ETH for each subdomain beyond 2
        uint256 baseCost = 0.1 ether;
        uint256 multiplier = $.subdomains[parentId].length - 1;
        
        return baseCost * multiplier;
    }

    /// @dev Calculates feature upgrade cost
    function calculateFeatureCost(
        AEDStorage.AEDAppStorage storage $,
        string memory featureName
    ) internal view returns (uint256) {
        AEDStorage.FeaturePricing memory pricing = $.featurePricing[featureName];
        require(pricing.active, "AED: Invalid feature");
        
        return pricing.price;
    }

    /// @dev Updates TLD pricing
    function updateTLDPrice(
        AEDStorage.AEDAppStorage storage $,
        string memory tld,
        uint256 newPrice
    ) internal {
        $.tldConfigs[tld].price = newPrice;
        
        // Emit event will be handled by caller
    }

    /// @dev Updates feature pricing
    function updateFeaturePrice(
        AEDStorage.AEDAppStorage storage $,
        string memory featureName,
        uint256 newPrice
    ) internal {
        $.featurePricing[featureName].price = newPrice;
        
        // Emit event will be handled by caller
    }

    /// @dev Adds new feature with pricing
    function addFeature(
        AEDStorage.AEDAppStorage storage $,
        string memory featureName,
        uint256 price,
        string memory description
    ) internal {
        require(bytes(featureName).length > 0, "Invalid feature name");
        require(!$.featurePricing[featureName].active, "Feature already exists");
        
        $.featurePricing[featureName] = AEDStorage.FeaturePricing({
            price: price,
            active: true,
            description: description
        });
    }

    /// @dev Calculates batch registration discount
    function calculateBatchDiscount(
        AEDStorage.AEDAppStorage storage $,
        uint256[] memory costs,
        uint256 totalCount
    ) internal pure returns (uint256[] memory discountedCosts) {
        discountedCosts = new uint256[](costs.length);
        
        // 5% discount for 5-9 domains
        // 10% discount for 10-19 domains
        // 15% discount for 20+ domains
        
        uint256 discountRate = 0;
        if (totalCount >= 20) {
            discountRate = 1500; // 15% (basis points)
        } else if (totalCount >= 10) {
            discountRate = 1000; // 10% (basis points)
        } else if (totalCount >= 5) {
            discountRate = 500; // 5% (basis points)
        }
        
        for (uint256 i = 0; i < costs.length; i++) {
            discountedCosts[i] = costs[i] * (10000 - discountRate) / 10000;
        }
        
        return discountedCosts;
    }

    /// @dev Calculates revenue sharing for external domains
    function calculateRevenueShare(
        AEDStorage.AEDAppStorage storage $,
        uint256 amount,
        address externalProvider
    ) internal view returns (uint256 protocolShare, uint256 externalShare) {
        // 70% to protocol, 30% to external provider
        protocolShare = (amount * 70) / 100;
        externalShare = (amount * 30) / 100;
        
        return (protocolShare, externalShare);
    }

    /// @dev Gets current pricing summary
    function getPricingSummary(
        AEDStorage.AEDAppStorage storage $
    ) internal view returns (
        string[] memory tlds,
        uint256[] memory tldPrices,
        string[] memory features,
        uint256[] memory featurePrices
    ) {
        // Get TLD pricing
        tlds = new string[]($.validTLDs.length);
        tldPrices = new uint256[]($.validTLDs.length);
        
        for (uint256 i = 0; i < $.validTLDs.length; i++) {
            string memory tld = $.validTLDs[i];
            tlds[i] = tld;
            tldPrices[i] = $.tldConfigs[tld].price;
        }
        
        // Get feature pricing (simplified - return known features)
        features = new string[](3);
        featurePrices = new uint256[](3);
        
        features[0] = "subdomain";
        features[1] = "metadata";
        features[2] = "external";
        
        featurePrices[0] = $.enhancementPricing["subdomain"];
        featurePrices[1] = $.featurePricing["metadata"].price;
        featurePrices[2] = $.enhancementPricing["byo"];
        
        return (tlds, tldPrices, features, featurePrices);
    }
}