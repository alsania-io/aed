// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./storage/AEDStorage.sol";
import "./core/AEDConstants.sol";
import "./libraries/LibValidation.sol";
import "./libraries/LibPricing.sol";

/**
 * @title AEDEnhancedImplementationFixed
 * @dev Fixed version of AED Enhanced Domains implementation
 */
contract AEDEnhancedImplementationFixed is 
    AEDConstants,
    AEDStorage,
    Initializable,
    ContextUpgradeable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using Strings for uint256;
    using LibValidation for AEDAppStorage;
    using LibPricing for AEDAppStorage;

    /// @dev Custom errors
    error InvalidDomain(string reason);
    error InsufficientPayment(uint256 required, uint256 provided);
    error UnauthorizedAccess();
    error ContractPaused();
    error DomainNotFound();
    error FeatureNotAvailable();
    error InvalidOperation();

    /// @dev Events
    event BatchDomainsRegistered(
        address indexed owner,
        uint256[] tokenIds,
        string[] domains,
        uint256 totalCost
    );

    event EmergencyPauseTriggered(address indexed account);
    event EmergencyUnpauseTriggered(address indexed account);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event RevenueWithdrawn(address indexed collector, uint256 amount);

    /// @dev Initialize the contract
    function initialize(
        string memory name,
        string memory symbol,
        address paymentWallet,
        address admin
    ) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        AEDAppStorage storage $ = _getAEDStorage();
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        _grantRole(TLD_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        // Initialize storage
        $.nextTokenId = 1;
        $.totalDomains = 0;
        $.totalRevenue = 0;
        $.paused = false;
        $.feeCollector = paymentWallet;

        // Initialize default TLDs
        _initializeDefaultTLDs();
        _initializeDefaultPricing();
    }

    /// @dev Initialize default TLD configurations
    function _initializeDefaultTLDs() private {
        AEDAppStorage storage $ = _getAEDStorage();
        
        string[6] memory tlds = ["aed", "alsa", "07", "alsania", "fx", "echo"];
        bool[6] memory isFree = [true, true, true, false, false, false];
        uint256[6] memory prices = [uint256(0), uint256(0), uint256(0), uint256(1 ether), uint256(1 ether), uint256(1 ether)];
        
        for (uint256 i = 0; i < tlds.length; i++) {
            string memory tld = tlds[i];
            $.tldConfigs[tld] = TLDConfig({
                active: true,
                price: prices[i],
                isFree: isFree[i],
                maxLength: AEDConstants.MAX_DOMAIN_LENGTH,
                minLength: AEDConstants.MIN_DOMAIN_LENGTH
            });
            $.validTLDs.push(tld);
        }
    }

    /// @dev Initialize default pricing
    function _initializeDefaultPricing() private {
        AEDAppStorage storage $ = _getAEDStorage();
        
        $.enhancementPricing["subdomain"] = AEDConstants.DEFAULT_SUBDOMAIN_PRICE;
        $.enhancementPricing["byo"] = AEDConstants.DEFAULT_BYO_PRICE;
    }

    /// @dev Register a new domain
    function registerDomain(
        string calldata name,
        string calldata tld,
        bool enableSubdomains,
        string calldata metadataURI
    ) external payable whenNotPaused nonReentrant returns (uint256 tokenId) {
        return _registerDomain(name, tld, enableSubdomains, metadataURI);
    }

    /// @dev Internal domain registration
    function _registerDomain(
        string calldata name,
        string calldata tld,
        bool enableSubdomains,
        string calldata metadataURI
    ) internal returns (uint256 tokenId) {
        AEDAppStorage storage $ = _getAEDStorage();
        
        // Validate domain
        (bool valid, string memory reason) = $.validateDomainName(name, tld);
        if (!valid) revert InvalidDomain(reason);
        
        // Calculate costs
        (uint256 totalCost, ) = $.calculateDomainCost(name, tld, enableSubdomains);
        if (msg.value < totalCost) revert InsufficientPayment(totalCost, msg.value);
        
        // Normalize name
        string memory normalizedName = LibValidation.normalizeName(name);
        string memory fullDomain = string(abi.encodePacked(normalizedName, ".", tld));
        
        // Create domain
        tokenId = $.nextTokenId++;
        uint256 features = enableSubdomains ? AEDConstants.FEATURE_SUBDOMAIN : 0;
        
        $.domains[tokenId] = Domain({
            name: normalizedName,
            tld: tld,
            fullDomain: fullDomain,
            owner: _msgSender(),
            createdAt: block.timestamp,
            expiresAt: 0,
            parentId: 0,
            features: features,
            isSubdomain: false,
            metadataURI: metadataURI,
            imageURI: ""
        });
        
        // Update mappings
        $.tokenIdToDomain[tokenId] = fullDomain;
        $.domainToTokenId[fullDomain] = tokenId;
        $.userDomains[_msgSender()].push(tokenId);
        $.userDomainCount[_msgSender()]++;
        $.tldUsage[tld]++;
        $.totalDomains++;
        
        // Mint NFT
        _mint(_msgSender(), tokenId);
        
        // Process payment
        _processPayment(totalCost);
        
        emit DomainRegistered(tokenId, _msgSender(), fullDomain, tld, totalCost);
        return tokenId;
    }

    /// @dev Batch register multiple domains
    function batchRegisterDomains(
        string[] calldata names,
        string[] calldata tlds,
        bool[] calldata enableSubdomains,
        string[] calldata metadataURIs
    ) external payable whenNotPaused nonReentrant returns (uint256[] memory tokenIds) {
        require(
            names.length == tlds.length && 
            names.length == enableSubdomains.length &&
            names.length == metadataURIs.length,
            "Array length mismatch"
        );
        
        AEDAppStorage storage $ = _getAEDStorage();
        
        tokenIds = new uint256[](names.length);
        uint256 totalCost = 0;
        
        // Calculate total cost
        for (uint256 i = 0; i < names.length; i++) {
            (bool valid, ) = $.validateDomainName(names[i], tlds[i]);
            if (!valid) continue;
            
            (uint256 cost, ) = $.calculateDomainCost(
                names[i], 
                tlds[i], 
                enableSubdomains[i]
            );
            totalCost += cost;
        }
        
        if (msg.value < totalCost) revert InsufficientPayment(totalCost, msg.value);
        
        // Register all domains
        for (uint256 i = 0; i < names.length; i++) {
            (bool valid, ) = $.validateDomainName(names[i], tlds[i]);
            if (!valid) continue;
            
            tokenIds[i] = _registerDomain(
                names[i], 
                tlds[i], 
                enableSubdomains[i], 
                metadataURIs[i]
            );
        }
        
        emit BatchDomainsRegistered(_msgSender(), tokenIds, names, totalCost);
        return tokenIds;
    }

    /// @dev Create a subdomain
    function createSubdomain(
        uint256 parentId,
        string calldata label,
        string calldata metadataURI
    ) external payable whenNotPaused nonReentrant returns (uint256 tokenId) {
        AEDAppStorage storage $ = _getAEDStorage();
        
        // Validate subdomain
        (bool valid, string memory reason) = $.validateSubdomainName(label, parentId);
        if (!valid) revert InvalidDomain(reason);
        
        // Calculate cost
        uint256 cost = $.calculateSubdomainCost(parentId);
        if (msg.value < cost) revert InsufficientPayment(cost, msg.value);
        
        // Get parent domain
        Domain storage parent = $.domains[parentId];
        string memory fullDomain = string(abi.encodePacked(
            LibValidation.normalizeName(label), 
            ".", 
            parent.fullDomain
        ));
        
        // Create subdomain
        tokenId = $.nextTokenId++;
        
        $.domains[tokenId] = Domain({
            name: LibValidation.normalizeName(label),
            tld: parent.tld,
            fullDomain: fullDomain,
            owner: _msgSender(),
            createdAt: block.timestamp,
            expiresAt: 0,
            parentId: parentId,
            features: 0,
            isSubdomain: true,
            metadataURI: metadataURI,
            imageURI: ""
        });
        
        // Update mappings
        $.tokenIdToDomain[tokenId] = fullDomain;
        $.domainToTokenId[fullDomain] = tokenId;
        $.userDomains[_msgSender()].push(tokenId);
        $.userDomainCount[_msgSender()]++;
        $.subdomains[parentId].push(tokenId);
        
        // Mint NFT
        _mint(_msgSender(), tokenId);
        
        // Process payment
        _processPayment(cost);
        
        emit SubdomainCreated(tokenId, parentId, fullDomain, _msgSender());
        return tokenId;
    }

    /// @dev Process payment with refunds
    function _processPayment(uint256 amount) private {
        AEDAppStorage storage $ = _getAEDStorage();
        
        $.totalRevenue += amount;
        
        // Transfer to fee collector
        (bool success, ) = $.feeCollector.call{value: amount}("");
        require(success, "Payment transfer failed");
        
        // Refund excess
        if (msg.value > amount) {
            uint256 excess = msg.value - amount;
            (bool refundSuccess, ) = _msgSender().call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }
    }

    /// @dev Get domain information
    function getDomainInfo(uint256 tokenId) external view returns (Domain memory) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.domains[tokenId];
    }

    /// @dev Get user domains
    function getUserDomains(address user) external view returns (uint256[] memory) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.userDomains[user];
    }

    /// @dev Get domain by name
    function getDomainByName(string calldata domain) external view returns (uint256 tokenId, Domain memory domainInfo) {
        AEDAppStorage storage $ = _getAEDStorage();
        tokenId = $.domainToTokenId[domain];
        if (tokenId != 0) {
            domainInfo = $.domains[tokenId];
        }
    }

    /// @dev Get pricing summary
    function getPricingSummary() external view returns (
        string[] memory tlds,
        uint256[] memory tldPrices,
        string[] memory features,
        uint256[] memory featurePrices
    ) {
        AEDAppStorage storage $ = _getAEDStorage();
        
        // Return basic pricing
        tlds = new string[](6);
        tldPrices = new uint256[](6);
        features = new string[](1);
        featurePrices = new uint256[](1);
        
        tlds[0] = "aed"; tldPrices[0] = 0;
        tlds[1] = "alsa"; tldPrices[1] = 0;
        tlds[2] = "07"; tldPrices[2] = 0;
        tlds[3] = "alsania"; tldPrices[3] = 1 ether;
        tlds[4] = "fx"; tldPrices[4] = 1 ether;
        tlds[5] = "echo"; tldPrices[5] = 1 ether;
        
        features[0] = "subdomain";
        featurePrices[0] = $.enhancementPricing["subdomain"];
        
        return (tlds, tldPrices, features, featurePrices);
    }

    /// @dev Get total domains
    function totalDomains() external view returns (uint256) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.totalDomains;
    }

    /// @dev Get total revenue
    function totalRevenue() external view returns (uint256) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.totalRevenue;
    }

    /// @dev Get fee collector
    function getFeeCollector() external view returns (address) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.feeCollector;
    }

    /// @dev Check if TLD is active
    function isTLDActive(string calldata tld) external view returns (bool) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.tldConfigs[tld].active;
    }

    /// @dev Calculate subdomain cost
    function calculateSubdomainCost(uint256 parentId) external view returns (uint256) {
        AEDAppStorage storage $ = _getAEDStorage();
        return $.calculateSubdomainCost(parentId);
    }

    /// @dev Override supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @dev Override _authorizeUpgrade
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /// @dev Override tokenURI
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (_ownerOf(tokenId) == address(0)) revert DomainNotFound();
        
        AEDAppStorage storage $ = _getAEDStorage();
        Domain memory domain = $.domains[tokenId];
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(
                abi.encodePacked(
                    '{"name":"', domain.fullDomain, '",',
                    '"description":"Alsania Enhanced Domain NFT",',
                    '"attributes":[{"trait_type":"TLD","value":"', domain.tld, '"}]}'
                )
            )
        ));
    }

    /// @dev Base64 encoding helper
    function _base64Encode(bytes memory data) private pure returns (bytes memory) {
        if (data.length == 0) return "";
        
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);
        
        assembly {
            let tablePtr := add(TABLE, 1)
            let resultPtr := add(result, 32)
            
            for {
                let i := 0
            } lt(i, mload(data)) {
                
            } {
                let input := mload(add(data, add(32, i)))
                let output := add(
                    add(
                        shl(18, and(input, 0xFF)),
                        shl(12, and(shr(8, input), 0xFF))),
                    add(
                        shl(6, and(shr(16, input), 0xFF)),
                        and(shr(24, input), 0xFF)
                    )
                )
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, output), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, output), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, output), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(output, 0x3F))))
                resultPtr := add(resultPtr, 1)
                
                i := add(i, 3)
            }
            
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }
        
        return result;
    }

    /// @dev Fallback function
    receive() external payable {}
}