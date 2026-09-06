# Alsania Enhanced Domains (AED)

## 🚀 Live Deployment

| Component | Address/URL |
|-----------|-------------|
| **Proxy Contract** | `0x9276f78c574b737d914704D9096777C1929ec1cB` |
| **Implementation** | `0xD6Fe7e8EBa6AeA4f49954bC4a14D0304Eacaf94B` |
| **Admin Wallet** | `0xC8D6AB0928F9A8bAbB77B739401504f3354580cD` |
| **USDC (Amoy)** | `0x8B0180f2101c8260d49339abfEe87927412494B4` |
| **Network** | Polygon Amoy Testnet |
| **Metadata Server** | https://aed-metadata.vercel.app |
| **Frontend** | http://localhost:8081 |

## 📋 Features

### Core
- [x] UUPS Upgradeable Proxy Pattern
- [x] ERC-721 Domain NFTs
- [x] AI Badge Subdomains
- [x] Capability System (4 capabilities)
- [x] Reverse Resolution
- [x] Dynamic SVG Image Generation

### Domains
- **Free TLDs:** .aed, .alsa, .07
- **Paid TLDs:** .alsania, .fx, .echo ($1 USDC)
- Exponential fee scaling

### AI Badges
- Minted as subdomains of parent domains
- Model types: Claude 3.5 Sonnet, GPT-4o, Gemini Pro, Llama 3
- 4 capabilities: Vision, Communication, Memory, Reasoning
- Capability fees: $1 each (exponential scaling)

### Reverse Resolution
- Set a domain to resolve to your address
- Look up any address to see its reverse record
- Clear reverse records

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Smart Contracts** | Solidity 0.8.30, OpenZeppelin UUPS |
| **Testing** | Hardhat, Chai |
| **Metadata Server** | Next.js 15, TypeScript, Vercel |
| **Frontend** | HTML, CSS, JavaScript, Ethers.js |
| **Blockchain** | Polygon Amoy Testnet |
| **AI Demo** | Node.js, Express |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Wallet                         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                Frontend (Port 8081)                 │
│    Showcase  │  Badges  │  Reverse Resolution      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│            Metadata Server (Vercel)                 │
│         /api/domain/:id  /api/sub/:id              │
│         /api/image/:id  Dynamic SVG Generation     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           Smart Contract (Amoy Testnet)            │
│     0x9276f78c574b737d914704D9096777C1929ec1cB     │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or similar Web3 wallet
- Amoy testnet USDC (for paid features)

### Frontend
```bash
cd frontend/aed-home
python3 -m http.server 8081
# Open http://localhost:8081
```

### Metadata Server (Local)
```bash
cd metadata-server
npm install
npm run dev
# Open http://localhost:3002
```

### AI Demo (Local)
```bash
cd ai-demo
npm install
node server.js
# Runs on http://localhost:3001
```

## 📊 Token Status (Current Deployment)

| Token | Domain | Type | Model | Reverse |
|-------|--------|------|-------|---------|
| #1 | `aegis.aed` | Domain | - | ✅ |
| #2 | `echo.aegis.aed` | AI Badge | claude-3.5-sonnet | - |

## 🔗 API Endpoints

### Metadata Server
- `GET /api/domain/:tokenId` - Domain metadata
- `GET /api/sub/:tokenId` - Subdomain/AI Badge metadata
- `GET /api/image/:tokenId` - Dynamic SVG image
- `GET /api/debug` - Server status

### Smart Contract
- `registerDomain(string name, string tld)` - Register a domain
- `createAISubdomain(string label, string parentDomain, string modelType)` - Mint AI badge
- `purchaseAICapability(uint256 tokenId, string capabilityType)` - Unlock capability
- `setReverse(string domain)` - Set reverse resolution
- `getReverse(address addr)` - Get reverse record

## 📝 Environment Variables

```bash
# .env
PRIVATE_KEY_PROD=your_private_key
AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/your_key
CONTRACT_ADDRESS=0x9276f78c574b737d914704D9096777C1929ec1cB
ALSANIA_ADMIN=0xC8D6AB0928F9A8bAbB77B739401504f3354580cD
```

## 🤝 Contributing

This is an Alsania project. All contributions should follow the Alsania Code principles:
- Sovereignty first
- Transparency
- Privacy
- Free and open tools

## 📄 License

MIT

---

**Built with ❤️ by Sigma & Aegis**
