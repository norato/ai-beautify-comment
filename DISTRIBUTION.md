# Gemini LinkedIn Commenter - Distribution Guide

A Chrome extension that generates professional LinkedIn comments using Google's Gemini 1.5 Flash model with automatic clipboard integration.

## ⚠️ Important Disclaimer

**This is an unofficial, open-source tool provided for educational and research purposes.** It is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation or Google. 

**Automating interactions on social media platforms may violate their Terms of Service.** You assume all responsibility for the use of this extension. The developers of this tool are not liable for any consequences, including but not limited to account suspension or termination.

## 🔒 Security & Privacy

Your privacy is paramount:

- **API Key Storage:** Your Google Gemini API key is stored exclusively on your local machine using the secure `chrome.storage.local` API.
- **Data Transmission:** Your key is only ever sent directly to the official Google Gemini API endpoint. It is never transmitted to or stored on any other server.
- **No User Tracking:** This extension does not collect, store, or transmit any personal data or usage analytics.

## 📥 Installation Instructions

Since this extension is distributed via developer mode (not through the Chrome Web Store), follow these steps:

### Step 1: Download the Extension

1. Go to the [Releases page](https://github.com/norato/gpt-linkedIn-commenter/releases)
2. Download the latest `gemini-linkedin-commenter-vX.X.X.zip` file
3. **Important:** Extract the ZIP file to a **permanent location** on your computer (NOT your Downloads folder)

> **⚠️ Warning:** You must unzip the extension files into a folder where they will **permanently reside**. Do not use your `Downloads` folder. If you move or delete the folder, Chrome will remove the extension.

### Step 2: Enable Developer Mode in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. In the top-right corner, toggle **"Developer mode"** ON
3. You'll see additional buttons appear

### Step 3: Load the Extension

1. Click the **"Load unpacked"** button
2. Navigate to and select the folder where you extracted the extension files
3. The extension should now appear in your extensions list and toolbar

### Step 4: Configure Your API Key

1. Get your Google Gemini API key:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create an account or sign in
   - Generate a new API key (starts with `AIzaSy`)

2. Configure the extension:
   - Click the extension icon in your Chrome toolbar
   - Paste your Gemini API key
   - Click "Save API Key"

## 🚀 How to Use

1. Navigate to any LinkedIn post
2. Select the text you want to comment on
3. Right-click and choose "Generate LinkedIn Comment"
4. Wait for the AI to generate a comment
5. The comment will be automatically copied to your clipboard
6. Paste (Ctrl+V / Cmd+V) in the LinkedIn comment field
7. **Always review and edit** the generated comment before posting

## ⚡ Developer Mode Limitations

**Important Note:** Because this extension is not distributed through the Chrome Web Store, Chrome will show you a **"Disable developer mode extensions"** popup each time you restart the browser.

**You must click "Cancel" (or the "X") to keep the extension running.** Clicking "Disable" will turn the extension off. This is a security feature of Chrome and is unavoidable for extensions loaded this way.

## 🔄 Updates

This extension includes an automatic update checker that will notify you when new versions are available:

- A red badge (!) will appear on the extension icon when updates are available
- Click the extension icon to see the update notification
- Follow the link to download the latest version
- Repeat the installation process with the new version

## 🛠️ Troubleshooting

### "Generate LinkedIn Comment" option doesn't appear
- Ensure you're on a LinkedIn page (`*.linkedin.com`)
- Make sure you've selected some text from a post
- Try refreshing the page

### Comments not copying to clipboard
- Check that you've saved your Gemini API key in the extension popup
- Ensure your API key is valid and starts with "AIzaSy"
- Try refreshing the LinkedIn page

### Extension disappears after browser restart
- Make sure you clicked "Cancel" on the developer mode popup
- Check if the extension folder still exists in its original location
- If the folder was moved/deleted, reinstall the extension

### API Key errors
- Verify your API key is correctly copied from Google AI Studio
- Check that your Google account has Gemini API access enabled
- Ensure your API key has sufficient quota/credits

## 🌍 Supported Languages

The extension automatically detects the language of LinkedIn posts and responds in the same language. Supported languages include:
- English, Portuguese, Spanish, French
- German, Italian, Russian, Japanese
- Korean, Chinese, Arabic, Hindi

## 📞 Support

- [Report an Issue](https://github.com/norato/gpt-linkedIn-commenter/issues)
- [View Source Code](https://github.com/norato/gpt-linkedIn-commenter)

## 📄 License

MIT License - feel free to modify and distribute

---

**Made with ❤️ for the LinkedIn community**

*Remember: Always review AI-generated content before posting. Use this tool responsibly and in accordance with LinkedIn's Terms of Service.*