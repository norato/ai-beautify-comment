// Content script for AI Beautify Comment
// Handles clipboard operations and DOM interactions

// Get icon URL from extension

// Notification component
class UniversalNotification {
    constructor() {
        this.notification = null;
        this.hideTimer = null;
        this.init();
    }

    init() {
        this.createNotification();
        this.attachStyles();
        this.addCleanupListeners();
    }

    createNotification() {
        this.notification = document.createElement('div');
        this.notification.id = 'ai-beautify-notification';
        this.notification.setAttribute('role', 'alert');
        this.notification.setAttribute('aria-live', 'polite');
        this.notification.setAttribute('aria-atomic', 'true');
        this.notification.setAttribute('tabindex', '-1');
        this.notification.innerHTML = `
            <div class="gpt-notification-header">
                <img src="${chrome.runtime.getURL('icon.png')}" alt="AI Beautify Comment" class="ai-notification-icon">
                <button class="gpt-notification-close" aria-label="Close notification" style="display: none;" tabindex="0">&times;</button>
            </div>
            <div class="gpt-notification-content">
                <div class="gpt-notification-title" role="heading" aria-level="3"></div>
                <div class="gpt-notification-message"></div>
            </div>
            <div class="gpt-notification-spinner" style="display: none;" aria-label="Loading">
                <div class="gpt-spinner" aria-hidden="true"></div>
            </div>
        `;
        
        document.body.appendChild(this.notification);
        
        // Add click handler for close button
        const closeBtn = this.notification.querySelector('.gpt-notification-close');
        closeBtn.onclick = () => this.hide();
        
        // Add keyboard support
        this.addKeyboardSupport();
    }

    attachStyles() {
        const style = document.createElement('style');
        style.id = 'gpt-notification-styles';
        style.textContent = `
            #ai-beautify-notification {
                position: fixed !important;
                top: 80px !important;
                right: 20px !important;
                width: 320px !important;
                background: white !important;
                border: 1px solid #e0e0e0 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                z-index: 99999 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                transform: translateX(100%) !important;
                opacity: 0 !important;
                transition: all 0.3s ease-out !important;
                padding: 16px !important;
                display: none !important;
            }
            
            #ai-beautify-notification.gpt-show {
                display: block !important;
                transform: translateX(0) !important;
                opacity: 1 !important;
            }
            
            .gpt-notification-header {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                margin-bottom: 12px !important;
            }
            
            .gpt-notification-icon {
                width: 32px !important;
                height: 32px !important;
                border-radius: 6px !important;
            }
            
            .gpt-notification-close {
                background: none !important;
                border: none !important;
                font-size: 20px !important;
                cursor: pointer !important;
                color: #666 !important;
                padding: 4px !important;
                line-height: 1 !important;
            }
            
            .gpt-notification-close:hover {
                color: #000 !important;
            }
            
            .gpt-notification-title {
                font-weight: 600 !important;
                font-size: 14px !important;
                color: #0a66c2 !important;
                margin-bottom: 4px !important;
            }
            
            .gpt-notification-message {
                font-size: 13px !important;
                color: #666 !important;
                line-height: 1.4 !important;
            }
            
            .gpt-notification-spinner {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-top: 12px !important;
            }
            
            .gpt-spinner {
                width: 20px !important;
                height: 20px !important;
                border: 2px solid #f3f3f3 !important;
                border-top: 2px solid #0a66c2 !important;
                border-radius: 50% !important;
                animation: gpt-spin 1s linear infinite !important;
            }
            
            @keyframes gpt-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Enhanced animations and responsive design */
            @keyframes gpt-slideInFromRight {
                0% {
                    transform: translateX(100%) translateY(-20px) !important;
                    opacity: 0 !important;
                    scale: 0.95 !important;
                }
                100% {
                    transform: translateX(0) translateY(0) !important;
                    opacity: 1 !important;
                    scale: 1 !important;
                }
            }
            
            @keyframes gpt-slideOutToRight {
                0% {
                    transform: translateX(0) translateY(0) !important;
                    opacity: 1 !important;
                    scale: 1 !important;
                }
                100% {
                    transform: translateX(100%) translateY(-20px) !important;
                    opacity: 0 !important;
                    scale: 0.95 !important;
                }
            }
            
            @keyframes gpt-pulse {
                0%, 100% { transform: scale(1) !important; }
                50% { transform: scale(1.05) !important; }
            }
            
            /* Dynamic positioning for universal layout */
            @media screen and (max-width: 768px) {
                #ai-beautify-notification {
                    top: 60px !important;
                    right: 10px !important;
                    left: 10px !important;
                    width: auto !important;
                    max-width: calc(100vw - 20px) !important;
                }
            }
            
            @media screen and (max-height: 600px) {
                #ai-beautify-notification {
                    top: 10px !important;
                }
            }
            
            /* Accessibility improvements */
            #ai-beautify-notification[aria-live] {
                position: fixed !important;
            }
            
            .gpt-notification-close:focus {
                outline: 2px solid #0a66c2 !important;
                outline-offset: 2px !important;
            }
            
            /* High contrast support */
            @media (prefers-contrast: high) {
                #ai-beautify-notification {
                    border: 2px solid #000 !important;
                    background: #fff !important;
                }
                
                .gpt-notification-title {
                    color: #000 !important;
                }
                
                .gpt-notification-message {
                    color: #000 !important;
                }
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                #ai-beautify-notification,
                .gpt-spinner {
                    animation: none !important;
                    transition: opacity 0.1s !important;
                }
                
                #ai-beautify-notification.ai-show {
                    transform: none !important;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                #ai-beautify-notification {
                    background: #1d2226 !important;
                    border-color: #38434f !important;
                    color: #f1f2f2 !important;
                }
                
                .gpt-notification-title {
                    color: #70b5f9 !important;
                }
                
                .gpt-notification-message {
                    color: #b0b7bf !important;
                }
                
                .gpt-notification-close {
                    color: #b0b7bf !important;
                }
                
                .gpt-notification-close:hover {
                    color: #f1f2f2 !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    show(title, message, type = 'loading') {
        if (!this.notification) return;
        
        const titleEl = this.notification.querySelector('.gpt-notification-title');
        const messageEl = this.notification.querySelector('.gpt-notification-message');
        const spinnerEl = this.notification.querySelector('.gpt-notification-spinner');
        const closeBtn = this.notification.querySelector('.gpt-notification-close');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Show/hide elements based on type
        if (type === 'loading') {
            spinnerEl.style.display = 'flex';
            closeBtn.style.display = 'none';
        } else {
            spinnerEl.style.display = 'none';
            closeBtn.style.display = type === 'error' ? 'block' : 'none';
        }
        
        // Clear any existing hide timer
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        
        // Update ARIA attributes
        this.notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        
        // Show notification with enhanced animation (faster for immediate feedback)
        this.notification.style.display = 'block';
        this.notification.style.animation = 'gpt-slideInFromRight 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
        
        setTimeout(() => {
            this.notification.classList.add('ai-show');
            
            // Add pulse animation for loading state
            if (type === 'loading') {
                this.notification.style.animation += ', gpt-pulse 1.5s ease-in-out infinite';
            }
        }, 5);
        
        // Auto-hide for success messages
        if (type === 'success') {
            this.hideTimer = setTimeout(() => this.hide(), 3000);
        }
    }
    
    hide() {
        if (!this.notification) return;
        
        // Enhanced slide-out animation
        this.notification.style.animation = 'gpt-slideOutToRight 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards';
        this.notification.classList.remove('ai-show');
        
        setTimeout(() => {
            this.notification.style.display = 'none';
            this.notification.style.animation = '';
        }, 300);
        
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }
    
    addKeyboardSupport() {
        // ESC key to close notification
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notification && this.notification.style.display !== 'none') {
                this.hide();
            }
        });
        
        // Focus management
        const closeBtn = this.notification.querySelector('.gpt-notification-close');
        closeBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.hide();
            }
        });
    }
    
    addCleanupListeners() {
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }
    
    destroy() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        
        const style = document.getElementById('gpt-notification-styles');
        if (style) style.remove();
        
        if (this.notification) {
            this.notification.remove();
            this.notification = null;
        }
    }
}

// Initialize notification system
let notificationSystem = null;

function initNotificationSystem() {
    if (!notificationSystem) {
        notificationSystem = new UniversalNotification();
    }
    return notificationSystem;
}

// === MODAL SYSTEM FOR MULTIPLE RESPONSES ===

// Function to inject modal CSS once
function injectModalCss() {
    const styleId = 'lc-modal-styles';
    if (document.getElementById(styleId)) {
        return; // CSS already injected
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Modal Overlay */
        .lc-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.6) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 99999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        }

        /* Modal Content */
        .lc-modal-content {
            background-color: white !important;
            padding: 24px !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
            max-width: 90vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            position: relative !important;
            box-sizing: border-box !important;
            min-width: 320px !important;
            width: fit-content !important;
            animation: lc-modal-appear 0.3s ease-out !important;
        }

        @keyframes lc-modal-appear {
            from {
                opacity: 0 !important;
                transform: scale(0.9) translateY(-20px) !important;
            }
            to {
                opacity: 1 !important;
                transform: scale(1) translateY(0) !important;
            }
        }

        /* Close Button */
        .lc-modal-close-btn {
            position: absolute !important;
            top: 12px !important;
            right: 16px !important;
            font-size: 28px !important;
            cursor: pointer !important;
            color: #666 !important;
            background: none !important;
            border: none !important;
            padding: 4px !important;
            line-height: 1 !important;
            border-radius: 50% !important;
            width: 36px !important;
            height: 36px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
        }

        .lc-modal-close-btn:hover {
            color: #333 !important;
            background-color: #f0f0f0 !important;
        }

        /* Modal Title */
        .lc-modal-title {
            margin-top: 0 !important;
            margin-bottom: 20px !important;
            color: #0a66c2 !important;
            font-size: 1.4em !important;
            font-weight: 600 !important;
            text-align: center !important;
            padding-right: 40px !important;
        }

        .lc-modal-subtitle {
            color: #666 !important;
            font-size: 0.9em !important;
            text-align: center !important;
            margin-bottom: 24px !important;
            font-weight: normal !important;
        }

        /* Response Grid */
        .lc-response-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
            gap: 16px !important;
            margin-top: 16px !important;
        }

        /* Individual Response Card */
        .lc-response-card {
            border: 1px solid #e0e0e0 !important;
            padding: 18px !important;
            border-radius: 8px !important;
            background-color: #fafafa !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            font-size: 0.95em !important;
            line-height: 1.5 !important;
            color: #333 !important;
            position: relative !important;
            min-height: 80px !important;
            display: flex !important;
            align-items: center !important;
            text-align: left !important;
            border-left: 3px solid transparent !important;
        }

        .lc-response-card:hover {
            background-color: #f0f7ff !important;
            border-color: #0a66c2 !important;
            border-left-color: #0a66c2 !important;
            box-shadow: 0 2px 8px rgba(10, 102, 194, 0.1) !important;
            transform: translateY(-1px) !important;
        }

        .lc-response-card::after {
            content: "Click to copy" !important;
            position: absolute !important;
            bottom: 8px !important;
            right: 8px !important;
            font-size: 0.8em !important;
            color: #999 !important;
            opacity: 0 !important;
            transition: opacity 0.2s ease !important;
            pointer-events: none !important;
        }

        .lc-response-card:hover::after {
            opacity: 1 !important;
        }

        /* Copy Success Message */
        .lc-copied-message {
            position: fixed !important;
            bottom: 30px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background-color: #28a745 !important;
            color: white !important;
            padding: 12px 24px !important;
            border-radius: 25px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease-in-out !important;
            z-index: 100000 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }

        .lc-copied-message.show {
            opacity: 1 !important;
        }

        /* Responsive Design */
        @media screen and (max-width: 768px) {
            .lc-modal-content {
                margin: 10px !important;
                padding: 20px !important;
                max-width: calc(100vw - 20px) !important;
            }
            
            .lc-response-grid {
                grid-template-columns: 1fr !important;
                gap: 12px !important;
            }
            
            .lc-modal-title {
                font-size: 1.2em !important;
                padding-right: 40px !important;
            }
            
            .lc-response-card {
                padding: 16px !important;
                font-size: 0.9em !important;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .lc-modal-content {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
            }
            
            .lc-modal-title {
                color: #70b5f9 !important;
            }
            
            .lc-modal-subtitle {
                color: #b0b7bf !important;
            }
            
            .lc-response-card {
                background-color: #2a2a2a !important;
                color: #ffffff !important;
                border-color: #444444 !important;
            }
            
            .lc-response-card:hover {
                background-color: #1a3a5c !important;
                border-color: #70b5f9 !important;
                border-left-color: #70b5f9 !important;
            }
            
            .lc-modal-close-btn {
                color: #b0b7bf !important;
            }
            
            .lc-modal-close-btn:hover {
                color: #ffffff !important;
                background-color: #404040 !important;
            }
        }

        /* High contrast support */
        @media (prefers-contrast: high) {
            .lc-modal-content {
                border: 2px solid #000000 !important;
            }
            
            .lc-response-card {
                border: 2px solid #000000 !important;
            }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .lc-modal-content {
                animation: none !important;
            }
            
            .lc-response-card {
                transition: none !important;
            }
            
            .lc-response-card:hover {
                transform: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Function to show multiple responses modal with Shadow DOM isolation
function showMultipleResponsesModal(responses, promptName = 'Custom Prompt') {
    // Remove any existing modal host
    const existingHost = document.getElementById('lc-modal-host');
    if (existingHost) {
        existingHost.remove();
    }

    // Create Shadow DOM host element
    const modalHost = document.createElement('div');
    modalHost.id = 'lc-modal-host';
    modalHost.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 99999 !important;
        pointer-events: auto !important;
    `;
    
    // Create Shadow Root for complete CSS isolation
    const shadowRoot = modalHost.attachShadow({ mode: 'open' });
    
    // Inject CSS into Shadow DOM
    const style = document.createElement('style');
    style.textContent = getModalShadowCSS();
    shadowRoot.appendChild(style);

    // Create modal structure inside Shadow DOM
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('lc-modal-overlay');

    const modalContent = document.createElement('div');
    modalContent.classList.add('lc-modal-content');

    const title = document.createElement('h3');
    title.classList.add('lc-modal-title');
    title.textContent = `${promptName} - ${responses.length} Response${responses.length > 1 ? 's' : ''}`;

    const subtitle = document.createElement('p');
    subtitle.classList.add('lc-modal-subtitle');
    subtitle.textContent = 'Click any response to copy it to your clipboard';

    const closeButton = document.createElement('button');
    closeButton.classList.add('lc-modal-close-btn');
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close modal (ESC)';
    closeButton.setAttribute('aria-label', 'Close modal');
    closeButton.addEventListener('click', () => {
        modalHost.remove();
    });

    const responseGrid = document.createElement('div');
    responseGrid.classList.add('lc-response-grid');

    responses.forEach((response, index) => {
        const responseCard = document.createElement('div');
        responseCard.classList.add('lc-response-card');
        responseCard.textContent = response.trim();
        responseCard.title = `Response ${index + 1} - Click to copy`;
        responseCard.setAttribute('aria-label', `Response ${index + 1} of ${responses.length}`);
        responseCard.setAttribute('tabindex', '0');
        responseCard.setAttribute('role', 'button');

        const copyResponse = async () => {
            try {
                await navigator.clipboard.writeText(response.trim());
                showCopiedMessage();
                modalHost.remove();
            } catch (err) {
                console.error('Error copying text:', err);
                // Fallback for older browsers
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = response.trim();
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    // Using execCommand as fallback - deprecated but still widely supported
                    // TODO: Modern browsers should use navigator.clipboard.writeText() instead
                    document.execCommand('copy');
                    textArea.remove();
                    showCopiedMessage();
                    modalHost.remove();
                } catch (fallbackErr) {
                    console.error('Fallback copy failed:', fallbackErr);
                    // Create error notification in Shadow DOM
                    const errorMsg = document.createElement('div');
                    errorMsg.classList.add('lc-error-message');
                    errorMsg.textContent = 'Failed to copy. Please try again.';
                    modalContent.appendChild(errorMsg);
                    setTimeout(() => errorMsg.remove(), 3000);
                }
            }
        };

        responseCard.addEventListener('click', copyResponse);
        
        // Add keyboard support
        responseCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                copyResponse();
            }
        });

        responseGrid.appendChild(responseCard);
    });

    // Build modal structure
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(subtitle);
    modalContent.appendChild(responseGrid);
    modalOverlay.appendChild(modalContent);
    shadowRoot.appendChild(modalOverlay);
    
    // Add to page
    document.body.appendChild(modalHost);

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalHost.remove();
        }
    });
    
    // Focus management for accessibility
    setTimeout(() => {
        closeButton.focus();
    }, 100);
}

// Get CSS for Shadow DOM modal (isolated from page styles)
function getModalShadowCSS() {
    return `
        /* Reset and base styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        /* Modal Overlay */
        .lc-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            padding: 20px;
            pointer-events: auto;
        }

        /* Modal Content */
        .lc-modal-content {
            background-color: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            min-width: 320px;
            width: fit-content;
            animation: lc-modal-appear 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        @keyframes lc-modal-appear {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        /* Close Button */
        .lc-modal-close-btn {
            position: absolute;
            top: 12px;
            right: 16px;
            font-size: 28px;
            cursor: pointer;
            color: #666;
            background: none;
            border: none;
            padding: 4px;
            line-height: 1;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .lc-modal-close-btn:hover,
        .lc-modal-close-btn:focus {
            color: #333;
            background-color: #f0f0f0;
            outline: 2px solid #0a66c2;
            outline-offset: 2px;
        }

        /* Modal Title */
        .lc-modal-title {
            margin-top: 0;
            margin-bottom: 8px;
            color: #0a66c2;
            font-size: 1.4em;
            font-weight: 600;
            text-align: center;
            padding-right: 40px;
        }

        .lc-modal-subtitle {
            color: #666;
            font-size: 0.9em;
            text-align: center;
            margin-bottom: 24px;
            font-weight: normal;
        }

        /* Response Grid */
        .lc-response-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        /* Individual Response Card */
        .lc-response-card {
            border: 2px solid #e0e0e0;
            padding: 18px;
            border-radius: 8px;
            background-color: #fafafa;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 0.95em;
            line-height: 1.5;
            color: #333;
            position: relative;
            min-height: 80px;
            display: flex;
            align-items: center;
            text-align: left;
            border-left: 3px solid transparent;
        }

        .lc-response-card:hover,
        .lc-response-card:focus {
            background-color: #f0f7ff;
            border-color: #0a66c2;
            border-left-color: #0a66c2;
            box-shadow: 0 2px 8px rgba(10, 102, 194, 0.1);
            transform: translateY(-1px);
            outline: 2px solid #0a66c2;
            outline-offset: 2px;
        }

        .lc-response-card::after {
            content: "Click to copy";
            position: absolute;
            bottom: 8px;
            right: 8px;
            font-size: 0.8em;
            color: #999;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .lc-response-card:hover::after,
        .lc-response-card:focus::after {
            opacity: 1;
        }

        /* Error Message */
        .lc-error-message {
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #dc3545;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 0.85em;
            animation: lc-error-appear 0.3s ease-out;
        }

        @keyframes lc-error-appear {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        /* Responsive Design */
        @media screen and (max-width: 768px) {
            .lc-modal-content {
                margin: 10px;
                padding: 20px;
                max-width: calc(100vw - 20px);
            }
            
            .lc-response-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            .lc-modal-title {
                font-size: 1.2em;
                padding-right: 40px;
            }
            
            .lc-response-card {
                padding: 16px;
                font-size: 0.9em;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .lc-modal-content {
                background-color: #1e1e1e;
                color: #ffffff;
            }
            
            .lc-modal-title {
                color: #70b5f9;
            }
            
            .lc-modal-subtitle {
                color: #b0b7bf;
            }
            
            .lc-response-card {
                background-color: #2a2a2a;
                color: #ffffff;
                border-color: #444444;
            }
            
            .lc-response-card:hover,
            .lc-response-card:focus {
                background-color: #1a3a5c;
                border-color: #70b5f9;
                border-left-color: #70b5f9;
            }
            
            .lc-modal-close-btn {
                color: #b0b7bf;
            }
            
            .lc-modal-close-btn:hover,
            .lc-modal-close-btn:focus {
                color: #ffffff;
                background-color: #404040;
            }
        }

        /* High contrast support */
        @media (prefers-contrast: high) {
            .lc-modal-content {
                border: 2px solid #000000;
            }
            
            .lc-response-card {
                border: 2px solid #000000;
            }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .lc-modal-content {
                animation: none;
            }
            
            .lc-response-card {
                transition: none;
            }
            
            .lc-response-card:hover,
            .lc-response-card:focus {
                transform: none;
            }
        }
    `;
}

// Function to show "Copied!" message
function showCopiedMessage() {
    let copiedMessage = document.getElementById('lcCopiedMessage');
    if (!copiedMessage) {
        copiedMessage = document.createElement('div');
        copiedMessage.id = 'lcCopiedMessage';
        copiedMessage.classList.add('lc-copied-message');
        copiedMessage.textContent = '✓ Copied to clipboard!';
        document.body.appendChild(copiedMessage);
    }

    copiedMessage.classList.add('show');
    setTimeout(() => {
        copiedMessage.classList.remove('show');
    }, 2000);
}

// Add global ESC key listener for modal (works with Shadow DOM)
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modalHost = document.getElementById('lc-modal-host');
        if (modalHost) {
            modalHost.remove();
        }
    }
});

// Track active requests to handle multiple simultaneous operations
const activeRequests = new Map();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    try {
        const notification = initNotificationSystem();
        const requestId = request.requestId || 'default';
        
        if (request.action === 'copyToClipboard') {
            copyToClipboard(request.text)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('Clipboard error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            
            // Return true to indicate async response
            return true;
        }
        
        // Notification message handlers with request tracking
        if (request.action === 'showLoading') {
            activeRequests.set(requestId, { status: 'loading', timestamp: Date.now() });
            notification.show('Generating Comment', 'AI is creating your professional comment...', 'loading');
            sendResponse({ success: true });
        }
        
        if (request.action === 'showSuccess') {
            // Only show if this request is still active (prevents race conditions)
            if (activeRequests.has(requestId)) {
                activeRequests.set(requestId, { status: 'success', timestamp: Date.now() });
                notification.show('Comment Generated!', 'Your comment has been copied to clipboard', 'success');
                
                // Clean up after auto-dismiss
                setTimeout(() => activeRequests.delete(requestId), 3500);
            }
            sendResponse({ success: true });
        }
        
        if (request.action === 'showError') {
            const message = request.message || 'Failed to generate comment. Please try again.';
            if (activeRequests.has(requestId)) {
                activeRequests.set(requestId, { status: 'error', timestamp: Date.now() });
                notification.show('Error', message, 'error');
            }
            sendResponse({ success: true });
        }
        
        if (request.action === 'hideNotification') {
            activeRequests.delete(requestId);
            notification.hide();
            sendResponse({ success: true });
        }
        
        if (request.action === 'showMultipleResponses') {
            if (request.responses && request.responses.length > 0) {
                // Hide any existing loading notification first
                if (activeRequests.has(requestId)) {
                    notification.hide();
                }
                
                const promptName = request.promptName || 'Custom Prompt';
                showMultipleResponsesModal(request.responses, promptName);
                
                activeRequests.set(requestId, { status: 'modal_shown', timestamp: Date.now() });
                sendResponse({ success: true });
            } else {
                console.warn('No responses to display in modal.');
                // Show error notification if no responses
                notification.show('No Responses', 'No responses were generated. Please try again.', 'error');
                sendResponse({ success: false, error: 'No responses to display' });
            }
        }
        
    } catch (error) {
        console.error('Content script error:', error);
        sendResponse({ success: false, error: error.message });
    }
});

// Clean up old requests periodically (prevent memory leaks)
setInterval(() => {
    const now = Date.now();
    for (const [requestId, request] of activeRequests.entries()) {
        // Remove requests older than 5 minutes
        if (now - request.timestamp > 5 * 60 * 1000) {
            activeRequests.delete(requestId);
        }
    }
}, 60 * 1000); // Check every minute

// Function to copy text to clipboard
async function copyToClipboard(text) {
    try {
        // Method 1: Using the modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        
        // Method 2: Fallback using execCommand
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            // Using execCommand as fallback - deprecated but still widely supported
            // TODO: Modern browsers should use navigator.clipboard.writeText() instead
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('Copy command failed');
            }
        } finally {
            textArea.remove();
        }
    } catch (error) {
        throw new Error('Failed to copy to clipboard: ' + error.message);
    }
}

// Optional: Add visual feedback when comment is copied
function showCopyFeedback() {
    const feedback = document.createElement('div');
    feedback.textContent = '✓ Comment copied to clipboard!';
    feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #057642;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    // Remove after 3 seconds
    setTimeout(() => {
        feedback.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            feedback.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// Listen for successful clipboard operations
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.action === 'copyToClipboard') {
        copyToClipboard(request.text)
            .then(() => {
                showCopyFeedback();
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error('Clipboard error:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true;
    }
});

// Initialize notification system
setTimeout(() => {
    try {
        initNotificationSystem();
    } catch (error) {
        console.error('Error initializing notification system:', error);
    }
}, 1000);

// Test runtime connection
try {
    chrome.runtime.sendMessage({action: 'testConnection'}, () => {
        if (chrome.runtime.lastError) {
            console.error('Runtime connection failed:', chrome.runtime.lastError.message);
        }
    });
} catch (error) {
    console.error('Runtime connection exception:', error);
}