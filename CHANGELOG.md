# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-08-14

### 🚀 Added
- **AI Beautify functionality**: New feature to improve and enhance your own text with in-place replacement
- **In-place text replacement**: Text is automatically replaced in editable fields (input, textarea, contenteditable)
- **Visual loading indicator**: Immediate feedback with extension logo while processing
- **Separate response count settings**: Independent configuration for AI Comment and AI Beautify
- **Menu visual hierarchy**: Added separator and better organization in context menu
- **Smart fallback system**: Automatic clipboard copy when in-place replacement isn't possible

### 🔄 Changed
- **BREAKING**: Complete refactoring of language detection - removed manual JavaScript detection
- **Language detection**: Now uses native Gemini capability with "Respond in the same language as the input text" instruction
- **Menu reorganization**: 
  - AI Beautify (improve yours) - positioned first
  - Visual separator line
  - AI Comment (default) - positioned second
  - Custom prompts follow after
- **Naming clarity**: Renamed "AI Beautify Comment" to "AI Comment" for better understanding
- **User interface**: Updated popup instructions to clearly explain both AI Beautify and AI Comment functions

### 🗑️ Removed
- **Manual language detection**: Eliminated `detectLanguage()` and `getLanguageName()` functions
- **Regex-based detection**: Removed all JavaScript language detection logic
- **Unnecessary TypeScript declarations**: Cleaned up global declarations for removed functions

### 🎨 Improved
- **Code simplification**: Reduced complexity by 60+ lines of detection code
- **Better reliability**: Native Gemini language detection is more accurate than regex patterns
- **Performance optimization**: Removed unnecessary JavaScript processing
- **User experience**: Immediate visual feedback and clearer functionality separation
- **Code maintainability**: Simplified architecture with single responsibility principle

### 🔧 Technical
- Removed dependencies on manual language detection throughout the codebase
- Simplified prompt construction across all API calls
- Enhanced error handling for text replacement scenarios
- Improved code modularity and maintainability

---

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