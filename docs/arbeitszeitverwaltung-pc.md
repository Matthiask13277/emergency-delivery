# Arbeitszeitverwaltung – Umsetzungsspezifikation

Status: Umsetzungsvorgabe für den Branch `feature/arbeitszeitverwaltung-pc`.

## Plattformgrenzen
- Verwaltungsfunktionen ausschließlich in der PC-Oberfläche.
- Mobile App bleibt bei der bisherigen Stempeluhr und persönlichen Einsicht.
- Fahrer können ihre eigenen Zeiten und Monatsübersichten ansehen, bestätigen oder beanstanden; keine Bearbeitungsrechte.
- PC und Handy verwenden denselben zentralen Datenbestand.

## Rollen
- `Admin` und `AdminDriver` haben identische vollständige Rechte für alle Mitarbeiter.
- Beide dürfen Einträge nachtragen/korrigieren, Abwesenheiten und Stammdaten verwalten, Monatsabschlüsse freigeben/wieder öffnen und Exporte erstellen.
- Fahrer dürfen ausschließlich eigene Daten lesen und Monatsübersichten bestätigen/beanstanden.

## Zeiteinträge
- Manuelles Nachtragen fehlender Tage sowie Korrektur von Beginn, Ende und Pausen.
- Pflicht-Begründung bei manueller Änderung.
- Historie mit Bearbeiter, Zeitstempel, altem/neuem Wert und Grund.
- Keine stille Löschung; Storno bleibt nachvollziehbar.
- Tages-Nettozeit = Ende minus Beginn minus Pausen; Zeitwerte intern in Minuten.

## Arbeitszeitkonto
- Reguläre Arbeitstage sind je Mitarbeiter konfigurierbar (Montag bis Sonntag); Standard bleibt Montag bis Freitag.
- Die Sollzeitberechnung und die Anrechnung von Abwesenheitstagen berücksichtigen nur die konfigurierten Arbeitstage und gesetzliche Feiertage.
- Individuelle Wochen-/Tages-Sollstunden und Arbeitstage pro Mitarbeiter.
- Soll/Ist, Plus-/Minusstunden und laufender Saldo.
- Freizeitausgleich und zur Auszahlung vorgemerkte Stunden getrennt führen; Vormerkung ist keine bestätigte Auszahlung.
- Urlaub und Krankheit werden nach dem individuellen Tages-Soll angerechnet.
- Urlaubsanspruch individuell; genommen, Rest und Übertrag separat führen.
- Beschäftigungsperioden, Archivierung und Wiederaktivierung ohne Verlust der Historie.

## Kalender und Abrechnung
- Italienische nationale Feiertage und Südtirol-Einstellung; keine kommunalen Patronatsfeiertage.
- Monats- und Jahresübersicht: Gesamtansicht aller Mitarbeiter plus Detailansicht je Mitarbeiter.
- Jahresvergleich zweier Jahre.
- Monatsabschluss mit Prüfung, Freigabe, Archivierung und kontrolliertem Wiederöffnen.
- Jahresabschluss-Vorschau; Übertragungen erst nach ausdrücklicher Bestätigung.
- Keine automatische Überstunden-Grenzwertwarnung.

## Exporte
- Echter XLSX-Export (nicht nur CSV) mit formatierter Gesamtübersicht und separaten Detail-/Kontoblättern.
- Nettoarbeitszeit nach Pausenabzug; Summen je Mitarbeiter und Gesamtsumme.
- PDF-Einzelabrechnungen und druckbare Übersichten.
- Korrekturen, Abwesenheiten, Soll/Ist, Salden, Ausgleich und Auszahlungsvormerkungen transparent kennzeichnen.

## Monatsbestätigung
- Verwaltung stellt geprüfte Monatsübersicht bereit.
- Fahrer erhalten Push-Erinnerung, sehen die eigene Übersicht mobil und bestätigen oder beanstanden sie.
- Status und Zeitpunkte von Bereitstellung, Benachrichtigung, Bestätigung und Bearbeitung protokollieren.
- Änderungen nach Bestätigung entwerten die Bestätigung und erfordern erneute Prüfung.

## Sicherheit und Datenqualität
- Serverseitige Rollenprüfung bei jedem schreibenden Endpunkt; UI-Ausblendung allein reicht nicht.
- Transaktionale Änderungen, Idempotenz und Schutz vor doppelten Tagesdatensätzen.
- Monatsabschlüsse und Audit-Historie vor stiller Änderung/Löschung schützen.
- Plausibilitätsprüfungen zeigen Auffälligkeiten, verändern Daten aber nie automatisch.
- Regelmäßige Backups und getestete Wiederherstellung.
- Berechnungen zentral und einheitlich für PC, Handy, Excel und PDF.

## Abnahmekriterien
1. Admin und AdminDriver können identische Verwaltungsaktionen ausführen.
2. Fahrer können mobil nur eigene Daten lesen, bestätigen oder beanstanden.
3. PC-only Verwaltungsfunktionen sind in der Handy-Oberfläche nicht verfügbar.
4. Manuelle Änderungen verlangen einen Grund und erzeugen Audit-Einträge.
5. Tages-, Monats-, Jahres- und Team-Summen stimmen rechnerisch überein.
6. XLSX enthält Nettozeiten, Mitarbeitersummen und Teamsumme.
7. Urlaub, Krankheit und Feiertage beeinflussen Sollstunden gemäß den festgelegten Regeln.
8. Monats-/Jahresabschluss, Wiederöffnung und Übertrag sind nachvollziehbar und bestätigt.


## Implementierungsstand im Feature-Branch

Bereits angelegt:
- Serverseitige Tabellen für Mitarbeiterprofile, Arbeitszeiteinträge, Abwesenheiten und Monatsabschlüsse.
- Admin-/AdminDriver-Endpunkte für Übersicht, Nachträge, Korrekturen, Abwesenheiten, Sollstundenprofile sowie Abschluss/Wiederöffnung.
- Eigene Lese- und Bestätigungs-/Beanstandungsendpunkte für angemeldete Mitarbeiter.
- PC-Verwaltungsoberfläche in der Web- und Desktop-App; Mobilansicht blendet die Administration aus.
- Mobile persönliche Übersicht mit Bestätigen/Beanstanden.
- Berechnung von Nettozeit, Werktags-Soll, Abwesenheitsgutschrift und Saldo.
- Feiertagsliste für die italienischen gesetzlichen Feiertage einschließlich Ostermontag; keine Patronatsfeiertage.
- Excel-kompatibler SpreadsheetML-Export (.xls) mit Mitarbeiter- und Gesamtsummen sowie Druckansicht für PDF.

Noch offen vor Produktivfreigabe:
- Moderner .xlsx-Export statt Excel-kompatiblem .xls.
- Vollständiger Urlaubsjahresübertrag mit nachvollziehbarer Genehmigung (Basis-Ledger und Admin-Freigabe sind jetzt ergänzt; Resturlaubsverbrauch, automatische Berechnung und Jahresabschluss-Verknüpfung sind noch offen).
- Push-Erinnerungen zur Monatsbestätigung.
- Umfassende Browser-/Backend-Tests, Migrationstest auf einer Kopie der Produktivdatenbank und fachliche Abnahme der Südtirol-Feiertagsregeln.
- Jahresabschluss-Workflow und kontrollierte Wiederöffnung mit vollständigem Prüfprotokoll.
- Integration mit bestehenden Personal-/Abwesenheitsdaten, falls diese bereits produktiv gepflegt werden.

Der Branch ist nicht in den Hauptbranch gemergt und nicht live geschaltet.


### Ergänzung: Urlaubsübertrag
- Pro Mitarbeiter und Kalenderjahr wird ein eigener Datensatz für Anspruch und genehmigten Übertrag geführt.
- Admin und AdminDriver können einen Übertrag mit Pflichtbegründung ausdrücklich genehmigen; Genehmiger, Zeitpunkt und Begründung werden gespeichert und auditiert.
- PC-Oberfläche zeigt Anspruch, Übertrag und Genehmigungsstatus je Mitarbeiter.
- Noch nicht enthalten: automatische Berechnung des Resturlaubs aus genommenen Tagen sowie die verbindliche Jahresabschluss-Freigabe.
