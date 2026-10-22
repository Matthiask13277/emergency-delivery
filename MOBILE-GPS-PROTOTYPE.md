# Mobile GPS prototype (Android + iOS)

This branch is an isolated prototype; it does not change `main` or the live Blitz.cloud deployment.

## Current state

- The existing web app remains hosted at `https://emergency-delivery.emergency-delivery1.blitz.cloud`.
- `capacitor.config.json` describes the proposed Capacitor app identity and hosted app.
- `mobile-shell/index.html` is a minimal local shell for the initial wrapper experiment.
- This is **not yet a working background-GPS implementation**. Native Android/iOS projects, dependencies, native location handling, permission flows, and real-device tests still need to be added.

## Required before operational use

1. Install and pin a compatible Capacitor toolchain and required packages.
2. Generate Android and iOS projects with Capacitor CLI.
3. Implement native background location separately for Android and iOS, including foreground-service/notification behavior where required and iOS background location capabilities.
4. Send location updates securely to the existing authenticated `POST /api/driver/gps` endpoint only while a driver has an active trip.
5. Clearly disclose location collection to drivers and request platform permissions; provide a stop condition when a trip is delivered.
6. Test on real Android and iPhone devices with screen locked, app backgrounded, battery saver enabled, permissions denied/re-enabled, and network unavailable.
7. Review the security model before release. Do not treat a successful build or a foreground test as proof of reliable background tracking.

## Important

A Capacitor wrapper alone does not make JavaScript timers run in the background. Do not merge this prototype into `main` or use it for operational fleet tracking until native location behavior has been implemented and validated.
