/**
 * Script to remove ALL console statements from production code
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
  'scripts',
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

function removeConsoleStatements(content) {
  let modified = false;
  
  // Match all console statements (log, error, warn, info, debug)
  // Handles single-line and multi-line console statements
  const consolePatterns = [
    // Single line console statements
    /^\s*console\.(log|error|warn|info|debug)\([^)]*\);?\s*$/gm,
    // Multi-line console statements with proper indentation
    /^\s*console\.(log|error|warn|info|debug)\([\s\S]*?\);?\s*$/gm,
  ];
  
  let newContent = content;
  
  // Remove all console statements
  consolePatterns.forEach(pattern => {
    newContent = newContent.replace(pattern, (match) => {
      logsRemoved++;
      modified = true;
      return ''; // Remove the line entirely
    });
  });
  
  // Also handle inline console statements
  newContent = newContent.replace(/console\.(log|error|warn|info|debug)\([^)]*\);?/g, (match) => {
    logsRemoved++;
    modified = true;
    return '';
  });
  
  // Clean up empty lines (more than 2 consecutive)
  newContent = newContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, modified } = removeConsoleStatements(content);
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesProcessed++;
    }
  } catch (error) {
    // Silent error handling
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
    // Silent error handling
  }
}

// Process each directory
DIRECTORIES_TO_SCAN.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    scanDirectory(dirPath);
  }
});

process.exit(0);

