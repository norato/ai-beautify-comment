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
    [ErrorTypes.API_KEY_MISSING]: 'Please set your OpenAI API key in the extension popup.',
    [ErrorTypes.API_KEY_INVALID]: 'Invalid API key. Please check your API key and try again.',
    [ErrorTypes.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
    [ErrorTypes.RATE_LIMIT]: 'Rate limit exceeded. Please wait a moment and try again.',
    [ErrorTypes.API_ERROR]: 'OpenAI API error. Please try again later.',
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
        getLanguageName
    };
}