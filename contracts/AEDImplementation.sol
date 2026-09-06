// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./core/AppStorage.sol";
import "./libraries/LibAppStorage.sol";
import "./libraries/LibMinting.sol";
import "./libraries/LibAdmin.sol";
import "./libraries/LibMetadata.sol";
import "./libraries/LibReverse.sol";
import "./libraries/LibEnhancements.sol";
import "./libraries/LibBadgeCreator.sol";
import "./libraries/LibBadgeManager.sol";
import "./libraries/LibEvolution.sol";
import "./libraries/LibPayment.sol";
import "./core/AEDConstants.sol";

contract AEDImplementation is
    UUPSUpgradeable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    AEDConstants
{
    using LibAppStorage for AppStorage;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    modifier onlyFeeManager() {
        require(hasRole(FEE_MANAGER_ROLE, msg.sender), "Not fee manager");
        _;
    }

    modifier onlyTLDManager() {
        require(hasRole(TLD_MANAGER_ROLE, msg.sender), "Not TLD manager");
        _;
    }

    modifier whenNotPaused() {
        require(!LibAppStorage.appStorage().paused, "Contract paused");
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(LibAppStorage.appStorage().owners[tokenId] == msg.sender, "Not token owner");
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        address paymentWallet,
        address admin
    ) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        AppStorage storage s = LibAppStorage.appStorage();
        s.feeCollector = paymentWallet;
        s.admins[admin] = true;
        s.nextTokenId = 1;
        s.baseURI = "ipfs://bafybeie4uuvvoqp66wx7vu6x7jmnk6xblqjz6cghz6mv2vqf6mcgcpk6xi/";

        // Register features (prices in USDC 6 decimals)
        _registerFeature(s, "subdomain", DEFAULT_SUBDOMAIN_ENHANCEMENT, FEATURE_SUBDOMAINS);
        _registerFeature(s, "metadata", 0, FEATURE_METADATA);
        _registerFeature(s, "reverse", 0, FEATURE_REVERSE);
        _registerFeature(s, "bridge", 0, FEATURE_BRIDGE);

        s.featureExists["byo"] = true;
        s.enhancementPrices["byo"] = DEFAULT_BYO_DOMAIN;
        s.enhancementPrices["metadata"] = 0;
        s.enhancementPrices["reverse"] = 0;
        s.enhancementPrices["bridge"] = 0;

        // TLD prices in USDC (6 decimals)
        s.tldPrices["alsania"] = DEFAULT_PAID_TLD;
        s.tldPrices["fx"] = DEFAULT_PAID_TLD;
        s.tldPrices["echo"] = DEFAULT_PAID_TLD;

        s.freeTlds["aed"] = true;
        s.freeTlds["alsa"] = true;
        s.freeTlds["07"] = true;
        s.validTlds["aed"] = true;
        s.validTlds["alsa"] = true;
        s.validTlds["07"] = true;
        s.validTlds["alsania"] = true;
        s.validTlds["fx"] = true;
        s.validTlds["echo"] = true;

        LibEnhancements.ensureDefaultFeatures();
        s.globalDescription = "Alsania Enhanced Domains collection";
        s.fees["subdomainFreeMints"] = 2;
        
        // Set default base fees (admin can adjust)
        s.fees["badgeBase"] = DEFAULT_BADGE_FEE;
        s.fees["capabilityBase"] = DEFAULT_CAPABILITY_FEE;
        s.fees["subdomainBase"] = DEFAULT_SUBDOMAIN_FEE;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(DEFAULT_ADMIN_ROLE)
        override
    {}

    // ===== DOMAIN MINTING =====

    function registerDomain(
        string calldata name,
        string calldata tld,
        bool withSubdomains
    ) external whenNotPaused nonReentrant returns (uint256) {
        uint256 cost = _calculateDomainCost(tld, withSubdomains);
        if (cost > 0) {
            LibPayment.collectPayment(cost, "domain_registration");
        }
        
        uint256 tokenId = LibMinting.registerDomain(name, tld, withSubdomains);

        AppStorage storage s = LibAppStorage.appStorage();
        if (s.userDomains[msg.sender].length == 1) {
            bytes32 eventHash = keccak256(abi.encodePacked("first_domain", tokenId, block.timestamp));
            LibEvolution.awardFragment(tokenId, "first_domain", eventHash);
        }

        return tokenId;
    }

    function mintSubdomain(
        uint256 parentId,
        string calldata label
    ) external whenNotPaused nonReentrant returns (uint256) {
        string memory parentDomain = LibAppStorage.appStorage().tokenIdToDomain[parentId];
        require(bytes(parentDomain).length > 0, "Parent not found");

        uint256 cost = LibMinting.calculateSubdomainFee(parentId);
        if (cost > 0) {
            LibPayment.collectPayment(cost, "subdomain_mint");
        }

        uint256 tokenId = LibMinting.createSubdomain(label, parentDomain);

        bytes32 eventHash = keccak256(abi.encodePacked("subdomain_created", parentId, tokenId, block.timestamp));
        LibEvolution.awardFragment(parentId, "subdomain_creator", eventHash);

        return tokenId;
    }

    function calculateSubdomainFee(uint256 parentId) external view returns (uint256) {
        return LibMinting.calculateSubdomainFee(parentId);
    }

    function batchRegisterDomains(
        string[] calldata names,
        string[] calldata tlds,
        bool[] calldata withSubdomains
    ) external whenNotPaused nonReentrant returns (uint256[] memory) {
        uint256 totalCost = 0;
        for (uint256 i = 0; i < names.length; i++) {
            totalCost += _calculateDomainCost(tlds[i], withSubdomains[i]);
        }

        if (totalCost > 0) {
            LibPayment.collectPayment(totalCost, "batch_registration");
        }

        uint256[] memory tokenIds = LibMinting.batchRegisterDomains(names, tlds, withSubdomains);

        return tokenIds;
    }

    // ===== BADGE (AI SUBDOMAIN) FUNCTIONS =====

    function createAISubdomain(
        string calldata label,
        string calldata parentDomain,
        string calldata modelType
    ) external whenNotPaused nonReentrant returns (uint256) {
        uint256 parentTokenId = LibAppStorage.appStorage().domainToTokenId[parentDomain];
        require(parentTokenId != 0, "Parent not found");

        uint256 fee = LibBadgeCreator.calculateAISubdomainFee(parentTokenId);
        LibPayment.collectPayment(fee, "badge_creation");

        uint256 tokenId = LibBadgeCreator.createAISubdomain(label, parentDomain, modelType);

        return tokenId;
    }

    function purchaseAICapability(
        uint256 tokenId,
        string calldata capabilityType
    ) external whenNotPaused nonReentrant {
        uint256 fee = LibBadgeCreator.calculateCapabilityFee(tokenId);
        LibPayment.collectPayment(fee, "capability_unlock");

        LibBadgeCreator.purchaseAICapability(tokenId, capabilityType);
    }

    function burnBadge(uint256 tokenId) external whenNotPaused {
        LibBadgeManager.burnBadge(tokenId);
    }

    function lockBadgeTransfer(uint256 tokenId) external onlyTokenOwner(tokenId) {
        LibBadgeManager.lockBadgeTransfer(tokenId);
    }

    function unlockBadgeTransfer(uint256 tokenId) external onlyTokenOwner(tokenId) {
        LibBadgeManager.unlockBadgeTransfer(tokenId);
    }

    function removeCapability(uint256 tokenId, string calldata capabilityType) external onlyAdmin {
        LibBadgeManager.removeCapability(tokenId, capabilityType);
    }

    function getActiveCapabilities(uint256 tokenId) external view returns (string[] memory) {
        return LibBadgeManager.getActiveCapabilities(tokenId);
    }

    function getBadgeCount(address owner, string calldata parentDomain) external view returns (uint256) {
        return LibBadgeManager.getBadgeCount(owner, parentDomain);
    }

    function hasAICapability(uint256 tokenId, string calldata capabilityType) external view returns (bool) {
        return LibBadgeCreator.hasAICapability(tokenId, capabilityType);
    }

    function getModelType(uint256 tokenId) external view returns (string memory) {
        return LibBadgeCreator.getModelType(tokenId);
    }

    function isAISubdomain(uint256 tokenId) external view returns (bool) {
        return LibBadgeCreator.isAISubdomain(tokenId);
    }

    function isBadgeTransferLocked(uint256 tokenId) external view returns (bool) {
        return LibBadgeManager.isBadgeTransferLocked(tokenId);
    }

    function getAISubdomainFee(uint256 parentTokenId) external view returns (uint256) {
        return LibBadgeCreator.calculateAISubdomainFee(parentTokenId);
    }

    function getCapabilityFee(uint256 tokenId) external view returns (uint256) {
        return LibBadgeCreator.calculateCapabilityFee(tokenId);
    }

    // ===== REPUTATION SYSTEM =====

    event FeedbackSubmitted(
        uint256 indexed badgeId,
        address indexed rater,
        uint8 score,
        bytes32 commentHash,
        uint256 timestamp
    );

    event FeedbackWithdrawn(
        uint256 indexed badgeId,
        address indexed rater,
        uint256 stakeReturned,
        uint256 timestamp
    );

    /**
     * @dev Leave feedback for a badge (AI subdomain)
     * Requires staking 1 ALSA token to prevent spam
     */
    function leaveFeedback(
        uint256 badgeId,
        uint8 score,
        string calldata comment
    ) external nonReentrant whenNotPaused {
        AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.isAISubdomain[badgeId], "Not a badge");
        require(score >= 1 && score <= 5, "Score must be 1-5");
        require(!s.badgeReputation[badgeId].hasRated[msg.sender], "Already rated");
        
        // Transfer ALSA stake
        IERC20 alsaToken = IERC20(s.alsaTokenAddress);
        require(alsaToken.balanceOf(msg.sender) >= s.alsaStakeAmount, "Insufficient ALSA balance");
        require(alsaToken.transferFrom(msg.sender, address(this), s.alsaStakeAmount), "ALSA transfer failed");
        
        // Update reputation
        BadgeReputationData storage badgeRep = s.badgeReputation[badgeId];
        
        uint256 newTotalScore = badgeRep.reputation.totalScore + score;
        uint256 newTotalRatings = badgeRep.reputation.totalRatings + 1;
        uint256 newAverageScore = newTotalScore / newTotalRatings;
        
        badgeRep.reputation.totalScore = newTotalScore;
        badgeRep.reputation.totalRatings = newTotalRatings;
        badgeRep.reputation.averageScore = newAverageScore;
        
        badgeRep.hasRated[msg.sender] = true;
        badgeRep.stakedAmount[msg.sender] = s.alsaStakeAmount;
        badgeRep.stakeReleaseTime[msg.sender] = block.timestamp + 7 days;
        badgeRep.lastFeedbackTimestamp = block.timestamp;
        
        // Store feedback history
        badgeRep.feedbackHistory.push(FeedbackRecord({
            rater: msg.sender,
            score: score,
            comment: comment,
            timestamp: block.timestamp,
            isActive: true
        }));
        
        emit FeedbackSubmitted(badgeId, msg.sender, score, keccak256(bytes(comment)), block.timestamp);
        
        // Award fragment for first feedback
        if (newTotalRatings == 1) {
            bytes32 eventHash = keccak256(abi.encodePacked("first_feedback", badgeId, block.timestamp));
            LibEvolution.awardFragment(badgeId, "first_feedback", eventHash);
        }
    }

    /**
     * @dev Get reputation data for a badge
     */
    function getBadgeReputation(uint256 badgeId) external view returns (
        uint256 averageScore,
        uint256 totalRatings,
        uint256 displayScore
    ) {
        AppStorage storage s = LibAppStorage.appStorage();
        require(s.isAISubdomain[badgeId], "Not a badge");
        
        BadgeReputationData storage badgeRep = s.badgeReputation[badgeId];
        
        averageScore = badgeRep.reputation.averageScore;
        totalRatings = badgeRep.reputation.totalRatings;
        
        // Apply decay if no recent feedback
        uint256 daysSinceLastFeedback = (block.timestamp - badgeRep.lastFeedbackTimestamp) / 1 days;
        if (daysSinceLastFeedback > s.reputationDecayDays && badgeRep.reputation.totalRatings > 0) {
            uint256 decayFactor = 1 * (s.reputationDecayDays / 180); // 50% decay after 180 days
            displayScore = averageScore * decayFactor / 1;
        } else {
            displayScore = averageScore;
        }
        
        // Only show reputation if enough ratings
        if (totalRatings < s.minRatingsForDisplay) {
            displayScore = 0;
        }
    }

    /**
     * @dev Get feedback history for a badge
     */
    function getFeedbackHistory(uint256 badgeId, uint256 start, uint256 limit) external view returns (
        address[] memory raters,
        uint8[] memory scores,
        uint256[] memory timestamps
    ) {
        AppStorage storage s = LibAppStorage.appStorage();
        require(s.isAISubdomain[badgeId], "Not a badge");
        
        BadgeReputationData storage badgeRep = s.badgeReputation[badgeId];
        uint256 total = badgeRep.feedbackHistory.length;
        require(start < total, "Start out of bounds");
        
        uint256 end = start + limit;
        if (end > total) end = total;
        
        uint256 resultCount = end - start;
        raters = new address[](resultCount);
        scores = new uint8[](resultCount);
        timestamps = new uint256[](resultCount);
        
        for (uint256 i = start; i < end; i++) {
            FeedbackRecord storage record = badgeRep.feedbackHistory[i];
            uint256 idx = i - start;
            raters[idx] = record.rater;
            scores[idx] = record.score;
            timestamps[idx] = record.timestamp;
        }
    }

    /**
     * @dev Withdraw staked ALSA after 7 days
     */
    function withdrawStake(uint256 badgeId) external nonReentrant {
        AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.badgeReputation[badgeId].hasRated[msg.sender], "No stake found");
        require(block.timestamp >= s.badgeReputation[badgeId].stakeReleaseTime[msg.sender], "Stake still locked");
        
        uint256 stakeAmount = s.badgeReputation[badgeId].stakedAmount[msg.sender];
        require(stakeAmount > 0, "No stake to withdraw");
        
        s.badgeReputation[badgeId].stakedAmount[msg.sender] = 0;
        
        IERC20 alsaToken = IERC20(s.alsaTokenAddress);
        require(alsaToken.transfer(msg.sender, stakeAmount), "ALSA transfer failed");
        
        emit FeedbackWithdrawn(badgeId, msg.sender, stakeAmount, block.timestamp);
    }

    /**
     * @dev Set ALSA token address (admin only)
     */
    function setAlsaTokenAddress(address tokenAddress) external onlyAdmin {
        AppStorage storage s = LibAppStorage.appStorage();
        s.alsaTokenAddress = tokenAddress;
    }

    // ===== METADATA =====

    function setProfileURI(uint256 tokenId, string calldata uri) external onlyTokenOwner(tokenId) {
        LibMetadata.setProfileURI(tokenId, uri);
    }

    function setImageURI(uint256 tokenId, string calldata uri) external onlyTokenOwner(tokenId) {
        LibMetadata.setImageURI(tokenId, uri);
    }

    function getProfileURI(uint256 tokenId) external view returns (string memory) {
        return LibMetadata.getProfileURI(tokenId);
    }

    function getImageURI(uint256 tokenId) external view returns (string memory) {
        return LibMetadata.getImageURI(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return LibMetadata.tokenURI(tokenId);
    }

    // ===== REVERSE RESOLUTION =====

    function setReverse(string calldata domain) external {
        LibReverse.setReverseRecord(domain);
    }

    function clearReverse() external {
        LibReverse.clearReverseRecord();
    }

    function getReverse(address addr) external view returns (string memory) {
        return LibAppStorage.appStorage().reverseRecords[addr];
    }

    function getReverseOwner(string calldata domain) external view returns (address) {
        return LibAppStorage.appStorage().reverseOwners[domain];
    }

    // ===== ENHANCEMENTS =====

    function purchaseFeature(uint256 tokenId, string calldata featureName) external whenNotPaused nonReentrant {
        LibEnhancements.purchaseFeature(tokenId, featureName);

        bytes32 featureHash = keccak256(bytes(featureName));
        string memory fragmentType;

        if (featureHash == keccak256(bytes("bridge"))) {
            fragmentType = "bridge_master";
        } else if (featureHash == keccak256(bytes("subdomain"))) {
            fragmentType = "subdomain_unlocked";
        }

        if (bytes(fragmentType).length > 0) {
            bytes32 eventHash = keccak256(abi.encodePacked("feature_purchased", tokenId, featureName, block.timestamp));
            LibEvolution.awardFragment(tokenId, fragmentType, eventHash);
        }
    }

    function enableSubdomainFeature(uint256 tokenId) external whenNotPaused nonReentrant {
        LibEnhancements.enableSubdomains(tokenId);
    }

    function upgradeExternalDomain(string calldata externalDomain) external whenNotPaused nonReentrant {
        LibEnhancements.upgradeExternalDomain(externalDomain);
    }

    function getFeaturePrice(string calldata featureName) external view returns (uint256) {
        return LibEnhancements.getFeaturePrice(featureName);
    }

    function isFeatureEnabled(uint256 tokenId, string calldata featureName) external view returns (bool) {
        return LibEnhancements.isFeatureEnabled(tokenId, featureName);
    }

    function getAvailableFeatures() external view returns (string[] memory) {
        return LibEnhancements.getAvailableFeatures();
    }

    // ===== EVOLUTION & FRAGMENTS =====

    function getTokenFragments(uint256 tokenId) external view returns (Fragment[] memory) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibEvolution.getTokenFragments(tokenId);
    }

    function getEvolutionLevel(uint256 tokenId) external view returns (uint256) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibEvolution.getEvolutionLevel(tokenId);
    }

    function getFragmentCount(uint256 tokenId) external view returns (uint256) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibEvolution.getFragmentCount(tokenId);
    }

    function hasFragment(uint256 tokenId, string calldata fragmentType) external view returns (bool) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibEvolution.hasFragment(tokenId, fragmentType);
    }

    function awardFragment(uint256 tokenId, string calldata fragmentType) external onlyAdmin {
        require(_tokenExists(tokenId), "Token does not exist");
        bytes32 eventHash = keccak256(abi.encodePacked("admin_award", tokenId, fragmentType, block.timestamp));
        LibEvolution.awardFragment(tokenId, fragmentType, eventHash);
    }

    function batchAwardFragments(
        uint256[] calldata tokenIds,
        string calldata fragmentType
    ) external onlyAdmin {
        bytes32 eventHash = keccak256(abi.encodePacked("batch_award", fragmentType, block.timestamp));

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_tokenExists(tokenIds[i])) {
                LibEvolution.awardFragment(tokenIds[i], fragmentType, eventHash);
            }
        }
    }

    // ===== ADMIN =====

    function updateFee(string calldata feeType, uint256 newAmount) external onlyFeeManager {
        LibAdmin.updateFee(feeType, newAmount);
    }

    function updateFeeRecipient(address newRecipient) external onlyAdmin {
        LibAdmin.updateFeeRecipient(newRecipient);
    }

    function configureTLD(string calldata tld, bool isActive, uint256 price) external onlyTLDManager {
        LibAdmin.configureTLD(tld, isActive, price);
    }

    function setFeaturePrice(string calldata featureName, uint256 price) external onlyAdmin {
        LibEnhancements.setFeaturePrice(featureName, price);
    }

    function addFeature(string calldata featureName, uint256 price, uint256 flag) external onlyAdmin {
        LibEnhancements.addFeature(featureName, price, flag);
    }

    function setFeatureFlags(string[] calldata _featureNames, uint256[] calldata _flags) external onlyAdmin {
        require(_featureNames.length == _flags.length, "Arrays length mismatch");
        AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i = 0; i < _featureNames.length; i++) {
            s.featureFlags[_featureNames[i]] = _flags[i];
        }
    }

    function setGlobalDescription(string calldata description) external onlyAdmin {
        LibAppStorage.appStorage().globalDescription = description;
    }

    function getGlobalDescription() external view returns (string memory) {
        return LibAppStorage.appStorage().globalDescription;
    }
    
    function pause() external onlyAdmin {
        LibAdmin.pauseContract();
    }

    function unpause() external onlyAdmin {
        LibAdmin.unpauseContract();
    }

    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.grantRole(role, account);
        LibAdmin.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        super.revokeRole(role, account);
        LibAdmin.revokeRole(role, account);
    }

    // ===== VIEW =====

    function getDomainInfo(uint256 tokenId) external view returns (Domain memory) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibAppStorage.appStorage().domains[tokenId];
    }

    function getUserDomains(address user) external view returns (string[] memory) {
        return LibAppStorage.appStorage().userDomains[user];
    }

    function getTotalRevenue() external view returns (uint256) {
        return LibAppStorage.appStorage().totalRevenue;
    }

    function getFeeCollector() external view returns (address) {
        return LibAppStorage.appStorage().feeCollector;
    }

    function isTLDActive(string calldata tld) external view returns (bool) {
        return LibAppStorage.appStorage().validTlds[tld];
    }

    function isTLDFree(string calldata tld) external view returns (bool) {
        return LibAppStorage.appStorage().freeTlds[tld];
    }

    function getTLDPrice(string calldata tld) external view returns (uint256) {
        return LibAppStorage.appStorage().tldPrices[tld];
    }

    function getFeeValue(string calldata feeType) external view returns (uint256) {
        return LibAdmin.getFee(feeType);
    }

    function isPaused() external view returns (bool) {
        return LibAdmin.isPaused();
    }

    function isRegistered(string calldata name, string calldata tld) external view returns (bool) {
        string memory fullDomain = string(abi.encodePacked(name, ".", tld));
        return LibAppStorage.appStorage().domainExists[fullDomain];
    }

    function getDomainByTokenId(uint256 tokenId) external view returns (string memory) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibAppStorage.appStorage().tokenIdToDomain[tokenId];
    }

    function getTokenIdByDomain(string calldata domain) external view returns (uint256) {
        uint256 tokenId = LibAppStorage.appStorage().domainToTokenId[domain];
        require(tokenId != 0, "Domain not found");
        return tokenId;
    }

    function totalSupply() external view returns (uint256) {
        AppStorage storage s = LibAppStorage.appStorage();
        return s.nextTokenId - 1;
    }

    function contractURI() external pure returns (string memory) {
        return LibMetadata.contractURI();
    }

    function estimateDomainPrice(string calldata tld, bool withEnhancements) external view returns (uint256) {
        return _calculateDomainCost(tld, withEnhancements);
    }

    // ===== ERC721 OVERRIDES =====

    function ownerOf(uint256 tokenId) public view override returns (address) {
        AppStorage storage s = LibAppStorage.appStorage();
        address owner = s.owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "Zero address query");
        return LibAppStorage.appStorage().balances[owner];
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        require(to != owner, "Approval to current owner");
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "Not owner nor approved"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_tokenExists(tokenId), "Token does not exist");
        return LibAppStorage.appStorage().tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public override {
        require(operator != msg.sender, "Approve to caller");
        _setApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return LibAppStorage.appStorage().operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");
        require(!LibBadgeManager.isBadgeTransferLocked(tokenId), "Badge transfer locked");
        _customTransfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");
        require(!LibBadgeManager.isBadgeTransferLocked(tokenId), "Badge transfer locked");
        _customSafeTransfer(from, to, tokenId, data);
    }

    // ===== INTERNAL =====

    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return LibAppStorage.appStorage().owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
        AppStorage storage s = LibAppStorage.appStorage();
        address owner = s.owners[tokenId];
        return (spender == owner ||
                s.tokenApprovals[tokenId] == spender ||
                s.operatorApprovals[owner][spender]);
    }

    function _customTransfer(address from, address to, uint256 tokenId) internal {
        AppStorage storage s = LibAppStorage.appStorage();
        require(s.owners[tokenId] == from, "Transfer from incorrect owner");
        require(to != address(0), "Transfer to zero address");

        delete s.tokenApprovals[tokenId];

        s.balances[from]--;
        s.balances[to]++;
        s.owners[tokenId] = to;

        s.domains[tokenId].owner = to;

        string memory domain = s.tokenIdToDomain[tokenId];
        _removeFromUserDomains(from, domain);
        s.userDomains[to].push(domain);

        LibReverse.handleDomainTransfer(from, to, domain);

        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal override {
        AppStorage storage s = LibAppStorage.appStorage();
        s.tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal override {
        require(owner != operator, "Approve to caller");
        AppStorage storage s = LibAppStorage.appStorage();
        s.operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _customSafeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal {
        _customTransfer(from, to, tokenId);
        require(_safeCheck721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver");
    }

    function _safeCheck721Received(address from, address to, uint256 tokenId, bytes memory data) internal returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non ERC721Receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _calculateDomainCost(string calldata tld, bool withSubdomains) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.appStorage();
        
        // Free TLDs cost nothing
        if (s.freeTlds[tld]) {
            return 0;
        }
        
        // Get TLD price (in USDC, 6 decimals)
        uint256 cost = s.tldPrices[tld];
        
        // Add subdomain enhancement fee if requested
        if (withSubdomains) {
            cost += s.enhancementPrices["subdomain"];
        }
        
        return cost;
    }

    function _removeFromUserDomains(address user, string memory domain) internal {
        AppStorage storage s = LibAppStorage.appStorage();
        string[] storage userDomains = s.userDomains[user];

        for (uint256 i = 0; i < userDomains.length; i++) {
            if (keccak256(bytes(userDomains[i])) == keccak256(bytes(domain))) {
                userDomains[i] = userDomains[userDomains.length - 1];
                userDomains.pop();
                break;
            }
        }
    }

    function _registerFeature(AppStorage storage s, string memory name, uint256 price, uint256 flag) private {
        if (!s.featureExists[name]) {
            s.availableFeatures.push(name);
            s.featureExists[name] = true;
        }

        s.featureFlags[name] = flag;
        s.enhancementPrices[name] = price;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
