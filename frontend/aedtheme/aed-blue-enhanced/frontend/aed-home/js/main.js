/**
 * AED Home - Main Application Controller
 * Coordinates all components and manages application state
 */

class AEDHomeApp {
    constructor() {
        this.currentSection = 'home';
        this.domainManager = null;
        this.portfolioManager = null;
        this.searchInterface = null;
        this.isInitialized = false;
        this.contractAddress = null; // Will be set from deployment
        this.contractABI = null; // Will be loaded from deployment
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing AED Home Application...');
            
            // Wait for dependencies to load
            await this.waitForDependencies();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ AED Home Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize AED Home Application:', error);
            this.showError('Failed to initialize application', error);
        }
    }

    /**
     * Wait for all dependencies to be ready
     */
    async waitForDependencies() {
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            if (window.glassUI && window.web3Provider) {
                console.log('✅ Dependencies loaded');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('Dependencies failed to load');
    }

    /**
     * Initialize all application components
     */
    async initializeComponents() {
        try {
            // Initialize domain manager
            this.domainManager = new DomainManager();
            await this.domainManager.init();

            // Initialize portfolio manager
            this.portfolioManager = new PortfolioManager();
            await this.portfolioManager.init();

            // Initialize search interface
            this.searchInterface = new SearchInterface();
            await this.searchInterface.init();

            console.log('✅ All components initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize components:', error);
            throw error;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Wallet connection events
        window.web3Provider.on('connected', (data) => {
            console.log('👛 Wallet connected:', data);
            this.onWalletConnected(data);
        });

        window.web3Provider.on('disconnected', () => {
            console.log('🔌 Wallet disconnected');
            this.onWalletDisconnected();
        });

        window.web3Provider.on('accountChanged', (address) => {
            console.log('👤 Account changed:', address);
            this.onAccountChanged(address);
        });

        // Domain registration events
        window.web3Provider.on('transactionSent', (tx) => {
            console.log('📤 Transaction sent:', tx);
            this.onTransactionSent(tx);
        });

        window.web3Provider.on('transactionConfirmed', (receipt) => {
            console.log('✅ Transaction confirmed:', receipt);
            this.onTransactionConfirmed(receipt);
        });

        window.web3Provider.on('transactionFailed', (error) => {
            console.error('❌ Transaction failed:', error);
            this.onTransactionFailed(error);
        });

        // UI events
        this.setupUIEventListeners();
        
        console.log('✅ Event listeners setup complete');
    }

    /**
     * Setup UI-specific event listeners
     */
    setupUIEventListeners() {
        // Hero search
        const heroSearchBtn = document.getElementById('heroSearchBtn');
        const heroSearchInput = document.getElementById('heroSearchInput');
        const heroTLDSelect = document.getElementById('heroTLDSelect');

        if (heroSearchBtn) {
            heroSearchBtn.addEventListener('click', () => {
                this.performHeroSearch();
            });
        }

        if (heroSearchInput) {
            heroSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performHeroSearch();
                }
            });
        }

        if (heroTLDSelect) {
            heroTLDSelect.addEventListener('change', () => {
                this.performHeroSearch();
            });
        }

        // Registration form
        const registerDomainBtn = document.getElementById('registerDomainBtn');
        const resetFormBtn = document.getElementById('resetFormBtn');

        if (registerDomainBtn) {
            registerDomainBtn.addEventListener('click', () => {
                this.registerDomain();
            });
        }

        if (resetFormBtn) {
            resetFormBtn.addEventListener('click', () => {
                this.resetRegistrationForm();
            });
        }

        // Batch registration
        const addDomainRowBtn = document.getElementById('addDomainRowBtn');
        const clearBatchBtn = document.getElementById('clearBatchBtn');
        const registerBatchBtn = document.getElementById('registerBatchBtn');

        if (addDomainRowBtn) {
            addDomainRowBtn.addEventListener('click', () => {
                this.addBatchDomainRow();
            });
        }

        if (clearBatchBtn) {
            clearBatchBtn.addEventListener('click', () => {
                this.clearBatchDomains();
            });
        }

        if (registerBatchBtn) {
            registerBatchBtn.addEventListener('click', () => {
                this.registerBatchDomains();
            });
        }

        // Portfolio controls
        const refreshPortfolioBtn = document.getElementById('refreshPortfolioBtn');
        const exportPortfolioBtn = document.getElementById('exportPortfolioBtn');
        const portfolioSearch = document.getElementById('portfolioSearch');
        const portfolioFilter = document.getElementById('portfolioFilter');

        if (refreshPortfolioBtn) {
            refreshPortfolioBtn.addEventListener('click', () => {
                this.refreshPortfolio();
            });
        }

        if (exportPortfolioBtn) {
            exportPortfolioBtn.addEventListener('click', () => {
                this.exportPortfolio();
            });
        }

        if (portfolioSearch) {
            portfolioSearch.addEventListener('input', (e) => {
                this.filterPortfolio(e.target.value);
            });
        }

        if (portfolioFilter) {
            portfolioFilter.addEventListener('change', (e) => {
                this.filterPortfolioByType(e.target.value);
            });
        }

        // CTA buttons
        const getStartedBtn = document.getElementById('getStartedBtn');
        const learnMoreBtn = document.getElementById('learnMoreBtn');

        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                this.scrollToSection('domains');
            });
        }

        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                this.scrollToSection('features');
            });
        }
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            console.log('📊 Loading initial data...');

            // Load contract data
            await this.loadContractData();

            // Load domain statistics
            await this.loadDomainStats();

            // Load TLD information
            await this.loadTLDInfo();

            // Load user's portfolio (if connected)
            if (window.web3Provider.isConnected) {
                await this.loadUserPortfolio();
            }

            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
        }
    }

    /**
     * Load contract data and configuration
     */
    async loadContractData() {
        try {
            // This would typically load from your deployment configuration
            // For now, we'll use mock data
            
            this.contractAddress = '0x1234567890123456789012345678901234567890'; // Mock address
            this.contractABI = []; // Mock ABI - would be loaded from deployment
            
            // Initialize contract if provider is ready
            if (window.web3Provider.isConnected && this.contractAddress && this.contractABI) {
                await window.web3Provider.initializeContract(this.contractAddress, this.contractABI);
            }
            
        } catch (error) {
            console.error('❌ Failed to load contract data:', error);
        }
    }

    /**
     * Load domain statistics
     */
    async loadDomainStats() {
        try {
            // Mock statistics - would be replaced with actual contract calls
            
            const stats = {
                totalDomains: 12547,
                totalRevenue: 15234.56,
                activeTLDs: 6
            };

            // Update UI
            this.updateDomainStats(stats);
            
        } catch (error) {
            console.error('❌ Failed to load domain stats:', error);
        }
    }

    /**
     * Load TLD information
     */
    async loadTLDInfo() {
        try {
            // Mock TLD data - would be replaced with actual contract calls
            
            const tlds = [
                { name: 'aed', price: 0, isFree: true },
                { name: 'alsa', price: 0, isFree: true },
                { name: '07', price: 0, isFree: true },
                { name: 'alsania', price: 1, isFree: false },
                { name: 'fx', price: 1, isFree: false },
                { name: 'echo', price: 1, isFree: false }
            ];

            this.populateTLDGrid(tlds);
            
        } catch (error) {
            console.error('❌ Failed to load TLD info:', error);
        }
    }

    /**
     * Load user's portfolio
     */
    async loadUserPortfolio() {
        try {
            if (!window.web3Provider.isConnected) return;

            const address = window.web3Provider.userAddress;
            console.log('📂 Loading portfolio for:', address);

            // Mock portfolio data - would be replaced with actual contract calls
            
            const domains = [
                {
                    id: 1,
                    name: 'mydomain',
                    tld: 'aed',
                    fullDomain: 'mydomain.aed',
                    owner: address,
                    features: ['subdomain'],
                    metadataURI: 'https://example.com/metadata.json'
                },
                {
                    id: 2,
                    name: 'premium',
                    tld: 'alsania',
                    fullDomain: 'premium.alsania',
                    owner: address,
                    features: ['subdomain', 'metadata'],
                    metadataURI: 'https://premium.com/metadata.json'
                }
            ];

            this.displayPortfolio(domains);
            
        } catch (error) {
            console.error('❌ Failed to load user portfolio:', error);
        }
    }

    /**
     * Event Handlers
     */
    onWalletConnected(data) {
        console.log('👛 Wallet connected event:', data);
        
        // Update UI
        this.updateConnectionStatus(true);
        
        // Load user-specific data
        this.loadUserPortfolio();
        
        // Show success notification
        window.glassUI.showNotification('Wallet connected successfully', 'success');
    }

    onWalletDisconnected() {
        console.log('🔌 Wallet disconnected');
        
        // Update UI
        this.updateConnectionStatus(false);
        
        // Clear user-specific data
        this.clearUserData();
        
        // Show notification
        window.glassUI.showNotification('Wallet disconnected', 'info');
    }

    onAccountChanged(address) {
        console.log('👤 Account changed:', address);
        
        // Reload user data
        this.loadUserPortfolio();
        
        // Show notification
        window.glassUI.showNotification(`Account changed to ${address.slice(0, 6)}...${address.slice(-4)}`, 'info');
    }

    onTransactionSent(tx) {
        console.log('📤 Transaction sent:', tx);
        
        // Show transaction status
        window.glassUI.showNotification(`Transaction sent: ${tx.hash.slice(0, 10)}...`, 'info', 5000);
        
        // Update UI to show pending state
        this.updateTransactionStatus('pending', tx.hash);
    }

    onTransactionConfirmed(receipt) {
        console.log('✅ Transaction confirmed:', receipt);
        
        // Show success notification
        window.glassUI.showNotification('Transaction confirmed successfully!', 'success');
        
        // Update UI
        this.updateTransactionStatus('confirmed', receipt.transactionHash);
        
        // Reload relevant data
        this.loadDomainStats();
        this.loadUserPortfolio();
    }

    onTransactionFailed(error) {
        console.error('❌ Transaction failed:', error);
        
        // Show error notification
        window.glassUI.showNotification(`Transaction failed: ${error.message}`, 'error');
        
        // Update UI
        this.updateTransactionStatus('failed');
    }

    /**
     * Core Functionality
     */
    async performHeroSearch() {
        try {
            const searchInput = document.getElementById('heroSearchInput');
            const tldSelect = document.getElementById('heroTLDSelect');
            
            if (!searchInput || !tldSelect) return;

            const query = searchInput.value.trim();
            const tld = tldSelect.value;

            if (!query || query.length < 2) {
                window.glassUI.clearHeroSearchResults();
                return;
            }

            console.log('🔍 Performing hero search:', query, tld);

            // Validate domain name
            const isValid = this.domainManager.validateDomainName(query);
            if (!isValid) {
                window.glassUI.showNotification('Invalid domain name format', 'warning');
                return;
            }

            // Perform search (mock implementation)
            const results = await this.searchInterface.searchDomain(query, tld);
            window.glassUI.displayHeroSearchResults(results);

        } catch (error) {
            console.error('❌ Hero search failed:', error);
            window.glassUI.showNotification('Search failed', 'error');
        }
    }

    async registerDomain() {
        try {
            if (!window.web3Provider.isConnected) {
                window.glassUI.showNotification('Please connect your wallet first', 'warning');
                return;
            }

            const domainName = document.getElementById('domainNameInput')?.value.trim();
            const selectedTLD = document.querySelector('input[name="tld"]:checked')?.value;
            const subdomainFeature = document.getElementById('subdomainFeature')?.checked;
            const metadataURI = document.getElementById('metadataURIInput')?.value.trim();

            if (!domainName || !selectedTLD) {
                window.glassUI.showNotification('Please fill in all required fields', 'warning');
                return;
            }

            // Validate inputs
            const validation = this.domainManager.validateRegistrationInputs({
                name: domainName,
                tld: selectedTLD,
                enableSubdomains: subdomainFeature,
                metadataURI: metadataURI
            });

            if (!validation.valid) {
                window.glassUI.showNotification(validation.error, 'warning');
                return;
            }

            console.log('📝 Registering domain:', {
                name: domainName,
                tld: selectedTLD,
                enableSubdomains: subdomainFeature,
                metadataURI: metadataURI
            });

            // Perform registration
            const result = await this.domainManager.registerDomain({
                name: domainName,
                tld: selectedTLD,
                enableSubdomains: subdomainFeature,
                metadataURI: metadataURI
            });

            if (result.success) {
                window.glassUI.showNotification('Domain registered successfully!', 'success');
                this.resetRegistrationForm();
                this.loadDomainStats();
                this.loadUserPortfolio();
            } else {
                window.glassUI.showNotification(`Registration failed: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('❌ Domain registration failed:', error);
            window.glassUI.showNotification('Registration failed', 'error');
        }
    }

    async registerBatchDomains() {
        try {
            if (!window.web3Provider.isConnected) {
                window.glassUI.showNotification('Please connect your wallet first', 'warning');
                return;
            }

            const batchData = this.domainManager.getBatchData();
            
            if (batchData.domains.length === 0) {
                window.glassUI.showNotification('Please add domains to register', 'warning');
                return;
            }

            console.log('📦 Registering batch domains:', batchData);

            const result = await this.domainManager.registerBatchDomains(batchData);
            
            if (result.success) {
                window.glassUI.showNotification('Batch registration successful!', 'success');
                this.clearBatchDomains();
                this.loadDomainStats();
                this.loadUserPortfolio();
            } else {
                window.glassUI.showNotification(`Batch registration failed: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('❌ Batch registration failed:', error);
            window.glassUI.showNotification('Batch registration failed', 'error');
        }
    }

    /**
     * UI Update Functions
     */
    updateDomainStats(stats) {
        const totalDomainsEl = document.getElementById('totalDomains');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const activeTLDsEl = document.getElementById('activeTLDs');

        if (totalDomainsEl) {
            this.animateNumber(totalDomainsEl, stats.totalDomains);
        }

        if (totalRevenueEl) {
            this.animateNumber(totalRevenueEl, stats.totalRevenue, 1);
        }

        if (activeTLDsEl) {
            this.animateNumber(activeTLDsEl, stats.activeTLDs);
        }
    }

    updateConnectionStatus(connected) {
        const connectBtn = document.getElementById('connectBtn');
        const walletAddress = document.getElementById('walletAddress');
        const statusIndicator = document.getElementById('statusIndicator');

        if (connected) {
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                connectBtn.classList.add('connected');
            }
            
            if (walletAddress) {
                const address = window.web3Provider.userAddress;
                const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                walletAddress.textContent = shortAddress;
            }
            
            if (statusIndicator) {
                statusIndicator.classList.add('connected');
            }
        } else {
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
                connectBtn.classList.remove('connected');
            }
            
            if (walletAddress) {
                walletAddress.textContent = 'Connect Wallet';
            }
            
            if (statusIndicator) {
                statusIndicator.classList.remove('connected');
            }
        }
    }

    updateTransactionStatus(status, txHash = null) {
        // Update transaction status indicators throughout the UI
        console.log(`🔄 Transaction status: ${status}`, txHash);
    }

    /**
     * Utility Functions
     */
    animateNumber(element, target, decimals = 0) {
        const start = parseFloat(element.textContent) || 0;
        const duration = 2000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (target - start) * this.easeOutQuart(progress);
            element.textContent = current.toFixed(decimals);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            
            // Update navigation
            const navLinks = document.querySelectorAll('.glass-nav-link');
            navLinks.forEach(link => {
                if (link.dataset.section === sectionId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }

    /**
     * Form Management Functions
     */
    resetRegistrationForm() {
        const form = document.querySelector('.registration-form');
        if (form) {
            form.reset();
            
            // Clear validation states
            const validationIcons = form.querySelectorAll('.validation-icon');
            const validationTexts = form.querySelectorAll('.validation-text');
            
            validationIcons.forEach(icon => {
                icon.innerHTML = '';
                icon.className = 'validation-icon';
            });
            
            validationTexts.forEach(text => {
                text.textContent = '';
            });
            
            // Reset cost breakdown
            this.updateCostBreakdown();
        }
    }

    addBatchDomainRow() {
        this.domainManager.addBatchDomainRow();
    }

    clearBatchDomains() {
        this.domainManager.clearBatchDomains();
    }

    /**
     * Portfolio Management Functions
     */
    refreshPortfolio() {
        if (window.web3Provider.isConnected) {
            this.loadUserPortfolio();
            window.glassUI.showNotification('Portfolio refreshed', 'success');
        } else {
            window.glassUI.showNotification('Please connect your wallet', 'warning');
        }
    }

    exportPortfolio() {
        if (!window.web3Provider.isConnected) {
            window.glassUI.showNotification('Please connect your wallet', 'warning');
            return;
        }

        const portfolio = this.portfolioManager.getPortfolio();
        const dataStr = JSON.stringify(portfolio, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `aed-portfolio-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        window.glassUI.showNotification('Portfolio exported successfully', 'success');
    }

    filterPortfolio(searchTerm) {
        this.portfolioManager.filterBySearch(searchTerm);
    }

    filterPortfolioByType(type) {
        this.portfolioManager.filterByType(type);
    }

    /**
     * Data Population Functions
     */
    populateTLDGrid(tlds) {
        const tldGrid = document.getElementById('tldGrid');
        if (!tldGrid) return;

        tldGrid.innerHTML = '';

        tlds.forEach(tld => {
            const option = document.createElement('label');
            option.className = 'tld-option';
            option.innerHTML = `
                <input type="radio" name="tld" value="${tld.name}">
                <div class="tld-card">
                    <span class="tld-name">.${tld.name}</span>
                    <span class="tld-price">${tld.isFree ? 'FREE' : `${tld.price} MATIC`}</span>
                </div>
            `;
            tldGrid.appendChild(option);
        });

        // Add change listeners
        const tldInputs = tldGrid.querySelectorAll('input[name="tld"]');
        tldInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateCostBreakdown();
            });
        });
    }

    displayPortfolio(domains) {
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (!portfolioGrid) return;

        if (domains.length === 0) {
            portfolioGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-globe-americas"></i>
                    <h3>No domains found</h3>
                    <p>Register your first domain to get started</p>
                    <button class="glass-button cta-primary" onclick="window.glassUI.scrollToSection('domains')">
                        Register Domain
                    </button>
                </div>
            `;
            return;
        }

        portfolioGrid.innerHTML = '';

        domains.forEach(domain => {
            const card = this.createDomainCard(domain);
            portfolioGrid.appendChild(card);
        });
    }

    createDomainCard(domain) {
        const card = document.createElement('div');
        card.className = 'domain-card glass-card';
        card.innerHTML = `
            <div class="domain-header">
                <div class="domain-name">${domain.fullDomain}</div>
                <div class="domain-status">
                    <div class="status-glass status-active">
                        <i class="fas fa-circle"></i> Active
                    </div>
                </div>
            </div>
            <div class="domain-details">
                <div class="detail-item">
                    <span class="detail-label">Token ID:</span>
                    <span class="detail-value">#${domain.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">TLD:</span>
                    <span class="detail-value">.${domain.tld}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Features:</span>
                    <span class="detail-value">${domain.features.join(', ')}</span>
                </div>
            </div>
            <div class="domain-actions">
                <button class="glass-button" onclick="app.viewDomainDetails(${domain.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="glass-button" onclick="app.transferDomain(${domain.id})">
                    <i class="fas fa-exchange-alt"></i> Transfer
                </button>
                <button class="glass-button" onclick="app.editDomain(${domain.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;
        
        return card;
    }

    /**
     * Error Handling
     */
    showError(message, error) {
        console.error(message, error);
        window.glassUI.showNotification(`${message}: ${error.message}`, 'error');
    }

    /**
     * Application State Management
     */
    getAppState() {
        return {
            currentSection: this.currentSection,
            isConnected: window.web3Provider.isConnected,
            userAddress: window.web3Provider.userAddress,
            network: window.web3Provider.network,
            domainManager: this.domainManager?.getState(),
            portfolioManager: this.portfolioManager?.getState()
        };
    }

    /**
     * Cleanup and teardown
     */
    destroy() {
        // Remove event listeners
        window.web3Provider.off('connected');
        window.web3Provider.off('disconnected');
        window.web3Provider.off('accountChanged');
        window.web3Provider.off('transactionSent');
        window.web3Provider.off('transactionConfirmed');
        window.web3Provider.off('transactionFailed');

        // Destroy components
        if (this.domainManager) this.domainManager.destroy();
        if (this.portfolioManager) this.portfolioManager.destroy();
        if (this.searchInterface) this.searchInterface.destroy();

        console.log('🧹 Application cleanup complete');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AEDHomeApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});