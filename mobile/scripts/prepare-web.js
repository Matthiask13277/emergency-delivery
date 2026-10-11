const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const source = path.join(mobileRoot, 'www');
const output = path.join(mobileRoot, 'www');

if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
  console.error('Expected mobile/www directory was not found.');
  process.exit(1);
}

// The current prototype uses a minimal local fallback page and loads the
// existing hosted application through capacitor.config.ts. Copying files onto
// the same directory would be destructive, so this script intentionally only
// validates the webDir and reports the next step.
const entry = path.join(output, 'index.html');
if (!fs.existsSync(entry)) {
  console.error('Expected mobile/www/index.html was not found.');
  process.exit(1);
}

console.log('Mobile webDir validated:', output);
console.log('Note: this prototype loads the hosted web app; native background GPS is not enabled by this script.');
