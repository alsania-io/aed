// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AEDMinimalV2
 * @notice Hardened Alsania Enhanced Domains registry (UUPS upgradeable).
 * @dev Storage layout is APPEND-ONLY relative to AEDMinimal v1 so this can be
 *      deployed as an upgrade to the existing proxy without corrupting state.
 *      v1 storage (owners, balances, domainToTokenId, tokenIdToDomain,
 *      domainExists, userDomains, validTlds, freeTlds, tldPrices, nextTokenId,
 *      feeCollector, totalRevenue, paused, aiModelType, isAISubdomain,
 *      aiCapabilities, reverseRecords, reverseOwners) is kept in the SAME order.
 */
contract AEDMinimalV2 is
    UUPSUpgradeable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ===== v1 storage (unchanged order) =====
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

    mapping(uint256 => string) public aiModelType;
    mapping(uint256 => bool) public isAISubdomain;
    mapping(uint256 => mapping(string => bool)) public aiCapabilities;

    mapping(address => string) public reverseRecords;
    mapping(string => address) public reverseOwners;

    // ===== v2 storage (appended) =====
    address public usdcAddress;                 // now configurable, was a constant
    mapping(string => bool) public validCapabilities;
    mapping(address => uint256) public freeRegistrations; // count of free domains per addr
    uint256 public maxFreePerAddress;           // 0 = unlimited
    uint256 public minNameLength;
    uint256 public maxNameLength;
    string public metadataBaseURI;

    // ===== events =====
    event DomainRegistered(address indexed owner, uint256 indexed tokenId, string fullDomain, uint256 cost);
    event CapabilityPurchased(address indexed owner, uint256 indexed tokenId, string capability, uint256 cost);
    event ReverseSet(address indexed addr, string domain);
    event ReverseCleared(address indexed addr, string domain);
    event FeeCollectorChanged(address indexed oldCollector, address indexed newCollector);
    event PausedToggled(bool paused);
    event TldConfigured(string tld, bool valid, bool free, uint256 price);
    event CapabilityConfigured(string capability, bool valid);
    event MetadataBaseURIChanged(string newBaseURI);
    event UsdcAddressChanged(address indexed oldUsdc, address indexed newUsdc);
    event FreeConfigChanged(uint256 maxFreePerAddress, uint256 minNameLength, uint256 maxNameLength);
    event RevenueWithdrawn(address indexed to, uint256 amount);

    // ===== modifiers =====
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    // ===== init =====
    /// @custom:oz-upgrades-validate-as-initializer
    function initialize(string memory name, string memory symbol, address admin) public initializer {
        __ERC721_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);

        feeCollector = admin;
        nextTokenId = 1;
        usdcAddress = 0x8B0180f2101c8260d49339abfEe87927412494B4; // Amoy USDC (override on mainnet)
        metadataBaseURI = "https://aed-metadata.vercel.app/api/";
        minNameLength = 1;
        maxNameLength = 63;
        maxFreePerAddress = 0; // unlimited by default; admin can cap

        _configureTld("aed", true, true, 0);
        _configureTld("alsa", true, true, 0);
        _configureTld("07", true, true, 0);
        _configureTld("alsania", true, false, 1000000);
        _configureTld("fx", true, false, 1000000);
        _configureTld("echo", true, false, 1000000);

        _configureCapability("ai_vision", true);
        _configureCapability("ai_communication", true);
        _configureCapability("ai_memory", true);
        _configureCapability("ai_reasoning", true);
    }

    /// @notice Re-init used when upgrading the EXISTING v1 proxy to v2.
    /// @dev Sets only the new v2 fields; does not touch v1 storage.
    ///      Parents (ERC721/ReentrancyGuard) were already initialized by v1's `initialize`,
    ///      so intentionally no parent initializer calls happen here.
    /// @custom:oz-upgrades-unsafe-allow missing-initializer-call
    function initializeV2(address usdc, string calldata baseURI) public reinitializer(2) {
        usdcAddress = usdc;
        metadataBaseURI = baseURI;
        minNameLength = 1;
        maxNameLength = 63;

        _configureCapability("ai_vision", true);
        _configureCapability("ai_communication", true);
        _configureCapability("ai_memory", true);
        _configureCapability("ai_reasoning", true);
    }

    // ===== internal config helpers =====
    function _configureTld(string memory tld, bool valid, bool free, uint256 price) internal {
        validTlds[tld] = valid;
        freeTlds[tld] = free;
        tldPrices[tld] = price;
        emit TldConfigured(tld, valid, free, price);
    }

    function _configureCapability(string memory capability, bool valid) internal {
        validCapabilities[capability] = valid;
        emit CapabilityConfigured(capability, valid);
    }

    // ===== validation =====
    /// @dev Lowercase a-z, 0-9, hyphen; no leading/trailing hyphen; length bounds.
    function _isValidLabel(string memory label) internal view returns (bool) {
        bytes memory b = bytes(label);
        if (b.length == 0) return false;
        if (b.length < minNameLength || b.length > maxNameLength) return false;
        if (b[0] == 0x2D || b[b.length - 1] == 0x2D) return false; // leading/trailing '-'
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7A)   // a-z
                || (c >= 0x30 && c <= 0x39)       // 0-9
                || (c == 0x2D);                   // -
            if (!ok) return false;
        }
        return true;
    }

    function _authorizeUpgrade(address) internal override onlyAdmin {}

    // ===== registration =====
    function registerDomain(string calldata name, string calldata tld)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        require(validTlds[tld], "Invalid TLD");
        require(_isValidLabel(name), "Invalid name");

        string memory fullDomain = string(abi.encodePacked(name, ".", tld));
        require(!domainExists[fullDomain], "Domain exists");

        uint256 cost = freeTlds[tld] ? 0 : tldPrices[tld];
        if (cost == 0) {
            // free tier: enforce optional per-address cap
            if (maxFreePerAddress > 0) {
                require(freeRegistrations[msg.sender] < maxFreePerAddress, "Free limit reached");
            }
            freeRegistrations[msg.sender] += 1;
        } else {
            collectPayment(cost);
        }

        uint256 tokenId = _mintDomain(msg.sender, fullDomain);
        emit DomainRegistered(msg.sender, tokenId, fullDomain, cost);
        return tokenId;
    }

    function createAISubdomain(string calldata label, string calldata parentDomain, string calldata modelType)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        require(domainExists[parentDomain], "Parent not found");
        require(_isValidLabel(label), "Invalid label");
        uint256 parentTokenId = domainToTokenId[parentDomain];
        require(owners[parentTokenId] == msg.sender, "Not parent owner");

        string memory badgeName = string(abi.encodePacked(label, ".", parentDomain));
        require(!domainExists[badgeName], "Badge exists");

        collectPayment(1000000);

        uint256 tokenId = _mintDomain(msg.sender, badgeName);
        aiModelType[tokenId] = modelType;
        isAISubdomain[tokenId] = true;
        emit DomainRegistered(msg.sender, tokenId, badgeName, 1000000);
        return tokenId;
    }

    /// @dev shared mint bookkeeping (writes owners/balances/maps/userDomains)
    function _mintDomain(address to, string memory fullDomain) internal returns (uint256) {
        uint256 tokenId = nextTokenId++;
        owners[tokenId] = to;
        balances[to] += 1;
        domainToTokenId[fullDomain] = tokenId;
        tokenIdToDomain[tokenId] = fullDomain;
        domainExists[fullDomain] = true;
        userDomains[to].push(fullDomain);
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function purchaseAICapability(uint256 tokenId, string calldata capabilityType)
        external
        whenNotPaused
        nonReentrant
    {
        require(owners[tokenId] == msg.sender, "Not owner");
        require(isAISubdomain[tokenId], "Not a badge");
        require(validCapabilities[capabilityType], "Invalid capability");
        require(!aiCapabilities[tokenId][capabilityType], "Already unlocked");

        collectPayment(1000000);
        aiCapabilities[tokenId][capabilityType] = true;
        emit CapabilityPurchased(msg.sender, tokenId, capabilityType, 1000000);
    }

    function collectPayment(uint256 amount) internal {
        if (amount == 0) return;
        require(usdcAddress != address(0), "USDC unset");
        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        require(usdc.transferFrom(msg.sender, feeCollector, amount), "Transfer failed");
        totalRevenue += amount;
    }

    // ===== views =====
    function getDomainByTokenId(uint256 tokenId) external view returns (string memory) {
        return tokenIdToDomain[tokenId];
    }

    function getModelType(uint256 tokenId) external view returns (string memory) {
        return aiModelType[tokenId];
    }

    function getActiveCapabilities(uint256 tokenId) public view returns (string[] memory) {
        string[4] memory allCaps = ["ai_vision", "ai_communication", "ai_memory", "ai_reasoning"];
        uint256 count = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (aiCapabilities[tokenId][allCaps[i]]) count++;
        }
        string[] memory result = new string[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (aiCapabilities[tokenId][allCaps[i]]) {
                result[j] = allCaps[i];
                j++;
            }
        }
        return result;
    }

    function hasAICapability(uint256 tokenId, string calldata capabilityType) external view returns (bool) {
        return aiCapabilities[tokenId][capabilityType];
    }

    function getUserDomains(address account) external view returns (string[] memory) {
        return userDomains[account];
    }

    /// @dev Local uint->string to avoid pulling OZ v5 Strings (Cancun mcopy).
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(owners[tokenId] != address(0), "Token not found");
        string memory endpoint = isAISubdomain[tokenId] ? "sub" : "domain";
        return string(abi.encodePacked(metadataBaseURI, endpoint, "/", _uint2str(tokenId)));
    }

    // ===== ERC721 overrides =====
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "Token not found");
        return owner;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "Zero address");
        return balances[owner];
    }

    function approve(address, uint256) public pure override { revert("Not supported"); }
    function getApproved(uint256) public pure override returns (address) { return address(0); }
    function setApprovalForAll(address, bool) public pure override { revert("Not supported"); }
    function isApprovedForAll(address, address) public pure override returns (bool) { return false; }

    /// @dev Enforces owner, clears any reverse record on the FROM side,
    ///      and keeps userDomains bookkeeping consistent.
    function _moveDomain(address from, address to, uint256 tokenId) internal {
        require(to != address(0), "Zero address");
        require(owners[tokenId] == from, "Wrong owner");
        require(msg.sender == from, "Only owner");

        // clear stale reverse record held by the sender
        _clearReverseFor(from);

        balances[from] -= 1;
        balances[to] += 1;
        owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        _moveDomain(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        _moveDomain(from, to, tokenId);
        _requireSafeRecipient(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        _moveDomain(from, to, tokenId);
        _requireSafeRecipient(from, to, tokenId, data);
    }

    function _requireSafeRecipient(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length > 0) {
            try IERC721ReceiverUpgradeable(to).onERC721Received(msg.sender, from, tokenId, data)
                returns (bytes4 retval)
            {
                require(retval == IERC721ReceiverUpgradeable.onERC721Received.selector, "Unsafe recipient");
            } catch {
                revert("Unsafe recipient");
            }
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ===== reverse resolution =====
    function _clearReverseFor(address account) internal {
        string memory existing = reverseRecords[account];
        if (bytes(existing).length > 0) {
            delete reverseOwners[existing];
            delete reverseRecords[account];
            emit ReverseCleared(account, existing);
        }
    }

    function setReverse(string calldata domain) external {
        uint256 tokenId = domainToTokenId[domain];
        require(tokenId != 0 && owners[tokenId] == msg.sender, "Not domain owner");

        _clearReverseFor(msg.sender);
        reverseRecords[msg.sender] = domain;
        reverseOwners[domain] = msg.sender;
        emit ReverseSet(msg.sender, domain);
    }

    function clearReverse() external {
        _clearReverseFor(msg.sender);
    }

    function getReverse(address addr) external view returns (string memory) {
        return reverseRecords[addr];
    }

    function getReverseOwner(string calldata domain) external view returns (address) {
        return reverseOwners[domain];
    }

    // ===== admin =====
    function setFeeCollector(address newCollector) external onlyAdmin {
        require(newCollector != address(0), "Zero address");
        address old = feeCollector;
        feeCollector = newCollector;
        emit FeeCollectorChanged(old, newCollector);
    }

    function setUsdcAddress(address newUsdc) external onlyAdmin {
        require(newUsdc != address(0), "Zero address");
        address old = usdcAddress;
        usdcAddress = newUsdc;
        emit UsdcAddressChanged(old, newUsdc);
    }

    function setMetadataBaseURI(string calldata newBaseURI) external onlyAdmin {
        metadataBaseURI = newBaseURI;
        emit MetadataBaseURIChanged(newBaseURI);
    }

    function configureTld(string calldata tld, bool valid, bool free, uint256 price) external onlyAdmin {
        _configureTld(tld, valid, free, price);
    }

    function configureCapability(string calldata capability, bool valid) external onlyAdmin {
        _configureCapability(capability, valid);
    }

    function setFreeConfig(uint256 maxFree, uint256 minLen, uint256 maxLen) external onlyAdmin {
        require(minLen >= 1 && maxLen >= minLen && maxLen <= 255, "Bad length bounds");
        maxFreePerAddress = maxFree;
        minNameLength = minLen;
        maxNameLength = maxLen;
        emit FreeConfigChanged(maxFree, minLen, maxLen);
    }

    function togglePause() external onlyAdmin {
        paused = !paused;
        emit PausedToggled(paused);
    }

    /// @notice Withdraw USDC held by the contract (e.g. accidental transfers).
    /// @dev Fees are paid directly to feeCollector on purchase, so this only
    ///      moves stray balances. Does not affect totalRevenue accounting.
    function withdrawUSDC(uint256 amount) external onlyAdmin nonReentrant {
        require(usdcAddress != address(0), "USDC unset");
        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        emit RevenueWithdrawn(msg.sender, amount);
    }
}
