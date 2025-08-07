// Service Worker for GPT LinkedIn Commenter

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
  try {
    // Get API key from storage
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    
    if (!apiKey) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'API Key Required',
        message: 'Please set your OpenAI API key in the extension popup.'
      });
      return;
    }
    
    // Show loading notification
    chrome.notifications.create('loading', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Generating Comment',
      message: 'Please wait while we generate your comment...'
    });
    
    // Generate comment using OpenAI API
    const comment = await generateComment(selectedText, apiKey);
    
    // Send comment to content script for clipboard
    chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      text: comment
    }, (response) => {
      // Clear loading notification
      chrome.notifications.clear('loading');
      
      if (response && response.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Comment Generated!',
          message: 'The comment has been copied to your clipboard.'
        });
      } else {
        throw new Error('Failed to copy to clipboard');
      }
    });
    
  } catch (error) {
    console.error('Error generating comment:', error);
    chrome.notifications.clear('loading');
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Error',
      message: error.message || 'Failed to generate comment. Please try again.'
    });
  }
}

// Function to call OpenAI API
async function generateComment(selectedText, apiKey) {
  const prompt = `Generate a professional and engaging LinkedIn comment in response to the following post content. The comment should be thoughtful, add value to the discussion, and maintain a professional tone. Keep it concise (2-3 sentences) and authentic. Respond in the same language as the post.

Post content: "${selectedText}"

Generate only the comment text, without any additional explanation or formatting.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional LinkedIn user who writes engaging and valuable comments on posts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate comment');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'testConnection') {
    sendResponse({ success: true });
  }
  return true;
});