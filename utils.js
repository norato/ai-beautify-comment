// Utility functions for error handling and API operations

// Error types
const ErrorTypes = {
    API_KEY_MISSING: 'API_KEY_MISSING',
    API_KEY_INVALID: 'API_KEY_INVALID',
    NETWORK_ERROR: 'NETWORK_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    API_ERROR: 'API_ERROR',
    CLIPBOARD_ERROR: 'CLIPBOARD_ERROR',
    UNKNOWN: 'UNKNOWN'
};

// Error messages
const ErrorMessages = {
    [ErrorTypes.API_KEY_MISSING]: 'Please set your Gemini API key in the extension popup.',
    [ErrorTypes.API_KEY_INVALID]: 'Invalid API key. Please check your API key and try again.',
    [ErrorTypes.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
    [ErrorTypes.RATE_LIMIT]: 'Rate limit exceeded. Please wait a moment and try again.',
    [ErrorTypes.API_ERROR]: 'Gemini API error. Please try again later.',
    [ErrorTypes.CLIPBOARD_ERROR]: 'Failed to copy to clipboard. Please try again.',
    [ErrorTypes.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Retry configuration
const RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2
};

// Parse Gemini API error
function parseGeminiError(error) {
    if (!error.response) {
        return { type: ErrorTypes.NETWORK_ERROR, message: ErrorMessages[ErrorTypes.NETWORK_ERROR] };
    }
    
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
        case 400:
            if (data?.error?.message?.includes('API_KEY_INVALID')) {
                return { type: ErrorTypes.API_KEY_INVALID, message: ErrorMessages[ErrorTypes.API_KEY_INVALID] };
            }
            return { type: ErrorTypes.API_ERROR, message: data?.error?.message || ErrorMessages[ErrorTypes.API_ERROR] };
        case 401:
        case 403:
            return { type: ErrorTypes.API_KEY_INVALID, message: ErrorMessages[ErrorTypes.API_KEY_INVALID] };
        case 429:
            const retryAfter = error.response.headers?.['retry-after'];
            const message = retryAfter 
                ? `Rate limit exceeded. Please wait ${retryAfter} seconds.`
                : ErrorMessages[ErrorTypes.RATE_LIMIT];
            return { type: ErrorTypes.RATE_LIMIT, message, retryAfter };
        case 500:
        case 502:
        case 503:
            return { type: ErrorTypes.API_ERROR, message: 'Gemini service temporarily unavailable. Please try again.' };
        default:
            return { type: ErrorTypes.API_ERROR, message: data?.error?.message || ErrorMessages[ErrorTypes.API_ERROR] };
    }
}

// Legacy function for backward compatibility
function parseOpenAIError(error) {
    return parseGeminiError(error);
}

// Retry with exponential backoff
async function retryWithBackoff(fn, retries = RetryConfig.maxRetries) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors
            if (error.type === ErrorTypes.API_KEY_INVALID || 
                error.type === ErrorTypes.API_KEY_MISSING) {
                throw error;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                RetryConfig.baseDelay * Math.pow(RetryConfig.backoffFactor, i),
                RetryConfig.maxDelay
            );
            
            // If rate limited, use the retry-after header if available
            if (error.retryAfter) {
                await sleep(error.retryAfter * 1000);
            } else {
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

// Sleep utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Detect language from text
function detectLanguage(text) {
    // Simple language detection based on character patterns
    // This is a basic implementation - could be enhanced with a proper library
    
    const patterns = {
        'pt': /[àáâãçéêíóôõúüÀÁÂÃÇÉÊÍÓÔÕÚÜ]/,
        'es': /[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/,
        'fr': /[àâäæçèéêëîïôùûüÿÀÂÄÆÇÈÉÊËÎÏÔÙÛÜŸ]/,
        'de': /[äöüßÄÖÜẞ]/,
        'it': /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/,
        'ru': /[а-яА-ЯёЁ]/,
        'ja': /[ぁ-んァ-ヶー一-龠]/,
        'ko': /[가-힣]/,
        'zh': /[\u4e00-\u9fff]/,
        'ar': /[\u0600-\u06FF]/,
        'hi': /[\u0900-\u097F]/
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
            return lang;
        }
    }
    
    return 'en'; // Default to English
}

// Get language name from code
function getLanguageName(code) {
    const languages = {
        'pt': 'Portuguese',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'en': 'English'
    };
    
    return languages[code] || 'English';
}

// Storage management functions for custom prompts and settings
const SYNC_STORAGE_LIMIT_BYTES = 100 * 1024; // 100 KB

// Generate UUID v4 (simple implementation without external library)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get all settings from storage
async function getSettings() {
    try {
        const result = await chrome.storage.sync.get();
        
        // Check if we have the new structure
        if (result.customPrompts !== undefined) {
            return {
                apiKey: result.apiKey || '',
                customPrompts: result.customPrompts || [],
                defaultResponseCount: result.defaultResponseCount || 3,
                defaultBeautifyResponseCount: result.defaultBeautifyResponseCount || 3
            };
        }
        
        // Legacy structure - migrate
        return {
            apiKey: result.apiKey || '',
            customPrompts: [],
            defaultResponseCount: 3,
            defaultBeautifyResponseCount: 3
        };
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            apiKey: '',
            customPrompts: [],
            defaultResponseCount: 3,
            defaultBeautifyResponseCount: 3
        };
    }
}

// Save settings with storage limit validation
async function saveSettings(settings) {
    try {
        const settingsString = JSON.stringify(settings);
        const settingsSize = new TextEncoder().encode(settingsString).length;

        if (settingsSize > SYNC_STORAGE_LIMIT_BYTES) {
            const sizeMB = (settingsSize / 1024).toFixed(2);
            const limitMB = (SYNC_STORAGE_LIMIT_BYTES / 1024).toFixed(2);
            console.error(`Storage limit exceeded! Current size: ${sizeMB}KB. Max: ${limitMB}KB.`);
            throw new Error('Storage limit exceeded. Please reduce the number or length of your custom prompts.');
        }

        await chrome.storage.sync.set(settings);
        console.log('Settings saved successfully.');
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// Update settings partially
async function updateSettings(partialSettings) {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...partialSettings };
    await saveSettings(updatedSettings);
}

// Add a new custom prompt
async function addPrompt(promptData) {
    const currentSettings = await getSettings();
    
    // Limit to 5 custom prompts max
    if (currentSettings.customPrompts.length >= 5) {
        throw new Error('Maximum of 5 custom prompts allowed.');
    }
    
    const newPrompt = {
        id: generateUUID(),
        name: promptData.name || 'Unnamed Prompt',
        promptText: promptData.promptText || '',
        responseCount: promptData.responseCount || currentSettings.defaultResponseCount,
        enabled: promptData.enabled !== undefined ? promptData.enabled : true
    };
    
    currentSettings.customPrompts.push(newPrompt);
    await saveSettings(currentSettings);
    return newPrompt;
}

// Update an existing prompt
async function updatePrompt(id, updatedPromptData) {
    const currentSettings = await getSettings();
    const index = currentSettings.customPrompts.findIndex(p => p.id === id);
    
    if (index === -1) {
        console.warn(`Prompt with ID ${id} not found.`);
        return false;
    }
    
    currentSettings.customPrompts[index] = {
        ...currentSettings.customPrompts[index],
        ...updatedPromptData
    };
    
    await saveSettings(currentSettings);
    return true;
}

// Delete a prompt
async function deletePrompt(id) {
    const currentSettings = await getSettings();
    const originalLength = currentSettings.customPrompts.length;
    
    currentSettings.customPrompts = currentSettings.customPrompts.filter(p => p.id !== id);
    
    if (currentSettings.customPrompts.length === originalLength) {
        console.warn(`Prompt with ID ${id} not found.`);
        return false;
    }
    
    await saveSettings(currentSettings);
    return true;
}

// Get enabled prompts for context menu
async function getEnabledPrompts() {
    const settings = await getSettings();
    return settings.customPrompts.filter(p => p.enabled);
}

// Migration function for existing users
async function migrateStorage() {
    try {
        const result = await chrome.storage.sync.get();
        
        // Check if migration is needed
        if (result.customPrompts === undefined && result.apiKey !== undefined) {
            console.log('Migrating storage for existing user...');
            
            const migratedSettings = {
                apiKey: result.apiKey,
                customPrompts: [],
                defaultResponseCount: 3,
                defaultBeautifyResponseCount: 3
            };
            
            await saveSettings(migratedSettings);
            console.log('Storage migration completed successfully.');
            return true;
        } else if (result.customPrompts === undefined && result.apiKey === undefined) {
            // New installation
            console.log('Initializing storage for new installation...');
            
            const defaultSettings = {
                apiKey: '',
                customPrompts: [],
                defaultResponseCount: 3,
                defaultBeautifyResponseCount: 3
            };
            
            await saveSettings(defaultSettings);
            console.log('Storage initialized for new installation.');
            return true;
        }
        
        console.log('No storage migration needed.');
        return false;
    } catch (error) {
        console.error('Error during storage migration:', error);
        return false;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ErrorTypes,
        ErrorMessages,
        RetryConfig,
        parseGeminiError,
        parseOpenAIError,
        retryWithBackoff,
        sleep,
        detectLanguage,
        getLanguageName,
        // Storage functions
        getSettings,
        saveSettings,
        updateSettings,
        addPrompt,
        updatePrompt,
        deletePrompt,
        getEnabledPrompts,
        migrateStorage,
        generateUUID
    };
}