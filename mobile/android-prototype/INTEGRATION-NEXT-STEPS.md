# Android prototype integration checklist

Status: The prototype branch's root `index.html` now calls the native `DriverLocation` plugin when a trip enters `In Transit`, and stops it when the trip is delivered. The native plugin/service remain source scaffolding until they are integrated into and built with the generated Android project. The currently installed APK loads the hosted production web app, so it does not contain the native plugin.

## Safe integration sequence

1. Keep all work on `prototype/capacitor-mobile-gps`. Do not merge this branch into `main`.
2. In the local generated project at `mobile/android`, copy `DriverLocationPlugin.java` and `DriverLocationService.java` into the Java package directory matching `com.emergencydelivery.mobile` (normally `app/src/main/java/com/emergencydelivery/mobile/`).
3. Merge the permissions and service declaration from `AndroidManifest.xml` into `mobile/android/app/src/main/AndroidManifest.xml`. Do not replace the generated manifest wholesale.
4. Register `DriverLocationPlugin.class` in the generated `MainActivity.java` before calling `super.onCreate(savedInstanceState)`. Preserve the existing package name and imports.
5. The prototype `index.html` already has a guarded call to `window.Capacitor.Plugins.DriverLocation.start({tripId, token})` on `In Transit` and `.stop()` on Delivered. Verify that logout also stops tracking and ensure the native plugin is registered before testing.
6. The Capacitor app currently uses `server.url` to load the live hosted website. The branch's `index.html` changes are not served by that URL unless deployed. Do not deploy bridge changes to production as part of this prototype. Until a separate preview URL exists, the UI bridge cannot be validated end-to-end without changing the live site.
7. The generated Android project is local and may be ignored by Git. Integrate and compile the plugin in that generated project or add a reproducible build workflow that creates the Capacitor project from source.
8. Build and test on a physical Android device. Confirm the foreground notification is visible and the admin timestamp continues updating with the screen locked. Also test Delivered/logout and denied permissions.

## Security and reliability notes

- The bearer token is passed to the service in memory through an Android intent; never print it to logs or store it in source control.
- This service needs a review for Android foreground-service start restrictions, Android 13+ notification permission, runtime location permission flow, and Android 14+ location foreground-service requirements before operational use.
- Verify that the backend accepts the exact trip ID type and that the server rejects a driver attempting to update another driver's trip.
- A successful build is not proof of background behavior; real-device testing is required.
- iOS requires a separate Core Location implementation and a macOS/Xcode build.
