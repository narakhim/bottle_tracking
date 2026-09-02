# bottle_tracking_frontend

Dieses Frontend ist ein separates Projekt für die Browser-Version der Gasflaschen-Tracker-Anwendung.

## Zweck

- reine Frontend-Anwendung ohne Java-Code
- GitHub Pages-fähig
- Filterung und CSV-Export für die derzeit sichtbaren Einträge
- separate Struktur zum Server-Projekt

## Lokaler Start

Einfach im Projektordner einen lokalen Webserver starten:

```bash
python -m http.server 8000
```

Danach öffnen:

```text
http://localhost:8000
```

## GitHub Pages

1. Repository auf GitHub erstellen
2. diesen Ordner als Seiten-Root nutzen
3. im Repository-Settings unter Pages den Stammordner wählen
4. die Seite veröffentlichen

## Hinweis

Das Frontend erwartet ein separates Backend für echte persistente Daten. Für die reine Frontend-Version sind die Daten in diesem Beispiel im Browser-Speicher gehalten.
