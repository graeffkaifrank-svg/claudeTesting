# Schema „Trainingsplan 2.0“

Alle Tabs: Zeile 1 = Kopfzeile, Spalten als Text formatiert. Zeilen mit leerer `id` (bzw. leerem Schlüssel) ignorieren.

## Einheiten (`A:P`)
`id, datum, uhrzeit, titel, typ, vorlage_id, status, dauer_geplant_min, dauer_ist_min, gefuehl, kommentar, quelle, kalender_event_id, garmin_activity_id, erstellt_am, geaendert_am`
- `status`: `geplant` | `erledigt` | `ausgelassen` | `geloescht`
- `quelle`: `dashboard` | `sprache` | `migration` | `vorschlag` | `garmin`
- `gefuehl`: 1–5 oder leer

## Typen (`A:E`)
`typ, kategorie, zeit_relevant, farbe, aktiv` – Schlüssel ist `typ`. Kategorien: Laufen-Ausdauer, Ausdauer alternativ, Berg/Tour, Klettern-Kraft, Klettern-Ausdauer, Core und Stabi, Beine Kraft, Recovery, Sonstiges.
`zeit_relevant = ja` → beim Abhaken Minuten erfragen bzw. eintragen.

## Vorlagen (`A:I`)
`id, name, typ, dauer_standard_min, kurzbeschreibung, anleitung, anleitung_link, aktualisiert_am, aktiv` – `anleitung` enthält Michis Vorgaben (Markdown-Aufzählung).

## Phasen (`A:H`)
`id, name, start, ende, fokus, coaching_notizen, coaching_link, status` – genau eine Phase `aktiv`; `ende` leer = laufend.

## Hauptziele (`A:E`)
`id, phase_id, name, farbe, reihenfolge`

## Ziele = Subziele (`A:I`)
`id, phase_id, hauptziel_id, bezeichnung, messgroesse, zielwert, filter_ebene, filter_werte, reihenfolge`
- `messgroesse`: `anzahl` | `minuten`; `zielwert` pro Woche
- `filter_ebene`: `typ` | `kategorie`; `filter_werte` kommagetrennt

## Wochen (`A:C`)
`woche, art, notiz` – `woche` = ISO-Woche `YYYY-Www`; `art`: krank | urlaub | tourenwoche | deload

## Benchmarks (`A:J`)
`id, name, bereich, protokoll, messwerte, hauptwert, richtung, intervall_wochen, vorlage_id, aktiv`
- `messwerte`: `schluessel:einheit` kommagetrennt (z.B. `zeit:mm:ss, puls_avg:bpm`)
- `richtung`: `hoeher_besser` | `niedriger_besser`

## Benchmark_Ergebnisse (`A:I`)
`id, benchmark_id, datum, hauptwert, werte, bedingungen, kommentar, einheit_id, quelle` – Zeiten in Sekunden.

## Config (`A:B`)
`schluessel, wert`: `zeitzone`, `coaching_start`, `kalender_id`, `kalender_sync` (ja/nein), `benchmark_intervall_wochen_standard`, `laktat_schwelle1`, `laktat_schwelle2`, `dashboard_url`, `schema_version`.

## Regeln für die Auswertung
1. Woche = Montag–Sonntag. Phase einer Woche = die Phase, in der der Montag liegt (sonst die, die in der Woche beginnt).
2. Einheit zählt für ein Subziel, wenn ihr Typ (bzw. dessen Kategorie) in `filter_werte` steht.
3. Ist = nur `erledigt` (Minuten: `dauer_ist_min`, sonst `dauer_geplant_min`); Plan = `geplant`.
4. Subziel: erreicht (Ist ≥ Ziel) · eingeplant (Ist + Plan ≥ Ziel) · offen.
5. Hauptziel erfüllt = **alle** Subziele erreicht. Erfüllungsgrad = Mittel von min(1, Ist/Ziel).
6. Gesamt erfüllt = alle Hauptziele der Phase erfüllt.
7. Streak (je Hauptziel und Gesamt) = aufeinanderfolgende erfüllte Wochen bis zur letzten abgeschlossenen Woche; laufende Woche bricht nicht; Ausnahmewochen und Wochen ohne dieses Hauptziel werden übersprungen.
