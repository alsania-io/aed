#!/usr/bin/env node
/**
 * Badge Gate Demo - Proof that AI can verify badge ownership and capabilities
 * 
 * This demonstrates the core value prop:
 * 1. User owns badge NFT (e.g., claude.sigma.aed)
 * 2. Badge has capabilities (communication, vision, memory, reasoning)
 * 3. AI checks on-chain before granting access
 * 4. No badge = no access
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Contract setup
const RPC_URL = process.env.AMOY_RPC;
const CONTRACT_ADDRESS = process.env.AED_CONTRACT_ADDRESS;
const ABI = JSON.parse(readFileSync(join(__dirname, 'aed-abi.json'), 'utf8'));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

/**
 * Badge verification service - simulates AI checking permissions
 */
class BadgeVerifier {
  constructor(contract) {
    this.contract = contract;
  }

  /**
   * Check if user owns a badge and has specific capability
   */
  async verifyAccess(userAddress, badgeDomain, requiredCapability) {
    try {
      // Step 1: Get badge token ID
      const tokenId = await this.contract.getTokenIdByDomain(badgeDomain);
      console.log(`✓ Badge found: ${badgeDomain} (Token ID: ${tokenId})`);

      // Step 2: Verify ownership
      const owner = await this.contract.ownerOf(tokenId);
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        console.log(`✗ Access denied: Badge owned by ${owner}, not ${userAddress}`);
        return { granted: false, reason: 'NOT_OWNER' };
      }
      console.log(`✓ Ownership verified: ${userAddress}`);

      // Step 3: Verify it's actually a badge (AI subdomain)
      const isBadge = await this.contract.isAISubdomain(tokenId);
      if (!isBadge) {
        console.log(`✗ Access denied: ${badgeDomain} is not an AI badge`);
        return { granted: false, reason: 'NOT_BADGE' };
      }
      console.log(`✓ Confirmed AI badge`);

      // Step 4: Get AI model type
      const modelType = await this.contract.getModelType(tokenId);
      console.log(`✓ Synced to model: ${modelType}`);

      // Step 5: Check specific capability
      const hasCapability = await this.contract.hasAICapability(tokenId, requiredCapability);
      if (!hasCapability) {
        console.log(`✗ Access denied: Missing capability '${requiredCapability}'`);
        return { granted: false, reason: 'MISSING_CAPABILITY' };
      }
      console.log(`✓ Capability verified: ${requiredCapability}`);

      // Step 6: Get all active capabilities
      const allCapabilities = await this.contract.getActiveCapabilities(tokenId);
      console.log(`✓ All capabilities: [${allCapabilities.join(', ')}]`);

      return {
        granted: true,
        tokenId: tokenId.toString(),
        modelType,
        capabilities: allCapabilities
      };

    } catch (error) {
      console.log(`✗ Verification failed: ${error.message}`);
      return { granted: false, reason: 'ERROR', error: error.message };
    }
  }
}

/**
 * Mock AI Agent that gates access based on badge
 */
class MockAIAgent {
  constructor(verifier, agentName) {
    this.verifier = verifier;
    this.agentName = agentName;
  }

  async processRequest(userAddress, userBadge, request) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 ${this.agentName} received request from ${userAddress}`);
    console.log(`   Badge claimed: ${userBadge}`);
    console.log(`   Request: "${request.prompt}"`);
    console.log(`   Required capability: ${request.requiresCapability}`);
    console.log(`${'='.repeat(60)}\n`);

    // Verify badge ownership and capability
    const verification = await this.verifier.verifyAccess(
      userAddress,
      userBadge,
      request.requiresCapability
    );

    console.log(`\n${'='.repeat(60)}`);
    if (verification.granted) {
      console.log(`✅ ACCESS GRANTED`);
      console.log(`   Token ID: ${verification.tokenId}`);
      console.log(`   Model: ${verification.modelType}`);
      console.log(`   Capabilities: ${verification.capabilities.join(', ')}`);
      console.log(`\n🤖 ${this.agentName} response:`);
      console.log(`   "${this.generateResponse(request)}"`);
    } else {
      console.log(`❌ ACCESS DENIED`);
      console.log(`   Reason: ${verification.reason}`);
      console.log(`\n🤖 ${this.agentName} response:`);
      console.log(`   "Sorry, you need '${request.requiresCapability}' capability to use this feature."`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return verification;
  }

  generateResponse(request) {
    const responses = {
      'ai_communication': 'Message sent to other agents in your network.',
      'ai_vision': 'Image analyzed: The image shows a sunset over mountains.',
      'ai_memory': 'Memory stored to IPFS: QmX7Yh3Z...',
      'ai_reasoning': 'Reasoning complete: Based on patterns A, B, C, the optimal solution is D.'
    };
    return responses[request.requiresCapability] || 'Request processed successfully.';
  }
}

/**
 * Demo scenarios
 */
async function runDemo() {
  console.log('\n' + '='.repeat(60));
  console.log('AED BADGE GATE DEMONSTRATION');
  console.log('='.repeat(60));
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: Polygon Amoy Testnet`);
  console.log('='.repeat(60) + '\n');

  const verifier = new BadgeVerifier(contract);
  const agent = new MockAIAgent(verifier, 'Claude AI Agent');

  // Demo scenarios using actual deployed data
  const scenarios = [
    {
      name: 'Scenario 1: User with badge + capability',
      userAddress: '0xC8D6AB0928F9A8bAbB77B739401504f3354580cD', // Alsania Fee Wallet
      badge: 'sigmasauer07.alsania', // Token ID: 1
      request: {
        prompt: 'Send a message to other agents',
        requiresCapability: 'ai_communication'
      }
    },
    {
      name: 'Scenario 2: User with badge but missing capability',
      userAddress: '0xC8D6AB0928F9A8bAbB77B739401504f3354580cD', // Alsania Fee Wallet
      badge: 'sigmasauer07.alsania',
      request: {
        prompt: 'Analyze this image',
        requiresCapability: 'ai_vision'
      }
    },
    {
      name: 'Scenario 3: Wrong owner tries to use badge',
      userAddress: '0x0000000000000000000000000000000000000001', // Random address
      badge: 'sigmasauer07.alsania',
      request: {
        prompt: 'Store this memory',
        requiresCapability: 'ai_memory'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`# ${scenario.name}`);
    console.log(`${'#'.repeat(60)}\n`);

    await agent.processRequest(
      scenario.userAddress,
      scenario.badge,
      scenario.request
    );

    // Pause between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('DEMO COMPLETE');
  console.log('='.repeat(60));
  console.log('\nKey Takeaways:');
  console.log('1. AI can verify badge ownership on-chain');
  console.log('2. Capabilities gate specific AI features');
  console.log('3. No badge = no access (verifiable permissioning)');
  console.log('4. Transfer badge = transfer AI access rights');
  console.log('='.repeat(60) + '\n');
}

// Run the demo
runDemo().catch(console.error);
