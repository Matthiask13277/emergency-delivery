# Admin-Testdaten-Reset: Implementierungsstatus

Stand: 2026-11-02

## Im Hauptbranch vorhanden
- Die Reset-Funktion wurde mit PR #103 in `main` gemergt.
- Commit: `ca20ecd81e92cc7e012cbd0ae4354361caa73600`
- Admin-only Vorschau und Reset-Endpunkt mit erneuter Passwortprüfung, Bestätigungsphrase, Transaktion/Rollback, Rechnungs-Sperre und Audit-Eintrag.
- Die fachliche Freigabe des App-Eigentümers umfasst alle Kunden, Kundenadressen und zugehörigen Testdokumente als Testdaten.
- Die zugehörige isolierte Backup-Test-Checkliste liegt unter `docs/RESET-BACKUP-TEST-CHECKLIST.md`.

## Geschützte Daten
Der Reset ist auf explizit ausgewählte Kunden begrenzt. Benutzer und Zugangsdaten, Firmenkonfiguration, Fahrzeuge, Verzögerungsregeln, Kalendertermine, Push-Abonnements, bestehende Audit-Historie, Live-Benachrichtigungen und sämtliche `notification_event_links` müssen erhalten bleiben. Rechnungsbeziehungen blockieren den Reset. Kein `TRUNCATE ... CASCADE`.

## Noch NICHT nachgewiesen
- Es liegt kein dokumentierter erfolgreicher Restore eines aktuellen Backups in eine isolierte Testdatenbank vor.
- Die vollständige Backup-Test-Checkliste ist nicht als bestanden protokolliert.
- Ein Deployment der neuen Version auf dem Hosting ist nicht bestätigt.
- Ein produktiver Reset wurde nicht ausgeführt.

## Deployment-Hinweis
Das Repository enthält einen Dockerfile, der `node start-online.js` auf Port 8080 startet. In `.github/workflows` ist derzeit kein Hosting-Deployment-Workflow vorhanden. Das Hosting muss daher über die tatsächlich konfigurierte Plattform/den dortigen Deploy-Mechanismus aktualisiert werden. Ein erfolgreicher GitHub-Merge allein deployt die App nicht nachweislich.

## Freigabeablauf
1. Aktuelles vollständiges Datenbank-Backup erstellen.
2. Backup isoliert wiederherstellen und sicherstellen, dass die Testinstanz keine produktiven Zugangsdaten nutzt.
3. Sämtliche Prüfungen aus `docs/RESET-BACKUP-TEST-CHECKLIST.md` durchführen und protokollieren.
4. Docker-Image/Anwendung über die konfigurierte Hosting-Plattform deployen.
5. Admin-Vorschau prüfen; Rechnungs-Sperre und geschützte Tabellen verifizieren.
6. Reset nur über die Admin-Oberfläche mit expliziter Kundenauswahl, erneutem Admin-Passwort und Bestätigungsphrase ausführen.

**Sicherheitsgrenze:** Keine produktiven Daten löschen, solange Backup-Restore, Rollback und Erhalt der geschützten Tabellen nicht nachgewiesen sind.
