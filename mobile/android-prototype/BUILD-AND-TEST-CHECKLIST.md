# Android build and test checklist

This prototype is not yet compiled and must not be used for operational tracking.

## Integration steps
1. Generate the Android project from the separate `mobile/` Capacitor package using the pinned Capacitor CLI.
2. Copy `DriverLocationService.java` into the generated app module package `com/emergencydelivery/mobile/`.
3. Merge the permissions and service declaration from `AndroidManifest.xml` into the generated manifest.
4. Add a Capacitor plugin bridge to start and stop the service from the authenticated driver app. Pass the active trip ID and bearer token at runtime; never hard-code credentials or log tokens.
5. Start tracking only when the logged-in driver has an active trip. Stop on Delivered, logout, trip reassignment, or permission revocation.
6. Confirm all permissions and foreground-service declarations meet the targeted Android version requirements.

## Required real-device tests
- Screen locked for at least 10 minutes while a trip is In Transit.
- Delivered status stops location transmission.
- Permission denied and revoked while running.
- Battery saver enabled and app moved to background.
- Network unavailable and restored.
- Expired login token and server-side authorization rejection.

Do not merge this prototype into `main` or use it for fleet operations until integration, build, security review, and all relevant device tests pass.