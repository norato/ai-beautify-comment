# Gemini LinkedIn Commenter

A Chrome extension that generates professional LinkedIn comments using Google's Gemini 1.5 Flash model with automatic clipboard integration.

![Extension Demo](https://via.placeholder.com/800x400/0A66C2/FFFFFF?text=Gemini+LinkedIn+Commenter+Demo)

## 🚀 Features

- 🤖 AI-powered comment generation using Gemini 1.5 Flash
- 📋 Automatic clipboard integration
- 🌍 Multi-language support (preserves post language)
- 🎨 Professional LinkedIn-styled interface
- 🔒 Secure local API key storage
- ♿ Accessibility-friendly design
- 🔄 Automatic update notifications
- 🚀 Fast and responsive with retry logic

## 📦 Distribution

This extension is distributed via **Developer Mode** (not through Chrome Web Store) for maximum control and to avoid potential Terms of Service conflicts.

### For Users: [Installation Guide](DISTRIBUTION.md)
👆 **Click here for complete installation instructions**

### For Developers: Building & Distribution

#### Quick Build
```bash
./build.sh
```

This creates:
- `dist/` folder for testing in Chrome
- `gemini-linkedin-commenter-v*.zip` for distribution

#### Distribution Workflow
1. **Build the extension** using the build script
2. **Test locally** by loading the `dist` folder in Chrome
3. **Create GitHub Release** and upload the ZIP file
4. **Update version.json** to trigger update notifications

#### Update System
The extension includes an automatic update checker:
- Checks for updates daily via GitHub
- Shows badge notification when updates are available
- Users get notified through the popup interface

**Important:** Update the `GITHUB_VERSION_URL` in `background.js` and `version.json` with your actual repository URL.

## 🔧 Configuration

### API Key Setup
1. Get your [Google Gemini API key](https://aistudio.google.com/app/apikey)
2. Click the extension icon in Chrome
3. Enter your API key (starts with `AIzaSy`)
4. Click "Save API Key"

### Supported Languages
- English, Portuguese, Spanish, French
- German, Italian, Russian, Japanese
- Korean, Chinese, Arabic, Hindi

## 🛡️ Security & Privacy

- **Local Storage:** API keys stored securely using `chrome.storage.local`
- **No Data Collection:** Extension doesn't collect or transmit user data
- **Direct API Calls:** Only communicates with official Google Gemini API
- **Open Source:** Full source code available for inspection

## ⚠️ Important Disclaimers

**LinkedIn Terms of Service:** This tool may conflict with LinkedIn's automation policies. Users assume all responsibility for compliance with LinkedIn's Terms of Service.

**AI-Generated Content:** Always review and edit AI-generated comments before posting. The tool is designed to assist, not replace, human judgment.

## 🔄 Development

### File Structure
```
gemini-linkedin-commenter/
├── manifest.json          # Extension configuration
├── background.js          # Service worker with update system
├── content.js             # Content script for clipboard operations
├── popup.html/js/css      # Extension popup interface
├── utils.js              # Utility functions and error handling
├── icon.png              # Extension icon
├── version.json          # Version info for updates
├── build.sh              # Build script
├── README.md             # This file
└── DISTRIBUTION.md       # User installation guide
```

### Update Process
1. Update `manifest.json` version
2. Update `version.json` with new version and release notes
3. Run `./build.sh` to create distribution package
4. Create GitHub Release with the ZIP file
5. Users will be automatically notified of the update

### Technologies Used
- Chrome Extensions Manifest V3
- Google Gemini 1.5 Flash API
- JavaScript ES6+
- CSS3 with animations
- Chrome Storage & Alarms APIs

## 📄 License

MIT License - feel free to modify and distribute

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension locally
5. Create a pull request

## 📞 Support

- [Report Issues](https://github.com/norato/gpt-linkedIn-commenter/issues)
- [Feature Requests](https://github.com/norato/gpt-linkedIn-commenter/discussions)

---

**Made with ❤️ for the LinkedIn community**

*Remember: Use this tool responsibly and always review AI-generated content before posting.*