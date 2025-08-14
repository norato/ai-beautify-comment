// Service Worker for AI Beautify Comment

// Load utilities and API service
try {
  importScripts('utils.js');
  importScripts('gemini-api.js');
} catch (error) {
  console.error('Failed to load scripts:', error);
}

// TypeScript declarations for imported functions (loaded via importScripts)
/* global getEnabledPrompts, getSettings, addPrompt, updatePrompt, deletePrompt, updateSettings, migrateStorage, ErrorTypes, ErrorMessages, parseGeminiError, GeminiApiClient */

// Extension lifecycle handlers
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🤖 AI Beautify Comment - Extension lifecycle event:', details.reason);
  
  // Initialize or migrate storage based on installation type
  if (details.reason === 'install') {
    console.log('🤖 AI Beautify Comment - Extension installed, initializing storage');
    await migrateStorage();
  } else if (details.reason === 'update') {
    console.log('🤖 AI Beautify Comment - Extension updated, checking for storage migration');
    await migrateStorage();
  }
  
  console.log('🤖 AI Beautify Comment - Creating context menu');
  await createContextMenu();
  
  chrome.action.setIcon({
    path: {
      '128': 'icon.png'
    }
  });
});

// Create context menu on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('🤖 AI Beautify Comment - Extension startup, recreating context menu');
  await createContextMenu();
});

// Function to create context menu with dynamic custom prompts
async function createContextMenu() {
  console.log('🤖 AI Beautify Comment - Starting context menu creation');
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(async () => {
      console.log('🤖 AI Beautify Comment - Removed existing context menus');
      try {
        // 1. AI Beautify (improve your own text) - positioned first
        chrome.contextMenus.create({
          id: 'beautifyText',
          title: 'AI Beautify (improve yours)',
          contexts: ['selection'],
          documentUrlPatterns: ['*://*/*']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error creating AI Beautify menu:', chrome.runtime.lastError);
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
            console.error('Error creating separator:', chrome.runtime.lastError);
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
            console.error('Error creating AI Comment menu:', chrome.runtime.lastError);
          }
        });
        
        // 4. Add custom prompts as additional comment options
        try {
          const enabledPrompts = await getEnabledPrompts();
          enabledPrompts.forEach((prompt) => {
            chrome.contextMenus.create({
              id: `custom-prompt-${prompt.id}`,
              title: prompt.name,
              contexts: ['selection'],
              documentUrlPatterns: ['*://*/*']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Error creating custom prompt menu ${prompt.name}:`, chrome.runtime.lastError);
              }
            });
          });
        } catch (error) {
          console.error('Error getting enabled prompts:', error);
        }
        
        resolve();
      } catch (error) {
        console.error('Failed to create context menu:', error);
        resolve();
      }
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('🤖 AI Beautify Comment - Context menu clicked:', info.menuItemId, 'on tab:', tab.id);
  
  if (!info.selectionText) {
    console.log('🤖 AI Beautify Comment - No text selected, ignoring click');
    return;
  }
  
  console.log('🤖 AI Beautify Comment - Selected text length:', info.selectionText.length);
  
  // Show immediate visual loading indicator
  const requestId = Date.now().toString();
  console.log('🤖 AI Beautify Comment - Generated request ID:', requestId);
  
  try {
    console.log('🤖 AI Beautify Comment - Showing loading indicator');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showLoadingIndicator,
      args: [chrome.runtime.getURL('icon.png')]
    });
  } catch (e) {
    console.warn('🤖 AI Beautify Comment - Could not show visual loading indicator:', e);
    // Fallback to notification if scripting fails
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId,
        message: 'AI is working...'
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Could not show loading notification fallback:', chrome.runtime.lastError);
        }
      });
    } catch (fallbackError) {
      console.warn('Could not show loading fallback:', fallbackError);
    }
  }
  
  if (info.menuItemId === 'generateProfessionalComment') {
    console.log('🤖 AI Beautify Comment - Handling default comment generation');
    handleCommentGeneration(info.selectionText, tab, requestId);
  } else if (info.menuItemId === 'beautifyText') {
    console.log('🤖 AI Beautify Comment - Handling text beautification');
    handleTextBeautification(info.selectionText, tab, requestId);
  } else if (info.menuItemId.startsWith('custom-prompt-')) {
    const promptId = info.menuItemId.replace('custom-prompt-', '');
    console.log('🤖 AI Beautify Comment - Handling custom prompt:', promptId);
    handleCustomPromptGeneration(info.selectionText, tab, promptId, requestId);
  }
});

// Function to handle text beautification
async function handleTextBeautification(selectedText, tab, requestId = null) {
  console.log('🤖 AI Beautify Comment - Starting text beautification, request ID:', requestId);
  
  if (!requestId) {
    requestId = Date.now().toString();
  }
  
  try {
    console.log('🤖 AI Beautify Comment - Getting settings for beautification');
    const settings = await getSettings();
    const { apiKey, defaultBeautifyResponseCount = 3 } = settings;
    
    console.log('🤖 AI Beautify Comment - Response count for beautification:', defaultBeautifyResponseCount);
    
    if (!apiKey) {
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    // Update loading notification with specific response count
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId,
        message: `Beautifying text with ${defaultBeautifyResponseCount} response${defaultBeautifyResponseCount > 1 ? 's' : ''}...`
      });
    } catch (e) {
      console.warn('Could not update loading notification:', e);
    }
    
    // Create a pseudo custom prompt for beautify behavior to reuse existing multi-response logic
    const beautifyPrompt = {
      name: 'AI Text Beautifier',
      promptText: 'Improve and enhance the following text to make it more professional, clear, and engaging. Maintain the original meaning while improving grammar, style, and flow. IMPORTANT: Respond in the same language as the input text.',
      responseCount: defaultBeautifyResponseCount
    };
    
    // Generate multiple beautified versions using the same logic as custom prompts
    console.log('🤖 AI Beautify Comment - Calling API for text beautification');
    const responses = await generateMultipleComments(selectedText, apiKey, beautifyPrompt);
    console.log('🤖 AI Beautify Comment - Received', responses.length, 'beautified responses');
    
    // Handle response based on count: auto-replace for 1, show modal for multiple
    if (defaultBeautifyResponseCount === 1) {
      // Auto-replace single response in place
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: replaceSelectedTextInPlace,
          args: [responses[0]]
        });

        // Hide visual loading indicator
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: hideLoadingIndicator
          });
        } catch (e) {
          console.warn('Could not hide visual loading indicator:', e);
        }

        if (results && results[0] && results[0].result) {
          const result = results[0].result;
          
          if (result.success && result.method === 'replace_in_place') {
            // Text was successfully replaced in place
            chrome.tabs.sendMessage(tab.id, {
              action: 'showSuccess',
              requestId: requestId
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Could not show success notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                showFallbackNotification('Text Beautified!', 'Your text has been improved in place.');
              }
            });
          } else {
            // Text was copied to clipboard as fallback
            chrome.tabs.sendMessage(tab.id, {
              action: 'showSuccess',
              requestId: requestId
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`Could not show success notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                let message = 'The improved text has been copied to your clipboard.';
                if (result.reason === 'not_editable') {
                  message = 'Text copied to clipboard (selected area is not editable).';
                }
                showFallbackNotification('Text Beautified!', message);
              }
            });
          }
        } else {
          throw new Error('No result from text replacement script');
        }
      } catch (error) {
        console.error('Error replacing text in place:', error);
        // Fallback to clipboard copy
        chrome.tabs.sendMessage(tab.id, {
          action: 'copyToClipboard',
          text: responses[0],
          requestId: requestId
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Fallback clipboard copy failed:', chrome.runtime.lastError);
          }
        });
      }
    } else {
      // Hide visual loading indicator and show modal for multiple responses
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: hideLoadingIndicator
        });
      } catch (e) {
        console.warn('Could not hide visual loading indicator:', e);
      }
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'showMultipleResponses',
        responses: responses,
        requestId: requestId,
        promptName: beautifyPrompt.name
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Could not display responses on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          showFallbackNotification('Error', 'Failed to display responses');
        }
      });
    }
    
  } catch (error) {
    console.error('Error beautifying text:', error);
    
    // Hide visual loading indicator on error
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: hideLoadingIndicator
      });
    } catch (e) {
      console.warn('Could not hide visual loading indicator on error:', e);
    }
    
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
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn(`Could not show error notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
        showFallbackNotification('Error', errorMessage);
      }
    });
  }
}

// Function to handle custom prompt generation with multiple responses
async function handleCustomPromptGeneration(selectedText, tab, promptId, requestId = null) {
  if (!requestId) {
    requestId = Date.now().toString();
  }
  
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
    
    // Update loading notification with specific response count
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId,
        message: `Generating ${customPrompt.responseCount} response${customPrompt.responseCount > 1 ? 's' : ''}...`
      });
    } catch (e) {
      console.warn('Could not update loading notification:', e);
    }
    
    // Generate multiple comments
    const responses = await generateMultipleComments(selectedText, apiKey, customPrompt);
    
    // Handle response based on count: auto-copy for 1, show modal for multiple
    if (customPrompt.responseCount === 1) {
      // Auto-copy single response
      chrome.tabs.sendMessage(tab.id, {
        action: 'copyToClipboard',
        text: responses[0],
        requestId: requestId
      }, async (response) => {
        if (chrome.runtime.lastError) {
          console.warn(`Could not copy comment to clipboard on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          await showFallbackNotification('Error', 'Failed to copy comment to clipboard');
          return;
        }
        
        if (response && response.success) {
          // Hide visual loading indicator and show success notification
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: hideLoadingIndicator
            });
          } catch (e) {
            console.warn('Could not hide visual loading indicator:', e);
          }
          
          chrome.tabs.sendMessage(tab.id, {
            action: 'showSuccess',
            requestId: requestId
          }, (_) => {
            if (chrome.runtime.lastError) {
              console.warn(`Could not show success notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
              showFallbackNotification(`${customPrompt.name} Generated!`, 'The comment has been copied to your clipboard.');
            }
          });
        } else {
          throw { 
            type: ErrorTypes.CLIPBOARD_ERROR, 
            message: ErrorMessages[ErrorTypes.CLIPBOARD_ERROR] 
          };
        }
      });
    } else {
      // Hide visual loading indicator and show modal for multiple responses
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: hideLoadingIndicator
        });
      } catch (e) {
        console.warn('Could not hide visual loading indicator:', e);
      }
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'showMultipleResponses',
        responses: responses,
        requestId: requestId,
        promptName: customPrompt.name
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Could not display responses on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          showFallbackNotification('Error', 'Failed to display responses');
        }
      });
    }
    
  } catch (error) {
    console.error('Error generating custom prompt responses:', error);
    
    // Hide visual loading indicator on error
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: hideLoadingIndicator
      });
    } catch (e) {
      console.warn('Could not hide visual loading indicator on error:', e);
    }
    
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
        console.warn(`Could not show error notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
        showFallbackNotification('Error', errorMessage);
      }
    });
  }
}

// Function to handle comment generation
async function handleCommentGeneration(selectedText, tab, requestId = null) {
  if (!requestId) {
    requestId = Date.now().toString();
  }
  
  try {
    const settings = await getSettings();
    const { apiKey, defaultResponseCount = 3 } = settings;
    
    if (!apiKey) {
      throw { 
        type: ErrorTypes.API_KEY_MISSING, 
        message: ErrorMessages[ErrorTypes.API_KEY_MISSING] 
      };
    }
    
    // Update loading notification with specific response count
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        requestId: requestId,
        message: `Generating ${defaultResponseCount} response${defaultResponseCount > 1 ? 's' : ''}...`
      });
    } catch (e) {
      console.warn('Could not update loading notification:', e);
    }
    
    // Create a pseudo custom prompt for default behavior to reuse existing multi-response logic
    const defaultPrompt = {
      name: 'Default Professional Comment',
      promptText: 'Generate thoughtful, professional comments that add meaningful insights or perspectives to the discussion. Ask thoughtful questions when appropriate and share relevant experiences when fitting. Respond in the same language as the input text.',
      responseCount: defaultResponseCount
    };
    
    // Generate multiple comments using the same logic as custom prompts
    const responses = await generateMultipleComments(selectedText, apiKey, defaultPrompt);
    
    // Handle response based on count: auto-copy for 1, show modal for multiple
    if (defaultResponseCount === 1) {
      // Auto-copy single response
      chrome.tabs.sendMessage(tab.id, {
        action: 'copyToClipboard',
        text: responses[0],
        requestId: requestId
      }, async (response) => {
        if (chrome.runtime.lastError) {
          console.warn(`Could not copy comment to clipboard on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          await showFallbackNotification('Error', 'Failed to copy comment to clipboard');
          return;
        }
        
        if (response && response.success) {
          // Hide visual loading indicator and show success notification
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: hideLoadingIndicator
            });
          } catch (e) {
            console.warn('Could not hide visual loading indicator:', e);
          }
          
          chrome.tabs.sendMessage(tab.id, {
            action: 'showSuccess',
            requestId: requestId
          }, (_) => {
            if (chrome.runtime.lastError) {
              console.warn(`Could not show success notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
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
    } else {
      // Hide visual loading indicator and show modal for multiple responses
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: hideLoadingIndicator
        });
      } catch (e) {
        console.warn('Could not hide visual loading indicator:', e);
      }
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'showMultipleResponses',
        responses: responses,
        requestId: requestId,
        promptName: defaultPrompt.name
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Could not display responses on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          showFallbackNotification('Error', 'Failed to display responses');
        }
      });
    }
    
  } catch (error) {
    console.error('Error generating comment:', error);
    
    // Hide visual loading indicator on error
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: hideLoadingIndicator
      });
    } catch (e) {
      console.warn('Could not hide visual loading indicator on error:', e);
    }
    
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
        console.warn(`Could not show error notification on tab ${tab.id}: ${chrome.runtime.lastError.message}`);
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

// Function to generate multiple comments using JSON prompt engineering (single API call)
async function generateMultipleComments(selectedText, apiKey, customPrompt) {
  const numResponses = customPrompt.responseCount;
  console.log('🤖 AI Beautify Comment - Generating', numResponses, 'responses using JSON approach');
  
  try {
    // Use single API call with JSON prompt engineering for better performance
    const responses = await generateMultipleCommentsWithJSON(selectedText, apiKey, customPrompt, numResponses);
    console.log('🤖 AI Beautify Comment - JSON approach successful, got', responses.length, 'responses');
    
    if (!responses || responses.length === 0) {
      throw new Error('Failed to generate any responses');
    }
    
    return responses;
  } catch (error) {
    console.warn('🤖 AI Beautify Comment - JSON approach failed, falling back to multiple API calls:', error);
    
    // Fallback to original approach if JSON parsing fails
    return await generateMultipleCommentsLegacy(selectedText, apiKey, customPrompt);
  }
}

// New function: Generate multiple comments using JSON prompt engineering
async function generateMultipleCommentsWithJSON(selectedText, apiKey, customPrompt, numResponses) {
  console.log('🤖 AI Beautify Comment - Building JSON prompt for', numResponses, 'responses');
  
  // Create Gemini API client
  const geminiClient = new GeminiApiClient(apiKey);
  
  // Construct JSON prompt with custom text
  const jsonPrompt = `You are a thoughtful professional. Generate ${numResponses} unique comment suggestions for the following content.

STRICT FORMATTING RULES:
- Respond ONLY with a valid JSON object
- The JSON object must have a single key called "sugestoes"
- The value of "sugestoes" must be an array of ${numResponses} strings
- Each string must be a unique, professional comment
- Do not include any explanation, markdown, or additional text
- Do not wrap in \`\`\`json blocks

CONTENT GUIDELINES:
${customPrompt.promptText}

RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences maximum)
- Be specific, add value, and keep it authentic
- Make each suggestion unique and different from the others
- Maintain a professional yet personable tone

CONTENT: "${selectedText}"

Example format for ${numResponses} responses:
{
  "sugestoes": [
    "First unique comment here",
    "Second unique comment here"${numResponses > 2 ? ',\n    "Third unique comment here"' : ''}${numResponses > 3 ? ',\n    "Fourth unique comment here"' : ''}${numResponses > 4 ? ',\n    "Fifth unique comment here"' : ''}
  ]
}`;

  try {
    // Use the new API client
    const contents = [{ parts: [{ text: jsonPrompt }] }];
    const generationConfig = {
      temperature: 0.8,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 500, // Increased for multiple responses
    };
    const safetySettings = GeminiApiClient.getDefaultSafetySettings();

    const response = await geminiClient.generateContent(contents, generationConfig, safetySettings);
    
    // Parse JSON response using the new client method
    const jsonResponse = geminiClient.parseJsonResponse(response);
    
    if (jsonResponse && Array.isArray(jsonResponse.sugestoes) && jsonResponse.sugestoes.length > 0) {
      return jsonResponse.sugestoes.slice(0, numResponses); // Ensure we don't exceed requested count
    } else {
      throw new Error('Invalid JSON format: missing or empty sugestoes array');
    }
    
  } catch (error) {
    console.error('JSON Gemini API error:', error);
    throw error;
  }
}

// Legacy function: Generate multiple comments using multiple API calls (fallback)
async function generateMultipleCommentsLegacy(selectedText, apiKey, customPrompt) {
  const numResponses = customPrompt.responseCount;
  const promises = [];
  
  console.log(`Falling back to ${numResponses} separate API calls`);
  
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
    console.error('Error generating multiple comments with legacy approach:', error);
    throw error;
  }
}

// Function to call Gemini API with custom prompt
async function generateCommentWithCustomPrompt(selectedText, apiKey, customPrompt) {
  console.log('[🤖] AI Beautify Comment - Generating comment with custom prompt using API client');
  
  // Create Gemini API client
  const geminiClient = new GeminiApiClient(apiKey);
  
  // Construct prompt with custom text
  const fullPrompt = `${customPrompt.promptText}

Guidelines:
- Keep responses concise (2-3 sentences maximum)
- Be specific, add value, and keep it authentic

Post content: "${selectedText}"

Generate only the comment text, without any additional explanation or formatting.`;

  try {
    const contents = [{ parts: [{ text: fullPrompt }] }];
    const generationConfig = {
      temperature: 0.8,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 150,
    };
    const safetySettings = [
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

    const response = await geminiClient.generateContent(contents, generationConfig, safetySettings);
    const generatedText = geminiClient.parseTextResponse(response);
    
    if (generatedText) {
      return generatedText;
    } else {
      throw {
        type: ErrorTypes.API_ERROR,
        message: 'No text content in Gemini API response'
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

// Legacy generateComment function removed - now using GeminiApiClient

// Update checker system
const GITHUB_VERSION_URL = 'https://raw.githubusercontent.com/norato/ai-beautify-comment/main/version.json';
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
      console.warn('Update check failed: Network response was not ok.');
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
    console.warn('Update check failed:', error);
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

// Function to show visual loading indicator (injected into content script context)
function showLoadingIndicator(iconUrl) {
  // Check if loader already exists to avoid duplicates
  let host = document.getElementById('ai-loading-indicator-host');
  if (host) {
    host.style.display = 'flex';
    const img = host.shadowRoot.querySelector('img');
    if (img) {
      img.style.animation = 'none';
      void img.offsetWidth; // Trigger reflow
      img.style.animation = 'spin 1.5s linear infinite';
    }
    return;
  }

  // Create host element for Shadow DOM
  host = document.createElement('div');
  host.id = 'ai-loading-indicator-host';
  document.body.appendChild(host);

  // Attach Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // HTML and CSS for the loader inside Shadow DOM
  shadowRoot.innerHTML = `
    <style>
      :host {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        background-color: rgba(59, 130, 246, 0.9);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        transition: opacity 0.3s ease-in-out;
        opacity: 1;
        backdrop-filter: blur(10px);
      }
      img {
        width: 32px;
        height: 32px;
        animation: spin 1.5s linear infinite;
        filter: brightness(0) invert(1);
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    <img src="${iconUrl}" alt="AI Processing">
  `;
}

// Function to hide visual loading indicator (injected into content script context)
function hideLoadingIndicator() {
  const host = document.getElementById('ai-loading-indicator-host');
  if (host) {
    host.style.opacity = '0';
    host.addEventListener('transitionend', () => {
      host.remove();
    }, { once: true });
  }
}

// Function to replace selected text in place (injected into content script context)
function replaceSelectedTextInPlace(improvedText) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    console.warn('No text selected for replacement. Copying to clipboard instead.');
    navigator.clipboard.writeText(improvedText);
    return { success: false, reason: 'no_selection', method: 'clipboard' };
  }

  const range = selection.getRangeAt(0);
  let targetElement = range.commonAncestorContainer;
  
  // Find the parent element if we're in a text node
  while (targetElement && targetElement.nodeType !== Node.ELEMENT_NODE) {
    targetElement = targetElement.parentNode;
  }

  // Check if the element is editable
  const isEditable = targetElement && (
    (targetElement.tagName === 'INPUT' && 
     !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image'].includes(targetElement.type)) ||
    targetElement.tagName === 'TEXTAREA' ||
    targetElement.isContentEditable ||
    targetElement.getAttribute('contenteditable') === 'true'
  );

  if (isEditable) {
    try {
      // Save scroll position to prevent visual jumps
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
        // Handle input and textarea elements
        const start = targetElement.selectionStart;
        const end = targetElement.selectionEnd;
        const newValue = targetElement.value.substring(0, start) + improvedText + targetElement.value.substring(end);
        targetElement.value = newValue;

        // Restore cursor position at the end of inserted text
        targetElement.setSelectionRange(start + improvedText.length, start + improvedText.length);

        // Dispatch input event for JavaScript frameworks
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (targetElement.isContentEditable || targetElement.getAttribute('contenteditable') === 'true') {
        // Handle contenteditable elements
        range.deleteContents(); // Remove selected text
        const textNode = document.createTextNode(improvedText);
        range.insertNode(textNode); // Insert new text

        // Restore selection/cursor after the inserted text
        selection.removeAllRanges();
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.addRange(range);

        // Dispatch input event for contenteditable
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Restore scroll position
      window.scrollTo(scrollX, scrollY);

      return { success: true, method: 'replace_in_place' };

    } catch (e) {
      console.error('Error replacing text:', e);
      // Fallback to clipboard if replacement fails
      navigator.clipboard.writeText(improvedText);
      return { success: false, reason: 'replacement_error', method: 'clipboard', error: e.message };
    }
  } else {
    // If element is not editable, copy to clipboard
    console.log('Selection is not in an editable element. Copying to clipboard instead.');
    navigator.clipboard.writeText(improvedText);
    return { success: false, reason: 'not_editable', method: 'clipboard' };
  }
}