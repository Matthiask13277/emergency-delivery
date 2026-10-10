# Android prototype integration checklist

Status: Java service and JS bridge are source scaffolding only. The currently installed APK loads the hosted production web app, so it does not include this bridge yet.

## Safe integration sequence

1. Keep all work on `prototype/capacitor-mobile-gps`. Do not merge this branch into `main`.
2. In the local generated project at `mobile/android`, copy `DriverLocationPlugin.java` and `DriverLocationService.java` into the Java package directory matching `com.emergencydelivery.mobile` (normally `app/src/main/java/com/emergencydelivery/mobile/`).
3. Merge the permissions and service declaration from `AndroidManifest.xml` into `mobile/android/app/src/main/AndroidManifest.xml`. Do not replace the generated manifest wholesale.
4. Register `DriverLocationPlugin.class` in the generated `MainActivity.java` before calling `super.onCreate(savedInstanceState)`. Preserve the existing package name and imports.
5. Add `capacitor-bridge.js` to the actual driver page and load it before the driver lifecycle code. Merely storing the file in this folder does not load it into the hosted app.
6. Call `window.startNativeDriverLocation(tripId, token)` only after the driver is authenticated and the trip status becomes `In Transit`. Call `window.stopNativeDriverLocation()` on Delivered and logout.
7. The Capacitor app currently uses `server.url` to load the live hosted website. Do not change that URL or deploy bridge changes to production as part of this prototype. Until a separate preview URL exists, a test APK cannot safely validate the UI bridge end-to-end.
8. Build and test on a physical Android device. Confirm the foreground notification is visible and the admin timestamp continues updating with the screen locked. Also test Delivered/logout and denied permissions.

## Security and reliability notes

- The bearer token is passed to the service in memory through an Android intent; never print it to logs or store it in source control.
- This service needs a review for Android foreground-service start restrictions, Android 13+ notification permission, runtime location permission flow, and Android 14+ location foreground-service requirements before operational use.
- Verify that the backend accepts the exact trip ID type and that the server rejects a driver attempting to update another driver's trip.
- A successful build is not proof of background behavior; real-device testing is required.
- iOS requires a separate Core Location implementation and a macOS/Xcode build.
