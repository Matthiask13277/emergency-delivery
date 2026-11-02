# Sicherer Bereinigungsplan für Testdaten

## Status und Geltungsbereich

Dieser Plan basiert auf dem schreibgeschützten Live-Export vom 2026-11-02T12:38:53Z. Der Export meldet ausdrücklich `read_only: true`; er enthält Bestandszahlen, Spalten und 27 Fremdschlüssel. **Dieser Plan führt keine Datenbankänderungen aus.**

Ziel ist, bestätigte Test-Kunden- und Betriebsdaten zu entfernen, ohne Mitarbeiterkonten, Authentifizierungsdaten, Berechtigungen, Firmenkonfiguration, Fahrzeuge oder Audit-Historie zu verändern.

## Bestandsaufnahme aus dem Export

| Tabelle | Zeilen |
|---|---:|
| audit_log | 378 |
| calendar_events | 2 |
| communication_templates | 0 |
| company_settings | 1 |
| control_alerts | 862 |
| customer_communication_outbox | 0 |
| customer_delay_notifications | 0 |
| customer_portal_tokens | 0 |
| customers | 7 |
| delay_escalation_rules | 3 |
| delivery_documents | 17 |
| email_outbox | 0 |
| fuel_entries | 0 |
| gps_points | 28 |
| invoice_dunning | 0 |
| invoices | 0 |
| notification_event_links | 851 |
| notification_inbox | 2166 |
| order_event_links | 22 |
| orders | 22 |
| push_subscriptions | 7 |
| stop_event_links | 0 |
| transport_offers | 3 |
| transport_requests | 3 |
| trip_costs | 0 |
| trip_event_links | 44 |
| trip_stops | 17 |
| trips | 17 |
| users | 5 |
| vehicle_costs | 0 |
| vehicle_documents | 0 |
| vehicle_maintenance_plans | 0 |
| vehicles | 1 |

## Geschützte Daten – niemals Teil eines Löschumfangs

- `users`: alle 5 Konten einschließlich Passwort-Hashes, Rollen, Berechtigungen und Mitarbeiterprofilen.
- `company_settings`: Firmendaten und Abrechnungs-/Bankkonfiguration.
- `vehicles`: Fahrzeugstammdaten.
- `audit_log`: vollständige Historie (378 Zeilen).
- `delay_escalation_rules`: 3 Regeln als Konfiguration.
- `calendar_events`: zunächst erhalten, da 2 Termine Mitarbeiterbezug haben können.
- `push_subscriptions`: zunächst erhalten, da 7 Registrierungen zu Mitarbeitern gehören können.
- `fuel_entries`, `vehicle_costs`, `vehicle_documents`, `vehicle_maintenance_plans`: als Fahrzeugdaten schützen, auch wenn der Export aktuell 0 Zeilen zeigt.

Kein pauschales Leeren von Tabellen, kein `TRUNCATE ... CASCADE`, kein Löschen von Benutzern oder Fahrzeugen.

## Fremdschlüssel-Abhängigkeiten aus dem Export

| Kindtabelle | Bezugstabelle | Löschregel |
|---|---|---|
| customer_communication_outbox | customers | CASCADE |
| customer_portal_tokens | customers | CASCADE |
| email_outbox | customers | SET NULL |
| invoices | customers | NO ACTION |
| orders | customers | NO ACTION |
| transport_requests | customers | NO ACTION |
| trips | customers | NO ACTION |
| invoice_dunning | invoices | CASCADE |
| order_event_links | orders | CASCADE |
| transport_offers | transport_requests | CASCADE |
| customer_delay_notifications | trip_stops | CASCADE |
| stop_event_links | trip_stops | CASCADE |
| control_alerts | trips | CASCADE |
| delivery_documents | trips | CASCADE |
| gps_points | trips | CASCADE |
| invoices | trips | NO ACTION |
| orders | trips | SET NULL |
| trip_event_links | trips | CASCADE |
| trip_stops | trips | CASCADE |
| calendar_events | users | NO ACTION |
| gps_points | users | NO ACTION |
| notification_inbox | users | CASCADE |
| push_subscriptions | users | CASCADE |
| trips | users | NO ACTION |
| trips | vehicles | NO ACTION |
| vehicle_documents | vehicles | CASCADE |
| vehicle_maintenance_plans | vehicles | CASCADE |

Die Datenbank erzwingt bei mehreren Kunden-/Fahrt-Beziehungen zunächst die Entfernung oder Entkopplung der abhängigen Testdatensätze. Die Reihenfolge muss aus diesen tatsächlichen Beziehungen abgeleitet werden; CASCADE darf nicht als pauschale Bereinigungsstrategie verwendet werden.

## Benachrichtigungen: gesonderte Behandlung erforderlich

Der Export enthält:
- `notification_inbox`: Quelle `live` 2.082, `order` 15, `trip` 69.
- `notification_event_links`: Quelle `live` 851; Event-Key-Präfix `live` 851.

`source_id` in diesen Tabellen besitzt laut Export keinen Fremdschlüssel. Daher können diese Einträge nicht sicher allein über FK-CASCADE bereinigt werden. Die 2.082 `live`-Benachrichtigungen und 851 `live`-Ereignisverknüpfungen dürfen nicht pauschal gelöscht werden: die Quelle ist nicht hinreichend spezifisch, um Mitarbeiter-/Fahrzeug-/Unternehmensereignisse von Testereignissen zu unterscheiden. Auch die `order`- und `trip`-Benachrichtigungen müssen anhand ihrer Quell-IDs und tatsächlichen Eltern-Datensätze abgegrenzt werden, bevor sie in einen Löschumfang aufgenommen werden.

## Vorgeschlagene sichere Ausführungsphasen

1. **Nur-Lese-Planprüfung:** unmittelbar vor jeder Bereinigung Bestandszahlen und Fremdschlüssel erneut lesen; Änderungen seit Export erkennen.
2. **Testdaten-Abgrenzung:** alle 7 Kunden, 22 Aufträge, 3 Transportanfragen, 3 Angebote, 17 Fahrten und deren abhängige Datensätze als Kandidaten prüfen. Die Nutzerangabe, dass Kunden- und Finanzdaten Testdaten sind, ist die fachliche Grundlage; vor dem Löschen müssen dennoch Verknüpfungen und etwaige neu hinzugekommene Datensätze erneut geprüft werden.
3. **Benachrichtigungen separat klassifizieren:** nur Einträge entfernen, deren Quell-ID eindeutig auf einen bestätigten Testauftrag bzw. eine bestätigte Testfahrt verweist. Unklare `live`-Einträge bleiben erhalten.
4. **Abhängigkeiten in kontrollierter Reihenfolge bereinigen:** nur explizit abgegrenzte Test-Kinddatensätze vor ihren Eltern entfernen; restriktive FKs berücksichtigen. Keine dynamischen Tabellenlisten als Löschziele verwenden.
5. **Geschützte Bestände verifizieren:** Anzahl und Identität der Benutzer, Fahrzeug- und Firmeneinstellungen sowie Audit-Log vor/nachher vergleichen; geschützte Tabellen müssen unverändert sein.
6. **Nachprüfung:** erneuter Nur-Lese-Export, Prüfung auf verwaiste Referenzen und Kontrolle der erwarteten Restbestände.

## Freigabe- und Sicherheitsgrenze

Dieses Dokument ist eine Analyse und Spezifikation, kein ausführbares SQL und keine Freigabe zur Datenlöschung. Der vorliegende Export ist eine Momentaufnahme und enthält keine Einzelzeilen/IDs der Testdaten. Es gibt hier keinen bestätigten direkten Datenbank-Ausführungskanal. Eine spätere Implementierung muss standardmäßig Vorschau/Nur-Lese-Modus verwenden, eine zweite explizite Bestätigung verlangen und in einer Transaktion mit Rollback-Möglichkeit arbeiten. Bis dahin bleibt die Live-Datenbank unverändert.
