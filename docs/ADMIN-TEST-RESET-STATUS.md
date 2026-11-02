# Admin-Testdaten-Reset: Implementierungsstatus

Dieses Dokument ist der aktuelle Arbeitsstand für die sichere Reset-Funktion.

## Erledigt
- Separater Branch `admin-test-data-reset`
- Sicherheits- und Freigabeanforderungen dokumentiert
- Keine Änderung an `main` oder an der Live-Datenbank

## Warum die Löschfunktion noch nicht implementiert ist
Der Quellcode enthält nicht notwendigerweise alle Tabellen, die in der gehosteten Datenbank vorhanden sind. Die Datenbank-UI bietet laut Screenshot nur lesende `SELECT`-Abfragen. Ohne das tatsächliche Live-Schema einschließlich aller Fremdschlüssel kann eine Löschliste nicht zuverlässig bestimmen, welche Finanz-/Auftragsdaten zu löschen sind und welche Mitarbeiter-/Fahrzeugdaten erhalten bleiben müssen.

## Nächster sicherer technischer Schritt
1. Auf der Live-Datenbank die SQL-Datei `scripts/reset-test-data-preflight.sql` ausführen und die Ergebnisse sichern.
2. Das komplette Tabelleninventar und alle Fremdschlüssel auswerten.
3. Eine explizite Allowlist zu löschender Tabellen und eine Blocklist zu schützender Tabellen erstellen.
4. Den Reset ausschließlich in einer wiederhergestellten Backup-Kopie implementieren und testen.
5. Erst danach die Admin-UI und serverseitige POST-Route mit bcrypt-Passwortprüfung, Admin-Rollenprüfung, Bestätigungstext, Transaktion, Rollback und Audit-Eintrag hinzufügen.

## Sicherheitsgrenze
Kein automatischer Reset auf Basis von Tabellennamen, keine `TRUNCATE ... CASCADE`-Anweisung, kein Löschen von `users`, `company_settings`, Fahrzeugkonfiguration oder `audit_log`. Der Reset darf erst freigegeben werden, wenn Tests nachweisen, dass Mitarbeiter- und Konfigurationsdaten erhalten bleiben.
