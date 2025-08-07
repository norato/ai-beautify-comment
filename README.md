# Gemini LinkedIn Commenter

A Chrome extension that generates professional LinkedIn comments using Google's Gemini 1.5 Flash model with automatic clipboard integration.

## Features

- 🤖 AI-powered comment generation using Gemini 1.5 Flash
- 📋 Automatic clipboard integration
- 🌍 Multi-language support (preserves post language)
- 🎨 Professional LinkedIn-styled interface
- 🔒 Secure API key storage
- ♿ Accessibility-friendly design
- 🚀 Fast and responsive with retry logic

## Installation

### Developer Mode Installation

1. **Download the extension files**
   - Clone this repository or download as ZIP
   - Extract files to a folder on your computer

2. **Generate the icon.png file**
   - Open `icon_generator.html` in your browser
   - Click "Download icon.png" button
   - Save the file in the extension folder

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension folder

4. **Get your Google Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create an account or sign in
   - Generate a new API key
   - Copy the key (starts with `AIzaSy`)

5. **Configure the extension**
   - Click the extension icon in Chrome toolbar
   - Paste your Gemini API key
   - Click "Save API Key"

## Usage

1. Navigate to any LinkedIn post
2. Select the text you want to comment on
3. Right-click and choose "Generate LinkedIn Comment"
4. Wait for the AI to generate a comment
5. The comment will be automatically copied to your clipboard
6. Paste (Ctrl+V / Cmd+V) in the comment field

## Features in Detail

### Smart Comment Generation
- Generates thoughtful, professional comments
- Adds value to discussions
- Maintains appropriate tone
- Keeps responses concise (2-3 sentences)

### Language Detection
- Automatically detects post language
- Responds in the same language
- Supports multiple languages including:
  - English, Portuguese, Spanish, French
  - German, Italian, Russian, Japanese
  - Korean, Chinese, Arabic, Hindi

### Error Handling
- Retry logic for network issues
- Rate limit handling
- User-friendly error messages
- Automatic recovery from failures

### Accessibility
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Reduced motion support

## Security

- API keys are stored locally using Chrome's secure storage
- No data is sent to external servers except OpenAI
- All requests use HTTPS
- API keys are never exposed in the interface

## Troubleshooting

### "API Key Required" error
- Ensure you've saved your Gemini API key in the extension popup
- Verify the key starts with "AIzaSy"

### "Rate limit exceeded" error
- Wait a few moments before trying again
- Check your Gemini API usage limits

### Comments not copying to clipboard
- Ensure you're on a LinkedIn page
- Try refreshing the page
- Check Chrome permissions for clipboard access

## Development

### File Structure
```
gpt-linkedin-commenter/
├── manifest.json      # Extension configuration
├── background.js      # Service worker
├── content.js         # Content script for clipboard
├── popup.html         # Extension popup UI
├── popup.js          # Popup functionality
├── popup.css         # Styling
├── utils.js          # Utility functions
├── icon.png          # Extension icon (generate from HTML)
├── icon.svg          # Icon source
├── icon_generator.html # Icon generator tool
└── README.md         # This file
```

### Technologies Used
- Chrome Extensions Manifest V3
- Google Gemini 1.5 Flash API
- JavaScript ES6+
- CSS3 with animations
- Chrome Storage API

## Privacy Policy

This extension:
- Only activates on LinkedIn domains
- Stores API keys locally on your device
- Does not collect or transmit personal data
- Only sends selected text to Google Gemini for processing

## License

MIT License - feel free to modify and distribute

## Support

For issues or feature requests, please create an issue in the GitHub repository.

---

Made with ❤️ for the LinkedIn community