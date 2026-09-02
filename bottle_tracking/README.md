# Gasflaschen-Tracker

Die Anwendung speichert Bestände und Benutzer zentral in PostgreSQL. Alle Browser arbeiten damit auf dem gleichen Datenbestand. Das Datenbankschema wird mit Flyway versioniert migriert.

## Start mit Docker

1. Sichere Zugangsdaten in PowerShell setzen:

   ```powershell
   $env:DB_PASSWORD = "ein-langes-datenbank-passwort"
   $env:INITIAL_ADMIN_PASSWORD = "ein-langes-admin-passwort"
   ```

2. Datenbank und Anwendung starten:

   ```powershell
   docker compose up --build -d
   ```

3. Die Anwendung unter `http://localhost:8080` öffnen und mit dem Benutzer `admin` sowie dem gewählten Admin-Passwort anmelden.

Beim ersten Start wird genau ein Administratorkonto aus `INITIAL_ADMIN_USERNAME` (Standard: `admin`) und `INITIAL_ADMIN_PASSWORD` erstellt. Anschließend wird das Passwort nicht erneut verarbeitet. Weitere Benutzer lassen sich als Administrator in der Anwendung anlegen.

## Betrieb mit einer vorhandenen PostgreSQL-Datenbank

Die folgenden Umgebungsvariablen setzen und danach `mvn spring-boot:run` ausführen:

```powershell
$env:DB_URL = "jdbc:postgresql://db-server:5432/bottle_tracking"
$env:DB_USERNAME = "bottle_tracking"
$env:DB_PASSWORD = "ein-langes-datenbank-passwort"
$env:INITIAL_ADMIN_PASSWORD = "ein-langes-admin-passwort"
```

`INITIAL_ADMIN_PASSWORD` wird nur gebraucht, solange noch kein Benutzer in der Datenbank existiert. Flyway legt die Tabellen und Startstandorte beim ersten Start automatisch an.

Eine bereits mit einer früheren Version der Anwendung angelegte PostgreSQL-Datenbank wird automatisch bei Schema-Version 2 übernommen; neue Migrationen werden danach weiter ausgeführt.
