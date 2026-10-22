import Foundation
import CoreLocation

/// Prototype only: integrate with the generated Capacitor iOS app and its
/// authenticated driver-trip lifecycle before use. Not yet compiled or device-tested.
final class DriverLocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private let endpoint = URL(string: "https://emergency-delivery.emergency-delivery1.blitz.cloud/api/driver/gps")!
    private var tripId: String?
    private var bearerToken: String?
    private var session: URLSession = .shared

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 10
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = true
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func start(tripId: String, bearerToken: String) {
        guard !tripId.isEmpty, !bearerToken.isEmpty else { return }
        self.tripId = tripId
        self.bearerToken = bearerToken
        manager.requestAlwaysAuthorization()
        manager.startUpdatingLocation()
    }

    func stop() {
        manager.stopUpdatingLocation()
        tripId = nil
        bearerToken = nil
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last,
              let tripId = tripId,
              let bearerToken = bearerToken else { return }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "tripId": tripId,
            "lat": location.coordinate.latitude,
            "lng": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: body) else { return }
        request.httpBody = data
        session.dataTask(with: request) { [weak self] _, response, _ in
            guard let http = response as? HTTPURLResponse else { return }
            if http.statusCode == 401 || http.statusCode == 403 || http.statusCode == 404 {
                DispatchQueue.main.async { self?.stop() }
            }
        }.resume()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Integrate user-visible diagnostics in the app; never log access tokens.
    }
}
