# Gmail-Import und Angebotsversand einrichten

Diese Anleitung gilt für den Feature-Branch `feat/transport-requests-offers` / Pull Request #54. Die Funktion ist erst aktiv, wenn sie nach erfolgreicher Prüfung bereitgestellt und die Zugangsdaten in Blitz.cloud gesetzt wurden.

## 1. Gmail-OAuth vorbereiten

1. Öffne die Google Cloud Console und wähle das Google-Workspace-Projekt aus, das Zugriff auf das Postfach erhalten soll.
2. Aktiviere die **Gmail API**.
3. Konfiguriere den OAuth-Zustimmungsbildschirm passend zur Organisation und zum Postfach.
4. Erstelle OAuth-Client-Zugangsdaten für eine Webanwendung bzw. den für eure Workspace-Richtlinien passenden OAuth-Client.
5. Erzeuge ein Refresh-Token für das zu importierende Postfach mit dem Scope `https://www.googleapis.com/auth/gmail.readonly`. Der OAuth-Client muss den für den Workspace zulässigen Zugriff erhalten. Falls die App auf „Testing“ steht, können Refresh-Tokens ablaufen; für einen dauerhaften Betrieb muss der Consent-Status passend eingerichtet sein.
6. Teile Client-Secret und Refresh-Token nicht im Chat und schreibe sie nicht in GitHub-Dateien.

## 2. Umgebungsvariablen in Blitz.cloud

Lege die folgenden Variablen im Geheimnis-/Environment-Bereich des passenden Blitz.cloud-Dienstes an. Die genaue Menübezeichnung hängt von der Blitz.cloud-Oberfläche ab.

- `GOOGLE_CLIENT_ID`: OAuth-Client-ID
- `GOOGLE_CLIENT_SECRET`: OAuth-Client-Secret
- `GOOGLE_REFRESH_TOKEN`: Refresh-Token des vorgesehenen Postfachs
- `GMAIL_IMPORT_QUERY`: optionale Gmail-Suche, zum Beispiel `newer_than:2d (transport OR lieferung OR transportanfrage)`

Der Import läuft ohne diese drei OAuth-Variablen nicht. Die Anwendung fragt Gmail im Hintergrund ungefähr alle zwei Minuten ab. Die Abfrage sollte auf das richtige Postfach und möglichst relevante Nachrichten begrenzt sein.

## 3. E-Mail-Versand

Der Angebotsversand verwendet die vorhandene SMTP-Konfiguration der Anwendung. Prüfe in der vorhandenen SMTP-Konfiguration, dass Host, Port, Absender und Zugangsdaten korrekt sind und der Provider SMTP-Versand zulässt. Gmail-Import (OAuth) und SMTP-Versand sind getrennte Berechtigungen und Konfigurationen.

## 4. Sicherer Abnahmetest

Nach erfolgreicher CI und Bereitstellung bitte mit einem internen Testpostfach und einer eigenen Empfängeradresse prüfen:

1. Eine Test-E-Mail mit einer Transportanfrage senden.
2. Kontrollieren, dass genau eine Anfrage importiert wurde und Absender, Betreff sowie Nachrichtentext plausibel sind.
3. Ein Angebot mit einem kleinen Testbetrag und passendem Steuersatz erstellen.
4. Prüfen, dass Netto, Steuer und Brutto korrekt sind und das PDF die Firmendaten aus den vorhandenen Einstellungen enthält.
5. Prüfen, dass ein Entwurf nicht versendet werden kann.
6. Das Angebot ausdrücklich freigeben und erst dann an die eigene Testadresse senden.
7. PDF-Anhang, Absender, Beträge und Daten prüfen; anschließend prüfen, dass ein wiederholter Klick keinen zweiten Versand auslöst.

## Wichtige Grenzen

- Der Import liest Nachrichtentext; Anhänge werden derzeit nicht ausgelesen.
- Die Gmail-Suche ist konfigurierbar und kann relevante Nachrichten übersehen oder irrelevante Nachrichten erfassen.
- Ein grüner Syntax-/Schema-Workflow ersetzt keinen echten Gmail-/SMTP-Integrationstest.
- Wenn SMTP die E-Mail bereits angenommen hat, aber die abschließende Datenbankaktualisierung fehlschlägt, bleibt der Versand-Claim absichtlich gesetzt. Vor einer manuellen Freigabe muss im SMTP-/Mailprotokoll geprüft werden, ob die Nachricht tatsächlich versendet wurde; den Claim nicht blind zurücksetzen, sonst droht eine Doppelzustellung.
- PR #54 erst zusammenführen, wenn alle Prüfungen auf dem aktuellen Commit erfolgreich sind und der Ende-zu-Ende-Test bestanden wurde.
