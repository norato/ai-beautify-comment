// Content script for GPT LinkedIn Commenter
// Handles clipboard operations and DOM interactions

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
});

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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

console.log('GPT LinkedIn Commenter content script loaded');