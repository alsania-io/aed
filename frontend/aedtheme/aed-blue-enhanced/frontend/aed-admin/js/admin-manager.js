/**
 * Admin Manager - Administrative Functions Controller
 * Handles all admin-specific operations and system management
 */

class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.adminRoles = [];
        this.systemSettings = {};
        this.emergencyMode = false;
        this.analyticsData = {};
        
        this.init();
    }

    async init() {
        try {
            await this.checkAdminStatus();
            await this.loadSystemSettings();
            await this.setupEventListeners();
            
            console.log('🔧 Admin Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Admin Manager:', error);
        }
    }

    /**
     * Check if current user has admin privileges
     */
    async checkAdminStatus() {
        try {
            if (!window.web3Provider.isConnected) {
                this.isAdmin = false;
                return;
            }

            const userAddress = window.web3Provider.userAddress;
            
            // Mock admin check - would be replaced with actual contract call
            const mockAdmins = [
                '0x1234567890123456789012345678901234567890',
                '0x0987654321098765432109876543210987654321'
            ];

            this.isAdmin = mockAdmins.includes(userAddress.toLowerCase());
            
            if (this.isAdmin) {
                console.log('✅ User has admin privileges');
                this.loadAdminDashboard();
            } else {
                console.log('⚠️ User does not have admin privileges');
                this.showAccessDenied();
            }
            
        } catch (error) {
            console.error('❌ Failed to check admin status:', error);
            this.isAdmin = false;
        }
    }

    /**
     * Load system settings and configuration
     */
    async loadSystemSettings() {
        try {
            // Mock system settings - would be replaced with actual contract calls
            
            this.systemSettings = {
                contractAddress: '0x1234567890123456789012345678901234567890',
                feeCollector: '0x0987654321098765432109876543210987654321',
                defaultTLDPrice: ethers.utils.parseEther('1.0'),
                subdomainFeaturePrice: ethers.utils.parseEther('2.0'),
                metadataFeaturePrice: ethers.utils.parseEther('0.5'),
                maxDomainLength: 63,
                maxSubdomainsPerDomain: 1000,
                freeSubdomainsPerDomain: 2,
                enablePause: true,
                enableUpgrade: true,
                enableWhitelist: false
            };

            this.populateSettingsForm();
            
        } catch (error) {
            console.error('❌ Failed to load system settings:', error);
        }
    }

    /**
     * Setup event listeners for admin functions
     */
    setupEventListeners() {
        if (!this.isAdmin) return;

        // Quick action buttons
        document.getElementById('pauseContractBtn')?.addEventListener('click', () => {
            this.toggleContractPause();
        });

        document.getElementById('emergencyWithdrawBtn')?.addEventListener('click', () => {
            this.performEmergencyWithdraw();
        });

        document.getElementById('updatePricingBtn')?.addEventListener('click', () => {
            this.showPricingModal();
        });

        document.getElementById('addTLDBtn')?.addEventListener('click', () => {
            this.showAddTLDModal();
        });

        // Settings management
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Emergency controls
        document.getElementById('emergencyPauseBtn')?.addEventListener('click', () => {
            this.emergencyPause();
        });

        document.getElementById('emergencyWithdrawBtn')?.addEventListener('click', () => {
            this.emergencyWithdraw();
        });

        document.getElementById('transferAdminBtn')?.addEventListener('click', () => {
            this.transferAdminRights();
        });

        document.getElementById('resumeOperationsBtn')?.addEventListener('click', () => {
            this.resumeOperations();
        });

        // Analytics controls
        document.getElementById('analyticsPeriod')?.addEventListener('change', (e) => {
            this.updateAnalytics(e.target.value);
        });

        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => {
            this.exportAnalytics();
        });
    }

    /**
     * Load admin dashboard with metrics and data
     */
    async loadAdminDashboard() {
        try {
            console.log('📊 Loading admin dashboard...');

            // Load key metrics
            await this.loadKeyMetrics();
            
            // Load recent activity
            await this.loadRecentActivity();
            
            // Initialize charts
            await this.initializeCharts();
            
            // Load domain management data
            await this.loadDomainManagement();
            
            // Load user management data
            await this.loadUserManagement();
            
            console.log('✅ Admin dashboard loaded');
            
        } catch (error) {
            console.error('❌ Failed to load admin dashboard:', error);
        }
    }

    /**
     * Load key performance metrics
     */
    async loadKeyMetrics() {
        try {
            // Mock metrics - would be replaced with actual contract calls
            
            const metrics = {
                totalDomains: 12547,
                totalRevenue: ethers.utils.parseEther('15234.56'),
                activeUsers: 3421,
                avgDomainValue: ethers.utils.parseEther('1.21'),
                domainsChange: 12.5,
                revenueChange: 8.3,
                usersChange: 15.7,
                valueChange: 0.0
            };

            this.displayMetrics(metrics);
            
        } catch (error) {
            console.error('❌ Failed to load key metrics:', error);
        }
    }

    /**
     * Display metrics in the dashboard
     */
    displayMetrics(metrics) {
        const elements = {
            totalDomains: document.getElementById('totalDomains'),
            totalRevenue: document.getElementById('totalRevenue'),
            activeUsers: document.getElementById('activeUsers'),
            avgDomainValue: document.getElementById('avgDomainValue'),
            domainsChange: document.getElementById('domainsChange'),
            revenueChange: document.getElementById('revenueChange'),
            usersChange: document.getElementById('usersChange'),
            valueChange: document.getElementById('valueChange')
        };

        // Update values with animation
        if (elements.totalDomains) {
            this.animateNumber(elements.totalDomains, metrics.totalDomains);
        }

        if (elements.totalRevenue) {
            this.animateNumber(elements.totalRevenue, parseFloat(ethers.utils.formatEther(metrics.totalRevenue)), 2);
        }

        if (elements.activeUsers) {
            this.animateNumber(elements.activeUsers, metrics.activeUsers);
        }

        if (elements.avgDomainValue) {
            this.animateNumber(elements.avgDomainValue, parseFloat(ethers.utils.formatEther(metrics.avgDomainValue)), 2);
        }

        // Update change indicators
        if (elements.domainsChange) {
            elements.domainsChange.textContent = `+${metrics.domainsChange}%`;
            elements.domainsChange.className = `metric-change ${metrics.domainsChange >= 0 ? 'positive' : 'negative'}`;
        }

        if (elements.revenueChange) {
            elements.revenueChange.textContent = `+${metrics.revenueChange}%`;
            elements.revenueChange.className = `metric-change ${metrics.revenueChange >= 0 ? 'positive' : 'negative'}`;
        }

        if (elements.usersChange) {
            elements.usersChange.textContent = `+${metrics.usersChange}%`;
            elements.usersChange.className = `metric-change ${metrics.usersChange >= 0 ? 'positive' : 'negative'}`;
        }

        if (elements.valueChange) {
            elements.valueChange.textContent = `${metrics.valueChange >= 0 ? '+' : ''}${metrics.valueChange}%`;
            elements.valueChange.className = `metric-change ${metrics.valueChange >= 0 ? 'positive' : 'negative'}`;
        }
    }

    /**
     * Load recent activity
     */
    async loadRecentActivity() {
        try {
            // Mock activity data - would be replaced with actual database queries
            
            const activities = [
                {
                    type: 'domain_registered',
                    title: 'New Domain Registered',
                    description: 'mydomain.aed registered by 0x1234...5678',
                    timestamp: Date.now() - 300000, // 5 minutes ago
                    icon: 'fas fa-globe'
                },
                {
                    type: 'revenue_generated',
                    title: 'Revenue Generated',
                    description: '2.5 MATIC from domain registration',
                    timestamp: Date.now() - 600000, // 10 minutes ago
                    icon: 'fas fa-coins'
                },
                {
                    type: 'user_joined',
                    title: 'New User Joined',
                    description: '0xabcd...efgh connected their wallet',
                    timestamp: Date.now() - 900000, // 15 minutes ago
                    icon: 'fas fa-user-plus'
                }
            ];

            this.displayActivity(activities);
            
        } catch (error) {
            console.error('❌ Failed to load recent activity:', error);
        }
    }

    /**
     * Display recent activity
     */
    displayActivity(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        activityList.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">
                    ${this.formatTimeAgo(activity.timestamp)}
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
    }

    /**
     * Initialize analytics charts
     */
    async initializeCharts() {
        try {
            // Initialize Chart.js or similar library
            // Mock chart data - would be replaced with actual analytics
            
            const chartData = {
                domainTrends: this.generateMockChartData('line', 30),
                revenueDistribution: this.generateMockChartData('pie', 6),
                registrationTrends: this.generateMockChartData('bar', 12),
                tldPerformance: this.generateMockChartData('doughnut', 6),
                userActivity: this.generateMockChartData('line', 24),
                revenueAnalysis: this.generateMockChartData('bar', 7)
            };

            this.renderCharts(chartData);
            
        } catch (error) {
            console.error('❌ Failed to initialize charts:', error);
        }
    }

    /**
     * Generate mock chart data
     */
    generateMockChartData(type, points) {
        const data = [];
        const labels = [];
        
        for (let i = 0; i < points; i++) {
            labels.push(`Point ${i + 1}`);
            data.push(Math.floor(Math.random() * 1000) + 100);
        }
        
        return { labels, data };
    }

    /**
     * Render charts with Chart.js or similar
     */
    renderCharts(chartData) {
        // This would integrate with Chart.js or similar library
        // For now, we'll create placeholder elements
        
        const charts = [
            'domainTrendsChart',
            'revenueDistributionChart',
            'registrationTrendsChart',
            'tldPerformanceChart',
            'userActivityChart',
            'revenueAnalysisChart'
        ];

        charts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                // Add placeholder or actual chart rendering
                canvas.style.background = 'rgba(255, 255, 255, 0.05)';
                canvas.style.borderRadius = '8px';
            }
        });
    }

    /**
     * Contract Administration Functions
     */
    async toggleContractPause() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            const contract = window.web3Provider.getContract();
            const isPaused = await contract.paused();
            
            if (isPaused) {
                await window.web3Provider.sendTransaction('unpause');
                window.glassUI.showNotification('Contract resumed successfully', 'success');
            } else {
                await window.web3Provider.sendTransaction('pause');
                window.glassUI.showNotification('Contract paused successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to toggle contract pause:', error);
            window.glassUI.showNotification('Failed to toggle contract pause', 'error');
        }
    }

    async performEmergencyWithdraw() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            const amount = document.getElementById('emergencyWithdrawAmount')?.value;
            const address = document.getElementById('emergencyWithdrawAddress')?.value;

            if (!amount || !address) {
                window.glassUI.showNotification('Please fill in all fields', 'warning');
                return;
            }

            // Show confirmation modal
            const confirmed = await this.showEmergencyConfirmation('emergency_withdraw', { amount, address });
            
            if (confirmed) {
                const contract = window.web3Provider.getContract();
                const amountWei = ethers.utils.parseEther(amount);
                
                await window.web3Provider.sendTransaction('emergencyWithdraw', [address, amountWei]);
                window.glassUI.showNotification('Emergency withdraw successful', 'success');
            }
            
        } catch (error) {
            console.error('❌ Emergency withdraw failed:', error);
            window.glassUI.showNotification('Emergency withdraw failed', 'error');
        }
    }

    async transferAdminRights() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            const newAdminAddress = document.getElementById('newAdminAddress')?.value;
            
            if (!newAdminAddress) {
                window.glassUI.showNotification('Please enter new admin address', 'warning');
                return;
            }

            // Validate address
            if (!ethers.utils.isAddress(newAdminAddress)) {
                window.glassUI.showNotification('Invalid Ethereum address', 'error');
                return;
            }

            // Show confirmation modal
            const confirmed = await this.showEmergencyConfirmation('transfer_admin', { newAdmin: newAdminAddress });
            
            if (confirmed) {
                const contract = window.web3Provider.getContract();
                await window.web3Provider.sendTransaction('transferAdmin', [newAdminAddress]);
                window.glassUI.showNotification('Admin rights transferred successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ Admin transfer failed:', error);
            window.glassUI.showNotification('Admin transfer failed', 'error');
        }
    }

    /**
     * Emergency Control Functions
     */
    async emergencyPause() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            const confirmed = await this.showEmergencyConfirmation('emergency_pause');
            
            if (confirmed) {
                await this.toggleContractPause();
                this.emergencyMode = true;
                this.logEmergencyAction('emergency_pause', 'Contract paused in emergency');
            }
            
        } catch (error) {
            console.error('❌ Emergency pause failed:', error);
            window.glassUI.showNotification('Emergency pause failed', 'error');
        }
    }

    async resumeOperations() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            if (!this.emergencyMode) {
                window.glassUI.showNotification('System is not in emergency mode', 'info');
                return;
            }

            const confirmed = await this.showEmergencyConfirmation('resume_operations');
            
            if (confirmed) {
                await this.toggleContractPause();
                this.emergencyMode = false;
                this.logEmergencyAction('resume_operations', 'Operations resumed after emergency');
            }
            
        } catch (error) {
            console.error('❌ Resume operations failed:', error);
            window.glassUI.showNotification('Resume operations failed', 'error');
        }
    }

    /**
     * Emergency confirmation modal
     */
    async showEmergencyConfirmation(action, data = {}) {
        return new Promise((resolve) => {
            let title, content, confirmText;

            switch (action) {
                case 'emergency_pause':
                    title = 'Emergency Pause Confirmation';
                    content = `
                        <div class="emergency-confirmation">
                            <div class="emergency-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>CRITICAL ACTION</h4>
                            </div>
                            <p>You are about to pause all contract operations. This will:</p>
                            <ul>
                                <li>Prevent new domain registrations</li>
                                <li>Stop all transfers and operations</li>
                                <li>Put the system in emergency mode</li>
                            </ul>
                            <p><strong>This action should only be taken in critical situations.</strong></p>
                        </div>
                    `;
                    confirmText = 'YES, EMERGENCY PAUSE';
                    break;

                case 'emergency_withdraw':
                    title = 'Emergency Withdraw Confirmation';
                    content = `
                        <div class="emergency-confirmation">
                            <div class="emergency-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>CRITICAL ACTION</h4>
                            </div>
                            <p>You are about to withdraw funds from the contract:</p>
                            <ul>
                                <li>Amount: ${data.amount} MATIC</li>
                                <li>To: ${data.address}</li>
                            </ul>
                            <p><strong>This will remove funds from the contract permanently.</strong></p>
                        </div>
                    `;
                    confirmText = 'YES, EMERGENCY WITHDRAW';
                    break;

                case 'transfer_admin':
                    title = 'Admin Transfer Confirmation';
                    content = `
                        <div class="emergency-confirmation">
                            <div class="emergency-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>CRITICAL ACTION</h4>
                            </div>
                            <p>You are about to transfer admin rights to:</p>
                            <p><strong>${data.newAdmin}</strong></p>
                            <p><strong>This action cannot be undone without the new admin's consent.</strong></p>
                        </div>
                    `;
                    confirmText = 'YES, TRANSFER ADMIN';
                    break;

                case 'resume_operations':
                    title = 'Resume Operations Confirmation';
                    content = `
                        <div class="emergency-confirmation">
                            <p>You are about to resume normal contract operations.</p>
                            <p>Ensure all issues have been resolved before proceeding.</p>
                        </div>
                    `;
                    confirmText = 'YES, RESUME OPERATIONS';
                    break;
            }

            const modalContent = `
                ${content}
                <div class="emergency-actions">
                    <button class="glass-button secondary" onclick="window.glassUI.closeModal(); resolve(false)">
                        Cancel
                    </button>
                    <button class="glass-button emergency-btn ${action.includes('pause') || action.includes('withdraw') ? 'critical' : action.includes('transfer') ? 'info' : 'success'}" onclick="window.glassUI.closeModal(); resolve(true)">
                        ${confirmText}
                    </button>
                </div>
            `;

            window.glassUI.showModal(title, modalContent);
        });
    }

    /**
     * Log emergency actions
     */
    logEmergencyAction(action, description) {
        const logEntry = {
            action,
            description,
            timestamp: Date.now(),
            admin: window.web3Provider.userAddress,
            txHash: null // Would be populated after transaction
        };

        // Add to emergency log
        const emergencyLog = document.getElementById('emergencyLog');
        if (emergencyLog) {
            const logItem = document.createElement('div');
            logItem.className = `log-entry ${action.includes('pause') || action.includes('withdraw') ? 'critical' : action.includes('transfer') ? 'info' : 'success'}`;
            logItem.innerHTML = `
                <div class="log-timestamp">${new Date().toLocaleString()}</div>
                <div class="log-content">
                    <div class="log-title">${description}</div>
                    <div class="log-description">By: ${window.web3Provider.userAddress.slice(0, 10)}...</div>
                </div>
            `;
            
            emergencyLog.insertBefore(logItem, emergencyLog.firstChild);
        }

        console.log('🚨 Emergency action logged:', logEntry);
    }

    /**
     * Settings Management
     */
    populateSettingsForm() {
        const settings = this.systemSettings;
        
        // Contract settings
        document.getElementById('contractAddress') && (document.getElementById('contractAddress').value = settings.contractAddress);
        document.getElementById('feeCollectorAddress') && (document.getElementById('feeCollectorAddress').value = settings.feeCollector);
        document.getElementById('defaultTLDPrice') && (document.getElementById('defaultTLDPrice').value = ethers.utils.formatEther(settings.defaultTLDPrice));
        
        // Feature settings
        document.getElementById('subdomainFeaturePrice') && (document.getElementById('subdomainFeaturePrice').value = ethers.utils.formatEther(settings.subdomainFeaturePrice));
        document.getElementById('metadataFeaturePrice') && (document.getElementById('metadataFeaturePrice').value = ethers.utils.formatEther(settings.metadataFeaturePrice));
        document.getElementById('reverseResolutionPrice') && (document.getElementById('reverseResolutionPrice').value = ethers.utils.formatEther(settings.reverseResolutionPrice));
        
        // System settings
        document.getElementById('maxDomainLength') && (document.getElementById('maxDomainLength').value = settings.maxDomainLength);
        document.getElementById('maxSubdomains') && (document.getElementById('maxSubdomains').value = settings.maxSubdomainsPerDomain);
        document.getElementById('freeSubdomains') && (document.getElementById('freeSubdomains').value = settings.freeSubdomainsPerDomain);
        
        // Security settings
        document.getElementById('enablePause') && (document.getElementById('enablePause').checked = settings.enablePause);
        document.getElementById('enableUpgrade') && (document.getElementById('enableUpgrade').checked = settings.enableUpgrade);
        document.getElementById('enableWhitelist') && (document.getElementById('enableWhitelist').checked = settings.enableWhitelist);
    }

    async saveSettings() {
        try {
            if (!this.isAdmin) {
                window.glassUI.showNotification('Admin privileges required', 'warning');
                return;
            }

            // Collect all settings from form
            const newSettings = {
                feeCollector: document.getElementById('feeCollectorAddress')?.value,
                defaultTLDPrice: ethers.utils.parseEther(document.getElementById('defaultTLDPrice')?.value || '0'),
                subdomainFeaturePrice: ethers.utils.parseEther(document.getElementById('subdomainFeaturePrice')?.value || '0'),
                metadataFeaturePrice: ethers.utils.parseEther(document.getElementById('metadataFeaturePrice')?.value || '0'),
                reverseResolutionPrice: ethers.utils.parseEther(document.getElementById('reverseResolutionPrice')?.value || '0'),
                maxDomainLength: parseInt(document.getElementById('maxDomainLength')?.value || '63'),
                maxSubdomainsPerDomain: parseInt(document.getElementById('maxSubdomains')?.value || '1000'),
                freeSubdomainsPerDomain: parseInt(document.getElementById('freeSubdomains')?.value || '2'),
                enablePause: document.getElementById('enablePause')?.checked,
                enableUpgrade: document.getElementById('enableUpgrade')?.checked,
                enableWhitelist: document.getElementById('enableWhitelist')?.checked
            };

            // Validate settings
            if (!ethers.utils.isAddress(newSettings.feeCollector)) {
                window.glassUI.showNotification('Invalid fee collector address', 'error');
                return;
            }

            // Send settings update transaction
            const contract = window.web3Provider.getContract();
            
            // This would be broken into multiple transactions for different settings
            // For now, we'll update the fee collector as an example
            
            await window.web3Provider.sendTransaction('updateFeeCollector', [newSettings.feeCollector]);
            
            // Update local settings
            this.systemSettings = { ...this.systemSettings, ...newSettings };
            
            window.glassUI.showNotification('Settings updated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            window.glassUI.showNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Analytics Management
     */
    async updateAnalytics(period) {
        try {
            console.log(`📊 Updating analytics for period: ${period}`);
            
            // This would fetch new analytics data based on the selected period
            // and update all charts and metrics accordingly
            
            const analyticsData = await this.fetchAnalyticsData(period);
            this.updateAnalyticsCharts(analyticsData);
            
        } catch (error) {
            console.error('❌ Failed to update analytics:', error);
        }
    }

    async fetchAnalyticsData(period) {
        try {
            // Mock analytics data - would be replaced with actual API calls
            
            const data = {
                registrationTrends: this.generateMockChartData('line', 30),
                tldPerformance: this.generateMockChartData('pie', 6),
                userActivity: this.generateMockChartData('line', 24),
                revenueAnalysis: this.generateMockChartData('bar', 7)
            };
            
            return data;
            
        } catch (error) {
            console.error('❌ Failed to fetch analytics data:', error);
            throw error;
        }
    }

    updateAnalyticsCharts(data) {
        // Update all analytics charts with new data
        // This would integrate with Chart.js or similar library
        
        console.log('📈 Updating analytics charts:', data);
    }

    async exportAnalytics() {
        try {
            const analyticsData = await this.fetchAnalyticsData('30d');
            
            const exportData = {
                exportDate: new Date().toISOString(),
                period: '30d',
                data: analyticsData,
                metadata: {
                    totalDomains: this.analyticsData.totalDomains || 0,
                    totalRevenue: this.analyticsData.totalRevenue || 0,
                    activeUsers: this.analyticsData.activeUsers || 0
                }
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `aed-analytics-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            window.glassUI.showNotification('Analytics exported successfully', 'success');
            
        } catch (error) {
            console.error('❌ Failed to export analytics:', error);
            window.glassUI.showNotification('Failed to export analytics', 'error');
        }
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

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    showAccessDenied() {
        const content = `
            <div class="access-denied">
                <i class="fas fa-lock" style="font-size: 4rem; color: var(--error-glow); margin-bottom: 1rem;"></i>
                <h3>Access Denied</h3>
                <p>You do not have admin privileges to access this dashboard.</p>
                <p>Please connect with an admin account or contact the system administrator.</p>
            </div>
        `;
        
        document.querySelector('.admin-main').innerHTML = content;
    }

    /**
     * Get admin state
     */
    getAdminState() {
        return {
            isAdmin: this.isAdmin,
            adminRoles: this.adminRoles,
            systemSettings: this.systemSettings,
            emergencyMode: this.emergencyMode,
            analyticsData: this.analyticsData
        };
    }

    /**
     * Cleanup and teardown
     */
    destroy() {
        // Remove event listeners
        // Clear intervals and timeouts
        // Reset state
        
        console.log('🧹 Admin Manager cleanup complete');
    }
}

// Initialize Admin Manager
window.adminManager = new AdminManager();