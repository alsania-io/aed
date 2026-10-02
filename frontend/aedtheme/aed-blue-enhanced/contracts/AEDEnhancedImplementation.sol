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
 * @title AEDEnhancedImplementation
 * @dev Enhanced Alsania Enhanced Domains implementation with modular architecture
 * @notice This contract implements UUPS upgradeable pattern with comprehensive features
 */
contract AEDEnhancedImplementation is 
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

    /// @dev Custom errors for gas optimization
    error InvalidDomain(string reason);
    error InsufficientPayment(uint256 required, uint256 provided);
    error UnauthorizedAccess();
    error ContractPaused();
    error DomainNotFound();
    error FeatureNotAvailable();
    error InvalidOperation();

    /// @dev Events for enhanced tracking
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

    /// @dev Modifier for authorized minters
    modifier onlyAuthorizedMinter() {
        if (!hasRole(MINTER_ROLE, _msgSender()) && !hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

    /// @dev Modifier for fee managers
    modifier onlyFeeManager() {
        if (!hasRole(FEE_MANAGER_ROLE, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

    /// @dev Modifier for TLD managers
    modifier onlyTLDManager() {
        if (!hasRole(TLD_MANAGER_ROLE, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

    /// @dev Modifier for pausers
    modifier onlyPauser() {
        if (!hasRole(PAUSER_ROLE, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

    /// @dev Modifier for upgraders
    modifier onlyUpgrader() {
        if (!hasRole(UPGRADER_ROLE, _msgSender())) {
            revert UnauthorizedAccess();
        }
        _;
    }

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
        
        $.featurePricing["metadata"] = FeaturePricing({
            price: 0.5 ether,
            active: true,
            description: "Enhanced metadata features"
        });
        
        $.featurePricing["reverse"] = FeaturePricing({
            price: 0.2 ether,
            active: true,
            description: "Reverse resolution features"
        });
    }

    /// @dev Register a new domain
    function registerDomain(
        string calldata name,
        string calldata tld,
        bool enableSubdomains,
        string calldata metadataURI
    ) external payable whenNotPaused nonReentrant returns (uint256 tokenId) {
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
            expiresAt: 0, // No expiration
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
        
        // Calculate total cost and validate
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
        
        // Register all domains individually
        for (uint256 i = 0; i < names.length; i++) {
            (bool valid, string memory reason) = $.validateDomainName(names[i], tlds[i]);
            if (!valid) continue;
            
            // Calculate individual cost
            (uint256 cost, ) = $.calculateDomainCost(
                names[i], 
                tlds[i], 
                enableSubdomains[i]
            );
            
            // Register domain
            tokenIds[i] = _registerDomainInternal(
                names[i], 
                tlds[i], 
                enableSubdomains[i], 
                metadataURIs[i],
                cost
            );
        }
        
        emit BatchDomainsRegistered(_msgSender(), tokenIds, names, totalCost);
        return tokenIds;
    }

    /// @dev Internal domain registration function
    function _registerDomainInternal(
        string calldata name,
        string calldata tld,
        bool enableSubdomains,
        string calldata metadataURI,
        uint256 cost
    ) internal returns (uint256 tokenId) {
        AEDAppStorage storage $ = _getAEDStorage();
        
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
        _processPayment(cost);
        
        emit DomainRegistered(tokenId, _msgSender(), fullDomain, tld, cost);
        return tokenId;
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

    /// @dev Upgrade domain features
    function upgradeFeature(
        uint256 tokenId,
        string calldata featureName
    ) external payable whenNotPaused nonReentrant {
        if (_ownerOf(tokenId) == address(0)) revert DomainNotFound();
        if (ownerOf(tokenId) != _msgSender()) revert UnauthorizedAccess();
        
        AEDAppStorage storage $ = _getAEDStorage();
        
        uint256 cost = $.calculateFeatureCost(featureName);
        if (msg.value < cost) revert InsufficientPayment(cost, msg.value);
        
        // Update features
        if (keccak256(bytes(featureName)) == keccak256(bytes("subdomain"))) {
            $.domains[tokenId].features |= AEDConstants.FEATURE_SUBDOMAIN;
        } else if (keccak256(bytes(featureName)) == keccak256(bytes("metadata"))) {
            $.domains[tokenId].features |= AEDConstants.FEATURE_METADATA;
        }
        
        _processPayment(cost);
        
        emit FeaturePurchased(tokenId, featureName, cost);
    }

    /// @dev Set reverse resolution
    function setReverseRecord(string calldata domain) external whenNotPaused {
        AEDAppStorage storage $ = _getAEDStorage();
        
        uint256 tokenId = $.domainToTokenId[domain];
        if (tokenId == 0) revert DomainNotFound();
        if (ownerOf(tokenId) != _msgSender()) revert UnauthorizedAccess();
        
        $.reverseRecords[_msgSender()] = domain;
        $.reverseOwners[domain] = _msgSender();
        
        emit ReverseRecordSet(_msgSender(), domain);
    }

    /// @dev Clear reverse resolution
    function clearReverseRecord() external {
        AEDAppStorage storage $ = _getAEDStorage();
        
        string memory domain = $.reverseRecords[_msgSender()];
        if (bytes(domain).length > 0) {
            delete $.reverseRecords[_msgSender()];
            delete $.reverseOwners[domain];
        }
    }

    /// @dev Admin functions
    function updateFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        require(newCollector != address(0), "Invalid address");
        
        AEDAppStorage storage $ = _getAEDStorage();
        address oldCollector = $.feeCollector;
        $.feeCollector = newCollector;
        
        emit FeeCollectorUpdated(oldCollector, newCollector);
    }

    /// @dev Withdraw accumulated revenue
    function withdrawRevenue(uint256 amount) external onlyRole(ADMIN_ROLE) {
        AEDAppStorage storage $ = _getAEDStorage();
        require(amount <= $.totalRevenue, "Insufficient revenue");
        
        $.totalRevenue -= amount;
        
        (bool success, ) = $.feeCollector.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit RevenueWithdrawn($.feeCollector, amount);
    }

    /// @dev Pause contract
    function pause() external onlyPauser {
        _pause();
        emit EmergencyPauseTriggered(_msgSender());
    }

    /// @dev Unpause contract
    function unpause() external onlyPauser {
        _unpause();
        emit EmergencyUnpauseTriggered(_msgSender());
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
        return $.getPricingSummary();
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

    /// @dev Override required by Solidity
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        ImplementationStorage storage impl = _getImplementationStorage();
        impl.upgradeCount++;
        impl.upgrades[impl.upgradeCount] = UpgradeRecord({
            oldImplementation: impl.implementation,
            newImplementation: newImplementation,
            timestamp: block.timestamp,
            description: "UUPS upgrade"
        });
        impl.implementation = newImplementation;
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

    /// @dev Override tokenURI for enhanced metadata
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (_ownerOf(tokenId) == address(0)) revert DomainNotFound();
        
        AEDAppStorage storage $ = _getAEDStorage();
        Domain memory domain = $.domains[tokenId];
        
        // Generate enhanced metadata JSON
        return _generateTokenURI(domain, tokenId);
    }

    /// @dev Generate token URI JSON
    function _generateTokenURI(Domain memory domain, uint256 tokenId)
        private
        view
        returns (string memory)
    {
        bytes memory attributes = abi.encodePacked(
            '[{"trait_type":"TLD","value":"', domain.tld, '"},',
            '{"trait_type":"Subdomain","value":"', domain.isSubdomain ? "Yes" : "No", '"},',
            '{"trait_type":"Features","value":"', uint256(domain.features).toString(), '"}]'
        );
        
        bytes memory image = abi.encodePacked(
            "data:image/svg+xml;base64,",
            _generateSVG(domain, tokenId)
        );
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                _base64Encode(
                    abi.encodePacked(
                        '{"name":"', domain.fullDomain, '",',
                        '"description":"Alsania Enhanced Domain NFT",',
                        '"image":"', image, '",',
                        '"attributes":', attributes, ',',
                        '"external_url":"https://alsania.io/domain/', domain.fullDomain, '"}'
                    )
                )
            )
        );
    }

    /// @dev Generate SVG image for domain
    function _generateSVG(Domain memory domain, uint256 tokenId)
        private
        pure
        returns (bytes memory)
    {
        return _base64Encode(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
                '<rect width="400" height="400" fill="#1a1a2e"/>',
                '<text x="200" y="150" font-family="Arial" font-size="24" fill="#eee" text-anchor="middle">',
                domain.fullDomain,
                '</text>',
                '<text x="200" y="200" font-family="Arial" font-size="16" fill="#aaa" text-anchor="middle">',
                "Token ID: #", tokenId.toString(),
                '</text>',
                '</svg>'
            )
        );
    }

    /// @dev Base64 encoding helper
    function _base64Encode(bytes memory data) private pure returns (bytes memory) {
        if (data.length == 0) return "";
        
        // Load table into memory
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        
        // Add some extra buffer at the end required for the writing
        bytes memory result = new bytes(encodedLen + 32);
        
        bytes memory table = bytes(TABLE);
        
        assembly {
            let tablePtr := add(table, 1)
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
            
            // Padding
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

    /// @dev Fallback function to receive Ether
    receive() external payable {}
}