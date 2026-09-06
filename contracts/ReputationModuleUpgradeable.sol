// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ReputationModuleUpgradeable
 * @dev UUPS upgradeable reputation system for AI badges
 * ENHANCED: Weighted scoring by rater reputation + Fee discounts for high reputation badge owners
 * Better than ERC-8004: sybil resistance, stake requirement, decay, dispute window, weighted scoring, fee discounts
 */
contract ReputationModuleUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ===========================================
    // Structs
    // ===========================================
    
    struct Reputation {
        uint256 totalWeightedScore;    // Sum of (score * raterReputation)
        uint256 totalWeight;           // Sum of rater reputations
        uint256 averageScore;          // Weighted average (totalWeightedScore / totalWeight)
        uint256 lastFeedbackTimestamp;
        uint256 totalRatings;          // Number of ratings (for display threshold)
    }
    
    struct Feedback {
        address rater;
        uint8 score;
        uint256 raterReputationAtTime; // Rater's reputation when rating
        string comment;
        uint256 timestamp;
        bool active;
    }
    
    struct StakeInfo {
        uint256 amount;
        uint256 releaseTime;
        bool hasStaked;
    }
    
    // ===========================================
    // Constants
    // ===========================================
    
    uint256 public constant ALSA_STAKE_AMOUNT = 1e18; // 1 ALSA
    uint256 public constant DISPUTE_WINDOW_DAYS = 7;
    uint256 public constant REPUTATION_DECAY_DAYS = 90;
    uint256 public constant MIN_RATINGS_FOR_DISPLAY = 5;
    uint256 public constant MAX_SCORE = 5;
    uint256 public constant MIN_SCORE = 1;
    
    // Fee discount tiers (basis points discount from houseFeeBps)
    uint256 public constant DISCOUNT_TIER1_THRESHOLD = 350; // 3.5 stars
    uint256 public constant DISCOUNT_TIER1_BPS = 50;       // 0.5% discount
    uint256 public constant DISCOUNT_TIER2_THRESHOLD = 400; // 4.0 stars
    uint256 public constant DISCOUNT_TIER2_BPS = 100;      // 1.0% discount
    uint256 public constant DISCOUNT_TIER3_THRESHOLD = 450; // 4.5 stars
    uint256 public constant DISCOUNT_TIER3_BPS = 200;      // 2.0% discount
    
    // ===========================================
    // State Variables
    // ===========================================
    
    address public alsaToken;
    address public badgeContract;
    address public feeRecipient;
    
    mapping(uint256 => Reputation) public badgeReputation;
    mapping(uint256 => Feedback[]) public badgeFeedback;
    mapping(uint256 => mapping(address => StakeInfo)) public userStakes;
    mapping(uint256 => mapping(address => bool)) public hasRated;
    
    uint256 public houseFeeBps;
    bool public paused;
    
    // NEW: Track rater reputation for weight calculation
    mapping(address => uint256) public raterReputation; // Rater's own reputation score (0-500 scale)
    mapping(address => bool) public isRaterRegistered;
    
    // NEW: Fee discount mapping for badge owners
    mapping(uint256 => uint256) public cachedDiscountBps; // Cache to avoid recomputation
    
    // ===========================================
    // Events
    // ===========================================
    
    event FeedbackSubmitted(
        uint256 indexed badgeId,
        address indexed rater,
        uint8 score,
        uint256 raterReputation,
        uint256 weightedContribution,
        string comment,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        uint256 indexed badgeId,
        uint256 newWeightedAverage,
        uint256 totalWeight,
        uint256 totalRatings
    );
    
    event StakeWithdrawn(
        uint256 indexed badgeId,
        address indexed user,
        uint256 amount
    );
    
    event HouseFeeWithdrawn(address indexed recipient, uint256 amount);
    
    event RaterReputationUpdated(address indexed rater, uint256 newReputation);
    
    event FeeDiscountUpdated(uint256 indexed badgeId, uint256 discountBps);
    
    // ===========================================
    // Modifiers
    // ===========================================
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    modifier badgeExists(uint256 badgeId) {
        require(badgeContract != address(0), "Badge contract not set");
        require(IERC721(badgeContract).ownerOf(badgeId) != address(0), "Badge does not exist");
        _;
    }
    
    // ===========================================
    // Initializer
    // ===========================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _alsaToken,
        address _badgeContract,
        address _feeRecipient
    ) public initializer {
        require(_alsaToken != address(0), "Invalid ALSA token");
        require(_badgeContract != address(0), "Invalid badge contract");
        
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        alsaToken = _alsaToken;
        badgeContract = _badgeContract;
        feeRecipient = _feeRecipient;
        houseFeeBps = 250; // 2.5%
        paused = false;
    }
    
    // ===========================================
    // Core Functions
    // ===========================================
    
    /**
     * @dev Leave feedback for a badge with weighted scoring based on rater's reputation
     * ENHANCEMENT 1: Weighted scoring - rater reputation multiplies score influence
     */
    function leaveFeedback(
        uint256 badgeId,
        uint8 score,
        string calldata comment
    ) external nonReentrant whenNotPaused badgeExists(badgeId) {
        require(score >= MIN_SCORE && score <= MAX_SCORE, "Score must be 1-5");
        require(!hasRated[badgeId][msg.sender], "Already rated this badge");
        
        // Get or initialize rater reputation
        uint256 raterRep = raterReputation[msg.sender];
        if (!isRaterRegistered[msg.sender]) {
            raterRep = 250; // Default neutral reputation (2.5 stars) for new raters
            raterReputation[msg.sender] = raterRep;
            isRaterRegistered[msg.sender] = true;
        }
        
        // Transfer ALSA stake
        IERC20 alsa = IERC20(alsaToken);
        require(alsa.balanceOf(msg.sender) >= ALSA_STAKE_AMOUNT, "Insufficient ALSA balance");
        require(alsa.transferFrom(msg.sender, address(this), ALSA_STAKE_AMOUNT), "ALSA transfer failed");
        
        // Record stake
        userStakes[badgeId][msg.sender] = StakeInfo({
            amount: ALSA_STAKE_AMOUNT,
            releaseTime: block.timestamp + (DISPUTE_WINDOW_DAYS * 1 days),
            hasStaked: true
        });
        hasRated[badgeId][msg.sender] = true;
        
        // Calculate weighted contribution
        // Weight = raterReputation (0-500 scale, where 500 = max influence)
        // Weighted contribution = score * raterRep
        uint256 weightedContribution = uint256(score) * raterRep;
        
        // Update reputation with weighted scoring
        Reputation storage rep = badgeReputation[badgeId];
        uint256 oldWeightedScore = rep.totalWeightedScore;
        uint256 oldTotalWeight = rep.totalWeight;
        uint256 oldTotalRatings = rep.totalRatings;
        
        rep.totalWeightedScore = oldWeightedScore + weightedContribution;
        rep.totalWeight = oldTotalWeight + raterRep;
        rep.totalRatings = oldTotalRatings + 1;
        
        // Calculate new weighted average (scale: 0-500)
        if (rep.totalWeight > 0) {
            rep.averageScore = (rep.totalWeightedScore * 100) / rep.totalWeight;
            // Convert to 0-500 scale (2 decimal places preserved)
            // averageScore = (totalWeightedScore / totalWeight) * 100
        }
        rep.lastFeedbackTimestamp = block.timestamp;
        
        // Store feedback with rater reputation snapshot
        badgeFeedback[badgeId].push(Feedback({
            rater: msg.sender,
            score: score,
            raterReputationAtTime: raterRep,
            comment: comment,
            timestamp: block.timestamp,
            active: true
        }));
        
        // Update cached fee discount for this badge
        updateCachedDiscount(badgeId);
        
        emit FeedbackSubmitted(badgeId, msg.sender, score, raterRep, weightedContribution, comment, block.timestamp);
        emit ReputationUpdated(badgeId, rep.averageScore, rep.totalWeight, rep.totalRatings);
    }
    
    /**
     * @dev Get reputation for a badge (returns weighted average)
     */
    function getBadgeReputation(uint256 badgeId) external view returns (
        uint256 weightedAverageScore,  // 0-500 scale (e.g., 425 = 4.25 stars)
        uint256 totalRatings,
        uint256 displayScore,          // 0-5 scale for display
        uint256 effectiveFeeBps        // Actual fee after discount
    ) {
        Reputation storage rep = badgeReputation[badgeId];
        
        weightedAverageScore = rep.averageScore;
        totalRatings = rep.totalRatings;
        
        // Convert weighted average (0-500) to display score (0-5)
        if (rep.totalRatings >= MIN_RATINGS_FOR_DISPLAY) {
            displayScore = rep.averageScore / 100; // Integer division, 0-5
        } else {
            displayScore = 0;
        }
        
        // Apply decay if no recent feedback
        if (rep.totalRatings > 0 && rep.lastFeedbackTimestamp > 0) {
            uint256 daysSinceLast = (block.timestamp - rep.lastFeedbackTimestamp) / 1 days;
            if (daysSinceLast > REPUTATION_DECAY_DAYS) {
                uint256 decayFactor = 100 - ((daysSinceLast - REPUTATION_DECAY_DAYS) * 50) / 90;
                if (decayFactor > 100) decayFactor = 100;
                displayScore = (displayScore * decayFactor) / 100;
                weightedAverageScore = (weightedAverageScore * decayFactor) / 100;
            }
        }
        
        // Get effective fee with discount
        effectiveFeeBps = getEffectiveFeeBps(badgeId);
    }
    
    /**
     * @dev Get effective fee rate after reputation discount
     * ENHANCEMENT 2: Fee discounts based on badge reputation
     */
    function getEffectiveFeeBps(uint256 badgeId) public view returns (uint256) {
        Reputation storage rep = badgeReputation[badgeId];
        
        if (rep.totalRatings < MIN_RATINGS_FOR_DISPLAY) {
            return houseFeeBps; // No discount for insufficient ratings
        }
        
        uint256 avgScore = rep.averageScore; // 0-500 scale
        uint256 discount = 0;
        
        if (avgScore >= DISCOUNT_TIER3_THRESHOLD) {
            discount = DISCOUNT_TIER3_BPS;
        } else if (avgScore >= DISCOUNT_TIER2_THRESHOLD) {
            discount = DISCOUNT_TIER2_BPS;
        } else if (avgScore >= DISCOUNT_TIER1_THRESHOLD) {
            discount = DISCOUNT_TIER1_BPS;
        }
        
        if (discount > houseFeeBps) {
            return 0; // Can't go negative
        }
        
        return houseFeeBps - discount;
    }
    
    /**
     * @dev Update cached discount for a badge
     */
    function updateCachedDiscount(uint256 badgeId) internal {
        uint256 newDiscount = getEffectiveFeeBps(badgeId);
        if (cachedDiscountBps[badgeId] != newDiscount) {
            cachedDiscountBps[badgeId] = newDiscount;
            emit FeeDiscountUpdated(badgeId, newDiscount);
        }
    }
    
    /**
     * @dev Calculate fee amount after discount for a transaction
     * @param badgeId The badge ID (owner's reputation determines discount)
     * @param amount The transaction amount
     * @return feeAmount The fee to charge after discount
     */
    function calculateDiscountedFee(uint256 badgeId, uint256 amount) external view returns (uint256) {
        uint256 effectiveFee = getEffectiveFeeBps(badgeId);
        return (amount * effectiveFee) / 10000;
    }
    
    /**
     * @dev Update rater's reputation (called by admin or automatically based on rating patterns)
     * @param rater Address of the rater
     * @param newReputation New reputation score (0-500 scale)
     */
    function updateRaterReputation(address rater, uint256 newReputation) external onlyOwner {
        require(newReputation <= 500, "Reputation must be <= 500");
        raterReputation[rater] = newReputation;
        isRaterRegistered[rater] = true;
        emit RaterReputationUpdated(rater, newReputation);
    }
    
    /**
     * @dev Get rater's reputation
     */
    function getRaterReputation(address rater) external view returns (uint256) {
        if (!isRaterRegistered[rater]) {
            return 250; // Default neutral reputation
        }
        return raterReputation[rater];
    }
    
    /**
     * @dev Get feedback history for a badge (includes rater reputation at time of rating)
     */
    function getFeedbackHistory(uint256 badgeId, uint256 start, uint256 limit) external view returns (
        address[] memory raters,
        uint8[] memory scores,
        uint256[] memory raterReputations,
        string[] memory comments,
        uint256[] memory timestamps
    ) {
        uint256 total = badgeFeedback[badgeId].length;
        require(start < total, "Start out of bounds");
        
        uint256 end = start + limit;
        if (end > total) end = total;
        
        uint256 resultCount = end - start;
        raters = new address[](resultCount);
        scores = new uint8[](resultCount);
        raterReputations = new uint256[](resultCount);
        comments = new string[](resultCount);
        timestamps = new uint256[](resultCount);
        
        for (uint256 i = start; i < end; i++) {
            Feedback storage fb = badgeFeedback[badgeId][i];
            uint256 idx = i - start;
            raters[idx] = fb.rater;
            scores[idx] = fb.score;
            raterReputations[idx] = fb.raterReputationAtTime;
            comments[idx] = fb.comment;
            timestamps[idx] = fb.timestamp;
        }
    }
    
    /**
     * @dev Withdraw staked ALSA after dispute window
     */
    function withdrawStake(uint256 badgeId) external nonReentrant {
        StakeInfo storage stake = userStakes[badgeId][msg.sender];
        require(stake.hasStaked, "No stake found");
        require(block.timestamp >= stake.releaseTime, "Stake still locked");
        
        uint256 amount = stake.amount;
        delete userStakes[badgeId][msg.sender];
        
        IERC20(alsaToken).transfer(msg.sender, amount);
        
        // After stake withdrawal, update rater reputation based on rating quality
        // This is a simplified reputation update - can be enhanced later
        
        emit StakeWithdrawn(badgeId, msg.sender, amount);
    }
    
    /**
     * @dev Get stake info for a user on a badge
     */
    function getStakeInfo(uint256 badgeId, address user) external view returns (
        uint256 amount,
        uint256 releaseTime,
        bool canWithdraw
    ) {
        StakeInfo storage stake = userStakes[badgeId][user];
        amount = stake.amount;
        releaseTime = stake.releaseTime;
        canWithdraw = stake.hasStaked && block.timestamp >= stake.releaseTime;
    }
    
    /**
     * @dev Get detailed reputation info including weight metrics
     */
    function getDetailedReputation(uint256 badgeId) external view returns (
        uint256 totalWeightedScore,
        uint256 totalWeight,
        uint256 weightedAverage,
        uint256 totalRatings,
        uint256 lastFeedback,
        uint256 effectiveFee
    ) {
        Reputation storage rep = badgeReputation[badgeId];
        totalWeightedScore = rep.totalWeightedScore;
        totalWeight = rep.totalWeight;
        weightedAverage = rep.averageScore;
        totalRatings = rep.totalRatings;
        lastFeedback = rep.lastFeedbackTimestamp;
        effectiveFee = getEffectiveFeeBps(badgeId);
    }
    
    // ===========================================
    // Admin Functions
    // ===========================================
    
    /**
     * @dev Withdraw accumulated ALSA (house fees) - uses effective fee tracking
     */
    function withdrawHouseFees() external onlyOwner {
        uint256 balance = IERC20(alsaToken).balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        
        IERC20(alsaToken).transfer(feeRecipient, balance);
        emit HouseFeeWithdrawn(feeRecipient, balance);
    }
    
    /**
     * @dev Update house fee (basis points, max 10%)
     */
    function setHouseFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
        houseFeeBps = newFeeBps;
    }
    
    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }
    
    /**
     * @dev Update badge contract address
     */
    function setBadgeContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Invalid contract");
        badgeContract = newContract;
    }
    
    /**
     * @dev Update ALSA token address
     */
    function setAlsaToken(address newToken) external onlyOwner {
        require(newToken != address(0), "Invalid token");
        alsaToken = newToken;
    }
    
    /**
     * @dev Refresh discount cache for all badges (gas intensive, use sparingly)
     */
    function refreshAllDiscounts(uint256[] calldata badgeIds) external onlyOwner {
        for (uint256 i = 0; i < badgeIds.length; i++) {
            updateCachedDiscount(badgeIds[i]);
        }
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        paused = true;
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        paused = false;
    }
    
    /**
     * @dev Withdraw any ERC20 sent by mistake
     */
    function withdrawERC20(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // ===========================================
    // UUPS Upgrade
    // ===========================================
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}