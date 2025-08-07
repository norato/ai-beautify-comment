// Service Worker for GPT LinkedIn Commenter

// Load utilities
try {
  importScripts('utils.js');
} catch (error) {
  console.error('Failed to load utils.js:', error);
}

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize or migrate storage based on installation type
  if (details.reason === 'install') {
    console.log('Extension installed - initializing storage');
    await migrateStorage();
  } else if (details.reason === 'update') {
    console.log('Extension updated - checking for storage migration');
    await migrateStorage();
  }
  
  createContextMenu();
  
  chrome.action.setIcon({
    path: {
      "128": "icon.png"
    }
  });
});

// Create context menu on startup
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// Function to create context menu with dynamic custom prompts
async function createContextMenu() {
  chrome.contextMenus.removeAll(async () => {
    try {
      // Always add the default option
      chrome.contextMenus.create({
        id: "generateLinkedInComment",
        title: "Generate LinkedIn Comment (Default)",
        contexts: ["selection"],
        documentUrlPatterns: ["*://*.linkedin.com/*"]
      });
      
      // Add custom prompts as menu items
      const enabledPrompts = await getEnabledPrompts();
      enabledPrompts.forEach((prompt) => {
        try {
          chrome.contextMenus.create({
            id: `custom-prompt-${prompt.id}`,
            title: prompt.name,
            contexts: ["selection"],
            documentUrlPatterns: ["*://*.linkedin.com/*"]
          });
        } catch (error) {
          console.error(`Failed to create menu item for prompt ${prompt.name}:`, error);
        }
      });
      
    } catch (error) {
      console.error('Failed to create context menu:', error);
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;
  
  if (info.menuItemId === "generateLinkedInComment") {
    // Default prompt
    handleCommentGeneration(info.selectionText, tab);
  } else if (info.menuItemId.startsWith("custom-prompt-")) {
    // Custom prompt
    const promptId = info.menuItemId.replace("custom-prompt-", "");
    handleCustomPromptGeneration(info.selectionText, tab, promptId);
  }
});

// Function to handle custom prompt generation with multiple responses
async function handleCustomPromptGeneration(selectedText, tab, promptId) {
  const requestId = Date.now().toString();
  
  try {
    const settings = await getSettings();
    const { apiKey } = settings;
    
    if (!apiKey) {
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    // Find the custom prompt
    const customPrompt = settings.customPrompts.find(p => p.id === promptId);
    if (!customPrompt) {
      throw new Error('Custom prompt not found');
    }
    
    // Show loading notification
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId,
        message: `Generating ${customPrompt.responseCount} responses...`
      }, (response) => {
        if (chrome.runtime.lastError) {
          showFallbackNotification('Generating Responses', `Please wait while we generate ${customPrompt.responseCount} responses...`);
        }
      });
    } catch (e) {
      console.error('Exception sending loading notification:', e);
      showFallbackNotification('Generating Responses', `Please wait while we generate ${customPrompt.responseCount} responses...`);
    }
    
    // Generate multiple comments
    const responses = await generateMultipleComments(selectedText, apiKey, customPrompt);
    
    // Send responses to content script for display
    chrome.tabs.sendMessage(tab.id, {
      action: 'showMultipleResponses',
      responses: responses,
      requestId: requestId,
      promptName: customPrompt.name
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Tab communication error:', chrome.runtime.lastError);
        showFallbackNotification('Error', 'Failed to display responses');
      }
    });
    
  } catch (error) {
    console.error('Error generating custom prompt responses:', error);
    
    let errorMessage;
    if (error && error.message) {
      errorMessage = error.message;
    } else if (error && error.type && ErrorMessages[error.type]) {
      errorMessage = ErrorMessages[error.type];
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = ErrorMessages[ErrorTypes.UNKNOWN];
    }
    
    // Show error notification
    chrome.tabs.sendMessage(tab.id, {
      action: 'showError',
      message: errorMessage,
      requestId: requestId
    }, (_) => {
      if (chrome.runtime.lastError) {
        showFallbackNotification('Error', errorMessage);
      }
    });
  }
}

// Function to handle comment generation
async function handleCommentGeneration(selectedText, tab) {
  const requestId = Date.now().toString();
  
  try {
    const settings = await getSettings();
    const { apiKey } = settings;
    
    if (!apiKey) {
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    // Show loading notification immediately
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId
      }, (response) => {
        if (chrome.runtime.lastError) {
          showFallbackNotification('Generating Comment', 'Please wait while we generate your comment...');
        }
      });
    } catch (e) {
      console.error('Exception sending loading notification:', e);
      showFallbackNotification('Generating Comment', 'Please wait while we generate your comment...');
    }
    
    // Generate comment using OpenAI API with retry logic
    const comment = await retryWithBackoff(() => 
      generateComment(selectedText, apiKey)
    );
    
    // Send comment to content script for clipboard
    chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      text: comment,
      requestId: requestId
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('Tab communication error:', chrome.runtime.lastError);
        await showFallbackNotification('Error', 'Failed to copy comment to clipboard');
        return;
      }
      
      if (response && response.success) {
        // Show success notification
        chrome.tabs.sendMessage(tab.id, {
          action: 'showSuccess',
          requestId: requestId
        }, (_) => {
          if (chrome.runtime.lastError) {
            showFallbackNotification('Comment Generated!', 'The comment has been copied to your clipboard.');
          }
        });
      } else {
        throw { 
          type: ErrorTypes.CLIPBOARD_ERROR, 
          message: ErrorMessages[ErrorTypes.CLIPBOARD_ERROR] 
        };
      }
    });
    
  } catch (error) {
    console.error('Error generating comment:', error);
    
    // Handle different error types with proper serialization
    let errorMessage;
    if (error && error.message) {
      errorMessage = error.message;
    } else if (error && error.type && ErrorMessages[error.type]) {
      errorMessage = ErrorMessages[error.type];
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = ErrorMessages[ErrorTypes.UNKNOWN];
    }
    
    // Show error notification
    chrome.tabs.sendMessage(tab.id, {
      action: 'showError',
      message: errorMessage,
      requestId: requestId
    }, (_) => {
      if (chrome.runtime.lastError) {
        showFallbackNotification('Error', errorMessage);
      }
    });
  }
}

// Helper function to send notification with Chrome notification fallback
async function sendNotificationWithFallback(tabId, message, fallbackTitle, fallbackMessage) {
  try {
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
    
    // If content script didn't respond or failed, use Chrome notification
    if (!response || !response.success) {
      await showFallbackNotification(fallbackTitle, fallbackMessage);
    }
  } catch (error) {
    console.error('Notification error:', error);
    await showFallbackNotification(fallbackTitle, fallbackMessage);
  }
}

// Helper function to show Chrome notification as fallback
async function showFallbackNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: title,
      message: message
    });
  } catch (error) {
    console.error('Fallback notification error:', error);
  }
}

// Function to generate multiple comments in parallel
async function generateMultipleComments(selectedText, apiKey, customPrompt) {
  const numResponses = customPrompt.responseCount;
  const promises = [];
  
  // Create promises for parallel API calls
  for (let i = 0; i < numResponses; i++) {
    promises.push(generateCommentWithCustomPrompt(selectedText, apiKey, customPrompt));
  }
  
  try {
    // Wait for all responses or handle partial failures
    const results = await Promise.allSettled(promises);
    const successfulResponses = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    if (successfulResponses.length === 0) {
      throw new Error('Failed to generate any responses');
    }
    
    // If we got some but not all responses, log the failures
    const failedCount = results.length - successfulResponses.length;
    if (failedCount > 0) {
      console.warn(`${failedCount} out of ${numResponses} API calls failed`);
    }
    
    return successfulResponses;
  } catch (error) {
    console.error('Error generating multiple comments:', error);
    throw error;
  }
}

// Function to call Gemini API with custom prompt
async function generateCommentWithCustomPrompt(selectedText, apiKey, customPrompt) {
  // Detect language of the post
  const detectedLanguage = detectLanguage(selectedText);
  const languageName = getLanguageName(detectedLanguage);
  
  // Construct prompt with custom text
  const fullPrompt = `${customPrompt.promptText}

Guidelines:
- The post appears to be in ${languageName} - respond in the same language
- Keep responses concise (2-3 sentences maximum)
- Be specific, add value, and keep it authentic

Post content: "${selectedText}"

Generate only the comment text, without any additional explanation or formatting.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 150,
        },
        safetySettings: [
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
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = parseGeminiError({
        response: {
          status: response.status,
          data: errorData,
          headers: response.headers
        }
      });
      throw error;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      const generatedText = data.candidates[0].content.parts[0].text.trim();
      return generatedText;
    } else {
      console.error('Unexpected Gemini response format:', data);
      throw {
        type: ErrorTypes.API_ERROR,
        message: 'Unexpected response format from Gemini API'
      };
    }
    
  } catch (error) {
    console.error('Gemini API error:', error);
    // If it's already a parsed error, throw it
    if (error.type) {
      throw error;
    }
    // Otherwise, wrap it as a network error
    throw { 
      type: ErrorTypes.NETWORK_ERROR, 
      message: ErrorMessages[ErrorTypes.NETWORK_ERROR] 
    };
  }
}

// Function to call Gemini API
async function generateComment(selectedText, apiKey) {
  // Detect language of the post
  const detectedLanguage = detectLanguage(selectedText);
  const languageName = getLanguageName(detectedLanguage);
  
  // Enhanced prompt optimized for Gemini
  const prompt = `You are a thoughtful LinkedIn professional. Generate a professional LinkedIn comment for the following post. 

Guidelines:
- Add meaningful insights or perspectives to the discussion
- Ask thoughtful questions when appropriate
- Share relevant experiences or examples when fitting
- Maintain a professional yet personable tone
- Show genuine engagement with the content
- Avoid generic responses like "Great post!" or "Thanks for sharing"
- Keep responses concise (2-3 sentences maximum)
- The post appears to be in ${languageName} - respond in the same language
- Be specific, add value, and keep it authentic

Post content: "${selectedText}"

Generate only the comment text, without any additional explanation or formatting.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 150,
        },
        safetySettings: [
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
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = parseGeminiError({
        response: {
          status: response.status,
          data: errorData,
          headers: response.headers
        }
      });
      throw error;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      const generatedText = data.candidates[0].content.parts[0].text.trim();
      return generatedText;
    } else {
      console.error('Unexpected Gemini response format:', data);
      throw {
        type: ErrorTypes.API_ERROR,
        message: 'Unexpected response format from Gemini API'
      };
    }
    
  } catch (error) {
    console.error('Gemini API error:', error);
    // If it's already a parsed error, throw it
    if (error.type) {
      throw error;
    }
    // Otherwise, wrap it as a network error
    throw { 
      type: ErrorTypes.NETWORK_ERROR, 
      message: ErrorMessages[ErrorTypes.NETWORK_ERROR] 
    };
  }
}

// Update checker system
const GITHUB_VERSION_URL = 'https://raw.githubusercontent.com/norato/gpt-linkedIn-commenter/main/version.json';
const UPDATE_CHECK_ALARM = 'update-check-alarm';

// Check for updates on startup and schedule periodic checks
chrome.runtime.onStartup.addListener(checkForUpdates);
chrome.runtime.onInstalled.addListener(scheduleUpdateCheck);

function scheduleUpdateCheck() {
  // Check once a day
  chrome.alarms.create(UPDATE_CHECK_ALARM, {
    periodInMinutes: 60 * 24 
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_CHECK_ALARM) {
    checkForUpdates();
  }
});

// Robust version comparison function
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  try {
    const response = await fetch(GITHUB_VERSION_URL, { cache: 'no-cache' });
    if (!response.ok) {
      console.warn("Update check failed: Network response was not ok.");
      return;
    }

    const latestVersionInfo = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;

    if (compareVersions(latestVersionInfo.version, currentVersion) > 0) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
      chrome.action.setTitle({ title: `Update available: v${latestVersionInfo.version}` });
      chrome.storage.local.set({ updateInfo: latestVersionInfo });
    } else {
      // Clear badge if user is up to date
      chrome.action.setBadgeText({ text: '' });
      chrome.storage.local.remove('updateInfo');
    }
  } catch (error) {
    console.warn("Update check failed:", error);
  }
}

// Function to update context menu when prompts change
async function updateContextMenu() {
  await createContextMenu();
}

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === 'testConnection') {
    sendResponse({ success: true });
  } else if (request.action === 'updateContextMenu') {
    // Popup requests menu update after prompt changes
    updateContextMenu().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error updating context menu:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'getSettings') {
    // Popup requests current settings
    getSettings().then((settings) => {
      sendResponse({ success: true, data: settings });
    }).catch((error) => {
      console.error('Error getting settings:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (request.action === 'addPrompt') {
    // Popup requests to add a new prompt
    addPrompt(request.data).then((newPrompt) => {
      sendResponse({ success: true, data: newPrompt });
    }).catch((error) => {
      console.error('Error adding prompt:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (request.action === 'updatePrompt') {
    // Popup requests to update an existing prompt
    updatePrompt(request.data.id, request.data).then((success) => {
      sendResponse({ success: success });
    }).catch((error) => {
      console.error('Error updating prompt:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (request.action === 'deletePrompt') {
    // Popup requests to delete a prompt
    deletePrompt(request.data.id).then((success) => {
      sendResponse({ success: success });
    }).catch((error) => {
      console.error('Error deleting prompt:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (request.action === 'updateSettings') {
    // Popup requests to update global settings
    updateSettings(request.data).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error updating settings:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  return true;
});