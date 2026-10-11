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
