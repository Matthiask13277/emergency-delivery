# Mobile background GPS prototype — next steps

This folder is isolated from the production app. No native build has been run yet.

## Important findings
- The root project is an Electron/Windows app, not a generated Capacitor Android/iOS project.
- `mobile/package.json` is a separate package to avoid changing root Electron dependencies.
- Android and iOS source snippets are scaffolding only. They are not wired into the web driver's active-trip lifecycle and have not been compiled.

## Recommended build order

### Android first (Windows PC)
1. Install Git and Android Studio. Install a supported JDK and Android SDK through Android Studio.
2. Clone the repository and switch to `prototype/capacitor-mobile-gps`.
3. Enter `mobile`, run `npm install`, then generate the Android project using Capacitor.
4. Integrate the Java service and plugin into the generated Android app, merge manifest declarations, and register the plugin.
5. Add a safe bridge in the driver UI that starts tracking only after login and only for the driver's active trip. Pass the existing auth token at runtime; do not persist or log it in plain text.
6. Stop the service on Delivered, logout, trip reassignment, and permission revocation.
7. Build, install, and test on a physical Android phone before considering any merge.

### iOS
1. Generate the iOS project with Capacitor on macOS using Xcode.
2. Integrate the Swift location manager, configure Info.plist location usage strings and Background Modes / Location updates, and register the native bridge.
3. Test on a physical iPhone. iOS controls background scheduling and may pause location updates; a fixed update interval cannot be promised.

## Required acceptance criteria
- No GPS transmission until the driver is authenticated and an active trip is marked In Transit.
- A visible platform-appropriate indicator explains that location is being shared.
- Tracking stops on Delivered, logout, trip reassignment, and permission revocation.
- Admin live-fleet timestamp changes while device screen is locked during a real trip.
- Unauthorized, expired-token, wrong-driver, and wrong-trip requests are rejected.
- Test battery saver / Low Power Mode, no network, and app restart.
- No tokens, coordinates, or personal data written to debug logs unnecessarily.

## Do not merge yet
The prototypes are incomplete, not compiled, and not device-tested. Do not use them for operational tracking or merge them to `main` until the acceptance criteria pass.
