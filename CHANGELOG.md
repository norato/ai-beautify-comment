# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-01-07

### 🚀 Added
- Comprehensive API timeout handling with 10-second timeout for validation requests
- Specific error messages for different failure types (network, timeout, invalid key)
- Loading states with spinner animation during API validation
- Better visual feedback for all API operations

### 🎨 Improved
- **Form Layout**: Reorganized form groups into clean column layout
- **Help Text**: Positioned all help text below input fields for better readability
- **Button Positioning**: Fixed custom prompt buttons using flexbox instead of absolute positioning
- **Container Alignment**: All UI elements now stay within proper card boundaries
- **Visual Consistency**: Improved spacing and alignment across all interface elements

### 🐛 Fixed
- Custom prompt buttons no longer appear outside their containers
- Proper flex alignment prevents UI overflow issues
- API validation now provides detailed error feedback instead of generic messages
- Form elements maintain consistent styling across different screen sizes

### 🔧 Technical
- Replaced `position: absolute` with flexbox for better layout control
- Added `Promise.race` for timeout handling in API requests
- Enhanced error handling with specific timeout and network error detection
- Improved CSS specificity to prevent style conflicts

---

## [2.1.0] - Previous Release

### Features
- Multiple response generation with modal selection
- Auto-copy functionality for single responses
- Custom prompts with individual response count settings
- Enhanced context menu integration
- Global settings for default response count

---

## [2.0.0] - Previous Release

### Features
- Initial implementation of custom prompts system
- Gemini 1.5 Flash API integration
- Chrome Manifest V3 compatibility
- Automatic update notifications