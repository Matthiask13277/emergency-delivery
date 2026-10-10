# Emergency Delivery Mobile (prototype)

This folder is isolated from the existing Electron/Blitz.cloud app. It does not change the root package scripts or production deployment.

## Current stage

This is only the Capacitor wrapper scaffold. It loads the existing hosted web app. It does **not** implement background GPS yet.

## Build on a development machine

1. Install Node.js LTS and Git.
2. From this folder, run `npm install`.
3. Run `npx cap add android` on a machine with Android tooling available.
4. For iOS, run `npx cap add ios` and build on macOS with Xcode.
5. Add and configure a native background-location implementation, permission disclosures, and authenticated uploads to `POST /api/driver/gps`.

## Background tracking requirements

- A JavaScript timer in a WebView/PWA is not a reliable background tracking mechanism.
- Android requires a properly declared location foreground service and runtime permissions, including notification behavior as applicable to the target Android version.
- iOS requires the appropriate location usage descriptions, background location capability, and user authorization.
- The driver must be clearly informed when location is collected. Tracking must only run for an active trip and stop when the trip is delivered.
- Validate screen-locked behavior on real devices, including denied permissions, battery saver, app termination, and loss of network.

Do not use this prototype for operational fleet tracking until the native tracking implementation is complete and tested.
