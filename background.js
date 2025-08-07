// Service Worker for GPT LinkedIn Commenter

// Load utilities
importScripts('utils.js');

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener((details) => {
  console.log('GPT LinkedIn Commenter installed:', details.reason);
  
  // Initialize context menu
  createContextMenu();
  
  // Set default icon
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
  // Remove existing menus to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create the context menu
    chrome.contextMenus.create({
      id: "generateLinkedInComment",
      title: "Generate LinkedIn Comment",
      contexts: ["selection"],
      documentUrlPatterns: ["*://*.linkedin.com/*"]
    });
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
    // Get API key from storage
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    
    if (!apiKey) {
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    // Show loading notification immediately
    chrome.tabs.sendMessage(tab.id, {
      action: 'showLoading',
      requestId: requestId
    });
    
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
    
    // Handle different error types
    const errorMessage = error.message || ErrorMessages[error.type] || ErrorMessages[ErrorTypes.UNKNOWN];
    
    // Show error notification
    chrome.tabs.sendMessage(tab.id, {
      action: 'showError',
      message: errorMessage,
      requestId: requestId
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

// Function to call OpenAI API
async function generateComment(selectedText, apiKey) {
  // Detect language of the post
  const detectedLanguage = detectLanguage(selectedText);
  const languageName = getLanguageName(detectedLanguage);
  
  // Enhanced prompt with better instructions
  const systemPrompt = `You are a thoughtful LinkedIn professional who writes valuable comments that:
- Add meaningful insights or perspectives to the discussion
- Ask thoughtful questions when appropriate
- Share relevant experiences or examples
- Maintain a professional yet personable tone
- Show genuine engagement with the content
- Avoid generic responses like "Great post!" or "Thanks for sharing"
- Keep responses concise (2-3 sentences maximum)
- Match the language and cultural context of the original post`;

  const userPrompt = `Generate a professional LinkedIn comment for this post. The post appears to be in ${languageName}. Respond in the same language.

Post content: "${selectedText}"

Remember: Be specific, add value, and keep it concise.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.8, // Slightly higher for more creative responses
        max_tokens: 150,
        presence_penalty: 0.3, // Encourage diverse vocabulary
        frequency_penalty: 0.3 // Reduce repetition
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = parseOpenAIError({ 
        response: { 
          status: response.status, 
          data: errorData,
          headers: response.headers
        } 
      });
      throw error;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
    
  } catch (error) {
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

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === 'testConnection') {
    sendResponse({ success: true });
  }
  return true;
});