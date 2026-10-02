const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

// Mock ERC20 for payments (USDC on Amoy is a real token; here we use a mock).
async function deployMockUsdc() {
  const Mock = await ethers.getContractFactory('MockUSDC');
  const usdc = await Mock.deploy();
  await usdc.waitForDeployment();
  return usdc;
}

describe('AEDMinimalV2', function () {
  let aed, usdc;
  let admin, user1, user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    usdc = await deployMockUsdc();

    const AED = await ethers.getContractFactory('AEDMinimalV2');
    aed = await upgrades.deployProxy(
      AED,
      ['Alsania Enhanced Domains', 'AED', admin.address],
      { initializer: 'initialize', kind: 'uups' }
    );
    await aed.waitForDeployment();

    // point contract at mock USDC and set free cap for tests
    await aed.connect(admin).setUsdcAddress(await usdc.getAddress());
    await aed.connect(admin).setFreeConfig(2, 1, 63);
  });

  it('initializes with correct metadata + roles + TLDs', async function () {
    expect(await aed.name()).to.equal('Alsania Enhanced Domains');
    expect(await aed.symbol()).to.equal('AED');
    expect(await aed.hasRole(await aed.ADMIN_ROLE(), admin.address)).to.equal(true);
    expect(await aed.validTlds('aed')).to.equal(true);
    expect(await aed.freeTlds('aed')).to.equal(true);
    expect(await aed.tldPrices('alsania')).to.equal(1000000n);
  });

  it('registers a free domain and tracks ownership + userDomains', async function () {
    await aed.connect(user1).registerDomain('alice', 'aed');
    expect(await aed.ownerOf(1)).to.equal(user1.address);
    expect(await aed.balanceOf(user1.address)).to.equal(1n);
    expect(await aed.getDomainByTokenId(1)).to.equal('alice.aed');
    const list = await aed.getUserDomains(user1.address);
    expect(list.length).to.equal(1);
    expect(list[0]).to.equal('alice.aed');
  });

  it('rejects invalid names (charset, length, hyphen edges)', async function () {
    await expect(aed.connect(user1).registerDomain('Alice', 'aed')).to.be.revertedWith('Invalid name');
    await expect(aed.connect(user1).registerDomain('-bad', 'aed')).to.be.revertedWith('Invalid name');
    await expect(aed.connect(user1).registerDomain('bad-', 'aed')).to.be.revertedWith('Invalid name');
    await expect(aed.connect(user1).registerDomain('has space', 'aed')).to.be.revertedWith('Invalid name');
  });

  it('enforces the free-registration cap', async function () {
    await aed.connect(user1).registerDomain('one', 'aed');
    await aed.connect(user1).registerDomain('two', 'aed');
    await expect(aed.connect(user1).registerDomain('three', 'aed')).to.be.revertedWith('Free limit reached');
  });

  it('paid TLD requires USDC allowance + routes to feeCollector', async function () {
    await usdc.mint(user1.address, 10_000_000n);
    await expect(aed.connect(user1).registerDomain('prem', 'alsania'))
      .to.be.revertedWith('Insufficient allowance');

    await usdc.connect(user1).approve(await aed.getAddress(), 1_000_000n);
    await aed.connect(user1).registerDomain('prem', 'alsania');
    expect(await usdc.balanceOf(admin.address)).to.equal(1_000_000n);
    expect(await aed.totalRevenue()).to.equal(1_000_000n);
  });

  it('clears reverse record on transfer (no stale spoof)', async function () {
    await aed.connect(user1).registerDomain('alice', 'aed');
    await aed.connect(user1).setReverse('alice.aed');
    expect(await aed.getReverse(user1.address)).to.equal('alice.aed');

    await aed.connect(user1).transferFrom(user1.address, user2.address, 1);
    expect(await aed.getReverse(user1.address)).to.equal('');
    expect(await aed.getReverseOwner('alice.aed')).to.equal(ethers.ZeroAddress);
    expect(await aed.ownerOf(1)).to.equal(user2.address);
  });

  it('rejects non-whitelisted capability purchases', async function () {
    await usdc.mint(user1.address, 10_000_000n);
    await usdc.connect(user1).approve(await aed.getAddress(), 10_000_000n);
    await aed.connect(user1).registerDomain('alice', 'aed');
    await aed.connect(user1).createAISubdomain('bot', 'alice.aed', 'claude');
    await expect(
      aed.connect(user1).purchaseAICapability(2, 'fake_cap')
    ).to.be.revertedWith('Invalid capability');

    await aed.connect(user1).purchaseAICapability(2, 'ai_vision');
    expect(await aed.hasAICapability(2, 'ai_vision')).to.equal(true);
    const caps = await aed.getActiveCapabilities(2);
    expect(caps.length).to.equal(1);
  });

  it('admin can configure TLDs, capabilities, pause', async function () {
    await aed.connect(admin).configureTld('new', true, false, 500000);
    expect(await aed.validTlds('new')).to.equal(true);
    expect(await aed.tldPrices('new')).to.equal(500000n);

    await aed.connect(admin).togglePause();
    expect(await aed.paused()).to.equal(true);
    await expect(aed.connect(user1).registerDomain('x', 'aed')).to.be.revertedWith('Paused');
  });

  it('upgrades from V1 preserving state', async function () {
    // deploy V1 fresh, register, then upgrade to V2
    const V1 = await ethers.getContractFactory('AEDMinimal');
    const v1 = await upgrades.deployProxy(
      V1,
      ['Alsania Enhanced Domains', 'AED', admin.address],
      { initializer: 'initialize', kind: 'uups' }
    );
    await v1.waitForDeployment();
    await v1.connect(user1).registerDomain('legacy', 'aed');

    const V2 = await ethers.getContractFactory('AEDMinimalV2');
    const upgraded = await upgrades.upgradeProxy(await v1.getAddress(), V2, {
      call: { fn: 'initializeV2', args: [await usdc.getAddress(), 'https://meta/'] },
    });
    await upgraded.waitForDeployment();

    // v1 state preserved
    expect(await upgraded.ownerOf(1)).to.equal(user1.address);
    expect(await upgraded.getDomainByTokenId(1)).to.equal('legacy.aed');
    // v2 fields initialized
    expect(await upgraded.usdcAddress()).to.equal(await usdc.getAddress());
    expect(await upgraded.validCapabilities('ai_vision')).to.equal(true);
  });
});
