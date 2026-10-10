# Android native GPS service prototype

This is source scaffolding only, not a generated Android Studio project or a tested APK.

## Included
- A location foreground service using Android's `LocationManager`.
- Foreground notification while location sharing is active.
- HTTPS POSTs to the existing `/api/driver/gps` endpoint with the driver's bearer token and trip ID.
- Stop action via service intent; the calling app must stop the service when the trip is marked Delivered.

## Not yet complete
- This folder is not yet a complete Gradle/Capacitor Android project.
- No UI bridge currently starts the service or supplies authenticated trip details.
- Must test and adapt permissions/foreground-service declarations for supported Android versions and Play policy.
- A token must be obtained from the existing authenticated login flow and kept securely; never hard-code credentials.
- Native code needs compile and real-device testing before use.

Do not deploy or rely on this scaffold for operational tracking yet.
