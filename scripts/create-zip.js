#!/usr/bin/env node

/**
 * Creates a distribution ZIP file for the AI Beautify Comment extension
 * Excludes development files and includes only production-ready files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating distribution ZIP for AI Beautify Comment extension...\n');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const zipName = `ai-beautify-comment-v${version}.zip`;

// Files to include in the ZIP
const includeFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'utils.js',
  'icon.png',
  'version.json'
];

// Files and directories to exclude
const excludePatterns = [
  'node_modules',
  '.git',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'scripts',
  'CHANGELOG.md',
  'README.md',
  '*.zip',
  '.DS_Store',
  'Thumbs.db'
];

console.log('📋 Files to include:');
includeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.error(`❌ ${file} (missing)`);
    process.exit(1);
  }
});

console.log('\n🗂️ Creating ZIP file...');

try {
  // Remove existing ZIP if it exists
  if (fs.existsSync(zipName)) {
    fs.unlinkSync(zipName);
    console.log(`🗑️ Removed existing ${zipName}`);
  }

  // Create ZIP using system zip command (cross-platform)
  const zipCommand = `zip -r "${zipName}" ${includeFiles.join(' ')} -x ${excludePatterns.map(p => `"${p}/*"`).join(' ')}`;
  
  execSync(zipCommand, { stdio: 'pipe' });
  
  // Check if ZIP was created successfully
  if (fs.existsSync(zipName)) {
    const stats = fs.statSync(zipName);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ Successfully created ${zipName}`);
    console.log(`📊 Size: ${sizeKB} KB`);
    
    // List contents of ZIP for verification
    console.log('\n📋 ZIP contents:');
    try {
      const contents = execSync(`unzip -l "${zipName}"`, { encoding: 'utf8' });
      console.log(contents);
    } catch (err) {
      console.warn('Could not list ZIP contents (this is normal on some systems)');
    }
    
    console.log('\n✅ ZIP file ready for distribution!');
    console.log(`🚀 Upload ${zipName} to Chrome Web Store or load as unpacked extension`);
    
  } else {
    throw new Error('ZIP file was not created');
  }

} catch (error) {
  console.error(`❌ Failed to create ZIP: ${error.message}`);
  process.exit(1);
}