# AED Gap Analysis & Implementation Plan

## Current State (v1.0 - Demo)

**Contract:** `0x9276f78c574b737d914704D9096777C1929ec1cB` (Amoy)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Domain Registration | ✅ Complete | Basic .aed domains |
| AI Badge Minting | ✅ Complete | Simple subdomain badges |
| Capability System | ✅ Complete | 4 capabilities (vision, comm, memory, reasoning) |
| Reverse Resolution | ✅ Complete | Address ↔ domain mapping |
| Dynamic Images | ✅ Complete | SVG with metadata |
| Metadata Server | ✅ Complete | Vercel live |
| Frontend UI | ✅ Complete | Showcase, Badges, Reverse |

## The Vision (From Whitepaper)

```
┌─────────────────────────────────────────────────────────────┐
│                    AED Identity Layer                      │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Evolution       │    │  Agent Subdomains               │ │
│  │  Domain NFTs     │───▶│  (AI Identity)                 │ │
│  │  (Human)         │    │                                 │ │
│  └─────────────────┘    └───────────────┬─────────────────┘ │
│                                          │                   │
│                                          ▼                   │
│                           ┌─────────────────────────────────┐ │
│                           │  ID Badges (AI Identity NFTs)  │ │
│                           │  - Metallic / Angular          │ │
│                           │  - Singular per AI             │ │
│                           │  - Evolves via enhancements    │ │
│                           └───────────────┬─────────────────┘ │
│                                          │                   │
│                                          ▼                   │
│                           ┌─────────────────────────────────┐ │
│                           │  Capability NFTs (ERC-1155)    │ │
│                           │  - Vision Module               │ │
│                           │  - Communication Bridge        │ │
│                           │  - Memory Module               │ │
│                           │  - Reasoning Core              │ │
│                           │  - Creative Expansion          │ │
│                           └───────────────┬─────────────────┘ │
│                                          │                   │
│                                          ▼                   │
│                           ┌─────────────────────────────────┐ │
│                           │  Agent Protocol                │ │
│                           │  - Signed messaging            │ │
│                           │  - Collaboration groups        │ │
│                           │  - Task completion             │ │
│                           │  - Reputation tracking         │ │
│                           └─────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Memory & Reputation Layer                             │ │
│  │  - Event memory stored on IPFS                         │ │
│  │  - Hashed on-chain                                     │ │
│  │  - Verifiable history                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Gap Analysis

| Vision Feature | Current State | Gap |
|----------------|---------------|-----|
| **Evolution Domains** | ❌ Not implemented | Needs fragment badge system, SVG renderer with composition |
| **Agent Subdomains** | ⚠️ Partial (basic subdomains exist) | Needs binding to AI models, ID badge system |
| **ID Badges** | ❌ Not implemented | Needs separate badge type with metallic styling, soulbound to agent |
| **Capability NFTs** | ⚠️ Placeholder (4 capabilities as booleans) | Needs ERC-1155 implementation, attachment to ID badges |
| **Agent Protocol** | ❌ Not implemented | Needs messaging, collaboration, reputation |
| **Memory Layer** | ❌ Not implemented | Needs IPFS storage, on-chain hashing, queryable history |
| **AI Social Graph** | ❌ Not implemented | Needs on-chain graph of agent relationships |

## Implementation Plan (Phased)

### Phase 1: Agent Identity Foundation (Week 1-2)

**Goal:** Enable users to mint AI-specific identities with ID badges

#### Task 1.1: Agent Subdomain Contract
```solidity
// Extend AEDMinimal with agent-specific functions
function mintAgentSubdomain(
  string memory label,
  string memory parentDomain,
  string memory modelType,
  address agentAddress
) external returns (uint256);

function getAgentSubdomains(address owner) view returns (string[]);
function getAgentBySubdomain(string memory subdomain) view returns (address);
```

#### Task 1.2: ID Badge System
```solidity
// Soulbound badge for AI agents
function mintIDBadge(uint256 agentTokenId) external;
function getIDBadge(uint256 agentTokenId) view returns (uint256);
// ID badges are non-transferable
```

#### Task 1.3: Frontend Integration
- Add "Mint AI Agent" flow
- Display ID badges in UI
- Connect to existing badge/domain system

---

### Phase 2: Capability NFTs (Week 3-4)

**Goal:** Implement ERC-1155 capability NFTs that attach to ID badges

#### Task 2.1: Capability NFT Contract
```solidity
// ERC-1155 capability tokens
function mintCapability(address to, uint256 id, uint256 amount) external;
function attachToBadge(uint256 badgeId, uint256 capabilityId) external;
function getBadgeCapabilities(uint256 badgeId) view returns (uint256[]);
```

#### Task 2.2: Capability Types
| Capability | Description | Effect |
|------------|-------------|--------|
| Vision Module | Image input | AI can process images |
| Communication Bridge | Agent-to-agent | AI can message other AIs |
| Memory Module | Long-term storage | AI remembers past interactions |
| Reasoning Core | Enhanced logic | AI can reason better |
| Creative Expansion | Pattern generation | AI can generate creative output |

#### Task 2.3: Capability Marketplace
- List capabilities for purchase
- USDC payment integration
- Visual display in UI

---

### Phase 3: Evolution & Fragments (Week 5-6)

**Goal:** Implement the fragment badge system for human domains

#### Task 3.1: Fragment Badge System
```solidity
// Fragment badges for human domains
function awardFragment(uint256 domainId, string memory fragmentType) external;
function getFragments(uint256 domainId) view returns (Fragment[]);

struct Fragment {
  string fragmentType;
  uint256 earnedAt;
  bytes32 eventHash;
  string svgData;
}
```

#### Task 3.2: Evolution Engine
- Calculate evolution level based on fragments
- Compose SVG from base + fragments
- Render on-chain SVG

#### Task 3.3: Fragment Types
| Fragment | Trigger | Visual Effect |
|----------|---------|---------------|
| First Domain | First registration | Base star |
| First Badge | First AI mint | AI icon |
| Bridge Master | Enhancement purchase | Bridge icon |
| Vision Pioneer | Vision capability | Eye icon |
| Communication Expert | Communication capability | Chat bubble |
| Memory Keeper | Memory capability | Brain icon |
| Reasoning Master | Reasoning capability | Gear icon |

---

### Phase 4: Agent Protocol (Week 7-8)

**Goal:** Enable agent-to-agent communication and collaboration

#### Task 4.1: Messaging Protocol
```solidity
function sendMessage(
  address fromAgent,
  address toAgent,
  bytes memory message,
  bytes memory signature
) external;

function getMessages(address agent) view returns (Message[]);
```

#### Task 4.2: Collaboration Groups
```solidity
function createGroup(string memory name) returns (uint256);
function addAgent(uint256 groupId, address agent) external;
function groupMessage(uint256 groupId, bytes memory message) external;
```

#### Task 4.3: Reputation System
- Track successful tasks
- Collaboration history
- Trust scores

---

### Phase 5: Memory Layer (Week 9-10)

**Goal:** Implement on-chain memory with IPFS storage

#### Task 5.1: Memory Registry
```solidity
function storeMemory(
  uint256 identityId,
  bytes32 eventHash,
  string memory ipfsCID
) external;

function getMemoryHistory(uint256 identityId) view returns (MemoryEvent[]);
```

#### Task 5.2: IPFS Integration
- Use Pinata or Web3.Storage
- Store event metadata
- Return CID for verification

#### Task 5.3: Queryable History
- Filter by event type
- Filter by time range
- Reputation scoring

---

## Priority Matrix

| Feature | Business Value | Technical Effort | Priority |
|---------|----------------|------------------|----------|
| Agent Subdomains | High | Medium | P0 |
| ID Badges | High | Medium | P0 |
| Capability NFTs | High | High | P0 |
| Evolution Engine | Medium | High | P1 |
| Fragment Badges | Medium | Medium | P1 |
| Agent Protocol | High | High | P2 |
| Memory Layer | Medium | High | P2 |

## Immediate Next Steps

1. **Week 1:** Implement Agent Subdomain minting with ID Badges
2. **Week 2:** Add frontend UI for agent management
3. **Week 3:** Capability NFT contract and minting
4. **Week 4:** Capability marketplace UI

## Summary

The current AED codebase is a **working demo** of the domain system.
The **vision** is a full identity layer for humans and AI.
The **gap** is the agent identity, capability, and protocol layers.

**We have the foundation. Now we build the future.**

---

*This analysis is based on the whitepaper and the current codebase.*
