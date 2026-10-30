---
name: trainingsplan
description: Kais Trainingsplan im Google Sheet „Trainingsplan 2.0“ lesen und schreiben – Trainings erfassen und abhaken („hab heute 45 min GA1 gemacht“, „Fingerkraft erledigt“, „gestern Klettern Gasi, lief zäh“), Einheiten planen oder verschieben („plan Intervalle für Donnerstag 18 Uhr“, „verschieb Core auf morgen“, „mach mir einen Vorschlag für nächste Woche“), Wochenstand abfragen („wie steh ich diese Woche?“, „was fehlt mir noch?“), Auswertungen und Streaks („analysier die letzten 4 Wochen“, „bin ich überlastet?“), Lauf-Benchmarks erfassen, eine neue Coaching-Phase starten und den Bericht für Michi erstellen. Verwende diesen Skill immer, wenn Kai über sein Training, Trainingsziele, Benchmarks oder das Coaching mit Michi spricht – er ersetzt die alten Notion-Skills training-abschluss und training-analyse.
---

# Trainingsplan (Google Sheet)

Kais Trainingsdaten liegen im Google Sheet **Trainingsplan 2.0**:
- Spreadsheet-ID: `11K-STJj8Up1AUSRQ6nWIpm5yBMa3ftp42RNFDilQJZ0`
- Link: https://docs.google.com/spreadsheets/d/11K-STJj8Up1AUSRQ6nWIpm5yBMa3ftp42RNFDilQJZ0/edit
- Dashboard: https://claude.ai/artifact/WXh8YAo3U8Txnop9YKShW9

Benchmarks: aktuell ist nur **B-L1 Referenzlauf** aktiv (Hausstrecke Schlieren, ca. 4,38 km). Die anderen sind deaktiviert.

Charts und Auswertungen immer im **IBCS-Stil**: Ist als dunkle Säule mit Wertbeschriftung, Soll als Umriss, Abweichungen grün (gut) / rot (schlecht), keine Gitterlinien, Titelzeile „Wer · Was · Einheit · Zeitraum“. Bei Läufen immer Zeit **und** Pace angeben, Pace im Format `m:ss min/km`. Wochenumfang als km und Höhenmeter (hm). Laufband-Einheiten laufen immer mit 15 % Steigung → ca. 148 hm pro km.

Werkzeuge: Google-Sheets-Connector (`get_values`, `append_values`, `update_values`), Google-Calendar-Connector (`create_event`, `update_event`, `delete_event`, `list_events`).
Tabellenaufbau und alle Spalten: siehe `references/schema.md`. Lies die Datei, bevor du zum ersten Mal schreibst.

## Grundregeln

- **Spalten über die Kopfzeile adressieren**, nie über feste Positionen. Erst `get_values` auf den Tab (z.B. `Einheiten!A:S`), dann Zeile 1 als Kopf lesen.
- **Neue Zeilen** immer mit `append_values` auf `<Tab>!A1`, Werte in der Reihenfolge der Kopfzeile.
- **Änderungen**: direkt vorher `<Tab>!A:A` lesen, Zeile über die `id` suchen, dann `update_values` auf genau diese Zeile (`Einheiten!A<n>`), komplette Zeile schreiben. Nie Zeilen löschen – Einheiten bekommen `status = geloescht`.
- **Datumswerte** als Text `YYYY-MM-DD`, Uhrzeit `HH:MM`. Die Spalten sind als Text formatiert.
- **IDs**: Einheit `E-` + 8 Zeichen aus `abcdefghijkmnpqrstuvwxyz23456789`, Benchmark-Ergebnis `R-` + 8 Zeichen.
- `erstellt_am`/`geaendert_am` als `YYYY-MM-DDTHH:MM:SS` (Zeitzone Europe/Zurich). `quelle = sprache`.
- **Typ ist Pflicht** und muss exakt einem Eintrag im Tab `Typen` entsprechen. Die Kategorie ergibt sich aus dem Typ.
- Antworte kurz: was geändert wurde, plus Wochenstand der betroffenen Hauptziele, z.B. „✓ GA1 eingetragen (45 min) · Laufen 130/180 min · Klettern 3/4 Subziele“.

## Typ-Zuordnung aus Sprache

| Kai sagt | Typ |
|---|---|
| GA1, Grundlage, Z1, lockerer Lauf, nüchtern laufen, Recovery Run, Laufband | GA1 |
| Intervalle, Pyramide, 4×4, Schwelle | Intervall |
| Trail, Berglauf | Trail/Berglauf |
| Referenzlauf, Benchmark-Lauf | Lauf-Benchmark |
| Fingerkraft, Max Hang, Hangboard, Max Kraft Finger | Fingerkraft Max |
| Max Kraft Bouldern, Max Boulder | Bouldern Max |
| Halle, Gasi, Gaswerk, Kletterhalle, Bouldern (Ausdauer) | Klettern Halle |
| Klettergarten, draussen klettern, Sportklettern, Fels | Fels |
| Eisgeräte, Mixed, Dry Tooling | Eisgeräte |
| Repeaters, Hang-Ausdauer | Hang-Ausdauer |
| Core, Michis Zirkel | Core |
| Beintraining, Squats, Kniebeugen | Beintraining |
| Stabi Beine, Wandstütz, Knie-Stabi | Stabi Beine |
| Sprünge, Box Jumps | Sprünge |
| Skitour / Hochtour, Nordwand, Gipfel | Skitour / Bergtour |
| Mehrseillänge, MSL | Mehrseillänge |
| Yoga, Mobility, Dehnen | Yoga / Mobility |
| Velo, Wandern, Skifahren | Velo / Wandern / Skifahren |

Unklar → einmal kurz nachfragen. **Kombi-Einheiten** („Eisgeräte mit Finger Max“, „Klettern und danach Core“) als **zwei Einheiten** anlegen, damit jedes Subziel zählt.

## Abläufe

### 1. Training erfassen / abhaken
1. Datum bestimmen („heute“, „gestern“, Wochentag → letztes Vorkommen).
2. `Einheiten!A:S` lesen, geplante Einheit an dem Tag mit passendem Typ suchen (`status = geplant`).
3. Gefunden → `status = erledigt`, `dauer_ist_min` (wenn genannt, sonst `dauer_geplant_min`), `kommentar` (Kais Worte, sinngemäss kurz), `gefuehl` 1–5 wenn er eins nennt oder es klar ist. Bei Läufen und Touren `distanz_km`, `puls_avg` und `hoehenmeter`, wenn genannt (z.B. „8,2 km, Puls 145“; Laufband ohne hm-Angabe → distanz × 148,3), und die Pace in der Antwort nennen. Kalender-Event aktualisieren (Titel mit „✓ “).
4. Nicht gefunden → neue Einheit mit `status = erledigt` anlegen, `vorlage_id` passend zum Typ (Tab `Vorlagen`).
5. Bei Typ `Lauf-Benchmark` zusätzlich ein Ergebnis in `Benchmark_Ergebnisse` anlegen (siehe 5).
6. Danach Wochenstand berechnen (siehe Regeln in `references/schema.md`) und kurz melden.

### 2. Planen / verschieben
- Neue geplante Einheit: Vorlage passend wählen, `dauer_geplant_min` = Vorlage-Standard, `status = geplant`.
- Kalender: wenn `Config.kalender_sync = ja`, Event in `Config.kalender_id` anlegen. Ohne Uhrzeit ganztägig (`allDay: true`, Start `YYYY-MM-DDT00:00:00`, Ende nächster Tag), `availability: AVAILABILITY_FREE`. Titel `Training: <titel>`, Beschreibung = Kurzbeschreibung + Anleitung der Vorlage + Dashboard-Link. Event-ID in `kalender_event_id` speichern.
- Verschieben: `datum`/`uhrzeit` ändern, Event mit `update_event` nachziehen (`notificationLevel: NONE`).
- Ausgelassen/gelöscht: Event mit `delete_event` entfernen, `kalender_event_id` leeren.

### 3. Wochenvorschlag
Lies Ziele der aktiven Phase, die Einheiten der Woche, die letzten 4 Wochen (inkl. Kommentare), fällige Benchmarks und Kalendertermine (`list_events` für die Woche). Plane nur, was zur Zielerfüllung fehlt. Regeln: keine zwei harten Kraft-Einheiten (Fingerkraft Max, Bouldern Max, Beintraining) an aufeinanderfolgenden Tagen; kein Intervall am Tag nach Fingerkraft Max oder Beintraining; nach Kraft nur GA1/Recovery; max. 2 Einheiten pro Tag; Fingerkraft Max darf mit Eisgeräte am selben Tag stehen. Kai arbeitet 100 % und trainiert meist morgens 30–60 min, Touren am Wochenende.
Zeige den Vorschlag als Liste (Tag, Vorlage, Dauer, ein Satz Begründung) und **lege erst nach Kais Bestätigung an**.

### 4. Wochenstand / Auswertung
- Wochenstand: pro Hauptziel die Subziele mit Ist/Ziel und Status (erreicht / eingeplant / offen), Gesamt und Streaks.
- Auswertung über mehrere Wochen: Erfüllungsquote je Hauptziel und Subziel, Minuten je Kategorie pro Woche, Trend, auffällige Kommentare (Schmerz, müde, krank, ausgelassen). „Überlastet?“: Wochenminuten der letzten Woche gegen den Schnitt der 4 Wochen davor; > +30 % oder Kommentare mit Erschöpfung/Schmerz → ansprechen.
- Ausnahmewochen (Tab `Wochen`, `art` gesetzt) zählen weder als erfüllt noch brechen sie Streaks.
- Wochentitel: „nenn die Woche Malta“ → Tab `Wochen`, Spalte `notiz` setzen (Zeile anlegen, falls es keine gibt; `art` leer lassen).

### 5. Benchmarks
- Fällig, wenn letztes Ergebnis älter als `intervall_wochen` (Standard 8) – bei Wochenstand und Wochenvorschlag erwähnen.
- Erfassen: Zeile in `Benchmark_Ergebnisse` mit `hauptwert` (Zeit in Sekunden, Tempo in km/h), alle Messwerte als JSON in `werte`, `bedingungen`, `einheit_id`. Danach Veränderung zum letzten und ersten Ergebnis nennen.

### 5b. Lauf-Blog
„Schreib einen Blog-Beitrag“ / „analysier meine letzten Läufe“: Läufe seit dem letzten `Journal`-Eintrag (sonst 14 Tage) lesen. Kurzer Beitrag (max. 160 Wörter, sachlich): 1 Satz Überblick, „Was auffällt“ (2–4 Punkte mit Zahlen: Dauer, Pace, Puls, GA1 vs. Intervall, Muster in Kommentaren), „Tipp“ (genau ein konkreter Tipp für 1–2 Wochen). Als Zeile in `Journal` speichern (`quelle = sprache`).

### 6. Neue Phase nach Coaching
Kai nennt Coaching-Datum und neue Ziele. Dann: alte aktive Phase `status = abgeschlossen`, `ende` = Tag vor Start. Neue Zeile in `Phasen` (`id` fortlaufend `P-05`, …; `status = aktiv`, Fokus, Coaching-Notizen, ggf. Notion-Link). Hauptziele und Subziele anlegen (Struktur: Klettern / Laufen / Beine, sofern Kai nichts anderes sagt). Danach den Bericht der abgeschlossenen Phase anbieten.

### 7. Bericht für Michi
Für eine Phase (oder seit Coaching-Start 2026-03-20): Erfüllung je Hauptziel und Subziel (x von y Wochen), längste und aktuelle Streak, Stunden je Kategorie, Wochenraster, auffällige Kommentare, 4–6 Sätze Einschätzung mit 1–2 Fragen fürs Coaching. Als PDF mit dem pdf-Skill erstellen, oder auf den Button „PDF für Michi“ im Dashboard (Ansicht Verlauf) verweisen.
