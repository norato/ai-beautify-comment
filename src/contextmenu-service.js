// Context Menu Service
// Handles all Chrome context menu creation and management

console.log('[🤖] AI Beautify Comment - Loading Context Menu Service');

/**
 * Service responsible for managing Chrome extension context menus.
 * Handles creation, updates and dynamic menu generation based on custom prompts.
 */
class ContextMenuService {
    /**
     * @param {Function} getEnabledPromptsFn - Function to get enabled prompts from storage
     */
    constructor(getEnabledPromptsFn) {
        this.getEnabledPrompts = getEnabledPromptsFn;
        // Map to store prompt data by menu item ID for quick lookup on click
        this.customPromptMenuMap = new Map();
        console.log('[🤖] AI Beautify Comment - ContextMenuService initialized');
    }

    /**
     * Initializes and creates all context menus.
     * This should be called on extension startup and when menus need to be refreshed.
     */
    async initAndCreateMenus() {
        console.log('[🤖] AI Beautify Comment - Initializing and creating context menus');
        
        // Always remove all existing menus before recreating to ensure clean state
        await this._removeAllMenus();
        await this._createAllMenus();
        
        console.log('[🤖] AI Beautify Comment - Context menus created/updated successfully');
    }

    /**
     * Removes all existing context menus.
     * @private
     */
    async _removeAllMenus() {
        console.log('[🤖] AI Beautify Comment - Removing all existing context menus');
        
        return new Promise(resolve => {
            chrome.contextMenus.removeAll(() => {
                if (chrome.runtime.lastError) {
                    console.error('[🤖] AI Beautify Comment - Error removing context menus:', chrome.runtime.lastError);
                } else {
                    console.log('[🤖] AI Beautify Comment - Existing context menus cleared');
                }
                this.customPromptMenuMap.clear(); // Clear the map when menus are removed
                resolve();
            });
        });
    }

    /**
     * Creates all static and dynamic context menus.
     * @private
     */
    async _createAllMenus() {
        console.log('[🤖] AI Beautify Comment - Creating all context menus');
        
        // 1. Create Static Menus
        this._createStaticMenus();

        // 2. Add Dynamic Custom Prompt Menus
        await this._addCustomPromptMenus();
    }

    /**
     * Creates the predefined static context menu items.
     * @private
     */
    _createStaticMenus() {
        console.log('[🤖] AI Beautify Comment - Creating static context menus');
        
        // 1. AI Beautify (improve your own text) - positioned first
        chrome.contextMenus.create({
            id: 'beautifyText',
            title: 'AI Beautify (improve yours)',
            contexts: ['selection'],
            documentUrlPatterns: ['*://*/*']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[🤖] AI Beautify Comment - Error creating AI Beautify menu:', chrome.runtime.lastError);
            } else {
                console.log('[🤖] AI Beautify Comment - AI Beautify menu created');
            }
        });
        
        // 2. Visual separator
        chrome.contextMenus.create({
            id: 'separator1',
            type: 'separator',
            contexts: ['selection'],
            documentUrlPatterns: ['*://*/*']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[🤖] AI Beautify Comment - Error creating separator:', chrome.runtime.lastError);
            }
        });

        // 3. AI Comment (generate comments from content)
        chrome.contextMenus.create({
            id: 'generateProfessionalComment',
            title: 'AI Comment (default)',
            contexts: ['selection'],
            documentUrlPatterns: ['*://*/*']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[🤖] AI Beautify Comment - Error creating AI Comment menu:', chrome.runtime.lastError);
            } else {
                console.log('[🤖] AI Beautify Comment - AI Comment menu created');
            }
        });
    }

    /**
     * Fetches enabled custom prompts and adds them as dynamic context menu items.
     * @private
     */
    async _addCustomPromptMenus() {
        console.log('[🤖] AI Beautify Comment - Adding custom prompt menus');
        
        try {
            const enabledPrompts = await this.getEnabledPrompts();
            console.log('[🤖] AI Beautify Comment - Retrieved', enabledPrompts.length, 'enabled prompts');

            if (enabledPrompts && enabledPrompts.length > 0) {
                enabledPrompts.forEach(prompt => {
                    const menuItemId = `custom-prompt-${prompt.id}`;
                    
                    chrome.contextMenus.create({
                        id: menuItemId,
                        title: prompt.name,
                        contexts: ['selection'],
                        documentUrlPatterns: ['*://*/*']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error(`[🤖] AI Beautify Comment - Error creating custom prompt menu ${prompt.name}:`, chrome.runtime.lastError);
                        } else {
                            console.log(`[🤖] AI Beautify Comment - Custom prompt menu created: ${prompt.name}`);
                        }
                    });
                    
                    // Store the full prompt object for later retrieval by the click handler
                    this.customPromptMenuMap.set(menuItemId, prompt);
                });
                
                console.log('[🤖] AI Beautify Comment - Added', enabledPrompts.length, 'custom prompt menus');
            } else {
                console.log('[🤖] AI Beautify Comment - No custom prompts enabled to add to context menu');
            }
        } catch (error) {
            console.error('[🤖] AI Beautify Comment - Error fetching or creating custom prompt menus:', error);
        }
    }

    /**
     * Retrieves the full prompt data for a given custom prompt menu item ID.
     * This method is to be called by the background.js click handler.
     * @param {string} menuItemId - The ID of the clicked menu item.
     * @returns {object|undefined} The prompt data, or undefined if not found.
     */
    getPromptData(menuItemId) {
        const promptData = this.customPromptMenuMap.get(menuItemId);
        if (promptData) {
            console.log(`[🤖] AI Beautify Comment - Retrieved prompt data for: ${promptData.name}`);
        } else {
            console.warn(`[🤖] AI Beautify Comment - No prompt data found for menu item: ${menuItemId}`);
        }
        return promptData;
    }

    /**
     * Returns all currently stored custom prompt menu items.
     * Useful for debugging and management purposes.
     */
    getCustomPromptMenus() {
        return Array.from(this.customPromptMenuMap.entries()).map(([id, prompt]) => ({
            menuId: id,
            promptName: prompt.name,
            promptId: prompt.id
        }));
    }

    /**
     * Updates context menus when prompts change.
     * This is a convenience method that can be called from background.js.
     */
    async refreshMenus() {
        console.log('[🤖] AI Beautify Comment - Refreshing context menus due to changes');
        await this.initAndCreateMenus();
    }
}

// Export for Chrome extension usage (service worker context)
if (typeof globalThis !== 'undefined') {
    globalThis.ContextMenuService = ContextMenuService;
}