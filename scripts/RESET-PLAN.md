# Emergency Delivery – Testdaten-Reset (Plan, noch nicht ausführen)

## Ziel
Alle Kunden sind Testkunden und alle Finanzdaten sind Testdaten. Entfernt werden sollen außerdem Aufträge, Fahrten, Stopps, zugehörige Lieferdokumente/GPS-Daten sowie alle Einträge in `notification_inbox`.

## Unbedingt erhalten
- `users` einschließlich Login-Daten/Passworthashes
- Rollen, Berechtigungen und mitarbeiterbezogene Stammdaten
- `company_settings`
- Fahrzeuge und Fahrzeugkonfiguration einschließlich Wartungsplänen/-dokumenten und Fahrzeugkosten/-tankdaten, sofern diese Konfiguration bzw. echte Mitarbeiter-/Fahrzeugdaten darstellen
- `audit_log`

## Tabellen, die im Code als kunden-/auftrag-/fahrtrelevant erscheinen
- `customers`, `orders`, `trips`, `trip_stops`
- `delivery_documents`, `gps_points`
- `trip_costs`, `invoices` und weitere Rechnungs-/Finanztabellen (müssen aus der tatsächlichen Datenbankliste identifiziert werden)
- `transport_requests`, `transport_offers`
- `customer_communication_outbox`, `communication_delivery_events`, `customer_delay_notifications`
- `order_event_links`, `trip_event_links`, `stop_event_links`, `notification_event_links`
- `notification_inbox` (Benachrichtigungen sollen vollständig geleert werden)

## Vor jeder Löschung erforderlich
1. Backup nachweislich vorhanden und wiederherstellbar.
2. Tatsächliche Tabellen und Fremdschlüssel aus der gehosteten PostgreSQL-Datenbank abrufen.
3. Alle Finanz-/Buchhaltungs-Tabellen explizit bestimmen. Nicht allein anhand des Namens löschen.
4. Vorher-Zählungen für alle betroffenen Tabellen speichern.
5. In einer Transaktion zuerst abhängige Datensätze und dann Stammdaten löschen; bei Fehler Rollback.
6. Prüfen, dass Mitarbeiterkonten, Berechtigungen, Einstellungen, Fahrzeugstammdaten und Audit-Protokoll unverändert sind.
7. Nachher-Zählungen und App-Anmeldung/Funktion prüfen.

## Sicherheitsstatus
Dieses Dokument ist nur ein Prüf- und Ausführungsplan. Es enthält absichtlich keine DELETE/TRUNCATE-Anweisungen und führt keine Datenbankoperation aus. Der Code-Repository-Zugriff kann die Live-Datenbank nicht auslesen oder ändern; die SQL-Vorprüfung muss in der gehosteten Datenbank ausgeführt werden, bevor eine sichere konkrete Löschliste erstellt werden kann.
