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


## Fourth cleanup pass (2026-10-11)

Additional server-side cleanup committed on the review branch:

- Control-center trip snapshots no longer return current driver coordinates or GPS freshness/status; ETA and active-stop data remain.
- Legacy heartbeat accepts no location values and no longer updates GPS coordinate/timestamp fields.
- Admin live control-center/map feeds no longer include current driver coordinates or GPS ping age; route/stop geometry remains.
- GPS geofence-check/automatic-arrival routes now return HTTP 410 with instructions to confirm arrival manually.
- GPS-based alert sweep/background worker and GPS-only alert creation were removed; ETA-overdue alert checking remains.
- Delivery proof capture no longer accepts or stores new proof coordinates; photos, signatures, timestamps and device metadata remain.
- GPS-history queries were removed from the old dispatch trip snapshot; historical database records and schema were not deleted.

## Validation boundary

- All edits remain isolated on `review/remove-driver-gps-tracking`; `main` and the live deployment have not been changed.
- The HTML source scan on this branch found no remaining `gps`, `geolocation`, `current_lat`, `current_lng` or live-map placeholder references.
- This is not yet a verified release: a server-side source scan still needs review for legacy location references and a real Node/build + driver/admin regression test run is unavailable through the repository file editor. In particular, existing historical proof coordinates and legacy schema columns are retained, and the separate Android prototype branch has not been modified.
- Do not merge or deploy until a runtime/preview test confirms driver status updates, manual arrival, proof photos/signatures, route planning, maps and ETA.


## Fifth cleanup pass (2026-10-11)

- Removed the remaining customer-facing tracking API coordinate fields and GPS coordinates from delivery-document output.
- Removed GPS-status notification generation.
- Removed initialization of legacy GPS status/timestamp/accuracy columns. Existing database columns and historic data are deliberately not dropped.
- Final source scan of `server.js` on this branch found no references to `current_lat`, `current_lng`, `gps_points`, `proof_lat`, `proof_lng`, `gps_status`, `gps_last_at`, or geolocation APIs.
- Final source scan of `index.html` found no GPS/geolocation/live-map references.

## Current verification status

- The branch is 25 commits ahead of `main`, with no changes merged into `main`.
- No GitHub Actions workflow run was associated with the latest cleanup commit, and `package.json` defines desktop packaging scripts but no test/lint script.
- A real application launch, API regression suite, and desktop/mobile packaging were not executed here. This branch is source-clean by keyword scan but is **not yet release-verified**.
- The separate `prototype/capacitor-mobile-gps` branch and any locally installed APK/desktop builds are outside this review branch and are not changed by these commits.
- Historical GPS/proof records remain in the database; removing them would be a separate, destructive data-retention decision.


## Sixth cleanup pass (2026-10-11)

- Removed the legacy `gps` permission from the driver role capability response.
- Removed the obsolete empty-live-map placeholder helper from the web UI.
- Removed GPS push-notification preference handling and initialization of the GPS alert timestamp column.
- Rechecked the current review branch: `server.js` has no remaining references to driver coordinate fields, GPS history/proof fields, GPS status timestamps, geolocation APIs, or GPS-only alert codes; `index.html` has no GPS/live-map UI references.
- Routing coordinates for customer addresses and planned stops remain intentionally supported for route calculation and mapping. This is not driver tracking.

## Release gate

The review branch must remain unmerged until someone can run the app and verify the main workflows in a preview. Source keyword checks are not a substitute for syntax/runtime testing. No build, API regression suite, or mobile package has been run from this environment.
