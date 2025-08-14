// Gemini API Service
// Handles all communication with Google's Gemini API

console.log('[🤖] AI Beautify Comment - Loading Gemini API service');

// Define the base endpoint for the Gemini API
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * A client for interacting with the Google Gemini API.
 * Encapsulates API key, endpoint, request execution, and basic error handling.
 */
class GeminiApiClient {
    /**
     * @param {string} apiKey - Your Google Gemini API key.
     * @throws {Error} If no API key is provided.
     */
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API Key is required for GeminiApiClient.');
        }
        this.apiKey = apiKey;
        console.log('[🤖] AI Beautify Comment - GeminiApiClient initialized');
    }

    /**
     * Internal helper to make the actual API fetch call.
     * Handles common headers, API key injection, and initial HTTP error checks.
     * @param {object} requestBody - The body of the request to send to the Gemini API.
     * @returns {Promise<object>} The parsed JSON response from the Gemini API.
     * @throws {Error} For network issues, HTTP errors, or API-specific errors.
     */
    async _callApi(requestBody) {
        console.log('[🤖] AI Beautify Comment - Making Gemini API call');
        
        // 🐛 DEBUG: Always log the complete request being sent to Gemini
        console.log('🤖 AI Beautify Comment - COMPLETE REQUEST TO GEMINI API:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(requestBody, null, 2));
        console.log('='.repeat(60));
        
        try {
            const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('[🤖] AI Beautify Comment - Gemini API response status:', response.status);

            if (!response.ok) {
                console.error('[🤖] AI Beautify Comment - Gemini API error, status:', response.status);
                // Attempt to parse API error message from response body
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                const error = new Error(`Gemini API error (${response.status}): ${errorData.error?.message || errorData.message || JSON.stringify(errorData)}`);
                error.status = response.status; // Attach status code for retry logic
                throw error;
            }

            const data = await response.json();
            
            // Check for API-specific errors embedded in the successful response payload
            if (data.error) {
                console.error('[🤖] AI Beautify Comment - Gemini API returned error:', data.error);
                throw new Error(`Gemini API returned error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            
            console.log('[🤖] AI Beautify Comment - Gemini API call successful');
            return data;
        } catch (error) {
            console.error('[🤖] AI Beautify Comment - Error during Gemini API call:', error);
            // Re-throw to allow calling functions to handle specific error types
            throw error;
        }
    }

    /**
     * Wrapper for API calls with retry logic and exponential backoff.
     * Retries on 503 (Service Unavailable) and 429 (Too Many Requests) errors.
     * @param {Function} apiCallFn - Function that makes the API call
     * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
     * @param {number} baseDelayMs - Base delay in milliseconds (default: 1000)
     * @returns {Promise<object>} The API response
     * @throws {Error} If all retry attempts fail
     */
    async _callApiWithRetry(apiCallFn, maxRetries = 5, baseDelayMs = 1000) {
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                return await apiCallFn();
            } catch (error) {
                // Check if error has status code and it's retryable (503 or 429)
                if (error.status && (error.status === 503 || error.status === 429)) {
                    if (retries >= maxRetries - 1) {
                        // Last retry failed, throw a user-friendly error
                        const userError = new Error('AI model is currently overloaded. Please try again in a few minutes.');
                        userError.status = error.status;
                        userError.originalError = error;
                        throw userError;
                    }
                    
                    // Calculate delay with exponential backoff + jitter
                    const delay = baseDelayMs * Math.pow(2, retries) + Math.random() * 300;
                    console.warn(`[🤖] AI Beautify Comment - API call failed with status ${error.status}. Retrying in ${delay.toFixed(0)}ms... (Attempt ${retries + 1}/${maxRetries})`);
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                } else {
                    // Non-retryable error, throw immediately
                    throw error;
                }
            }
        }
    }

    /**
     * Generates content using the Gemini API's generateContent endpoint.
     * This method directly maps to the API's expected request structure.
     * Prompt construction should happen before calling this.
     *
     * @param {Array<object>} contents - An array of content objects.
     * @param {object} [generationConfig={}] - Optional configuration for content generation.
     * @param {Array<object>} [safetySettings=[]] - Optional safety settings for content generation.
     * @returns {Promise<object>} The raw response object from the Gemini API.
     */
    async generateContent(contents, generationConfig = {}, safetySettings = []) {
        console.log('[🤖] AI Beautify Comment - Preparing Gemini request with config:', generationConfig);
        
        const requestBody = {
            contents: contents,
            generationConfig: generationConfig,
            safetySettings: safetySettings
        };
        
        // Use retry wrapper for API calls
        return this._callApiWithRetry(() => this._callApi(requestBody));
    }

    /**
     * Parses the raw Gemini API response to extract the main text content.
     * @param {object} response - The raw response object received from the Gemini API.
     * @returns {string} The extracted text content, or an empty string if not found.
     */
    parseTextResponse(response) {
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('[🤖] AI Beautify Comment - Parsed text response, length:', text.length);
        return text;
    }

    /**
     * Parses the raw Gemini API response to extract and parse JSON content.
     * Assumes JSON is either raw text or wrapped in a markdown code block.
     * @param {object} response - The raw response object received from the Gemini API.
     * @returns {object|null} The parsed JSON object, or null if parsing fails.
     */
    parseJsonResponse(response) {
        const text = this.parseTextResponse(response);
        if (text) {
            try {
                console.log('[🤖] AI Beautify Comment - Attempting to parse JSON response');
                // Attempt to extract JSON from a markdown code block first
                const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
                const jsonString = jsonMatch ? jsonMatch[1] : text;
                const parsed = JSON.parse(jsonString);
                console.log('[🤖] AI Beautify Comment - Successfully parsed JSON response');
                return parsed;
            } catch (e) {
                console.warn('[🤖] AI Beautify Comment - Could not parse Gemini JSON response:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Default generation config for the extension
     */
    static getDefaultConfig() {
        return {
            temperature: 0.8,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 500
        };
    }

    /**
     * Default safety settings for the extension
     */
    static getDefaultSafetySettings() {
        return [
            {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
        ];
    }
}

// Export for Chrome extension usage (service worker context)
if (typeof globalThis !== 'undefined') {
    globalThis.GeminiApiClient = GeminiApiClient;
}