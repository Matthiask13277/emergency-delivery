package com.emergencydelivery.mobile;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class DriverLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.emergencydelivery.mobile.GPS_START";
    public static final String ACTION_STOP = "com.emergencydelivery.mobile.GPS_STOP";
    public static final String EXTRA_TRIP_ID = "tripId";
    public static final String EXTRA_TOKEN = "token";
    private static final String CHANNEL_ID = "driver_location";
    private static final int NOTIFICATION_ID = 4201;
    private static final String GPS_ENDPOINT =
        "https://emergency-delivery.emergency-delivery1.blitz.cloud/api/driver/gps";

    private LocationManager locationManager;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private String tripId;
    private String token;
    private boolean running;

    @Override public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        tripId = intent.getStringExtra(EXTRA_TRIP_ID);
        token = intent.getStringExtra(EXTRA_TOKEN);
        if (tripId == null || tripId.trim().isEmpty() || token == null || token.trim().isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(NOTIFICATION_ID, buildNotification());
        if (!hasLocationPermission()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 15000L, 0f, this, Looper.getMainLooper());
            running = true;
        } catch (SecurityException | IllegalArgumentException ex) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_NOT_STICKY;
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override public void onLocationChanged(Location location) {
        if (!running || location == null || tripId == null || token == null) return;
        final String activeTrip = tripId;
        final String activeToken = token;
        final double lat = location.getLatitude();
        final double lng = location.getLongitude();
        final float accuracy = location.hasAccuracy() ? location.getAccuracy() : 0f;
        network.execute(() -> sendLocation(activeTrip, activeToken, lat, lng, accuracy));
    }

    private void sendLocation(String activeTrip, String activeToken, double lat, double lng, float accuracy) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(GPS_ENDPOINT);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Authorization", "Bearer " + activeToken);
            JSONObject body = new JSONObject();
            body.put("tripId", activeTrip);
            body.put("lat", lat);
            body.put("lng", lng);
            body.put("accuracy", accuracy);
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
            int status = connection.getResponseCode();
            if (status == 401 || status == 403 || status == 404) {
                // Invalid session or trip: stop rather than repeatedly transmit.
                stopTracking();
                stopSelf();
            }
        } catch (Exception ignored) {
            // Temporary network failures are not fatal; the next location can retry.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private Notification buildNotification() {
        return new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Emergency Delivery")
            .setContentText("Standort wird während der aktiven Tour übertragen")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Fahrer-Standort", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Zeigt an, wenn Standort während einer aktiven Tour geteilt wird.");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private void stopTracking() {
        running = false;
        if (locationManager != null) {
            try { locationManager.removeUpdates(this); } catch (SecurityException ignored) {}
        }
        tripId = null;
        token = null;
    }

    @Override public void onDestroy() {
        stopTracking();
        network.shutdownNow();
        super.onDestroy();
    }

    @Override public void onProviderDisabled(String provider) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override public IBinder onBind(Intent intent) { return null; }
}
