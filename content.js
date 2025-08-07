// Content script for GPT LinkedIn Commenter
// Handles clipboard operations and DOM interactions

// Base64 encoded icon (32x32)
const ICON_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyNCIgZmlsbD0iIzBBNjZDMiIvPjx0ZXh0IHg9IjIwIiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPmluPC90ZXh0PjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDY1LCA0NSkiPjxwYXRoIGQ9Ik0yNSAyQzMzLjgzNjYgMiA0MSA5LjE2MzQ0IDQxIDE4QzQxIDI2LjgzNjYgMzMuODM2NiAzNCAyNSAzNEMyMy44MzY5IDM0IDIyLjcwMjYgMzMuODc2NCAyMS42MDk0IDMzLjY0MDZMMTQUNSWEDR5VjMwLjE0MDZDMTA0NTY1IDI3LjM5OTUgOCAyMi45NjY4IDggMThDOCA5LjE2MzQ0IDE1LjE2MzQgMiAyNCAySC2NVoiIGZpbGw9IndoaXRlIiBzdHJva2U9IiMwQTY2QzIiIHN0cm9rZS13aWR0aD0iMiIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE2LCAxMCkiPjxwYXRoIGQ9Ik05IDBMMTAuNSAzTDEzLjUgNC41TDEwLjUgNkw5IDlMNy41IDZMNC41IDQuNUw3LjUgM0w5IDBaIiBmaWxsPSIjMEE2NkMyIi8+PHBhdGggZD0iTTQgN0w0Ljc1IDguNUw2LjI1IDkuMjVMNC43NSAxMEw0IDExLjVMMy4yNSAxMEwxLjc1IDkuMjVMMy4yNSA4LjVMNCA3WiIgZmlsbD0iIzBBNjZDMiIvPjxwYXRoIGQ9Ik0xMyA5TDEzLjUgMTBMMTQuNSAxMC41TDEzLjUgMTFMMTMgMTJMMTIuNSAxMUwxMS41IDEwLjVMMTIuNSAxMEwxMyA5WiIgZmlsbD0iIzBBNjZDMiIvPjwvZz48L2c+PC9zdmc+';

// Notification component
class LinkedInNotification {
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
        this.notification.id = 'gpt-linkedin-notification';
        this.notification.setAttribute('role', 'alert');
        this.notification.setAttribute('aria-live', 'polite');
        this.notification.setAttribute('aria-atomic', 'true');
        this.notification.setAttribute('tabindex', '-1');
        this.notification.innerHTML = `
            <div class="gpt-notification-header">
                <img src="${ICON_BASE64}" alt="GPT LinkedIn Commenter" class="gpt-notification-icon">
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
            #gpt-linkedin-notification {
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
            
            #gpt-linkedin-notification.gpt-show {
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
            
            /* Dynamic positioning based on LinkedIn layout */
            @media screen and (max-width: 768px) {
                #gpt-linkedin-notification {
                    top: 60px !important;
                    right: 10px !important;
                    left: 10px !important;
                    width: auto !important;
                    max-width: calc(100vw - 20px) !important;
                }
            }
            
            @media screen and (max-height: 600px) {
                #gpt-linkedin-notification {
                    top: 10px !important;
                }
            }
            
            /* Accessibility improvements */
            #gpt-linkedin-notification[aria-live] {
                position: fixed !important;
            }
            
            .gpt-notification-close:focus {
                outline: 2px solid #0a66c2 !important;
                outline-offset: 2px !important;
            }
            
            /* High contrast support */
            @media (prefers-contrast: high) {
                #gpt-linkedin-notification {
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
                #gpt-linkedin-notification,
                .gpt-spinner {
                    animation: none !important;
                    transition: opacity 0.1s !important;
                }
                
                #gpt-linkedin-notification.gpt-show {
                    transform: none !important;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                #gpt-linkedin-notification {
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
        
        // Show notification with enhanced animation
        this.notification.style.display = 'block';
        this.notification.style.animation = 'gpt-slideInFromRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
        
        setTimeout(() => {
            this.notification.classList.add('gpt-show');
            
            // Add pulse animation for loading state
            if (type === 'loading') {
                this.notification.style.animation += ', gpt-pulse 2s ease-in-out infinite';
            }
        }, 10);
        
        // Auto-hide for success messages
        if (type === 'success') {
            this.hideTimer = setTimeout(() => this.hide(), 3000);
        }
    }
    
    hide() {
        if (!this.notification) return;
        
        // Enhanced slide-out animation
        this.notification.style.animation = 'gpt-slideOutToRight 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards';
        this.notification.classList.remove('gpt-show');
        
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
        notificationSystem = new LinkedInNotification();
    }
    return notificationSystem;
}

// Track active requests to handle multiple simultaneous operations
const activeRequests = new Map();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    try {
        console.log('GPT LinkedIn: Message received:', request);
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
            console.log('GPT LinkedIn: Showing loading notification');
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

console.log('=== GPT LinkedIn Commenter Content Script Starting ===');
console.log('🌍 Current URL:', window.location.href);
console.log('📄 Document ready state:', document.readyState);
console.log('⏰ Load timestamp:', new Date().toISOString());

// Test notification system on load
setTimeout(() => {
    console.log('🧪 Testing notification system initialization...');
    try {
        const testNotification = initNotificationSystem();
        console.log('✅ Notification system initialized:', !!testNotification);
        
        if (testNotification && testNotification.notification) {
            console.log('🎯 Notification element created successfully');
        } else {
            console.error('❌ Failed to create notification element');
        }
    } catch (error) {
        console.error('💥 Error initializing notification system:', error);
    }
}, 1000);

// Add runtime connection test
try {
    chrome.runtime.sendMessage({action: 'testConnection'}, (response) => {
        if (chrome.runtime.lastError) {
            console.error('📵 Runtime connection failed:', chrome.runtime.lastError.message);
        } else {
            console.log('✅ Runtime connection successful:', response);
        }
    });
} catch (error) {
    console.error('💥 Runtime connection exception:', error);
}