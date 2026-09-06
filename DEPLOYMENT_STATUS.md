# AED Deployment Status

**Last Updated:** September 6, 2026
**Status:** ✅ Production Ready (Testnet)

---

## 📍 Contract Addresses

| Component | Address |
|-----------|---------|
| **Proxy** | `0x9276f78c574b737d914704D9096777C1929ec1cB` |
| **Implementation** | `0xD6Fe7e8EBa6AeA4f49954bC4a14D0304Eacaf94B` |
| **Admin Wallet** | `0xC8D6AB0928F9A8bAbB77B739401504f3354580cD` |
| **USDC** | `0x8B0180f2101c8260d49339abfEe87927412494B4` |
| **Network** | Polygon Amoy Testnet |

---

## 🎯 Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Domain Registration | ✅ | Free + Paid TLDs |
| AI Badge Minting | ✅ | Subdomain badges |
| Capability System | ✅ | 4 capabilities |
| Dynamic Images | ✅ | SVG generation |
| Metadata Server | ✅ | Vercel live |
| Reverse Resolution | ✅ | Set, get, clear, lookup |
| Frontend UI | ✅ | Showcase, Badges, Reverse |
| AI Demo Server | ✅ | Badge verification |
| UUPS Upgradeable | ✅ | Future upgrades possible |

---

## 📊 Token Registry

| Token | Domain | Type | Model | Reverse |
|-------|--------|------|-------|---------|
| #1 | `aegis.aed` | Domain | - | ✅ |
| #2 | `echo.aegis.aed` | AI Badge | claude-3.5-sonnet | - |

---

## 🌐 Services

| Service | URL | Status |
|---------|-----|--------|
| **Metadata Server** | https://aed-metadata.vercel.app | ✅ Live |
| **Frontend (Local)** | http://localhost:8081 | ✅ Running |
| **AI Demo** | http://localhost:3001 | ✅ Running |

---

## 🔗 API Endpoints

### Metadata Endpoints
```
GET /api/domain/:tokenId  - Domain metadata (JSON)
GET /api/sub/:tokenId     - Subdomain metadata (JSON)
GET /api/image/:tokenId   - Dynamic SVG image
GET /api/debug            - Server status
```

### Contract Functions
```solidity
// Domains
registerDomain(string name, string tld) → uint256

// AI Badges
createAISubdomain(string label, string parentDomain, string modelType) → uint256
purchaseAICapability(uint256 tokenId, string capabilityType)

// Reverse Resolution
setReverse(string domain)
clearReverse()
getReverse(address addr) → string
getReverseOwner(string domain) → address

// Views
getDomainByTokenId(uint256 tokenId) → string
isAISubdomain(uint256 tokenId) → bool
getModelType(uint256 tokenId) → string
getActiveCapabilities(uint256 tokenId) → string[]
```

---

## 📁 Directory Structure

```
aed/
├── contracts-clean/
│   └── AEDMinimal.sol          # Main contract
├── frontend/aed-home/
│   ├── pages/
│   │   ├── showcase-minimal.html
│   │   ├── badges-minimal.html
│   │   ├── reverse.html
│   │   └── simple.html
│   └── js/
├── metadata-server/
│   ├── app/api/
│   │   ├── domain/[tokenId]/
│   │   ├── sub/[tokenId]/
│   │   └── image/[tokenId]/
│   └── lib/
├── ai-demo/
│   └── server.js
└── scripts/
    ├── deploy-clean-upgrade.cjs
    ├── setup-new-contract.mjs
    └── mint-badge-new.mjs
```

---

## 🚀 Deployment History

| Date | Version | Changes |
|------|---------|---------|
| 2026-09-06 | v1.0.0 | Initial deployment with reverse resolution |
| 2026-09-06 | v1.0.0 | Dynamic image generation added |
| 2026-09-06 | v1.0.0 | Reverse resolution UI built |

---

**Ready for production demo.**
