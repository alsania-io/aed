/**
 * Web3 Provider Integration
 * Handles wallet connections, network switching, and blockchain interactions
 */

class Web3Provider {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;
        this.network = null;
        this.isConnected = false;
        this.contractAddress = null; // Will be set from deployment
        this.contractABI = null; // Will be loaded from deployment
        
        this.initialize();
    }

    async initialize() {
        try {
            await this.detectProvider();
            await this.setupEventListeners();
            console.log('🔌 Web3 Provider initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Web3 Provider:', error);
        }
    }

    /**
     * Detect and setup Web3 provider
     */
    async detectProvider() {
        // Check for MetaMask or other injected providers
        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Try to get the signer immediately
            try {
                await this.provider.send("eth_requestAccounts", []);
                this.signer = this.provider.getSigner();
                this.userAddress = await this.signer.getAddress();
                this.network = await this.provider.getNetwork();
                this.isConnected = true;
                
                console.log('✅ Provider detected and connected');
                console.log('📍 Address:', this.userAddress);
                console.log('🌐 Network:', this.network.name, `(Chain ID: ${this.network.chainId})`);
                
            } catch (error) {
                console.log('ℹ️ Provider detected but not connected');
            }
        } else {
            // Fallback to read-only provider
            console.log('ℹ️ No injected provider found, using read-only mode');
            // You can add a default provider here for read-only operations
            // this.provider = new ethers.providers.JsonRpcProvider('https://your-rpc-url');
        }
    }

    /**
     * Setup event listeners for provider changes
     */
    setupEventListeners() {
        if (!window.ethereum) return;

        // Handle account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log('👤 Accounts changed:', accounts);
            if (accounts.length === 0) {
                this.disconnect();
            } else {
                this.userAddress = accounts[0];
                this.updateUI();
                this.emit('accountChanged', accounts[0]);
            }
        });

        // Handle chain changes
        window.ethereum.on('chainChanged', (chainId) => {
            console.log('🔗 Chain changed:', chainId);
            window.location.reload(); // Reload to ensure proper network setup
        });

        // Handle disconnect
        window.ethereum.on('disconnect', (error) => {
            console.log('🔌 Provider disconnected:', error);
            this.disconnect();
        });
    }

    /**
     * Connect wallet
     */
    async connectWallet() {
        try {
            if (!window.ethereum) {
                throw new Error('No Web3 provider detected. Please install MetaMask.');
            }

            // Request account access
            await this.provider.send("eth_requestAccounts", []);
            
            // Get signer and address
            this.signer = this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.network = await this.provider.getNetwork();
            this.isConnected = true;

            console.log('✅ Wallet connected successfully');
            console.log('📍 Address:', this.userAddress);
            console.log('🌐 Network:', this.network.name, `(Chain ID: ${this.network.chainId})`);

            // Update UI
            this.updateUI();
            this.emit('connected', {
                address: this.userAddress,
                network: this.network
            });

            return {
                success: true,
                address: this.userAddress,
                network: this.network
            };

        } catch (error) {
            console.error('❌ Failed to connect wallet:', error);
            this.emit('connectionError', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Disconnect wallet
     */
    disconnect() {
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        
        console.log('🔌 Wallet disconnected');
        
        this.updateUI();
        this.emit('disconnected');
    }

    /**
     * Switch network
     */
    async switchNetwork(chainId) {
        try {
            if (!window.ethereum) {
                throw new Error('No Web3 provider detected.');
            }

            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainId }]
            });

            console.log(`✅ Switched to network: ${chainId}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to switch network:', error);
            
            // If network doesn't exist, try to add it
            if (error.code === 4902) {
                return await this.addNetwork(chainId);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add network to wallet
     */
    async addNetwork(chainId) {
        try {
            const networkConfig = this.getNetworkConfig(chainId);
            if (!networkConfig) {
                throw new Error(`Network configuration not found for chain ID: ${chainId}`);
            }

            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [networkConfig]
            });

            console.log(`✅ Added network: ${networkConfig.chainName}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to add network:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get network configuration
     */
    getNetworkConfig(chainId) {
        const networks = {
            '0x89': { // Polygon Mainnet
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com']
            },
            '0x13882': { // Polygon Amoy Testnet
                chainId: '0x13882',
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                },
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                blockExplorerUrls: ['https://amoy.polygonscan.com']
            },
            '0x13881': { // Polygon Mumbai Testnet (deprecated)
                chainId: '0x13881',
                chainName: 'Polygon Mumbai Testnet',
                nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                },
                rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com']
            }
        };

        return networks[chainId];
    }

    /**
     * Get current network information
     */
    async getNetworkInfo() {
        if (!this.provider) {
            throw new Error('No provider available');
        }

        try {
            const network = await this.provider.getNetwork();
            const balance = this.signer ? await this.signer.getBalance() : null;
            const blockNumber = await this.provider.getBlockNumber();
            const gasPrice = await this.provider.getGasPrice();

            return {
                chainId: network.chainId,
                name: network.name,
                balance: balance ? ethers.utils.formatEther(balance) : null,
                blockNumber: blockNumber,
                gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
            };
        } catch (error) {
            console.error('❌ Failed to get network info:', error);
            throw error;
        }
    }

    /**
     * Initialize contract instance
     */
    async initializeContract(contractAddress, contractABI) {
        try {
            if (!this.signer) {
                throw new Error('No signer available. Please connect wallet first.');
            }

            this.contractAddress = contractAddress;
            this.contractABI = contractABI;
            this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);

            console.log('📋 Contract initialized:', contractAddress);
            return this.contract;

        } catch (error) {
            console.error('❌ Failed to initialize contract:', error);
            throw error;
        }
    }

    /**
     * Get contract instance (read-only if no signer)
     */
    getContract() {
        if (!this.contractAddress || !this.contractABI) {
            throw new Error('Contract not initialized');
        }

        if (this.signer) {
            return new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
        } else {
            return new ethers.Contract(this.contractAddress, this.contractABI, this.provider);
        }
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(functionName, params = []) {
        try {
            const contract = this.getContract();
            const gasEstimate = await contract.estimateGas[functionName](...params);
            
            console.log(`⛽ Gas estimate for ${functionName}:`, gasEstimate.toString());
            return gasEstimate;

        } catch (error) {
            console.error(`❌ Failed to estimate gas for ${functionName}:`, error);
            throw error;
        }
    }

    /**
     * Send transaction with gas estimation
     */
    async sendTransaction(functionName, params = [], options = {}) {
        try {
            if (!this.signer) {
                throw new Error('No signer available. Please connect wallet first.');
            }

            const contract = this.getContract();
            
            // Estimate gas if not provided
            if (!options.gasLimit) {
                const gasEstimate = await this.estimateGas(functionName, params);
                options.gasLimit = gasEstimate.mul(110).div(100); // Add 10% buffer
            }

            console.log(`🚀 Sending transaction: ${functionName}`);
            console.log('📋 Parameters:', params);
            console.log('⚙️ Options:', options);

            const tx = await contract[functionName](...params, options);
            
            console.log('📤 Transaction sent:', tx.hash);
            this.emit('transactionSent', { hash: tx.hash, function: functionName });

            return tx;

        } catch (error) {
            console.error(`❌ Transaction failed: ${functionName}`, error);
            this.emit('transactionError', { error, function: functionName });
            throw error;
        }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(txHash, confirmations = 1) {
        try {
            console.log(`⏳ Waiting for ${confirmations} confirmation(s) for tx:`, txHash);
            
            const receipt = await this.provider.waitForTransaction(txHash, confirmations);
            
            console.log('✅ Transaction confirmed:', receipt);
            this.emit('transactionConfirmed', receipt);
            
            return receipt;

        } catch (error) {
            console.error('❌ Transaction confirmation failed:', error);
            this.emit('transactionFailed', error);
            throw error;
        }
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            return receipt;
        } catch (error) {
            console.error('❌ Failed to get transaction receipt:', error);
            throw error;
        }
    }

    /**
     * Format wei to ether
     */
    formatEther(wei) {
        return ethers.utils.formatEther(wei);
    }

    /**
     * Parse ether to wei
     */
    parseEther(ether) {
        return ethers.utils.parseEther(ether);
    }

    /**
     * Format units
     */
    formatUnits(value, unit = 'ether') {
        return ethers.utils.formatUnits(value, unit);
    }

    /**
     * Parse units
     */
    parseUnits(value, unit = 'ether') {
        return ethers.utils.parseUnits(value, unit);
    }

    /**
     * Update UI based on connection status
     */
    updateUI() {
        const connectBtn = document.getElementById('connectBtn');
        const walletAddress = document.getElementById('walletAddress');
        const statusIndicator = document.getElementById('statusIndicator');

        if (this.isConnected) {
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                connectBtn.classList.add('connected');
                connectBtn.disabled = false;
            }
            
            if (walletAddress) {
                const shortAddress = `${this.userAddress.slice(0, 6)}...${this.userAddress.slice(-4)}`;
                walletAddress.textContent = shortAddress;
            }
            
            if (statusIndicator) {
                statusIndicator.classList.add('connected');
            }
        } else {
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
                connectBtn.classList.remove('connected');
                connectBtn.disabled = false;
            }
            
            if (walletAddress) {
                walletAddress.textContent = 'Connect Wallet';
            }
            
            if (statusIndicator) {
                statusIndicator.classList.remove('connected');
            }
        }
    }

    /**
     * Event emitter
     */
    emit(event, data) {
        window.dispatchEvent(new CustomEvent(`web3:${event}`, { detail: data }));
    }

    /**
     * Event listener
     */
    on(event, callback) {
        window.addEventListener(`web3:${event}`, (e) => callback(e.detail));
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        window.removeEventListener(`web3:${event}`, callback);
    }

    /**
     * Get current connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            address: this.userAddress,
            network: this.network,
            provider: this.provider,
            signer: this.signer
        };
    }
}

// Initialize Web3 Provider
window.web3Provider = new Web3Provider();