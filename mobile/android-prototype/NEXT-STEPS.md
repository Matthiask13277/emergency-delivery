# Android background GPS – next integration steps

Status: prototype only. The Android foreground service and Capacitor plugin are source scaffolding; do not distribute this build as a working background-tracking app yet.

## Important architecture detail

`mobile/capacitor.config.ts` points the Capacitor WebView at the hosted Blitz app. The JavaScript served by that website must call the native Capacitor plugin for the service to start. Changes made only to the Android Java files cannot add that call to the hosted website.

## Required work before a driver test

1. Keep all work on `prototype/capacitor-mobile-gps`; do not merge into `main` or deploy the prototype over the live site.
2. Ensure `DriverLocationPlugin.java` and `DriverLocationService.java` use the same package as the generated Android project (`com.emergencydelivery.mobile`) and compile against the current Capacitor version.
3. Merge the service declaration and permissions into the existing manifest. Do not replace the generated manifest with the prototype manifest: the generated file also contains the app activity and FileProvider.
4. Register `DriverLocationPlugin` in `MainActivity.java`. Capacitor's custom-code guide documents explicit registration.
5. Add a guarded native bridge in the driver web UI: when a trip enters “in transit”, call `DriverLocation.start({ tripId, token })`; when delivered or the driver logs out, call `DriverLocation.stop()`. Retain the existing web GPS fallback for browsers/PWA.
6. Do not test by deploying this bridge to the production Blitz URL without a feature gate or isolated preview. The current mobile config loads the production URL, so production web changes would affect the live app.
7. Verify Android 13+ notification permission, Android 14+ location foreground-service requirements, runtime location permission, API authentication, and device lock/background behavior on a physical phone.
8. Only after a successful build and real-device test, create a new APK and verify the admin timestamp continues updating while the screen is locked.

## Why the current APK does not track in the background

It loads the hosted website, but the website does not yet call the native plugin. Therefore, the service is not started when the driver changes trip status. This is an integration gap, not something fixed by rebuilding the same files.

## iPhone

Android Studio on Windows cannot build or validate the iOS version. iOS needs a separate Core Location implementation and a macOS/Xcode build and test.
