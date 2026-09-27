# Emergency Delivery V216

Online-Server für blitz.cloud.

Der Haupt-Dockerfile läuft als nicht privilegierter Benutzer auf Port 8080.
Bei gesetztem `DATABASE_URL` verwendet der Server Managed PostgreSQL; ohne diese Variable bleibt der lokale PGlite-Betrieb für Desktop erhalten.

Windows-Build: 2026-09-27T20:33:43.146Z
