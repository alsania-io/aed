/**
 * Glass UI - Futuristic Interface Controller
 * Handles all glass morphism effects, animations, and UI interactions
 */

class GlassUI {
    constructor() {
        this.isInitialized = false;
        this.activeSection = 'home';
        this.scrollPosition = 0;
        this.particleSystem = null;
        this.loadingProgress = 0;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupLoadingScreen();
        this.setupNavigation();
        this.setupParticleSystem();
        this.setupScrollEffects();
        this.setupModals();
        this.setupFormValidation();
        this.setupAnimations();
        
        this.isInitialized = true;
        console.log('🚀 Glass UI initialized successfully');
    }

    /**
     * Loading Screen Management
     */
    setupLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingProgress = document.querySelector('.loading-progress');
        const loadingText = document.querySelector('.loading-text');
        
        const loadingSteps = [
            'Initializing Web3 Connection...',
            'Loading Contract Interfaces...',
            'Setting up Particle System...',
            'Preparing Glass Effects...',
            'Almost Ready...'
        ];

        let currentStep = 0;
        const totalSteps = loadingSteps.length;

        const updateLoading = () => {
            if (currentStep < totalSteps) {
                loadingText.textContent = loadingSteps[currentStep];
                const progress = ((currentStep + 1) / totalSteps) * 100;
                loadingProgress.style.width = `${progress}%`;
                currentStep++;
                
                setTimeout(updateLoading, 800);
            } else {
                // Hide loading screen
                setTimeout(() => {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                        this.startParticleAnimation();
                    }, 500);
                }, 1000);
            }
        };

        // Start loading sequence
        updateLoading();
    }

    /**
     * Navigation System
     */
    setupNavigation() {
        const nav = document.getElementById('mainNav');
        const navLinks = document.querySelectorAll('.glass-nav-link');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const walletStatus = document.getElementById('walletStatus');
        const connectBtn = document.getElementById('connectBtn');

        // Scroll-based navigation effects
        window.addEventListener('scroll', () => {
            this.scrollPosition = window.scrollY;
            
            if (this.scrollPosition > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });

        // Navigation link interactions
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                const navMenu = document.getElementById('navMenu');
                navMenu.classList.toggle('active');
                
                // Animate hamburger
                const spans = mobileMenuToggle.querySelectorAll('span');
                spans[0].style.transform = navMenu.classList.contains('active') ? 'rotate(45deg) translate(5px, 5px)' : '';
                spans[1].style.opacity = navMenu.classList.contains('active') ? '0' : '1';
                spans[2].style.transform = navMenu.classList.contains('active') ? 'rotate(-45deg) translate(7px, -6px)' : '';
            });
        }

        // Wallet connection
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectWallet();
            });
        }

        // Wallet status indicator
        if (walletStatus) {
            walletStatus.addEventListener('click', () => {
                this.showWalletModal();
            });
        }
    }

    /**
     * Particle System for Background Effects
     */
    setupParticleSystem() {
        const particleField = document.querySelector('.particle-field');
        if (!particleField) return;

        this.particleSystem = {
            particles: [],
            maxParticles: 50,
            animationId: null
        };

        this.createParticles();
    }

    createParticles() {
        const particleField = document.querySelector('.particle-field');
        if (!particleField) return;

        // Clear existing particles
        particleField.innerHTML = '';

        for (let i = 0; i < this.particleSystem.maxParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: ${this.getRandomGlowColor()};
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.5 + 0.2};
                animation: particle-float ${Math.random() * 20 + 10}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            
            particleField.appendChild(particle);
            this.particleSystem.particles.push(particle);
        }
    }

    getRandomGlowColor() {
        const colors = [
            'var(--primary-glow)',
            'var(--secondary-glow)',
            'var(--accent-glow)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    startParticleAnimation() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes particle-float {
                0% { transform: translateY(0) translateX(0) rotate(0deg); }
                25% { transform: translateY(-20px) translateX(10px) rotate(90deg); }
                50% { transform: translateY(-10px) translateX(-10px) rotate(180deg); }
                75% { transform: translateY(-30px) translateX(5px) rotate(270deg); }
                100% { transform: translateY(0) translateX(0) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Scroll Effects and Parallax
     */
    setupScrollEffects() {
        const sections = document.querySelectorAll('section');
        const animatedElements = document.querySelectorAll('.glass-card, .feature-card, .pricing-card');

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    this.animateElement(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => observer.observe(el));

        // Parallax effect for hero section
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = document.querySelector('.hero-section');
            const speed = scrolled * 0.5;
            
            if (parallax) {
                parallax.style.transform = `translateY(${speed}px)`;
            }
        });
    }

    animateElement(element) {
        const animations = [
            'fadeInUp',
            'fadeInLeft',
            'fadeInRight',
            'zoomIn'
        ];
        
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        element.style.animation = `${randomAnimation} 0.8s ease-out`;
    }

    /**
     * Modal System
     */
    setupModals() {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    showModal(title, content, options = {}) {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modalOverlay || !modalTitle || !modalBody) return;

        modalTitle.textContent = title;
        modalBody.innerHTML = content;

        if (options.size) {
            const modalContent = modalOverlay.querySelector('.modal-content');
            modalContent.style.maxWidth = options.size;
        }

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Add entrance animation
        const modalContent = modalOverlay.querySelector('.modal-content');
        modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (!modalOverlay) return;

        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';

        // Reset modal content
        setTimeout(() => {
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            if (modalTitle) modalTitle.textContent = '';
            if (modalBody) modalBody.innerHTML = '';
        }, 300);
    }

    /**
     * Form Validation and Interaction
     */
    setupFormValidation() {
        // Domain name validation
        const domainNameInput = document.getElementById('domainNameInput');
        if (domainNameInput) {
            domainNameInput.addEventListener('input', (e) => {
                this.validateDomainName(e.target.value);
            });
        }

        // Real-time search validation
        const heroSearchInput = document.getElementById('heroSearchInput');
        if (heroSearchInput) {
            heroSearchInput.addEventListener('input', (e) => {
                this.debounce(() => this.performHeroSearch(e.target.value), 300);
            });
        }

        // Cost calculation
        const featureCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        featureCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCostBreakdown();
            });
        });
    }

    validateDomainName(name) {
        const validationIcon = document.getElementById('nameValidationIcon');
        const validationText = document.getElementById('nameValidationText');
        
        if (!validationIcon || !validationText) return;

        // Basic validation rules
        const isValid = /^[a-z0-9-]+$/.test(name) && 
                       name.length >= 1 && 
                       name.length <= 63 &&
                       !name.startsWith('-') && 
                       !name.endsWith('-');

        if (isValid) {
            validationIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
            validationIcon.className = 'validation-icon valid';
            validationText.textContent = 'Valid domain name';
            validationText.style.color = 'var(--accent-glow)';
        } else {
            validationIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
            validationIcon.className = 'validation-icon invalid';
            validationText.textContent = 'Invalid domain name';
            validationText.style.color = 'var(--error-glow)';
        }

        return isValid;
    }

    performHeroSearch(query) {
        if (!query || query.length < 2) {
            this.clearHeroSearchResults();
            return;
        }

        // Simulate domain search (replace with actual contract call)
        const mockResults = [
            { domain: `${query}.aed`, available: Math.random() > 0.5 },
            { domain: `${query}.alsa`, available: Math.random() > 0.5 },
            { domain: `${query}.alsania`, available: Math.random() > 0.5 }
        ];

        this.displayHeroSearchResults(mockResults);
    }

    displayHeroSearchResults(results) {
        const resultsContainer = document.getElementById('heroSearchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${result.available ? 'available' : 'taken'}`;
            resultItem.innerHTML = `
                <i class="fas fa-${result.available ? 'check-circle' : 'times-circle'}"></i>
                <span>${result.domain}</span>
                <span class="status">${result.available ? 'Available' : 'Taken'}</span>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
    }

    clearHeroSearchResults() {
        const resultsContainer = document.getElementById('heroSearchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="result-item placeholder">
                <i class="fas fa-globe"></i>
                <span>Start typing to search for available domains</span>
            </div>
        `;
    }

    updateCostBreakdown() {
        // Implementation for dynamic cost calculation
        console.log('Updating cost breakdown...');
    }

    /**
     * Animations and Effects
     */
    setupAnimations() {
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalSlideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes fadeInUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes fadeInLeft {
                from { transform: translateX(-30px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes fadeInRight {
                from { transform: translateX(30px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes zoomIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .animate-in {
                animation-fill-mode: both;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Wallet Connection
     */
    async connectWallet() {
        try {
            // Update UI to show connecting state
            const connectBtn = document.getElementById('connectBtn');
            const statusIndicator = document.getElementById('statusIndicator');
            
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                connectBtn.disabled = true;
            }

            // Simulate connection (replace with actual Web3 connection)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Update UI to show connected state
            if (statusIndicator) {
                statusIndicator.classList.add('connected');
            }
            
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                connectBtn.classList.add('connected');
                
                // Update wallet status
                const walletAddress = document.getElementById('walletAddress');
                if (walletAddress) {
                    walletAddress.textContent = '0x1234...5678'; // Mock address
                }
            }

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showNotification('Failed to connect wallet', 'error');
            
            // Reset button state
            const connectBtn = document.getElementById('connectBtn');
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
                connectBtn.disabled = false;
            }
        }
    }

    showWalletModal() {
        const content = `
            <div class="wallet-modal-content">
                <h4>Wallet Information</h4>
                <div class="wallet-details">
                    <p><strong>Address:</strong> 0x1234...5678</p>
                    <p><strong>Balance:</strong> 1.234 MATIC</p>
                    <p><strong>Network:</strong> Polygon Amoy</p>
                </div>
                <div class="wallet-actions">
                    <button class="glass-button" onclick="glassUI.disconnectWallet()">
                        <i class="fas fa-sign-out-alt"></i> Disconnect
                    </button>
                    <button class="glass-button secondary" onclick="glassUI.closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        this.showModal('Wallet Information', content);
    }

    disconnectWallet() {
        // Implement wallet disconnection
        const statusIndicator = document.getElementById('statusIndicator');
        const connectBtn = document.getElementById('connectBtn');
        const walletAddress = document.getElementById('walletAddress');
        
        if (statusIndicator) {
            statusIndicator.classList.remove('connected');
        }
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            connectBtn.classList.remove('connected');
            connectBtn.disabled = false;
        }
        
        if (walletAddress) {
            walletAddress.textContent = 'Connect Wallet';
        }
        
        this.closeModal();
    }

    /**
     * Navigation and Section Management
     */
    navigateToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        this.activeSection = sectionId;
        
        // Smooth scroll to section
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });

        // Update navigation active state
        const navLinks = document.querySelectorAll('.glass-nav-link');
        navLinks.forEach(link => {
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Trigger section-specific animations
        this.animateSection(section);
    }

    animateSection(section) {
        const elements = section.querySelectorAll('.glass-card, .glass-panel');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s both`;
            }, index * 100);
        });
    }

    /**
     * Notifications and Feedback
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Utility Functions
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Theme Management
     */
    toggleTheme() {
        const body = document.body;
        const currentTheme = body.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.dataset.theme = newTheme;
        localStorage.setItem('glass-ui-theme', newTheme);
        
        this.updateThemeColors(newTheme);
    }

    updateThemeColors(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.1)');
            root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.2)');
            root.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.1)');
        } else {
            root.style.setProperty('--glass-bg', 'rgba(0, 20, 40, 0.25)');
            root.style.setProperty('--glass-border', 'rgba(0, 245, 255, 0.3)');
            root.style.setProperty('--glass-shadow', 'rgba(0, 245, 255, 0.2)');
        }
    }

    /**
     * Performance Monitoring
     */
    measurePerformance() {
        if ('performance' in window) {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const connectTime = perfData.responseEnd - perfData.requestStart;
            
            console.log(`Page load time: ${pageLoadTime}ms`);
            console.log(`Connection time: ${connectTime}ms`);
        }
    }
}

// Initialize Glass UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.glassUI = new GlassUI();
});

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        padding: 1rem 1.5rem;
        color: #fff;
        font-family: var(--font-secondary);
        font-size: 0.9rem;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-info {
        border-color: var(--primary-glow);
        color: var(--primary-glow);
    }
    
    .notification-success {
        border-color: var(--accent-glow);
        color: var(--accent-glow);
    }
    
    .notification-warning {
        border-color: var(--warning-glow);
        color: var(--warning-glow);
    }
    
    .notification-error {
        border-color: var(--error-glow);
        color: var(--error-glow);
    }
`;

document.head.appendChild(notificationStyles);