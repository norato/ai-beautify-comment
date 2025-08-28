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
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
const zipName = `ai-beautify-comment-v${version}.zip`;

// Check if dist folder exists
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ folder not found. Please run "npm run build" first.');
  process.exit(1);
}

// Change to dist directory for ZIP creation
process.chdir(distDir);
console.log(`📂 Working directory: ${distDir}\n`);

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

console.log('📋 Checking files in dist folder:');

// Get all files in dist directory
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(path.relative(distDir, filePath));
    }
  });
  return fileList;
}

const distFiles = getAllFiles(distDir);
console.log(`✅ Found ${distFiles.length} files in dist/`);
distFiles.forEach(file => console.log(`  - ${file}`));

console.log('\n🗂️ Creating ZIP file...');

try {
  // ZIP output path (in project root, not dist)
  const outputZipPath = path.resolve(__dirname, '..', zipName);
  
  // Remove existing ZIP if it exists
  if (fs.existsSync(outputZipPath)) {
    fs.unlinkSync(outputZipPath);
    console.log(`🗑️ Removed existing ${zipName}`);
  }

  // Create ZIP of entire dist folder contents
  const zipCommand = `zip -r "${outputZipPath}" . -x "*.DS_Store" -x "__MACOSX/*" -x "*/.*"`;
  
  execSync(zipCommand, { stdio: 'pipe', cwd: distDir });
  
  // Check if ZIP was created successfully
  if (fs.existsSync(outputZipPath)) {
    const stats = fs.statSync(outputZipPath);
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