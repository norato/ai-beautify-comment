// Popup script for GPT LinkedIn Commenter

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleVisibility = document.getElementById('toggleVisibility');
    const apiKeyForm = document.getElementById('apiKeyForm');
    const statusDiv = document.getElementById('status');
    
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
        
        if (!apiKey.startsWith('sk-')) {
            showStatus('Invalid API key format. It should start with "sk-"', 'error');
            return;
        }
        
        // Show loading state
        showStatus('Validating API key...', 'loading');
        const submitButton = apiKeyForm.querySelector('.save-btn');
        submitButton.disabled = true;
        
        try {
            // Test the API key with a minimal request
            const isValid = await validateApiKey(apiKey);
            
            if (isValid) {
                // Save to chrome.storage
                await chrome.storage.sync.set({ apiKey });
                showStatus('API key saved successfully!', 'success');
                
                // Notify background script
                chrome.runtime.sendMessage({ action: 'apiKeyUpdated' });
            } else {
                showStatus('Invalid API key. Please check and try again.', 'error');
            }
        } catch (error) {
            showStatus('Error validating API key: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
    
    // Function to show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
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
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('API validation error:', error);
            return false;
        }
    }
});