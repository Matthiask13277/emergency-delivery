const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(mobileRoot, 'android');
const prototypeRoot = path.join(mobileRoot, 'android-prototype');
const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'emergencydelivery', 'mobile');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const activityPath = path.join(javaDir, 'MainActivity.java');

function fail(message) {
  console.error('\nAndroid GPS integration stopped safely:\n' + message);
  process.exit(1);
}

if (!fs.existsSync(androidRoot)) fail('Generated mobile/android project not found. Run the existing Capacitor Android setup first.');
if (!fs.existsSync(javaDir)) fail('Expected Java package folder not found: ' + javaDir + '. Check the appId/package name before continuing.');
if (!fs.existsSync(manifestPath)) fail('AndroidManifest.xml not found.');
if (!fs.existsSync(activityPath)) fail('MainActivity.java not found at the expected package path. No files were changed.');

const activity = fs.readFileSync(activityPath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');

if (!activity.includes('extends BridgeActivity')) {
  fail('MainActivity does not extend BridgeActivity; refusing to patch an unfamiliar activity.');
}
if (!manifest.includes('<manifest') || !manifest.includes('<application')) {
  fail('Manifest structure was not recognized; refusing to patch it.');
}
if (activity.includes('DriverLocationPlugin.class')) {
  console.log('DriverLocationPlugin already appears registered in MainActivity.');
} else {
  console.log('This helper intentionally does not auto-edit MainActivity or AndroidManifest.xml.');
  console.log('Those generated files need a careful merge to preserve existing app configuration.');
}

for (const file of ['DriverLocationPlugin.java', 'DriverLocationService.java']) {
  const source = path.join(prototypeRoot, file);
  if (!fs.existsSync(source)) fail('Prototype source missing: ' + source);
}

console.log('\nPreflight passed. Native sources are present and the generated project shape is recognized.');
console.log('No Android files were changed by this preflight helper.');
console.log('Next: manually merge the documented manifest entries and register DriverLocationPlugin, then wire the bridge into a non-production web preview.');
