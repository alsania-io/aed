import { getContract, getGlobalDescription } from './contract';

const IMAGE_BASE = "https://aed-metadata.vercel.app/api/image";

export async function buildMetadata(tokenId: bigint, isSub: boolean) {
  const contract = getContract();
  const globalDesc = getGlobalDescription();

  if (!contract) {
    throw new Error('Contract not initialized');
  }

  try {
    const owner = await contract.ownerOf(tokenId);
    console.log(`Building metadata for token ${tokenId}, owner: ${owner}`);

    let domainName = '';
    let isSubdomain = false;
    let modelType = '';
    let capabilities: string[] = [];

    try {
      domainName = await contract.getDomainByTokenId(tokenId);
      console.log(`Got domain name: ${domainName}`);
    } catch (domainError) {
      console.log(`getDomainByTokenId failed for ${tokenId}`);
      domainName = `domain${tokenId}`;
    }

    // Check if it's a badge
    try {
      isSubdomain = await contract.isAISubdomain(tokenId);
    } catch {
      isSubdomain = false;
    }

    // Get badge info
    if (isSubdomain) {
      try {
        modelType = await contract.getModelType(tokenId);
      } catch {
        modelType = 'Unknown';
      }
      
      try {
        capabilities = await contract.getActiveCapabilities(tokenId);
      } catch {
        capabilities = [];
      }
    }

    if (!domainName || domainName === '') {
      domainName = `domain${tokenId}`;
    }

    const attributes: any[] = [
      { trait_type: 'Token ID', value: tokenId.toString() },
      { trait_type: 'Owner', value: owner },
      { trait_type: 'Type', value: isSubdomain ? 'AI Badge' : 'Domain' },
      { trait_type: 'Contract', value: 'Alsania Enhanced Domains' }
    ];

    if (isSubdomain) {
      attributes.push({ trait_type: 'Model', value: modelType });
      if (capabilities.length > 0) {
        attributes.push({ trait_type: 'Capabilities', value: capabilities.join(', ') });
      }
    }

    const metadata: any = {
      name: domainName,
      description: globalDesc || 'Alsania Enhanced Domain',
      external_url: `https://alsania.io/domain/${domainName}`,
      image: `${IMAGE_BASE}/${tokenId}`, 
      attributes: attributes
    };

    console.log(`Final metadata for ${tokenId}:`, metadata);
    return metadata;

  } catch (error) {
    console.error(`Error building metadata for ${tokenId}:`, error);
    return {
      name: `Domain #${tokenId}`,
      description: globalDesc || 'Alsania Enhanced Domain',
      external_url: `https://www.alsania-io.com/aed`,
      image: `${IMAGE_BASE}/${tokenId}`, 
      attributes: [
        { trait_type: 'Token ID', value: tokenId.toString() },
        { trait_type: 'Type', value: isSub ? 'AI Badge' : 'Domain' },
        { trait_type: 'Contract', value: 'Alsania Enhanced Domains' }
      ]
    };
  }
}