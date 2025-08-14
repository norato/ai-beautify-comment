// Popup script for AI Beautify Comment

// Prevent memory leaks by cleaning up listeners
let cleanupFunctions = [];
let currentPrompts = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Tab elements
    const apiKeyTabBtn = document.getElementById('apiKeyTabBtn');
    const customPromptsTabBtn = document.getElementById('customPromptsTabBtn');
    const apiKeyTabContent = document.getElementById('apiKeyTabContent');
    const customPromptsTabContent = document.getElementById('customPromptsTabContent');
    
    // API Key elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleVisibility = document.getElementById('toggleVisibility');
    const apiKeyForm = document.getElementById('apiKeyForm');
    const statusDiv = document.getElementById('status');
    
    // Custom Prompts elements
    const promptsList = document.getElementById('promptsList');
    const addPromptBtn = document.getElementById('addPromptBtn');
    const promptFormContainer = document.getElementById('promptFormContainer');
    const formTitle = document.getElementById('formTitle');
    const promptIdInput = document.getElementById('promptId');
    const promptNameInput = document.getElementById('promptName');
    const promptTextInput = document.getElementById('promptText');
    const responseCountInput = document.getElementById('responseCount');
    const promptEnabledCheckbox = document.getElementById('promptEnabled');
    const savePromptBtn = document.getElementById('savePromptBtn');
    const cancelPromptBtn = document.getElementById('cancelPromptBtn');
    const defaultResponseCountInput = document.getElementById('defaultResponseCount');
    const saveDefaultBtn = document.getElementById('saveDefaultBtn');
    const defaultBeautifyResponseCountInput = document.getElementById('defaultBeautifyResponseCount');
    const saveBeautifyBtn = document.getElementById('saveBeautifyBtn');
    const promptLimitMessage = document.querySelector('.prompt-limit-message');
    const noPromptsMessage = document.querySelector('.no-prompts-message');
    
    // Display update notification if available
    await displayUpdateNotification();
    
    // Initialize with settings
    await loadAndRenderSettings();
    
    // === TAB MANAGEMENT ===
    function showTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.getElementById(`${tabId}Btn`).classList.add('active');
        document.getElementById(`${tabId}Content`).classList.add('active');
    }
    
    apiKeyTabBtn.addEventListener('click', () => showTab('apiKeyTab'));
    customPromptsTabBtn.addEventListener('click', () => showTab('customPromptsTab'));
    
    // === SETTINGS LOADING AND RENDERING ===
    async function loadAndRenderSettings() {
        try {
            const settings = await getSettings();
            currentPrompts = settings.customPrompts || [];
            
            // Load API Key
            if (settings.apiKey) {
                apiKeyInput.value = settings.apiKey;
                showStatus('API key is saved and ready to use!', 'success');
            }
            
            // Load default response count
            defaultResponseCountInput.value = settings.defaultResponseCount || 3;
            defaultBeautifyResponseCountInput.value = settings.defaultBeautifyResponseCount || 3;
            
            // Render custom prompts
            renderCustomPrompts(currentPrompts);
            
        } catch (error) {
            console.error('Error loading settings:', error);
            showStatus('Error loading settings. Please refresh and try again.', 'error');
        }
    }
    
    function renderCustomPrompts(prompts) {
        promptsList.innerHTML = '';
        
        if (prompts.length === 0) {
            noPromptsMessage.style.display = 'block';
        } else {
            noPromptsMessage.style.display = 'none';
            prompts.forEach(prompt => {
                const promptElement = document.createElement('div');
                promptElement.classList.add('prompt-item');
                if (!prompt.enabled) promptElement.classList.add('disabled');
                promptElement.dataset.id = prompt.id;
                
                promptElement.innerHTML = `
                    <h4>
                        ${prompt.name}
                        <span class="prompt-status">${prompt.enabled ? 'Enabled' : 'Disabled'}</span>
                    </h4>
                    <div class="prompt-text">${prompt.promptText}</div>
                    <div class="prompt-meta">Responses: ${prompt.responseCount}</div>
                    <div class="prompt-actions">
                        <button class="edit-btn" data-id="${prompt.id}">Edit</button>
                        <button class="delete-btn" data-id="${prompt.id}">Delete</button>
                        <button class="toggle-btn" data-id="${prompt.id}">
                            ${prompt.enabled ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                `;
                promptsList.appendChild(promptElement);
            });
        }
        
        // Manage visibility of add button and limit message
        if (prompts.length >= 5) {
            addPromptBtn.style.display = 'none';
            promptLimitMessage.style.display = 'block';
        } else {
            addPromptBtn.style.display = 'block';
            promptLimitMessage.style.display = 'none';
        }
    }
    
    // === PROMPT FORM MANAGEMENT ===
    function showPromptForm(prompt = null) {
        promptFormContainer.style.display = 'block';
        addPromptBtn.style.display = 'none';
        promptLimitMessage.style.display = 'none';
        
        if (prompt) {
            formTitle.textContent = 'Edit Prompt';
            promptIdInput.value = prompt.id;
            promptNameInput.value = prompt.name;
            promptTextInput.value = prompt.promptText;
            responseCountInput.value = prompt.responseCount;
            promptEnabledCheckbox.checked = prompt.enabled;
        } else {
            formTitle.textContent = 'Add New Prompt';
            promptIdInput.value = '';
            promptNameInput.value = '';
            promptTextInput.value = '';
            responseCountInput.value = 3;
            promptEnabledCheckbox.checked = true;
        }
        
        // Focus on name input
        promptNameInput.focus();
    }
    
    function hidePromptForm() {
        promptFormContainer.style.display = 'none';
        if (currentPrompts.length < 5) {
            addPromptBtn.style.display = 'block';
        } else {
            promptLimitMessage.style.display = 'block';
        }
    }
    
    // === UTILITY FUNCTIONS ===
    async function getSettings() {
        // This will use the utils.js functions via importScripts in the background
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    // Fallback to direct chrome.storage access
                    chrome.storage.sync.get().then(resolve);
                }
            });
        });
    }
    
    async function savePrompt(promptData) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: promptData.id ? 'updatePrompt' : 'addPrompt',
                data: promptData
            }, (response) => {
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Failed to save prompt'));
                }
            });
        });
    }
    
    async function deletePromptById(id) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'deletePrompt',
                data: { id }
            }, (response) => {
                if (response && response.success) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to delete prompt'));
                }
            });
        });
    }
    
    async function updatePromptSettings(id, updates) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'updatePrompt',
                data: { id, ...updates }
            }, (response) => {
                if (response && response.success) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to update prompt'));
                }
            });
        });
    }
    
    // === EVENT LISTENERS ===
    
    // Toggle API key visibility
    toggleVisibility.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleVisibility.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        toggleVisibility.setAttribute('aria-label', 
            type === 'password' ? 'Show API key' : 'Hide API key'
        );
    });
    
    // Add prompt button
    addPromptBtn.addEventListener('click', () => showPromptForm());
    
    // Cancel prompt form
    cancelPromptBtn.addEventListener('click', hidePromptForm);
    
    // Save prompt form
    savePromptBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = promptNameInput.value.trim();
        const text = promptTextInput.value.trim();
        const responseCount = parseInt(responseCountInput.value);
        const enabled = promptEnabledCheckbox.checked;
        const id = promptIdInput.value;
        
        // Validation
        if (!name || !text) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (isNaN(responseCount) || responseCount < 1 || responseCount > 5) {
            alert('Number of responses must be between 1 and 5.');
            return;
        }
        
        try {
            const promptData = { name, promptText: text, responseCount, enabled };
            if (id) promptData.id = id;
            
            await savePrompt(promptData);
            hidePromptForm();
            await loadAndRenderSettings();
            
            // Update context menu
            chrome.runtime.sendMessage({ action: 'updateContextMenu' });
            
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Error saving prompt: ' + error.message);
        }
    });
    
    // Prompt list event delegation
    promptsList.addEventListener('click', async (event) => {
        const target = event.target;
        const promptId = target.dataset.id;
        
        if (!promptId) return;
        
        if (target.classList.contains('edit-btn')) {
            const prompt = currentPrompts.find(p => p.id === promptId);
            if (prompt) showPromptForm(prompt);
            
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this prompt?')) {
                try {
                    await deletePromptById(promptId);
                    await loadAndRenderSettings();
                    chrome.runtime.sendMessage({ action: 'updateContextMenu' });
                } catch (error) {
                    console.error('Error deleting prompt:', error);
                    alert('Error deleting prompt: ' + error.message);
                }
            }
            
        } else if (target.classList.contains('toggle-btn')) {
            try {
                const prompt = currentPrompts.find(p => p.id === promptId);
                if (prompt) {
                    await updatePromptSettings(promptId, { enabled: !prompt.enabled });
                    await loadAndRenderSettings();
                    chrome.runtime.sendMessage({ action: 'updateContextMenu' });
                }
            } catch (error) {
                console.error('Error toggling prompt:', error);
                alert('Error toggling prompt: ' + error.message);
            }
        }
    });
    
    // Save default response count
    saveDefaultBtn.addEventListener('click', async () => {
        const count = parseInt(defaultResponseCountInput.value);
        
        if (isNaN(count) || count < 1 || count > 5) {
            alert('Default response count must be between 1 and 5.');
            return;
        }
        
        try {
            chrome.runtime.sendMessage({ 
                action: 'updateSettings',
                data: { defaultResponseCount: count }
            }, (response) => {
                if (response && response.success) {
                    // Show temporary success message
                    const originalText = saveDefaultBtn.textContent;
                    saveDefaultBtn.textContent = 'Saved!';
                    saveDefaultBtn.disabled = true;
                    setTimeout(() => {
                        saveDefaultBtn.textContent = originalText;
                        saveDefaultBtn.disabled = false;
                    }, 2000);
                } else {
                    alert('Error saving default response count.');
                }
            });
        } catch (error) {
            console.error('Error saving default count:', error);
            alert('Error saving default response count: ' + error.message);
        }
    });

    // Save beautify response count
    saveBeautifyBtn.addEventListener('click', async () => {
        const count = parseInt(defaultBeautifyResponseCountInput.value);
        
        if (isNaN(count) || count < 1 || count > 5) {
            alert('AI Beautify response count must be between 1 and 5.');
            return;
        }
        
        try {
            chrome.runtime.sendMessage({ 
                action: 'updateSettings',
                data: { defaultBeautifyResponseCount: count }
            }, (response) => {
                if (response && response.success) {
                    // Show temporary success message
                    const originalText = saveBeautifyBtn.textContent;
                    saveBeautifyBtn.textContent = 'Saved!';
                    saveBeautifyBtn.disabled = true;
                    setTimeout(() => {
                        saveBeautifyBtn.textContent = originalText;
                        saveBeautifyBtn.disabled = false;
                    }, 2000);
                } else {
                    alert('Error saving AI Beautify response count.');
                }
            });
        } catch (error) {
            console.error('Error saving beautify count:', error);
            alert('Error saving AI Beautify response count: ' + error.message);
        }
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
        submitButton.innerHTML = 'Validating...<span class="spinner"></span>';
        
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
            showStatus('Connecting to Gemini API...', 'loading');
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout - API took too long to respond')), 10000)
            );
            
            const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (response.ok) {
                return true;
            } else if (response.status === 400) {
                showStatus('API key format is valid but request failed. This may be normal during validation.', 'error');
                return true; // Accept 400 as valid key format
            } else if (response.status === 401 || response.status === 403) {
                showStatus('Invalid or expired API key. Please check your key.', 'error');
                return false;
            } else {
                showStatus(`API responded with status ${response.status}. Please try again.`, 'error');
                return false;
            }
            
        } catch (error) {
            console.error('API validation error:', error);
            if (error.message.includes('timeout')) {
                showStatus('Connection timeout. Please check your internet connection and try again.', 'error');
            } else if (error.message.includes('Failed to fetch')) {
                showStatus('Unable to reach Gemini API. Please check your internet connection.', 'error');
            } else {
                showStatus('Network error: ' + error.message, 'error');
            }
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