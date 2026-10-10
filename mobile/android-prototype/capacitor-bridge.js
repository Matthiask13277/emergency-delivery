/**
 * Capacitor bridge for the Android background location plugin.
 *
 * This helper is intentionally opt-in. It does nothing in a normal browser/PWA.
 * Call startNativeDriverLocation(tripId, token) when a driver starts an active
 * trip, and stopNativeDriverLocation() when the trip is delivered or the driver
 * logs out. The web app must be rebuilt/reloaded with this file included before
 * the native service can be used.
 */
(function () {
  "use strict";

  const plugin = () => window.Capacitor?.Plugins?.DriverLocation;

  window.startNativeDriverLocation = async function (tripId, token) {
    const nativePlugin = plugin();
    if (!nativePlugin || !tripId || !token) return { available: false };

    try {
      const result = await nativePlugin.start({
        tripId: String(tripId),
        token: String(token)
      });
      return { available: true, started: result?.started === true };
    } catch (error) {
      console.warn("Native background GPS could not start:", error?.message || error);
      return { available: true, started: false, error: String(error?.message || error) };
    }
  };

  window.stopNativeDriverLocation = async function () {
    const nativePlugin = plugin();
    if (!nativePlugin) return { available: false };

    try {
      const result = await nativePlugin.stop();
      return { available: true, stopped: result?.stopped === true };
    } catch (error) {
      console.warn("Native background GPS could not stop:", error?.message || error);
      return { available: true, stopped: false, error: String(error?.message || error) };
    }
  };
})();
