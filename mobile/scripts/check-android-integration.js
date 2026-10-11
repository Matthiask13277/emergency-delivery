const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(mobileRoot, 'android');
const prototypeRoot = path.join(mobileRoot, 'android-prototype');
const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'emergencydelivery', 'mobile');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const activityPath = path.join(javaDir, 'MainActivity.java');

function fail(message) {
  console.error('\nAndroid GPS integration preflight failed:\n' + message);
  process.exit(1);
}

function hasPermission(manifest, permission) {
  return new RegExp('<uses-permission\\s+android:name="' + permission + '"\\s*/?>').test(manifest);
}

if (!fs.existsSync(androidRoot)) fail('Generated mobile/android project not found. Run the existing Capacitor Android setup first.');
if (!fs.existsSync(javaDir)) fail('Expected Java package folder not found: ' + javaDir + '. Check the appId/package name before continuing.');
if (!fs.existsSync(manifestPath)) fail('AndroidManifest.xml not found.');
if (!fs.existsSync(activityPath)) fail('MainActivity.java not found at the expected package path. No files were changed.');

const activity = fs.readFileSync(activityPath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');

if (!activity.includes('extends BridgeActivity')) {
  fail('MainActivity does not extend BridgeActivity; refusing to inspect an unfamiliar activity.');
}
if (!manifest.includes('<manifest') || !manifest.includes('<application')) {
  fail('Manifest structure was not recognized; refusing to inspect it.');
}

const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION'
];
const missingPermissions = requiredPermissions.filter(permission => !hasPermission(manifest, permission));
const serviceDeclared = /<service\\b[^>]*android:name="(?:\\.DriverLocationService|com\\.emergencydelivery\\.mobile\\.DriverLocationService)"[\\s\\S]*?<\\/service>/.test(manifest);
const serviceHasLocationType = serviceDeclared && /<service\\b[^>]*android:name="(?:\\.DriverLocationService|com\\.emergencydelivery\\.mobile\\.DriverLocationService)"[\\s\\S]*?android:foregroundServiceType="location"/.test(manifest);
const pluginRegistered = activity.includes('registerPlugin(DriverLocationPlugin.class)');

const sourceFiles = ['DriverLocationPlugin.java', 'DriverLocationService.java'];
const missingSources = sourceFiles.filter(file => !fs.existsSync(path.join(prototypeRoot, file)));

console.log('Emergency Delivery — Android GPS integration preflight');
console.log('Generated Android project: found');
console.log('MainActivity: recognized Capacitor BridgeActivity');
console.log('Manifest: basic XML structure recognized');

if (missingSources.length) {
  console.error('FAIL: missing prototype source files: ' + missingSources.join(', '));
} else {
  console.log('PASS: native prototype source files found');
}
if (missingPermissions.length) {
  console.error('MISSING manifest permissions: ' + missingPermissions.join(', '));
} else {
  console.log('PASS: required GPS/foreground-service permissions present');
}
if (!serviceDeclared) {
  console.error('MISSING manifest service declaration for DriverLocationService');
} else if (!serviceHasLocationType) {
  console.error('INCOMPLETE manifest service declaration: foregroundServiceType="location" is required');
} else {
  console.log('PASS: DriverLocationService declared as a location foreground service');
}
if (!pluginRegistered) {
  console.error('MISSING native plugin registration: registerPlugin(DriverLocationPlugin.class)');
} else {
  console.log('PASS: DriverLocationPlugin registration found');
}

console.log('\nNo files were changed. This check does not compile the app or prove background GPS works.');
console.log('Note: Android 13+ notification permission and runtime location permission flow still need device testing.');

if (missingSources.length || missingPermissions.length || !serviceHasLocationType || !pluginRegistered) {
  process.exitCode = 1;
} else {
  console.log('Preflight passed. Next run the Android build, then verify tracking on a physical device with the screen locked.');
}
