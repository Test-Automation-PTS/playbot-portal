# Playbot 0.4.0

Daten, Dokumente und Oberflächen prüfen.

Veröffentlicht: 2026-09-07.

JSON/XML-Vergleiche und PDF-Funktionen sind finalisiert. Die spätere lokale UI-Demo zeigt die vorhandene Browser-API.

## Neuerungen

- JSON/XML: explizite Regeln, Filter, Änderungen, strukturierte Unterschiede und tatsächlicher früher Abbruch.
- PDF: Text- und echter Pixelvergleich, Seitenanzahl, Masken und Fehlerartefakte.
- Schwärzung: neue PNG- und Raster-PDF-Ausgaben ohne ursprüngliche Textebene.
- Zwei Release-Profile: all-modules und all-modules-no-browser; pdf-gui bleibt lokal.

## Übernahme in ein Projekt

Das Release-Manifest und den unveränderlichen Image-Digest übernehmen. XML benötigt json und xml. Explizite Regex-Masken mit regex: kennzeichnen.

## Grenzen

Keine OCR oder automatische Erkennung personenbezogener Daten. Die UI-Demo vom 9. September erweitert die Kundenszenarien, nicht das Release 0.4.0.

[Module und Beispiele](../docs/modules.md) · [Kundenablauf](../docs/customer.md)

Quelle: Release v0.4.0, Revision 67daa501a06e9127e17c69dd996c5e152deb8ed9. Diese Zusammenfassung wurde für das Portal aus dem veröffentlichten Release erstellt.
