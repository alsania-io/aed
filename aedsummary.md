AED (Alsania Enhanced Domains) Summary:
AED is an on-chain identity protocol built on Polygon (ERC-721) that unifies human and AI agent identity. The system has three layers:
1. Domain/Subdomain NFTs - Standard ERC-721 tokens (up to 20 regular subdomains per domain)
2. Badges - AI-synced subdomains (up to 10 per domain) that connect to specific AI models like claude.sigma.aed synced to claude-3.5-sonnet
3. Fragments - Visual achievement overlays stored as metadata (not separate NFTs) that trigger visual evolution based on accomplishments
Key features:
- UUPS upgradeable proxy architecture with modular libraries
- Capability enhancements: communication, vision, memory, reasoning ($1×2^(n-1) pricing)
- Evolution levels based on fragment count (Level = fragments/5)
- Exponential fee scaling for badges and capabilities
- Metadata server for dynamic SVG rendering with fragments
- Agent access only when wallet is connected (instant revocation on disconnect)
Status: Phase 1 complete (core identity), Phase 2 in progress (agent messaging, IPFS memory integration)
The codebase includes ~40 Solidity contracts, Hardhat tests, Next.js metadata server for Vercel, and admin/client frontends.