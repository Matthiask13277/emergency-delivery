# iOS background location prototype

This is source scaffolding only. It is not a generated Xcode project and has not been compiled or tested on an iPhone.

## Required integration
1. Generate the iOS project with Capacitor on macOS using Xcode.
2. Add the native location manager to the generated app target and connect start/stop calls to the authenticated driver trip lifecycle.
3. Configure the required location usage descriptions and Background Modes > Location updates in Xcode. Request authorization in a clear, user-facing flow.
4. Start only for the signed-in driver's active trip; stop on Delivered, logout, reassignment, or revoked permission.
5. Upload fixes to the existing authenticated `POST /api/driver/gps` endpoint over HTTPS. Keep tokens out of logs and source control.
6. Test on real iPhones with the screen locked, Low Power Mode, permission changes, network loss, and app termination.

iOS decides when background location updates are delivered. This scaffold does not guarantee a fixed 15-second cadence or continued updates in every system state. Do not use operationally until built, reviewed, and device-tested.
