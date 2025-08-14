/**
 * Simple build script - copies files from src/ to dist/
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const distDir = path.resolve(__dirname, '../dist');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`✅ Copied: ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
}

function copyDirectory(srcDir, destDir) {
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir);

  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

function build() {
  try {
    console.log('🚀 Starting build...');
    
    // Clean dist directory
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
      console.log('🧹 Cleaned dist directory');
    }
    
    // Copy all files from src to dist
    console.log('📁 Copying files from src/ to dist/...');
    copyDirectory(srcDir, distDir);
    
    console.log('');
    console.log('🎉 Build completed successfully!');
    console.log(`📦 Extension ready for Chrome in: ${path.relative(process.cwd(), distDir)}/`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Open Chrome and go to chrome://extensions/');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked" and select the dist/ folder');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = { build };