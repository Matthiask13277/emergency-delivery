# GPS removal audit — review before any production change

Date: 2026-10-11
Repository: `Matthiask13277/emergency-delivery`
Production branch inspected: `main`
Native prototype branch inspected: `prototype/capacitor-mobile-gps`

## Safety rule

This is an inventory only. No production files, database records, deployed app, or live branch were changed. Do not merge this audit or remove code until the owner confirms the exact scope and the changes are tested.

## Findings

### A. Driver location collection and transmission — remove

In production `index.html`:
- `startAutoGps`, `stopAutoGps`, and `edGpsWatchers` / `edGpsLastSent`.
- Periodic browser geolocation polling and the manual `gps(id)` function.
- Calls to `POST /api/driver/gps`.
- Client-side writes to `current_lat`, `current_lng`, and `last_driver_ping_at` following location updates.
- Offline queue actions with `type: "gps"`.
- Driver UI/lifecycle calls that start polling when status becomes `In Transit`.

### B. Admin/dispatcher live GPS display — remove

In production `index.html`:
- `live()` loads `GET /api/fleet/live`.
- Fleet live view displays driver coordinates, last update timestamp, and a Google Maps link.
- Remove its refresh/timer or page lifecycle calls once the view is removed.

In production `server.js`:
- `GET /api/fleet/live` returns trips with non-null current coordinates.
- `POST /api/driver/gps` stores GPS points and updates trip coordinates.
- A separate control-center/fleet data endpoint includes `current_lat`, `current_lng`, `last_driver_ping_at`, and GPS status/age fields. Exact consumers need a second pass before changing that shared endpoint.

### C. Native Android background GPS prototype — remove

On `prototype/capacitor-mobile-gps`:
- `mobile/android-prototype/DriverLocationPlugin.java`
- `mobile/android-prototype/DriverLocationService.java`
- `mobile/android-prototype/AndroidManifest.xml` (prototype template only; do not copy over generated manifest)
- `mobile/android-prototype/capacitor-bridge.js`
- related setup/checklist docs and any plugin registration/service declarations in the local generated Android project.

The installed APK was previously reported to load the hosted production web app. A native service source file existing locally does not prove it is active in the APK.

### D. Shared coordinate data and map/route features — requires explicit scope decision

`server.js` also uses coordinate fields for:
- trip stop addresses/coordinates and route calculations/ETA;
- map/route response payloads that include a driver marker when `current_lat/current_lng` exist;
- delivery proof capture endpoints that may accept coordinates and update trip location fields;
- stale-GPS alerts and GPS status metadata;
- sync payloads containing location-related trip fields.

Some of these are not the same as live driver tracking: stop coordinates can support route planning and delivery workflows. Removing all coordinates and map/route functionality could affect navigation, ETA, proof-of-delivery, and dispatch. These should not be deleted blindly as part of removing driver tracking.

## Suggested safe sequence

1. Confirm whether “all GPS” means (a) driver live/background tracking + admin live location, or also (b) all stop geocoding, route maps/ETA, and coordinate capture during proof of delivery.
2. Make the removal on an isolated review branch first, not on `main`.
3. Remove the matching client collection/UI and dedicated server endpoints; audit every consumer before changing shared trip/sync payloads or database schema.
4. Keep unrelated trip status, proof photo/signature, dispatch, customer, and delivery workflows working.
5. Run syntax/build checks and targeted regression checks. Review the diff and behavior before any production merge/deployment.
6. Only after explicit approval should the reviewed change be merged/deployed. Do not delete existing GPS database records unless separately requested.

## Initial source references

- `index.html`: automatic driver geolocation around the `startAutoGps` / `gps(id)` functions; fleet live view around `live()`.
- `server.js`: `POST /api/driver/gps`, `GET /api/fleet/live`, plus fleet/control-center/sync/ETA/proof-capture handlers using trip coordinate fields.
- Native scaffolding under `mobile/android-prototype/` on the prototype branch.
