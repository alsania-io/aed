# AED Reputation System - Priority 1 Enhancements

## Overview
Enhanced reputation module for AI badges with **weighted scoring** and **fee discounts**, built on top of ERC-8004 improvements.

## Priority 1 Features (Implemented)

### 1. Weighted Scoring by Rater Reputation
Raters with higher reputation have more influence on badge scores.

**How it works:**
- Each rater has a reputation score (0-500 scale)
- New raters start at 250 (neutral)
- Admin can update rater reputations based on rating quality
- Weighted contribution = `score × raterReputation`
- Weighted average = `(Σ score × reputation) / Σ reputation`

**Benefits:**
- Prevents low-reputation users from gaming the system
- Rewards consistent, high-quality raters
- More accurate representation of community consensus

**Example:**
```javascript
// High reputation rater (500) gives score 5 → contributes 2500
// Low reputation rater (100) gives score 5 → contributes 500
// Weighted average: (2500 + 500) / (500 + 100) = 5.0
```

### 2. Fee Discounts for High Reputation Badges
Badge owners with high reputation pay lower platform fees.

**Discount Tiers:**
| Reputation (0-500) | Stars | Discount | Effective Fee (from 2.5%) |
|-------------------|-------|----------|--------------------------|
| ≥ 350             | 3.5★  | 0.5%     | 2.0%                     |
| ≥ 400             | 4.0★  | 1.0%     | 1.5%                     |
| ≥ 450             | 4.5★  | 2.0%     | 0.5%                     |

**How it works:**
- Minimum 5 ratings required for discount eligibility
- Fee calculated as: `houseFeeBps - discount`
- Cached per badge for gas efficiency
- Emits `FeeDiscountUpdated` event when discount changes

**API:**
```solidity
// Get effective fee for a badge
function getEffectiveFeeBps(uint256 badgeId) public view returns (uint256)

// Calculate discounted fee for a transaction
function calculateDiscountedFee(uint256 badgeId, uint256 amount) external view returns (uint256)

// Get badge reputation with effective fee
function getBadgeReputation(uint256 badgeId) external view returns (
    uint256 weightedAverageScore,  // 0-500 scale
    uint256 totalRatings,
    uint256 displayScore,          // 0-5 scale
    uint256 effectiveFeeBps        // Fee after discount
)
```

## New Data Structures

### Reputation Struct (Enhanced)
```solidity
struct Reputation {
    uint256 totalWeightedScore;    // Sum of (score * raterReputation)
    uint256 totalWeight;           // Sum of rater reputations
    uint256 averageScore;          // Weighted average (totalWeightedScore / totalWeight)
    uint256 lastFeedbackTimestamp;
    uint256 totalRatings;          // Number of ratings (for display threshold)
}
```

### Feedback Struct (Enhanced)
```solidity
struct Feedback {
    address rater;
    uint8 score;
    uint256 raterReputationAtTime; // Snapshot of rater's reputation
    string comment;
    uint256 timestamp;
    bool active;
}
```

### New Mappings
```solidity
mapping(address => uint256) public raterReputation;  // 0-500 scale
mapping(address => bool) public isRaterRegistered;
mapping(uint256 => uint256) public cachedDiscountBps;
```

## New Events
```solidity
event RaterReputationUpdated(address indexed rater, uint256 newReputation);
event FeeDiscountUpdated(uint256 indexed badgeId, uint256 discountBps);
```

## Admin Functions

### Update Rater Reputation
```solidity
function updateRaterReputation(address rater, uint256 newReputation) external onlyOwner
```
Sets a rater's reputation score (0-500). Call this based on:
- Rating consistency
- Dispute resolution outcomes
- Community feedback
- Stake withdrawal patterns

### Refresh Discount Cache
```solidity
function refreshAllDiscounts(uint256[] calldata badgeIds) external onlyOwner
```
Gas-intensive; use sparingly or after bulk reputation updates.

## Integration Guide

### For Frontend Applications

1. **Get badge reputation and effective fee:**
```javascript
const result = await reputationModule.getBadgeReputation(badgeId);
console.log({
    weightedScore: result.weightedAverageScore / 100, // Convert to stars
    totalRatings: result.totalRatings,
    displayScore: result.displayScore,
    effectiveFee: result.effectiveFeeBps / 100 // Percentage
});
```

2. **Calculate fee for transaction:**
```javascript
const amount = ethers.parseEther("100");
const fee = await reputationModule.calculateDiscountedFee(badgeId, amount);
console.log(`Fee: ${ethers.formatEther(fee)} ALSA`);
```

3. **Display reputation tiers:**
```javascript
const effectiveFee = await reputationModule.getEffectiveFeeBps(badgeId);
const discount = houseFee - effectiveFee;

if (discount >= 200) tier = "Platinum (4.5★+)";
else if (discount >= 100) tier = "Gold (4.0★+)";
else if (discount >= 50) tier = "Silver (3.5★+)";
else tier = "Bronze (<3.5★)";
```

### For Smart Contract Integrations

1. **Apply discounted fee when charging:**
```solidity
uint256 fee = IReputationModule(reputationAddress).calculateDiscountedFee(badgeId, amount);
require(alsaToken.transferFrom(user, feeRecipient, fee), "Fee transfer failed");
uint256 netAmount = amount - fee;
```

2. **Check discount eligibility:**
```solidity
(uint256 avgScore, uint256 totalRatings, , ) = IReputationModule(reputationAddress).getBadgeReputation(badgeId);
bool hasDiscount = totalRatings >= 5 && avgScore >= 350;
```

## Deployment Instructions

### New Deployment
```bash
cd /home/sigma/Desktop/echo-lab/aed
npx hardhat run scripts/deploy-reputation-enhanced.js --network amoy
```

### Upgrade Existing Deployment
```bash
# Update PROXY_ADDRESS in upgrade script first
npx hardhat run scripts/upgrade-reputation-enhanced.js --network amoy
```

## Testing
```bash
npx hardhat test test/ReputationEnhanced.test.js
```

## Migration from Old Version

If upgrading from the basic reputation module:

1. **Proxy upgrade preserves all existing state** (ratings, stakes, feedback)
2. **New fields initialize automatically:**
   - `totalWeightedScore` = old `totalScore` × default weight
   - `totalWeight` = old `totalRatings` × 250 (default rater reputation)
   - `averageScore` = old `averageScore` × 100 (converted to 0-500 scale)
3. **Existing raters get default reputation (250)**
4. **Fee discounts start at 0** until new ratings are added

### Post-Upgrade Steps
1. Set initial rater reputations for trusted users
2. Notify badge owners about new discount system
3. Update frontend to display effective fees
4. Monitor discount events

## Performance Considerations

- **Gas costs:** Weighted calculations add ~15-20% overhead
- **Caching:** Fee discounts are cached to reduce recomputation
- **Batch operations:** Use `refreshAllDiscounts` sparingly
- **Storage:** ~50% increase due to additional mappings

## Security Notes

- **Rater reputation updates restricted to owner** (admin-controlled)
- **Stake requirement unchanged** (1 ALSA) prevents sybil attacks
- **Dispute window unchanged** (7 days) for quality control
- **Default reputation (250)** ensures new raters have moderate influence

## Future Enhancements (Priority 2-3)

### Priority 2
- Badge holder response mechanism
- Tiered badges (Bronze/Silver/Gold)

### Priority 3
- Category-specific reputation
- Arbitration DAO for disputes

## Support

For questions or issues:
- Contract: `ReputationModuleUpgradeable.sol`
- Tests: `test/ReputationEnhanced.test.js`
- Deployment: `scripts/deploy-reputation-enhanced.js`

---
**Status:** ✅ Priority 1 enhancements complete and tested
**Next:** Deploy to Amoy testnet, then Polygon mainnet
**Version:** 2.0 (Enhanced)
