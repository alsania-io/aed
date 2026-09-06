// Test script for Enhanced Reputation Module
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationModuleUpgradeable - Enhanced Features", function () {
    let reputationModule;
    let alsaToken;
    let mockBadge;
    let owner;
    let rater1;
    let rater2;
    let rater3;
    let badgeOwner;
    
    const ALSA_STAKE = ethers.parseEther("1");
    
    beforeEach(async function () {
        [owner, rater1, rater2, rater3, badgeOwner] = await ethers.getSigners();
        
        // Deploy mock ALSA token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        alsaToken = await MockERC20.deploy("ALSA Token", "ALSA", 18);
        await alsaToken.waitForDeployment();
        
        // Mint ALSA to raters
        await alsaToken.mint(rater1.address, ALSA_STAKE * 10n);
        await alsaToken.mint(rater2.address, ALSA_STAKE * 10n);
        await alsaToken.mint(rater3.address, ALSA_STAKE * 10n);
        
        // Deploy mock badge contract
        const MockBadge = await ethers.getContractFactory("MockERC721");
        mockBadge = await MockBadge.deploy("AED Badge", "AED");
        await mockBadge.waitForDeployment();
        
        // Mint badge to badgeOwner
        await mockBadge.mint(badgeOwner.address, 1);
        
        // Deploy reputation module
        const ReputationModule = await ethers.getContractFactory("ReputationModuleUpgradeable");
        const implementation = await ReputationModule.deploy();
        await implementation.waitForDeployment();
        
        const Proxy = await ethers.getContractFactory("ERC1967Proxy");
        const initializeData = ReputationModule.interface.encodeFunctionData("initialize", [
            await alsaToken.getAddress(),
            await mockBadge.getAddress(),
            owner.address
        ]);
        
        const proxy = await Proxy.deploy(await implementation.getAddress(), initializeData);
        await proxy.waitForDeployment();
        
        reputationModule = await ethers.getContractAt("ReputationModuleUpgradeable", await proxy.getAddress());
        
        // Approve ALSA spending
        await alsaToken.connect(rater1).approve(await reputationModule.getAddress(), ALSA_STAKE);
        await alsaToken.connect(rater2).approve(await reputationModule.getAddress(), ALSA_STAKE);
        await alsaToken.connect(rater3).approve(await reputationModule.getAddress(), ALSA_STAKE);
    });
    
    describe("Weighted Scoring", function () {
        it("Should assign default reputation (250) to new raters", async function () {
            const rep = await reputationModule.getRaterReputation(rater1.address);
            expect(rep).to.equal(250);
        });
        
        it("Should allow admin to update rater reputation", async function () {
            await reputationModule.updateRaterReputation(rater1.address, 500);
            const rep = await reputationModule.getRaterReputation(rater1.address);
            expect(rep).to.equal(500);
        });
        
        it("Should give more weight to high reputation raters", async function () {
            // Set rater1 to high reputation (500)
            await reputationModule.updateRaterReputation(rater1.address, 500);
            
            // Set rater2 to low reputation (100)
            await reputationModule.updateRaterReputation(rater2.address, 100);
            
            // Both rate the same badge with score 5
            await reputationModule.connect(rater1).leaveFeedback(1, 5, "Excellent badge from high rep rater");
            await reputationModule.connect(rater2).leaveFeedback(1, 5, "Good badge from low rep rater");
            
            // Get detailed reputation
            const details = await reputationModule.getDetailedReputation(1);
            
            // Weighted average should be higher due to high rep rater's influence
            // High rep (500) + Low rep (100) = total weight 600
            // Weighted score: (5*500) + (5*100) = 2500 + 500 = 3000
            // Average = 3000 / 600 = 5 (500 on 0-500 scale)
            expect(details.weightedAverage).to.equal(500);
            expect(details.totalWeight).to.equal(600);
            expect(details.totalWeightedScore).to.equal(3000);
        });
        
        it("Should calculate correct weighted average with mixed scores", async function () {
            await reputationModule.updateRaterReputation(rater1.address, 500);
            await reputationModule.updateRaterReputation(rater2.address, 300);
            
            await reputationModule.connect(rater1).leaveFeedback(1, 5, "Great");
            await reputationModule.connect(rater2).leaveFeedback(1, 3, "Average");
            
            const details = await reputationModule.getDetailedReputation(1);
            
            // Weighted score: (5*500) + (3*300) = 2500 + 900 = 3400
            // Total weight: 500 + 300 = 800
            // Average: 3400 / 800 = 4.25 (425 on 0-500 scale)
            expect(details.weightedAverage).to.equal(425);
            expect(details.totalWeight).to.equal(800);
        });
        
        it("Should store rater reputation snapshot in feedback history", async function () {
            await reputationModule.updateRaterReputation(rater1.address, 450);
            await reputationModule.connect(rater1).leaveFeedback(1, 4, "Good work");
            
            const history = await reputationModule.getFeedbackHistory(1, 0, 10);
            expect(history.raterReputations[0]).to.equal(450);
        });
    });
    
    describe("Fee Discounts", function () {
        beforeEach(async function () {
            // Setup: Get 5 ratings to meet minimum threshold
            await reputationModule.updateRaterReputation(rater1.address, 500);
            await reputationModule.updateRaterReputation(rater2.address, 500);
            await reputationModule.updateRaterReputation(rater3.address, 500);
            
            // Add 5 ratings with high scores to achieve high reputation
            for (let i = 0; i < 5; i++) {
                await reputationModule.connect(rater1).leaveFeedback(1, 5, "Excellent");
            }
        });
        
        it("Should apply no discount for badges with insufficient ratings", async function () {
            // New badge with only 1 rating
            await mockBadge.mint(badgeOwner.address, 2);
            await reputationModule.connect(rater1).leaveFeedback(2, 5, "New badge");
            
            const fee = await reputationModule.getEffectiveFeeBps(2);
            const houseFee = await reputationModule.houseFeeBps();
            expect(fee).to.equal(houseFee); // No discount
        });
        
        it("Should apply Tier 1 discount (50 bps) for reputation >= 350", async function () {
            // Create badge with average score 3.5 (350 on 0-500 scale)
            await mockBadge.mint(badgeOwner.address, 3);
            await reputationModule.connect(rater1).leaveFeedback(3, 4, "Good");
            await reputationModule.connect(rater2).leaveFeedback(3, 3, "Average");
            
            const details = await reputationModule.getDetailedReputation(3);
            expect(details.weightedAverage).to.equal(350); // (4+3)/2 = 3.5
            
            const fee = await reputationModule.getEffectiveFeeBps(3);
            const houseFee = await reputationModule.houseFeeBps();
            expect(fee).to.equal(houseFee - 50); // 2.5% - 0.5% = 2.0%
        });
        
        it("Should apply Tier 2 discount (100 bps) for reputation >= 400", async function () {
            await mockBadge.mint(badgeOwner.address, 4);
            await reputationModule.connect(rater1).leaveFeedback(4, 5, "Excellent");
            await reputationModule.connect(rater2).leaveFeedback(4, 4, "Great");
            
            const details = await reputationModule.getDetailedReputation(4);
            expect(details.weightedAverage).to.equal(450); // (5+4)/2 = 4.5
            
            const fee = await reputationModule.getEffectiveFeeBps(4);
            const houseFee = await reputationModule.houseFeeBps();
            expect(fee).to.equal(houseFee - 100); // 2.5% - 1.0% = 1.5%
        });
        
        it("Should apply Tier 3 discount (200 bps) for reputation >= 450", async function () {
            await mockBadge.mint(badgeOwner.address, 5);
            await reputationModule.connect(rater1).leaveFeedback(5, 5, "Perfect");
            await reputationModule.connect(rater2).leaveFeedback(5, 5, "Outstanding");
            
            const details = await reputationModule.getDetailedReputation(5);
            expect(details.weightedAverage).to.equal(500); // Both 5s
            
            const fee = await reputationModule.getEffectiveFeeBps(5);
            const houseFee = await reputationModule.houseFeeBps();
            expect(fee).to.equal(houseFee - 200); // 2.5% - 2.0% = 0.5%
        });
        
        it("Should calculate discounted fee correctly", async function () {
            await mockBadge.mint(badgeOwner.address, 6);
            await reputationModule.connect(rater1).leaveFeedback(6, 5, "Top tier");
            await reputationModule.connect(rater2).leaveFeedback(6, 5, "Excellent");
            
            const amount = ethers.parseEther("100");
            const fee = await reputationModule.calculateDiscountedFee(6, amount);
            
            // Expect 0.5% fee (50 bps) for tier 3
            const expectedFee = (amount * 50n) / 10000n;
            expect(fee).to.equal(expectedFee);
        });
        
        it("Should emit FeeDiscountUpdated event when discount changes", async function () {
            await mockBadge.mint(badgeOwner.address, 7);
            
            // First rating - should not trigger discount (insufficient ratings)
            await expect(reputationModule.connect(rater1).leaveFeedback(7, 5, "First rating"))
                .to.emit(reputationModule, "FeeDiscountUpdated");
            
            // Add 4 more ratings to reach threshold
            for (let i = 0; i < 4; i++) {
                await reputationModule.connect(rater1).leaveFeedback(7, 5, "More ratings");
            }
            
            // After 5th rating, discount should update
            const currentFee = await reputationModule.getEffectiveFeeBps(7);
            const houseFee = await reputationModule.houseFeeBps();
            expect(currentFee).to.be.lessThan(houseFee);
        });
    });
    
    describe("Reputation Display", function () {
        it("Should return display score (0-5) with decay", async function () {
            await reputationModule.updateRaterReputation(rater1.address, 400);
            await reputationModule.connect(rater1).leaveFeedback(1, 5, "Great");
            
            // Need 5 ratings for display
            for (let i = 0; i < 4; i++) {
                await reputationModule.connect(rater1).leaveFeedback(1, 5, "More");
            }
            
            const result = await reputationModule.getBadgeReputation(1);
            expect(result.displayScore).to.equal(5); // 5 stars
        });
        
        it("Should return effective fee in getBadgeReputation", async function () {
            await mockBadge.mint(badgeOwner.address, 8);
            await reputationModule.updateRaterReputation(rater1.address, 500);
            
            // Add 5 high ratings
            for (let i = 0; i < 5; i++) {
                await reputationModule.connect(rater1).leaveFeedback(8, 5, "Excellent");
            }
            
            const result = await reputationModule.getBadgeReputation(8);
            const houseFee = await reputationModule.houseFeeBps();
            expect(result.effectiveFeeBps).to.equal(houseFee - 200); // Tier 3 discount
        });
    });
    
    describe("Compatibility", function () {
        it("Should maintain backward compatibility with existing functions", async function () {
            await reputationModule.connect(rater1).leaveFeedback(1, 5, "Test");
            
            const stakeInfo = await reputationModule.getStakeInfo(1, rater1.address);
            expect(stakeInfo.amount).to.equal(ALSA_STAKE);
            expect(stakeInfo.hasStaked).to.equal(true);
            
            // Check dispute window
            const releaseTime = stakeInfo.releaseTime;
            const currentTime = Math.floor(Date.now() / 1000);
            expect(releaseTime).to.be.greaterThan(currentTime);
        });
        
        it("Should prevent duplicate ratings", async function () {
            await reputationModule.connect(rater1).leaveFeedback(1, 5, "First");
            await expect(
                reputationModule.connect(rater1).leaveFeedback(1, 4, "Duplicate")
            ).to.be.revertedWith("Already rated this badge");
        });
    });
});
