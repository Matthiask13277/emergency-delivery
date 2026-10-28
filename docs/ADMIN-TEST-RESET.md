# Admin-Funktion: Testdaten zurücksetzen

Status: Spezifikation für Entwicklung; noch nicht implementiert und nicht für produktive Ausführung freigegeben.

## UI
- Nur für angemeldete Benutzer mit Rolle `Admin` anzeigen.
- Sicherheitsdialog erklärt exakt, welche Daten entfernt werden und welche erhalten bleiben.
- Erfordert erneute Eingabe des aktuellen Admin-Passworts und den Text `RESET TESTDATEN`.
- Keine Speicherung des Passworts im Browser oder in Logs.
- Nach erfolgreichem Lauf zeigt die Oberfläche Zählungen vor/nachher und eine eindeutige Ergebnisnachricht.

## Serverseitige Sicherheitsanforderungen
- Admin-Rolle serverseitig anhand des aktuellen Datensatzes in `users` prüfen; UI-Verstecken ist keine Zugriffskontrolle.
- Passwort mit `bcrypt.compare` gegen den aktuellen `password_hash` des angemeldeten Admins validieren.
- POST-only, CSRF-/Origin-Absicherung passend zur bestehenden Authentifizierung, Rate-Limit und Audit-Eintrag.
- Alle Operationen auf einer dedizierten PostgreSQL-Verbindung in einer Transaktion; bei jedem Fehler vollständiges ROLLBACK.
- Niemals dynamische Tabellen- oder Spaltennamen aus Request-Daten übernehmen.
- Tabellen-/Fremdschlüssel-Inventar aus der LIVE-Datenbank und Testabdeckung sind Voraussetzungen für jede Löschroutine.

## Zu löschen (nach bestätigter Live-Schema-Prüfung)
- Alle Kunden und Kundendaten.
- Alle Aufträge, Fahrten, Stopps und dazugehörige Lieferdokumente/GPS-Daten.
- Alle Rechnungen und sonstigen Finanz-/Buchhaltungs-Testdaten.
- Alle Benachrichtigungen in `notification_inbox`.
- Kundenkommunikation, Zustellereignisse und Event-Link-Tabellen, soweit sie ausschließlich zu den gelöschten Testdaten gehören.

## Zu behalten
- `users`, einschließlich Passwort-Hashes und Mitarbeiterstammdaten.
- Rollen, Berechtigungen und mitarbeiterbezogene Daten.
- `company_settings`.
- Fahrzeuge und Konfigurationen sowie Fahrzeugstammdaten/-dokumente, sofern nicht ausdrücklich anders bestätigt.
- `audit_log`; nach dem Reset einen neuen Audit-Eintrag schreiben.
- Authentifizierungs-, Kommunikations- und Sicherheitseinstellungen, Vorlagen und Webhook-Secrets.
- Push-Abonnements und Benachrichtigungseinstellungen der Mitarbeiter.

## Nicht freigabefähig, bis geprüft
- Die Liste aller Tabellen im produktiven Schema ist größer als die im Code statisch sichtbaren Tabellen.
- Das Dashboard zeigte bereits abweichende Zeilenzahlen zwischen UI und SQL; vor dem Reset sind Live-Zählungen maßgeblich.
- Finanz- und Auftrags-Tabellen dürfen nicht nur anhand von Namen geraten werden.
- FK-Abhängigkeiten müssen geprüft werden, damit keine Mitarbeiter- oder Konfigurationsdaten über CASCADE verloren gehen.

## Freigabekriterien
1. Erfolgreiche Tests auf einer separaten, aus Backup wiederhergestellten Datenbank.
2. Test mit falschem Passwort, Nicht-Admin und fehlender Bestätigung muss ohne Datenänderung fehlschlagen.
3. Fehler während des Löschlaufs muss vollständiges Rollback bewirken.
4. Vorher-/Nachher-Zählungen belegen, dass Zieltabellen leer und geschützte Tabellen unverändert sind.
5. Erst nach diesen Prüfungen darf der Code über einen reviewed Pull Request in die Live-Version gelangen.

Diese Datei selbst führt keine Datenbankoperation aus.
