package com.emergencydelivery.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
    name = "DriverLocation",
    permissions = {
        @com.getcapacitor.annotation.Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        )
    }
)
public final class DriverLocationPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String tripId = call.getString("tripId");
        String token = call.getString("token");
        if (tripId == null || tripId.trim().isEmpty() || token == null || token.trim().isEmpty()) {
            call.reject("Aktive Tour und Anmeldung sind erforderlich.");
            return;
        }
        if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && getContext().checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Standortberechtigung fehlt. Bitte zuerst in der App erlauben.");
            return;
        }
        Intent intent = new Intent(getContext(), DriverLocationService.class);
        intent.setAction(DriverLocationService.ACTION_START);
        intent.putExtra(DriverLocationService.EXTRA_TRIP_ID, tripId);
        intent.putExtra(DriverLocationService.EXTRA_TOKEN, token);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(getContext(), intent);
            } else {
                getContext().startService(intent);
            }
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("GPS-Dienst konnte nicht gestartet werden: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), DriverLocationService.class);
        intent.setAction(DriverLocationService.ACTION_STOP);
        getContext().startService(intent);
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }
}
