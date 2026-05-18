/**
 * Script to remove console.log statements from production code
 * Keeps console.error and console.warn for error tracking
 */

const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  'components',
  'lib',
  'hooks',
  'app',
  'contexts'
];

const EXCLUDED_PATTERNS = [
  'node_modules',
  '.next',
  'public/sw.js', // Keep service worker logs for debugging
];

let filesProcessed = 0;
let logsRemoved = 0;

function shouldProcessFile(filePath) {
  // Only process .ts, .tsx files
  if (!['.ts', '.tsx'].includes(path.extname(filePath))) {
    return false;
  }
  
  // Check if file matches any excluded patterns
  return !EXCLUDED_PATTERNS.some(pattern => 
    filePath.includes(pattern)
  );
}

function removeConsoleLogs(content) {
  let modified = false;
  
  // Match console.log statements (including multi-line)
  const consoleLogPattern = /^\s*console\.log\([^)]*\);?\s*$/gm;
  
  const newContent = content.replace(consoleLogPattern, (match) => {
    logsRemoved++;
    modified = true;
    return ''; // Remove the line entirely
  });
  
  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, modified } = removeConsoleLogs(content);
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesProcessed++;
      console.log(`✓ Cleaned: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDED_PATTERNS.some(pattern => fullPath.includes(pattern))) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile() && shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`✗ Error scanning directory ${dirPath}:`, error.message);
  }
}

console.log('🧹 Starting console.log cleanup...\n');

// Process each directory
DIRECTORIES_TO_SCAN.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`📂 Scanning ${dir}/...`);
    scanDirectory(dirPath);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✨ Cleanup complete!`);
console.log(`📝 Files modified: ${filesProcessed}`);
console.log(`🗑️  Console.log statements removed: ${logsRemoved}`);
console.log('='.repeat(50));

process.exit(0);
