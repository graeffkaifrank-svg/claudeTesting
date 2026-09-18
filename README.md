# Wohnungsplaner

Ein Tool, um Wohnungsgrundrisse in 2D zu skizzieren: Wände zeichnen, Möbel per
Drag & Drop platzieren, verschieben, drehen und skalieren, Entwürfe als JSON
speichern/laden – plus eine einfache 3D-Vorschau.

**Live:** https://graeffkaifrank-svg.github.io/claudeTesting/ (baut nach jedem
Push auf `main` automatisch neu, siehe `.github/workflows/deploy-pages.yml`).

## Entwicklung

```bash
npm install
npm run dev
```

## Funktionen

- **Wände zeichnen**: Werkzeug „Wand zeichnen“, mehrere Segmente am Stück
  klicken (Winkel rastet auf 15°), Rechtsklick oder Esc beendet die Kette.
  Länge und Stärke sind über das Eigenschaften-Panel editierbar.
- **Möbel**: Katalog links nach Raum sortiert (Schlafzimmer, Wohnzimmer,
  Küche, Bad, Arbeitszimmer, Bauteile wie Tür/Fenster). Auf den Grundriss
  ziehen oder anklicken zum Einfügen.
- **Bearbeiten**: Auswählen, verschieben, über die Ecken drehen/skalieren
  oder Breite/Tiefe/Drehung/Farbe direkt im Panel eintragen. Entf löscht die
  Auswahl, Strg+Z/Strg+Y für Rückgängig/Wiederholen.
- **Raster & Zoom**: Einrasten am 20-cm-Raster (abschaltbar), Mausrad zum
  Zoomen, Ziehen zum Verschieben der Ansicht.
- **Speichern/Laden**: Export als `.json`-Datei, Import per Dateiauswahl.
- **3D-Vorschau** (Bonus): Wände und Möbel werden aus denselben Daten grob
  extrudiert dargestellt (three.js), mit Orbit-Steuerung.

## Tech-Stack

React + Vite, [react-konva](https://konvajs.org/docs/react/) für den
2D-Canvas, [zustand](https://github.com/pmndrs/zustand) für den Zustand,
[three.js](https://threejs.org/) für die 3D-Vorschau.
