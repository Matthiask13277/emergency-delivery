# Admin-Testdaten-Reset – Test auf wiederhergestellter Datenbankkopie

Diese Checkliste ist vor dem Merge und vor jeder produktiven Ausführung abzuarbeiten.
Die Prüfung erfolgt ausschließlich auf einer isolierten Wiederherstellung, niemals auf der Produktivdatenbank.

## 1. Vorbereitung

- [ ] Aktuelles vollständiges Datenbank-Backup erstellen und Wiederherstellung in eine isolierte Testdatenbank durchführen.
- [ ] Sicherstellen, dass die Anwendung der Testdatenbank zugeordnet ist (getrennte Zugangsdaten/Umgebung); produktive Zugangsdaten dürfen dort nicht verwendet werden.
- [ ] Tabellenstände und Stichproben der geschützten Daten vor dem Test sichern.
- [ ] Test-Admin, Nicht-Admin und mindestens einen Kunden mit verknüpften Aufträgen/Fahrten/Transportanfragen bereitstellen.
- [ ] Zusätzlich einen Kunden mit zugeordneter Rechnung bereitstellen.

## 2. Vorschau und Berechtigungen

- [ ] Nicht angemeldeter Zugriff auf `GET /api/admin/reset-candidates` wird abgewiesen.
- [ ] Angemeldeter Nicht-Admin wird abgewiesen.
- [ ] Admin sieht die Kundenliste und korrekte Anzahl zugehöriger Aufträge, Fahrten, Transportanfragen und Rechnungen.
- [ ] Vorschau ist lesend; Tabellenstände bleiben unverändert.
- [ ] Antwort enthält `Cache-Control: no-store`.

## 3. Reset-Schutz

- [ ] Falsches Admin-Passwort wird abgewiesen; keine Tabelle wird verändert.
- [ ] Fehlender/falscher Bestätigungstext wird abgewiesen.
- [ ] Ungültige, doppelte oder mehr als 50 Kunden-IDs werden abgewiesen.
- [ ] Ungültiger Origin wird abgewiesen.
- [ ] Rate-Limit wird nach wiederholten Versuchen ausgelöst.
- [ ] Auswahl mit zugeordneter Rechnung wird vollständig abgebrochen; auch andere ausgewählte Kunden bleiben erhalten.
- [ ] Simulierter SQL-Fehler während der Transaktion führt zum vollständigen Rollback.

## 4. Erfolgreicher Reset

- [ ] Einen oder mehrere ausschließlich zu Testzwecken angelegte Kunden ohne Rechnungen auswählen.
- [ ] Zugehörige Aufträge, Fahrten und Transportanfragen werden gelöscht.
- [ ] Abhängige Fahrtdaten (z. B. Stops, Dokumente, GPS-Punkte und Trip-Event-Verknüpfungen) werden gemäß den tatsächlichen FK-Regeln entfernt.
- [ ] Nur Inbox-Benachrichtigungen mit `source='order'` bzw. `source='trip'` und den ausgewählten Quell-IDs werden entfernt.
- [ ] Live-Benachrichtigungen und sämtliche `notification_event_links` bleiben unverändert.
- [ ] Audit-Eintrag `TEST_DATA_RESET` wird mit Admin, Umfang und Zählwerten geschrieben.
- [ ] Die API meldet Erfolg erst nach erfolgreichem Commit.

## 5. Geschützte Tabellen – Vorher/Nachher vergleichen

Folgende Daten müssen unverändert bleiben:

- [ ] `users` (einschließlich Passworthashes, Rollen und Berechtigungen)
- [ ] `company_settings`
- [ ] `vehicles`
- [ ] `delay_escalation_rules`
- [ ] `calendar_events`
- [ ] `push_subscriptions`
- [ ] vorhandene `audit_log`-Historie (neben dem neuen Reset-Audit-Eintrag)
- [ ] Live-Zeilen in `notification_inbox`
- [ ] sämtliche `notification_event_links`

## 6. Freigabekriterien

- [ ] Alle obigen Tests sind auf der isolierten Wiederherstellung erfolgreich.
- [ ] Vorher-/Nachher-Vergleich und Testprotokoll sind dokumentiert.
- [ ] Backup-Wiederherstellung wurde nachgewiesen.
- [ ] Erst danach PR reviewen und mergen.
- [ ] Produktiv-Deployment separat durchführen und anschließend nur nach erneuter Vorschau sowie expliziter Admin-Bestätigung ausführen.

**Wichtig:** Die Aussage, dass alle Kunden und Kundenadressen Testdaten sind, ist die fachliche Freigabe des Kundenbestands. Sie ersetzt nicht die technische Prüfung von Rechnungsbeziehungen, Fremdschlüsseln, Rollback und geschützten Live-Daten.
