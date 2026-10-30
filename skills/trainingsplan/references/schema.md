# Schema „Trainingsplan 2.0“

Alle Tabs: Zeile 1 = Kopfzeile, Spalten als Text formatiert. Zeilen mit leerer `id` (bzw. leerem Schlüssel) ignorieren.

## Einheiten (`A:S`)
`id, datum, uhrzeit, titel, typ, vorlage_id, status, dauer_geplant_min, dauer_ist_min, gefuehl, kommentar, quelle, kalender_event_id, garmin_activity_id, erstellt_am, geaendert_am, distanz_km, puls_avg, hoehenmeter`
- `dauer_ist_min` darf Dezimalstellen haben (18:08 → 18.13)
- Läufe: `distanz_km` und `puls_avg` eintragen, wenn bekannt. Pace = dauer_ist_min × 60 / distanz_km Sekunden pro km, Anzeige immer `m:ss min/km`.
- `hoehenmeter`: Aufstieg in m (Garmin `total_elevation_gain`, bei Touren und Läufen). **Laufband: Kai läuft immer mit 15 % Steigung** (Config `laufband_steigung_prozent`) → ohne eigenen Wert hm = distanz_km × 148,3 (gerundet), im Kommentar „Laufband“ vermerken.
- `garmin_activity_id` kann mehrere ids kommagetrennt enthalten.
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
`woche, art, notiz` – `woche` = ISO-Woche `YYYY-Www`; `art`: krank | urlaub | tourenwoche | deload oder leer. `notiz` = Wochentitel (z.B. „Malta und krank“). Ausnahmewoche nur, wenn `art` gesetzt ist; eine Zeile nur mit Titel ist eine normale Woche.

## Benchmarks (`A:J`)
`id, name, bereich, protokoll, messwerte, hauptwert, richtung, intervall_wochen, vorlage_id, aktiv`
- `messwerte`: `schluessel:einheit` kommagetrennt (z.B. `zeit:mm:ss, puls_avg:bpm`)
- `richtung`: `hoeher_besser` | `niedriger_besser`

## Benchmark_Ergebnisse (`A:I`)
`id, benchmark_id, datum, hauptwert, werte, bedingungen, kommentar, einheit_id, quelle` – Zeiten in Sekunden.

## Journal (`A:E`)
`id, datum, titel, text, quelle` – Lauf-Blog. `id` = `J-` + 8 Zeichen. `text` als Markdown mit `- ` Aufzählungen.

## Laufstatistik (`A:J`)
`monat, laeufe, km, stunden, hm, ga_pace_150, ga_laeufe, ctl, lange_laeufe, aktualisiert_am` – eine Zeile pro Monat (`YYYY-MM`), aus intervals.icu berechnet (Routine). `ga_pace_150` = Pace der lockeren Läufe draussen (Puls 125–155) umgerechnet auf Puls 150, in Sekunden pro km. `ctl` = Fitness-Wert von intervals.icu am Monatsende (gleitender Schnitt der Trainingslast ~6 Wochen, alle Sportarten).

## Fitness (`A:E`)
`datum, ctl, atl, ruhepuls, hrv` – eine Zeile pro Tag aus intervals.icu (wellness). `ctl` = Fitness (Ø Trainingslast 42 Tage), `atl` = Ermüdung (Ø 7 Tage), Form % = (ctl − atl) / ctl × 100. Zonen: > 20 Übergang, 5…20 Frisch, −10…5 Grauzone, −30…−10 Optimal (Aufbau), < −30 Hohes Risiko.

## Config (`A:B`)
`schluessel, wert`: `zeitzone`, `coaching_start`, `kalender_id`, `kalender_sync` (ja/nein), `benchmark_intervall_wochen_standard`, `laktat_schwelle1`, `laktat_schwelle2`, `dashboard_url`, `schema_version`, `laufband_steigung_prozent` (15).

## Regeln für die Auswertung
1. Woche = Montag–Sonntag. Phase einer Woche = die Phase, in der der Montag liegt (sonst die, die in der Woche beginnt).
2. Einheit zählt für ein Subziel, wenn ihr Typ (bzw. dessen Kategorie) in `filter_werte` steht.
3. Ist = nur `erledigt` (Minuten: `dauer_ist_min`, sonst `dauer_geplant_min`); Plan = `geplant`.
4. Subziel: erreicht (Ist ≥ Ziel) · eingeplant (Ist + Plan ≥ Ziel) · offen.
5. Hauptziel erfüllt = **alle** Subziele erreicht. Erfüllungsgrad = Mittel von min(1, Ist/Ziel).
6. Gesamt erfüllt = alle Hauptziele der Phase erfüllt.
7. Streak (je Hauptziel und Gesamt) = aufeinanderfolgende erfüllte Wochen bis zur letzten abgeschlossenen Woche; laufende Woche bricht nicht; Ausnahmewochen und Wochen ohne dieses Hauptziel werden übersprungen.
