# Driver GPS tracking removal — isolated review branch

Branch: `review/remove-driver-gps-tracking`
Base: `main`

## Scope confirmed by owner

Remove:
- driver GPS collection and transmission (automatic polling, manual GPS button/action, offline queued GPS actions);
- admin/dispatcher live vehicle GPS map and GPS-only refresh behavior;
- dedicated server endpoints used only for driver live GPS collection and the dedicated fleet live GPS list;
- native Android background GPS prototype/service and its permission/service wiring where present.

Preserve:
- route planning and stop coordinates;
- route maps, route optimization and ETA calculations;
- proof of delivery, signatures and photos;
- delivery status, customer, dispatch, accounting and all other unrelated features.

## Important boundary

This is a review-only branch. Do not merge or deploy to `main` until the diff and tests have been reviewed and the owner explicitly approves. Do not delete historical `gps_points` rows or database columns as part of this code change.

## Source inventory

- `index.html` — `startAutoGps`, `stopAutoGps`, `gps(id)`, driver status lifecycle calls, offline `type:"gps"` queue handling, admin `live()` view calling `/api/fleet/live`.
- `server.js` — `POST /api/driver/gps`, `GET /api/fleet/live`. Shared `/api/control-center/live`, sync, proof capture and route/ETA handlers also read or update location-related fields and must be audited individually; do not remove their route/stop coordinate behavior.
- `mobile/android-prototype/DriverLocationPlugin.java` and `DriverLocationService.java` — native background tracking scaffolding on the separate Capacitor prototype branch. These are not production-branch files and must not be copied into this branch.

## Regression checklist before approval

- Driver can sign in and see assigned deliveries.
- Driver can change trip/stop statuses.
- Proof photo and signature flows work.
- Route planning, stop coordinates, map directions, optimization and ETA still work.
- Admin/dispatcher pages load without live driver GPS map or GPS polling.
- No frontend requests are sent to `/api/driver/gps` or `/api/fleet/live`.
- No GPS actions are added to the offline queue.
- Existing historical GPS data is untouched.
- Server and frontend syntax/build checks pass.
- Review all changes and test on a preview deployment before merging.


## Follow-up audit (2026-10-11)

The first code pass is not yet ready to merge. A second server-side audit found additional GPS entry points and consumers that the initial removal did not cover:

- Additional collection endpoints: `POST /api/gps` and `POST /api/driver/live-gps`.
- Offline sync accepts `type: "gps"` and writes to `gps_points` / trip current coordinates. This handler must reject/remove GPS actions without disrupting status sync.
- Control-center endpoints expose driver coordinates and GPS status; the live fleet/control-center UI consumers must be mapped before removing these payload fields.
- Stale-GPS alerts and several dashboard/report routes read GPS history. GPS-only alerts and tracking panels should be removed, while route/ETA logic must be preserved or deliberately switched to stop-based ETA.
- Some proof/arrival flows update trip coordinates and may rely on geofencing. These are a separate product behavior from continuous driver tracking and must not be deleted without verifying the proof and stop-completion flow.
- The HTML still has a leftover live-map placeholder/navigation fragment to fully clean up.

## Validation status

- Production branch `main`: unchanged.
- Review branch: partial changes committed.
- Runtime/build/regression tests: not run in this environment.
- Do not merge/deploy yet. Further removal is needed and a real preview test is required before approval.


## Additional cleanup pass (2026-10-11)

Completed on the isolated review branch:

- Removed the remaining `POST /api/gps` route.
- Removed the GPS action branch from offline sync while retaining status/stop sync.
- Removed the remaining `POST /api/driver/live-gps` ingestion route in the earlier pass.
- Removed the live-fleet view placeholder from the web UI.
- Removed the bootstrap payload's query and response field for recent GPS history (the underlying database table/data are untouched).
- Removed the driver-position marker from the control-center map-data feed; stop markers and route data remain.

Still outstanding and requiring careful consumer review:

- The server contains additional control-center/live endpoints that return GPS status/coordinates or calculate ETA from the last driver coordinate.
- GPS-stale alert generation and older report/dashboard routes still read GPS history.
- Some stop/proof handlers accept coordinates or update trip location fields; these should be separated from continuous tracking without breaking proof capture or stop completion.
- The trip PATCH API still permits current_lat/current_lng; remove these from driver-editable fields after confirming no route-planning consumer depends on that patch.
- No runtime tests/build have been run; this branch is not ready to merge/deploy.


## Third cleanup pass (2026-10-11)

Completed on the review branch:

- Trip PATCH no longer accepts `current_lat` / `current_lng` from drivers or admins; the authorization guard was updated consistently.
- Removed the dedicated `GET /api/dispatch/live-map-v74/:id` endpoint, which returned the last GPS point and GPS-derived ETA.
- Removed current driver coordinates from the `GET /api/fleet/status` response while retaining fleet/status and stop-count fields.

Important remaining work:

- Other legacy endpoints still expose GPS status and coordinates, including `/api/control-center/trip/:id/live`, `/api/control-center/trip/:id/live-full`, the heartbeat endpoint, and stale-GPS alert checks.
- Geofence-check endpoints explicitly require a submitted location; disable these if the product should no longer transmit any driver location, but confirm stop completion is not wired to them.
- Delivery-proof handlers accept proof coordinates and may store them with the proof record. Photo/signature proof should remain; decide whether to remove proof-coordinate capture separately.
- Historical GPS table and schema are intentionally untouched; no records have been deleted.
- Runtime/build/regression tests remain unrun. Do not merge or deploy until the remaining consumers are reviewed and a preview passes.
