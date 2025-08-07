// Service Worker for GPT LinkedIn Commenter

// Load utilities
try {
  importScripts('utils.js');
} catch (error) {
  console.error('Failed to load utils.js:', error);
}

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener((details) => {
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

// Function to create context menu
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    try {
      chrome.contextMenus.create({
        id: "generateLinkedInComment",
        title: "Generate LinkedIn Comment",
        contexts: ["selection"],
        documentUrlPatterns: ["*://*.linkedin.com/*"]
      });
    } catch (error) {
      console.error('Failed to create context menu:', error);
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateLinkedInComment" && info.selectionText) {
    handleCommentGeneration(info.selectionText, tab);
  }
});

// Function to handle comment generation
async function handleCommentGeneration(selectedText, tab) {
  const requestId = Date.now().toString();
  
  try {
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    
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

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === 'testConnection') {
    sendResponse({ success: true });
  }
  return true;
});