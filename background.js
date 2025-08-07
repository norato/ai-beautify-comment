// Service Worker for GPT LinkedIn Commenter

console.log('=== GPT LinkedIn Commenter Background Script Starting ===');

// Load utilities
try {
  importScripts('utils.js');
  console.log('✓ Utils.js loaded successfully');
} catch (error) {
  console.error('✗ Failed to load utils.js:', error);
}

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔄 Extension installed/updated:', details.reason);
  
  // Initialize context menu
  console.log('🎯 Creating context menu...');
  createContextMenu();
  
  // Set default icon
  console.log('🎨 Setting default icon...');
  chrome.action.setIcon({
    path: {
      "128": "icon.png"
    }
  });
  
  console.log('✅ Installation complete');
});

// Create context menu on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension startup - creating context menu...');
  createContextMenu();
});

// Function to create context menu
function createContextMenu() {
  console.log('🔧 Creating context menu...');
  
  // Remove existing menus to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    console.log('🧹 Cleared existing context menus');
    
    // Create the context menu
    try {
      chrome.contextMenus.create({
        id: "generateLinkedInComment",
        title: "Generate LinkedIn Comment",
        contexts: ["selection"],
        documentUrlPatterns: ["*://*.linkedin.com/*"]
      });
      console.log('✅ Context menu created successfully');
    } catch (error) {
      console.error('✗ Failed to create context menu:', error);
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('🖱️ Context menu clicked!');
  console.log('📋 Menu item ID:', info.menuItemId);
  console.log('📝 Selected text:', info.selectionText);
  console.log('🏷️ Tab info:', {
    id: tab.id,
    url: tab.url,
    title: tab.title
  });
  
  if (info.menuItemId === "generateLinkedInComment") {
    if (info.selectionText) {
      console.log('🚀 Starting comment generation...');
      handleCommentGeneration(info.selectionText, tab);
    } else {
      console.warn('⚠️ No text selected');
    }
  } else {
    console.warn('⚠️ Unknown menu item:', info.menuItemId);
  }
});

// Function to handle comment generation
async function handleCommentGeneration(selectedText, tab) {
  const requestId = Date.now().toString();
  console.log('🎬 handleCommentGeneration started');
  console.log('🔢 Request ID:', requestId);
  console.log('📄 Selected text length:', selectedText.length);
  
  try {
    console.log('🔑 Getting API key from storage...');
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    
    if (!apiKey) {
      console.error('❌ No API key found');
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    console.log('✅ API key found (length:', apiKey.length, ')');
    console.log('💬 About to send loading notification...');
    
    // Show loading notification immediately
    console.log('📨 Sending loading message to tab:', tab.id);
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId
      }, (response) => {
        console.log('📬 Loading message response:', response);
        if (chrome.runtime.lastError) {
          console.error('📵 Content script communication error:', chrome.runtime.lastError.message);
          console.log('🔄 Using fallback Chrome notification...');
          showFallbackNotification('Generating Comment', 'Please wait while we generate your comment...');
        } else {
          console.log('✅ Loading notification sent successfully');
        }
      });
    } catch (e) {
      console.error('💥 Exception sending loading notification:', e);
      console.log('🔄 Using fallback Chrome notification...');
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
  console.log('🤖 Calling Gemini API...');
  
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
    console.log('📡 Making request to Gemini API...');
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

    console.log('📊 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Gemini API error:', errorData);
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
    console.log('✅ Gemini API response received');
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      const generatedText = data.candidates[0].content.parts[0].text.trim();
      console.log('📝 Generated comment length:', generatedText.length);
      return generatedText;
    } else {
      console.error('❌ Unexpected Gemini response format:', data);
      throw {
        type: ErrorTypes.API_ERROR,
        message: 'Unexpected response format from Gemini API'
      };
    }
    
  } catch (error) {
    console.error('💥 Gemini API error:', error);
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