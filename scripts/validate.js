#!/usr/bin/env node

/**
 * Validation script for AI Beautify Comment extension
 * Validates manifest.json, checks required files, and performs basic integrity checks
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating AI Beautify Comment extension...\n');

let hasErrors = false;

function error(message) {
  console.error(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function warn(message) {
  console.warn(`⚠️  WARNING: ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

// Define base directories
const srcDir = path.join(__dirname, '..', 'src');
const rootDir = path.join(__dirname, '..');

// Check required files
const requiredFiles = [
  { file: 'manifest.json', dir: srcDir },
  { file: 'background.js', dir: srcDir },
  { file: 'content.js', dir: srcDir },
  { file: 'popup/popup.html', dir: srcDir },
  { file: 'popup/popup.js', dir: srcDir },
  { file: 'popup/popup.css', dir: srcDir },
  { file: 'utils.js', dir: srcDir },
  { file: 'assets/icon.png', dir: srcDir },
  { file: 'version.json', dir: rootDir }
];

console.log('📁 Checking required files...');
requiredFiles.forEach(({ file, dir }) => {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    success(`${file} exists`);
  } else {
    error(`${file} is missing`);
  }
});

// Validate manifest.json
console.log('\n📋 Validating manifest.json...');
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8'));
  
  // Check required fields
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  requiredFields.forEach(field => {
    if (manifest[field]) {
      success(`manifest.${field}: ${manifest[field]}`);
    } else {
      error(`manifest.${field} is missing`);
    }
  });

  // Check manifest version
  if (manifest.manifest_version === 3) {
    success('Using Manifest V3');
  } else {
    error('Should use Manifest V3');
  }

  // Check permissions
  if (manifest.permissions && Array.isArray(manifest.permissions)) {
    success(`Permissions: ${manifest.permissions.join(', ')}`);
  } else {
    warn('No permissions specified');
  }

  // Check background script
  if (manifest.background && manifest.background.service_worker) {
    success(`Background script: ${manifest.background.service_worker}`);
  } else {
    error('Background service worker not specified');
  }

} catch (err) {
  error(`Failed to parse manifest.json: ${err.message}`);
}

// Validate version.json
console.log('\n📊 Validating version.json...');
try {
  const version = JSON.parse(fs.readFileSync(path.join(rootDir, 'version.json'), 'utf8'));
  
  if (version.version) {
    success(`Version: ${version.version}`);
  } else {
    error('Version not specified in version.json');
  }

  if (version.release_notes) {
    success('Release notes present');
  } else {
    warn('No release notes specified');
  }

} catch (err) {
  error(`Failed to parse version.json: ${err.message}`);
}

// Check version consistency
console.log('\n🔄 Checking version consistency...');
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8'));
  const version = JSON.parse(fs.readFileSync(path.join(rootDir, 'version.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

  if (manifest.version === version.version && version.version === packageJson.version) {
    success(`All versions match: ${manifest.version}`);
  } else {
    error(`Version mismatch - manifest: ${manifest.version}, version.json: ${version.version}, package.json: ${packageJson.version}`);
  }
} catch (err) {
  error(`Failed to check version consistency: ${err.message}`);
}

// Basic syntax check for JavaScript files
console.log('\n🔧 Performing basic syntax checks...');
const jsFiles = [
  { file: 'background.js', dir: srcDir },
  { file: 'content.js', dir: srcDir },
  { file: 'popup/popup.js', dir: srcDir },
  { file: 'utils.js', dir: srcDir }
];

jsFiles.forEach(({ file, dir }) => {
  try {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic syntax check - just try to parse it
    new Function(content);
    success(`${file} syntax OK`);
  } catch (err) {
    error(`${file} syntax error: ${err.message}`);
  }
});

// Check for common issues
console.log('\n🕵️ Checking for common issues...');

// Check if background.js has importScripts for utils.js
try {
  const backgroundContent = fs.readFileSync(path.join(srcDir, 'background.js'), 'utf8');
  if (backgroundContent.includes('importScripts(\'utils.js\')')) {
    success('background.js properly imports utils.js');
  } else {
    warn('background.js might not be importing utils.js');
  }
} catch (err) {
  warn('Could not check background.js imports');
}

// Final result
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Validation FAILED - please fix the errors above');
  process.exit(1);
} else {
  console.log('✅ Validation PASSED - extension is ready!');
  process.exit(0);
}