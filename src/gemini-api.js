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
                throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || errorData.message || JSON.stringify(errorData)}`);
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
        
        return this._callApi(requestBody);
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