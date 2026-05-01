/**
 * 🛰️ API CONTRACT VALIDATOR
 * ------------------------
 * This script statically analyzes the frontend codebase to ensure 
 * compliance with the API Communication Contract.
 * 
 * RUN: node scripts/validate-api.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT  = path.resolve(__dirname, '../src');

const RULES = [
  {
    name: 'No Hardcoded Backend URLs',
    // Catch localhost/127.0.0.1 with backend ports, or absolute http/https that look like internal APIs
    pattern: /http:\/\/localhost|http:\/\/127\.0\.0\.1|localhost:8000|127\.0\.0\.1:8000/g,
    exclude: [/api\.js/, /authService\.js/, /\.md$/, /\.css$/],
    message: 'Hardcoded backend URLs are prohibited. Use relative /api routing.'
  },
  {
    name: 'No Direct Axios/Fetch Usage',
    pattern: /axios\.|fetch\(/g,
    exclude: [/api\.js/, /authService\.js/, /utils\//, /\.md$/],
    message: 'Direct HTTP calls are prohibited. Centralize logic in services/api.js.'
  },
  {
    name: 'No Redundant /api Prefix',
    pattern: /['"`]\/api\//g,
    include: [/services\//],
    exclude: [/api\.js/, /authService\.js/],
    message: "Redundant '/api' prefix detected. baseURL handles this; remove it from the service path."
  }
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

/**
 * 🔍 Starting API Contract Validation...
 */

let violations = 0;
const targetFiles = process.argv.slice(2);

function runValidation(filePath) {
  const relativePath = path.relative(SRC_ROOT, filePath);
  
  // Basic sanity check: only scan files inside src
  if (filePath.indexOf(SRC_ROOT) === -1) return;

  const content = fs.readFileSync(filePath, 'utf8');

  RULES.forEach(rule => {
    // Check inclusion filters
    if (rule.include && !rule.include.some(re => re.test(relativePath))) return;
    
    // Check exclusion filters
    if (rule.exclude && rule.exclude.some(re => re.test(relativePath))) return;

    const matches = content.match(rule.pattern);
    if (matches) {
      violations++;
      console.error(`\n❌ API CONTRACT VIOLATION in ${relativePath}:`);
      console.error(`   ${rule.message}`);
      
      // Log matching lines for clarity
      content.split('\n').forEach((line, i) => {
        // Reset regex state for global matches if needed
        rule.pattern.lastIndex = 0; 
        if (rule.pattern.test(line)) {
          console.error(`   L${i + 1}: ${line.trim()}`);
        }
      });
    }
  });
}

if (targetFiles.length > 0) {
  // targeted validation (e.g. from lint-staged)
  targetFiles.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      runValidation(fullPath);
    }
  });
} else {
  // Full scan (CI mode)
  walk(SRC_ROOT, (filePath) => {
    runValidation(filePath);
  });
}

if (violations > 0) {
  console.error(`\n🚨 Validation Failed: ${violations} contract violations found.`);
  process.exit(1);
} else {
  console.log('\n✅ API Contract Validated: No violations found.');
  process.exit(0);
}
