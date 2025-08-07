// Popup script for GPT LinkedIn Commenter

// Prevent memory leaks by cleaning up listeners
let cleanupFunctions = [];

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleVisibility = document.getElementById('toggleVisibility');
    const apiKeyForm = document.getElementById('apiKeyForm');
    const statusDiv = document.getElementById('status');
    
    // Display update notification if available
    await displayUpdateNotification();
    
    // Load existing API key
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    if (apiKey) {
        apiKeyInput.value = apiKey;
        showStatus('API key is saved and ready to use!', 'success');
    }
    
    // Toggle API key visibility
    toggleVisibility.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleVisibility.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        toggleVisibility.setAttribute('aria-label', 
            type === 'password' ? 'Show API key' : 'Hide API key'
        );
    });
    
    // Handle form submission
    apiKeyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        
        // Basic validation
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }
        
        if (!apiKey.startsWith('AIzaSy')) {
            showStatus('Invalid API key format. Gemini API keys start with "AIzaSy"', 'error');
            return;
        }
        
        // Show loading state
        showStatus('Validating API key...', 'loading');
        const submitButton = apiKeyForm.querySelector('.save-btn');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Validating<span class="spinner"></span>';
        
        try {
            // Test the API key with a minimal request
            const isValid = await validateApiKey(apiKey);
            
            if (isValid) {
                // Save to chrome.storage
                await chrome.storage.sync.set({ apiKey });
                showStatus('<span class="checkmark"></span>API key saved successfully!', 'success');
                
                // Notify background script
                chrome.runtime.sendMessage({ action: 'apiKeyUpdated' });
            } else {
                showStatus('Invalid API key. Please check and try again.', 'error');
            }
        } catch (error) {
            showStatus('Error validating API key: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
    
    // Function to show status messages
    function showStatus(message, type) {
        statusDiv.innerHTML = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    // Function to validate API key
    async function validateApiKey(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Hello'
                        }]
                    }]
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('API validation error:', error);
            return false;
        }
    }
    
    // Function to display update notification
    async function displayUpdateNotification() {
        const updateBanner = document.getElementById('update-banner');
        if (!updateBanner) return;

        try {
            const result = await chrome.storage.local.get('updateInfo');
            if (result.updateInfo) {
                updateBanner.innerHTML = `
                    <strong>📦 Update Available!</strong><br>
                    Version ${result.updateInfo.version} is now available.
                    <a href="${result.updateInfo.release_url}" target="_blank" style="color: #0a66c2; text-decoration: underline;">Download Now</a>
                `;
                updateBanner.style.display = 'block';
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }
    
    // Cleanup function for memory leak prevention
    cleanupFunctions.push(() => {
        toggleVisibility.removeEventListener('click', toggleVisibility.onclick);
        apiKeyForm.removeEventListener('submit', apiKeyForm.onsubmit);
    });
});

// Clean up on unload
window.addEventListener('unload', () => {
    cleanupFunctions.forEach(cleanup => cleanup());
});