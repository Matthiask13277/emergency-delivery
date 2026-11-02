# Admin-Testdaten-Reset: Implementierungsstatus

Dieses Dokument ist der aktuelle Arbeitsstand für die sichere Reset-Funktion.

## Live-Prüfung bestätigt (Screenshots vom 02.11.2026)

Die Admin-Prüfung wurde in der gestarteten Blitz-Live-App erfolgreich ausgeführt. Sie meldet:
- 33 Tabellen
- 27 Fremdschlüssel
- 412 Spalten
- `audit_log`: 378 Einträge
- `calendar_events`: 2 Einträge
- `company_settings`: 1 Eintrag
- `control_alerts`: 862 Einträge
- `customer_communication_outbox`, `customer_delay_notifications` und `customer_portal_tokens`: jeweils 0
- `vehicles`: 1 Eintrag (aus dem vorherigen sichtbaren Tabellen-Count)

Sichtbare Fremdschlüsselbeziehungen umfassen unter anderem:
- Kunden → `customer_communication_outbox`, `customer_portal_tokens`, `email_outbox`, `invoices`, `orders`, `transport_requests`, `trips`
- Rechnungen → `invoice_dunning`
- Aufträge → `order_event_links`
- Transportanfragen → `transport_offers`
- Fahrtstopps → `customer_delay_notifications`, `stop_event_links`
- Fahrten → `control_alerts`, `delivery_documents`, `gps_points`, `invoices`, `orders`, `trip_event_links`, `trip_stops`
- Benutzer → `calendar_events`, `gps_points`, `notification_inbox`, `push_subscriptions`, `trips`
- Fahrzeuge → `trips`, `vehicle_documents`, `vehicle_maintenance_plans`

Die UI zeigt bei einzelnen Fremdschlüsseln explizit `ON DELETE CASCADE` und `ON DELETE SET NULL`; bei weiteren Beziehungen ist keine solche Aktion ausgewiesen. Das ist vor jeder Löschplanung pro Constraint zu berücksichtigen. Die Screenshots zeigen außerdem, dass `audit_log`, `users`, `company_settings` und `vehicles` echte Live-Tabellen sind.

## Erledigt
- Separater Branch `admin-test-data-reset`
- Sicherheits- und Freigabeanforderungen dokumentiert
- Admin-geschützte, ausschließlich lesende Live-Prüfroute und UI
- Live-Prüfung mit Tabellenanzahl, Zeilenzahlen, Spalten und Fremdschlüsselregeln erfolgreich
- Keine Änderung an den Live-Datensätzen

## Was noch fehlt
Die Screenshots liefern die Live-Struktur und wichtige Beispiele, aber nicht alle 27 Constraint-Zeilen und nicht alle 412 Spalten vollständig lesbar/exportierbar. Insbesondere belegen sie nicht, welche Datensätze eindeutig Testdaten sind. Die Anzahl in `control_alerts` (862) zeigt zudem, dass diese Tabelle nicht pauschal geleert werden darf, ohne ihren Inhalt und ihre Zuordnung zu prüfen.

## Nächster sicherer technischer Schritt
1. Die vollständigen Preflight-Ergebnisse maschinenlesbar sichern (alle 33 Tabellen, 27 Fremdschlüssel mit Delete-Regel und 412 Spalten).
2. Datensatzherkunft und Verknüpfungen der Kunden-, Auftrags-, Rechnungs-, Transport- und Fahrtdaten prüfen.
3. Eine explizite Allowlist zu löschender Testdatensätze und Blocklist geschützter Tabellen/-Datensätze erstellen.
4. Den Reset ausschließlich in einer wiederhergestellten Backup-Kopie implementieren und testen.
5. Erst danach die Admin-UI und serverseitige POST-Route mit erneuter Admin-Prüfung, bcrypt-Passwortprüfung, Bestätigungstext, Transaktion, Rollback und Audit-Eintrag hinzufügen.

## Sicherheitsgrenze
Kein automatischer Reset auf Basis bloßer Tabellennamen, keine `TRUNCATE ... CASCADE`-Anweisung, kein Löschen von `users`, `company_settings`, Fahrzeugkonfiguration oder `audit_log`. Mitarbeiterdaten, Rollen, Berechtigungen, Passwort-Hashes, Fahrzeuge und deren Dokumente/Wartungspläne bleiben geschützt. Der Reset darf erst freigegeben werden, wenn Tests nachweisen, dass Mitarbeiter- und Konfigurationsdaten erhalten bleiben.


## Ein-Klick-Export für mobile Nutzung

Die Admin-Oberfläche enthält bereits die Schaltfläche **„Prüfergebnisse exportieren“**. Die zugehörige API wurde erweitert und liefert jetzt zusätzlich zum Tabelleninventar, den Datensatzanzahlen und Fremdschlüsseln auch sämtliche Spaltenmetadaten aus `information_schema.columns` (Tabellenname, Spaltenname, Datentyp, NULL-Zulässigkeit, Default und Position). Damit enthält die JSON-Datei den vollständigen strukturellen Prüfbericht. Der Export ist rein lesend und verändert keine Daten.

Ablauf am Handy: **„Datenbank sicher prüfen“** antippen, danach **„Prüfergebnisse exportieren“** antippen und die heruntergeladene Datei hier im Chat anhängen. Die Oberfläche muss dafür nicht durch alle Tabellen gescrollt werden.

Hinweis: Der neue API-Stand liegt im Entwicklungsbranch/PR und wird erst nach dem vorgesehenen Blitz-Push in der Live-App wirksam. Vorherige Live-Versionen liefern den bisherigen Bericht.
