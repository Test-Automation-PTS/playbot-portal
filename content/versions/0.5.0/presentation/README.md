# Playbot 0.5.0

APIs testen. Abhängigkeiten kontrollieren.

Veröffentlicht: 2026-09-10.

HTTP-Tests, isolierte WireMock-Dienste und OpenAPI-Vertragsprüfung ergänzen die bestehenden Vergleiche.

## Neuerungen

- API-Modul: HTTP-Sessions, JSON/XML/Formular-Payloads, Status-, Header- und Laufzeitprüfungen.
- WireMock: eigene Prozesse und Ports pro Worker, Mappings, Szenarien und Request-Verifikation.
- OpenAPI 3.0/3.1: gebündelte JSON-Verträge für echte Request-/Response-Paare.
- 15 Kundenbeispiele für Transport, Payloads, Verträge, Fehler und Mock-Isolation.

## Übernahme in ein Projekt

api und optional api-mocks aktivieren. Lokal die passenden Extras, Java 11+ und das gepinnte WireMock-JAR installieren; beide Release-Images enthalten die Laufzeit bereits.

## Grenzen

Kein Pact/Broker, keine WSDL-Generierung oder XSD-Validierung. Laufzeitprüfungen ersetzen keinen Lasttest.

[Module und Beispiele](../docs/modules.md) · [Kundenablauf](../docs/customer.md)

Quelle: Release v0.5.0, Revision b8a3d9b9f3fdeab0993c1678f1ea26f082a307c6. Diese Zusammenfassung wurde für das Portal aus dem veröffentlichten Release erstellt.
