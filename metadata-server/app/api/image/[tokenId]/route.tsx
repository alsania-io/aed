import { NextRequest } from 'next/server';
import { getContract } from '@/lib/contract';

export const runtime = 'edge';

async function generateSVG(tokenId: string, domainName: string, isBadge: boolean, modelType: string, capabilities: string[], evolutionLevel: number, fragmentCount: number) {
  const displayName = domainName || `#${tokenId}`;
  const typeLabel = isBadge ? 'AI Badge' : 'Domain';
  const borderColor = isBadge ? '#667eea' : '#00ff88';
  
  const capEmojis: Record<string, string> = {
    'ai_vision': '👁️ Vision',
    'ai_communication': '🗨️ Comm',
    'ai_memory': '🧠 Memory',
    'ai_reasoning': '🎯 Reason'
  };
  const capDisplay = capabilities.map(c => capEmojis[c] || '⭐').join('  ');

  const gradient = isBadge
    ? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2d1b69 100%)'
    : 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d4a3a 100%)';

  return `<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e27;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a1f3a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:${isBadge ? '#2d1b69' : '#0d4a3a'};stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="40" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="800" height="800" fill="url(#grad)" rx="20" ry="20"/>
  
  <circle cx="400" cy="400" r="300" fill="${borderColor}" opacity="0.08" filter="url(#glow)"/>
  
  <rect x="10" y="10" width="780" height="780" rx="16" ry="16" fill="none" stroke="${borderColor}" stroke-width="2" opacity="0.3"/>
  
  <rect x="580" y="30" width="190" height="36" rx="18" fill="${borderColor}" opacity="0.2"/>
  <rect x="580" y="30" width="190" height="36" rx="18" fill="none" stroke="${borderColor}" stroke-width="1.5"/>
  <text x="675" y="54" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${borderColor}" text-anchor="middle" letter-spacing="0.5">${typeLabel}</text>
  
  <text x="40" y="54" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#667eea" opacity="0.6">#${tokenId}</text>
  
  <text x="400" y="320" font-family="system-ui, sans-serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">${displayName}</text>
  
  ${isBadge && modelType ? `<text x="400" y="380" font-family="system-ui, sans-serif" font-size="20" fill="#667eea" text-anchor="middle">🧠 ${modelType}</text>` : ''}
  
  ${isBadge && capabilities.length > 0 ? `
  <rect x="180" y="420" width="440" height="50" rx="12" fill="rgba(255,255,255,0.05)"/>
  <rect x="180" y="420" width="440" height="50" rx="12" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="400" y="450" font-family="system-ui, sans-serif" font-size="18" fill="#00ff88" text-anchor="middle">${capDisplay}</text>
  ` : ''}
  
  <rect x="100" y="510" width="600" height="60" rx="12" fill="rgba(255,255,255,0.03)"/>
  <rect x="100" y="510" width="600" height="60" rx="12" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  
  <text x="250" y="545" font-family="system-ui, sans-serif" font-size="20" fill="#667eea" text-anchor="middle">⚡ Evolution ${evolutionLevel}</text>
  <text x="400" y="545" font-family="system-ui, sans-serif" font-size="20" fill="#667eea" text-anchor="middle">🧩 ${fragmentCount} Fragments</text>
  <text x="550" y="545" font-family="system-ui, sans-serif" font-size="20" fill="${isBadge ? '#00ff88' : '#667eea'}" text-anchor="middle">${isBadge ? '✅ AI Enabled' : '🌐 Domain'}</text>
  
  <text x="400" y="760" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.15)" text-anchor="middle" letter-spacing="3">ALSANIA ENHANCED DOMAINS</text>
</svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const contract = getContract();
    if (!contract) {
      return new Response('Contract not initialized', { status: 500 });
    }

    const tokenIdBigInt = BigInt(tokenId);
    let domainName = `#${tokenId}`;
    let isBadge = false;
    let modelType = '';
    let capabilities: string[] = [];
    let evolutionLevel = 0;
    let fragmentCount = 0;

    try {
      domainName = await contract.getDomainByTokenId(tokenIdBigInt);
    } catch {}

    try {
      isBadge = await contract.isAISubdomain(tokenIdBigInt);
    } catch {}

    if (isBadge) {
      try { modelType = await contract.getModelType(tokenIdBigInt); } catch {}
      try { capabilities = await contract.getActiveCapabilities(tokenIdBigInt); } catch {}
    }

    try {
      if (typeof contract.getEvolutionLevel === 'function') {
        evolutionLevel = Number(await contract.getEvolutionLevel(tokenIdBigInt));
      }
    } catch {}
    try {
      if (typeof contract.getFragmentCount === 'function') {
        fragmentCount = Number(await contract.getFragmentCount(tokenIdBigInt));
      }
    } catch {}

    const svg = await generateSVG(tokenId, domainName, isBadge, modelType, capabilities, evolutionLevel, fragmentCount);
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return new Response('Image generation failed', { status: 500 });
  }
}