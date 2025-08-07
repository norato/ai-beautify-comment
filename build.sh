#!/bin/bash

# Build script for Gemini LinkedIn Commenter Chrome Extension
echo "🚀 Building Gemini LinkedIn Commenter..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -f gemini-linkedin-commenter-*.zip

# Create build directory
mkdir -p dist

# Copy essential files only (exclude development files)
echo "📁 Copying essential files..."
cp manifest.json dist/
cp background.js dist/
cp content.js dist/
cp popup.html dist/
cp popup.js dist/
cp popup.css dist/
cp utils.js dist/
cp icon.png dist/

# Verify all files were copied
echo "✅ Files copied to dist/:"
ls -la dist/

# Create distribution ZIP
echo "📦 Creating distribution package..."
cd dist
zip -r ../gemini-linkedin-commenter-v$(grep '"version"' manifest.json | cut -d'"' -f4).zip .
cd ..

echo "🎉 Extension packaged successfully!"
echo "📄 Package: gemini-linkedin-commenter-v$(grep '"version"' manifest.json | cut -d'"' -f4).zip"
echo ""
echo "📋 Next steps:"
echo "1. Test the extension by loading the 'dist' folder in Chrome"
echo "2. Upload the ZIP file to GitHub Releases"