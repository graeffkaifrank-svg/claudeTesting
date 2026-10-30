# Trainings-Dashboard – Requirements

Stand: 2026-10-30 · Status: Entwurf v1 · Owner: Kai

Dieses Dokument ist die Bauanleitung für Claude Code. Es beschreibt Ziel, Datenmodell, Regeln, Features und Abnahmekriterien. Offene Punkte stehen am Ende und sind vor dem jeweiligen Meilenstein zu klären.

---

## 1. Ziel

Ein persönliches Trainings-System, das den bisherigen Notion-Trainingsplan ablöst:

- Trainingseinheiten planen, abhaken und kommentieren – im Dashboard **und** per (Sprach-)Befehl an Claude.
- Pro Coaching-Phase (Zeitraum zwischen zwei Coaching-Sessions mit Michi Wohlleben) eigene Wochenziele, gemischt aus **Anzahl Einheiten** und **Minuten**.
- Wochenüberblick als Checkliste: Welche Ziele sind erfüllt, was fehlt, was ist geplant.
- Verlauf/Streak über die Wochen und ein **PDF-Export pro Phase** für Michi.
- Zu jeder Einheit die Anleitung, die mit Michi festgelegt wurde (z.B. „Halle: am Ende Repeaters“).
- Geplante Einheiten erscheinen im Google Calendar.
- Claude hat Lesezugriff auf alle Daten inkl. Kommentare, um Auswertungen zu machen.

Nicht-Ziele (v1): Bergführer-/Touren-Datenbanken bleiben in Notion. Kein Mehrbenutzer-Betrieb (nur Kai; Michi bekommt PDFs).

## 2. Architektur-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Datenbank | **Google Sheet** in Kais Google Drive | Daten gehören Kai, einfach exportierbar, Claude erreicht es über den Google-Sheets-Connector von überall (Claude App, Sprache, Claude Code). |
| Dashboard | **Claude-Artifact** (eine HTML-Seite auf claude.ai) | Kein Hosting, kein eigener Google-Login: die Seite nutzt über die `mcp`-Capability Kais claude.ai-Connectoren (Google Sheets, Google Calendar). Läuft am Handy und am Desktop. |
| Lokale HTML-Datei | **Nicht** in v1 | Eine lokal geöffnete HTML-Datei hat keinen Zugriff auf die claude.ai-Connectoren und bräuchte ein eigenes Google-Cloud-Projekt mit OAuth-Client. Möglich, aber nur, wenn das Artifact nicht reicht. |
| Sprachbefehle | **Claude-Skills**, die direkt im Sheet lesen/schreiben | Ersetzen die bisherigen Notion-Skills `training-abschluss` und `training-analyse`. |
| Load | **Minuten** (keine RPE-Gewichtung) | Bewusst einfach. Minuten sind nur bei zeitrelevanten Typen Pflicht (siehe `Typen.zeit_relevant`). |
| Kalender | **Google Calendar**, Einbahn: Sheet → Kalender | Google Tasks hat keinen Connector; deshalb Kalender-Events statt Aufgaben. |
| Export für Michi | **PDF** pro Phase | Im Dashboard per Button erzeugt und gespeichert. |
| Garmin | **Phase 2**, bevorzugt über intervals.icu (siehe §11) | Garmin hat keine offene Privat-API. |

## 3. Begriffe

- **Einheit**: eine Trainingseinheit an einem Tag (geplant, erledigt oder ausgelassen).
- **Kategorie**: grobe Belastungsart (Laufen-Ausdauer, Klettern-Kraft, …).
- **Typ**: konkrete Art der Einheit innerhalb einer Kategorie (GA1, Intervall, Fingerkraft Max, …). Jede Einheit hat **genau einen Typ**; die Kategorie ergibt sich aus dem Typ.
- **Vorlage**: wiederverwendbare Einheit mit Typ, Standarddauer und Michis Anleitung.
- **Phase**: Zeitraum von einer Coaching-Session bis zur nächsten. Trägt die Ziele.
- **Ziel**: Wochenziel innerhalb einer Phase, z.B. „Laufen ≥ 180 min“ oder „Fingerkraft Max ≥ 2×“.
- **Kernziel**: Ziel, das für die Streak zählt.
- **Woche**: Montag bis Sonntag, ISO-Kalenderwoche, Zeitzone Europe/Zurich.

## 4. Datenmodell (Google Sheet)

Ein Spreadsheet „Trainingsplan“ mit folgenden Tabellenblättern. Zeile 1 ist immer die Kopfzeile; **der Code adressiert Spalten über den Kopfzeilen-Namen, nie über die Position.** Jede Zeile hat eine stabile `id`; Zeilennummern werden nie als Schlüssel gespeichert.

### 4.1 `Einheiten`

| Spalte | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| id | Text | ja | `E-` + 8 Zeichen zufällig (z.B. `E-k3f9x2ab`) |
| datum | Text `YYYY-MM-DD` | ja | Trainingstag |
| uhrzeit | Text `HH:MM` | nein | Für Kalender-Event mit Uhrzeit; leer = ganztägig |
| titel | Text | ja | Anzeigename, Standard = Vorlagenname bzw. Typ |
| typ | Text | ja | Verweis auf `Typen.typ` |
| vorlage_id | Text | nein | Verweis auf `Vorlagen.id` |
| status | `geplant` \| `erledigt` \| `ausgelassen` \| `geloescht` | ja | `geloescht` = Soft-Delete, wird überall ausgeblendet |
| dauer_geplant_min | Zahl | nein | Aus Vorlage vorbelegt |
| dauer_ist_min | Zahl | nein | Pflicht beim Abhaken nur wenn `Typen.zeit_relevant = ja`, sonst wird `dauer_geplant_min` übernommen |
| gefuehl | Zahl 1–5 | nein | Subjektives Gefühl (ersetzt den „gefühlten Fitness-Score“ der alten Analyse) – siehe offene Fragen |
| kommentar | Text | nein | Freitext, wie es gelaufen ist |
| quelle | `dashboard` \| `sprache` \| `migration` \| `garmin` \| `vorschlag` | ja | Herkunft |
| kalender_event_id | Text | nein | ID des Google-Calendar-Events |
| garmin_activity_id | Text | nein | Phase 2 |
| erstellt_am / geaendert_am | Text ISO-Datetime | ja | Audit |

### 4.2 `Typen`

| Spalte | Beschreibung |
|---|---|
| typ | Eindeutiger Name, z.B. `GA1`, `Intervall`, `Fingerkraft Max` |
| kategorie | z.B. `Laufen-Ausdauer` |
| zeit_relevant | `ja`/`nein` – fragt das Dashboard beim Abhaken nach Minuten? (Laufen, Klettern-Ausdauer: ja; Fingerkraft: nein) |
| farbe | Hex-Farbe für das Dashboard (pro Kategorie gleich) |
| aktiv | `ja`/`nein` |

Startliste (Vorschlag, mit Kai abzustimmen):

| Kategorie | Typen | zeit_relevant |
|---|---|---|
| Laufen-Ausdauer | GA1, Intervall, Trail/Berglauf | ja |
| Berg/Tour | Bergtour, Skitour, Mehrseillänge | ja |
| Klettern-Kraft | Fingerkraft Max, Bouldern Max | nein |
| Klettern-Ausdauer | Halle Ausdauer, Fels, Eisgeräte | ja |
| Core und Stabi | Core, Stabi Beine | nein |
| Beine Kraft | Beintraining, Sprünge | nein |
| Recovery | Mobility, Yoga, Regeneration | nein |

### 4.3 `Vorlagen`

| Spalte | Beschreibung |
|---|---|
| id | `V-` + 6 Zeichen |
| name | z.B. „Klettern Halle“ |
| typ | Verweis auf `Typen.typ` |
| dauer_standard_min | Vorbelegung für `dauer_geplant_min` |
| kurzbeschreibung | 1 Zeile, wird auf der Karte gezeigt |
| anleitung | Längerer Text (Markdown erlaubt): was mit Michi festgelegt wurde, z.B. „Am Ende 3×6 Repeaters 7/3 s“ |
| anleitung_link | optional: Link auf ein Google Doc oder Video |
| aktualisiert_am | Datum der letzten Änderung (z.B. nach einem Coaching) |
| aktiv | `ja`/`nein` |

### 4.4 `Phasen`

| Spalte | Beschreibung |
|---|---|
| id | `P-` + Nummer, fortlaufend (`P-01`, `P-02`, …) |
| name | z.B. „Q4/2026 – Ausdauer-Basis“ |
| start | Datum der Coaching-Session (= erster Tag der Phase) |
| ende | Tag vor der nächsten Coaching-Session; leer = laufend |
| fokus | 1–3 Sätze: Schwerpunkt der Phase |
| coaching_notizen | Notizen aus der Session, die die Phase eröffnet hat |
| status | `aktiv` \| `abgeschlossen` |

Es ist immer höchstens eine Phase `aktiv`.

### 4.5 `Ziele`

| Spalte | Beschreibung |
|---|---|
| id | `Z-` + 6 Zeichen |
| phase_id | Verweis auf `Phasen.id` |
| bezeichnung | z.B. „Laufen gesamt“ |
| messgroesse | `anzahl` \| `minuten` |
| zielwert | Zahl pro Woche |
| filter_ebene | `kategorie` \| `typ` |
| filter_werte | Kommagetrennte Liste, z.B. `Laufen-Ausdauer` oder `GA1` |
| kernziel | `ja`/`nein` |
| reihenfolge | Zahl, Anzeige-Reihenfolge |

Beispiel (Kais Wunsch):

| bezeichnung | messgroesse | zielwert | filter_ebene | filter_werte | kernziel |
|---|---|---|---|---|---|
| Laufen gesamt | minuten | 180 | kategorie | Laufen-Ausdauer | ja |
| GA1-Lauf | anzahl | 1 | typ | GA1 | ja |
| Intervall-Lauf | anzahl | 1 | typ | Intervall | ja |
| Fingerkraft Max | anzahl | 2 | typ | Fingerkraft Max | ja |
| Core | anzahl | 2 | kategorie | Core und Stabi | nein |

### 4.6 `Wochen`

Nur für Ausnahmen; eine Zeile pro markierter Woche.

| Spalte | Beschreibung |
|---|---|
| woche | ISO-Woche `YYYY-Www` |
| art | `krank` \| `urlaub` \| `tourenwoche` \| `deload` |
| notiz | Freitext |

### 4.7 `Config`

Key/Value: `zeitzone` (Europe/Zurich), `kalender_id` (Google Calendar „Training“), `coaching_start` (Datum der ersten Coaching-Session), `schema_version`.

## 5. Regeln

1. **Zuordnung Einheit → Ziel**: Eine Einheit zählt für ein Ziel, wenn ihr Typ (bei `filter_ebene = typ`) bzw. die Kategorie ihres Typs (bei `filter_ebene = kategorie`) in `filter_werte` steht. Keine Stichwortsuche im Titel.
2. **Ist-Wert**: nur Einheiten mit `status = erledigt`. Bei `messgroesse = minuten` zählt `dauer_ist_min` (fallback `dauer_geplant_min`), bei `anzahl` jede Einheit 1×.
3. **Plan-Wert**: Einheiten mit `status = geplant` in der Woche, gleiche Logik mit `dauer_geplant_min`.
4. **Zielstatus pro Woche**: `erreicht` (Ist ≥ Ziel) · `eingeplant` (Ist + Plan ≥ Ziel) · `offen` (sonst, mit Rest „fehlt 1×“ / „fehlt 45 min“).
5. **Phase einer Woche**: die Phase, in der der Montag der Woche liegt.
6. **Woche erfüllt**: alle Kernziele der Phase `erreicht`.
7. **Streak**: Anzahl aufeinanderfolgender erfüllter Wochen bis zur letzten abgeschlossenen Woche. Die laufende Woche bricht die Streak nicht, sie wird als „läuft“ angezeigt. Ausnahmewochen (`Wochen`-Tabelle) werden übersprungen: sie zählen weder als erfüllt noch brechen sie die Streak.
8. **Trefferquote je Ziel**: erreichte Wochen ÷ ausgewertete Wochen (ohne Ausnahmewochen) in der Phase.
9. **Wochen-Load**: Summe Minuten erledigt (Ist) und Summe Minuten geplant (Plan), gesamt und je Kategorie.

## 6. Dashboard (Artifact)

Mobile first (ab 360 px), Desktop bis ~1300 px. Hell/Dunkel-Modus. Deutsch.

### 6.1 Ansicht „Woche“ (Startansicht)

- Kopf: KW, Datumsbereich, aktive Phase (Name + Fokus einklappbar), Wochen-Navigation (‹ Heute ›).
- **Ziel-Checkliste**: pro Ziel eine Zeile mit Häkchen-Symbol (erreicht / eingeplant / offen), Ist/Ziel als Zahl und Fortschrittsbalken (erledigt voll, geplant schraffiert). Kernziele sind markiert. Oben: „3 von 4 Kernzielen erreicht“.
- **Load**: Minuten erledigt vs. geplant für die Woche, aufgeteilt nach Kategorie (gestapelter Balken).
- **Kalender**: 7 Tage (Desktop: Spalten, Handy: Zeilen). Karten mit Titel, Typfarbe, Dauer, Status.
  - **Abhaken mit einem Tipp** auf den Kreis der Karte. Bei zeitrelevantem Typ öffnet sich eine Mini-Abfrage „Minuten?“ (vorbelegt mit geplanter Dauer) plus optional Kommentar.
  - Karte antippen → Detailblatt: Titel, Datum, Uhrzeit, Status, Dauer geplant/ist, Gefühl, Kommentar, **Anleitung aus der Vorlage** (gerendertes Markdown + Link), Löschen (Soft-Delete).
  - **Drag & Drop** zum Verschieben auf einen anderen Tag (Pointer-Events, funktioniert per Touch über einen Griff). Alternative ohne Drag: Datum im Detailblatt ändern.
  - „+ Einheit“ pro Tag → Auswahl aus Vorlagen oder Typ ohne Vorlage. Vorlagen lassen sich auch aus einer Leiste auf einen Tag ziehen.
- **Woche als Ausnahme markieren** (krank/urlaub/tourenwoche/deload).

Abnahme:
- [ ] Abhaken einer Fingerkraft-Einheit = 1 Tipp, kein Minuten-Dialog.
- [ ] Abhaken einer GA1-Einheit fragt Minuten ab, vorbelegt.
- [ ] Jede Änderung steht innerhalb von 3 s im Sheet; bei Fehler wird die Änderung in der UI zurückgenommen und eine verständliche Meldung gezeigt.
- [ ] Ein per Sprache angelegter Eintrag erscheint nach Neuladen bzw. spätestens nach 2 min automatisch.

### 6.2 Ansicht „Verlauf“

- **Streak** (Zahl + Flamme o.ä.) und „x von y Wochen erfüllt“ in der aktiven Phase und seit Coaching-Start.
- **Raster Ziel × Woche** (Heatmap): Zeilen = Ziele der gewählten Phase, Spalten = Wochen, Zelle grün/gelb/rot/grau (Ausnahme). Antippen zeigt Ist/Ziel.
- **Wochenminuten** als Balkendiagramm über die Phase, gestapelt nach Kategorie, mit Linie für das Minuten-Ziel.
- Phasen-Auswahl (aktive Phase vorausgewählt, ältere wählbar).

### 6.3 Ansicht „Phasen & Ziele“

- Liste der Phasen; aktive oben.
- **Neue Phase starten** (nach einem Coaching): Startdatum, Name, Fokus, Coaching-Notizen; Ziele der vorherigen Phase werden als Kopie vorgeschlagen und können angepasst werden. Die vorherige Phase wird automatisch mit `ende = Start − 1 Tag` abgeschlossen. Danach wird angeboten, den PDF-Export der abgeschlossenen Phase zu erzeugen.
- Ziele bearbeiten: Bezeichnung, Messgröße, Zielwert, Filter (Auswahl aus Kategorien/Typen), Kernziel, Reihenfolge.

### 6.4 Ansicht „Vorlagen“

- Liste der Vorlagen, gruppiert nach Kategorie. Bearbeiten von Name, Typ, Standarddauer, Kurzbeschreibung, Anleitung (Markdown) und Link.

### 6.5 PDF-Export für Michi

Button in „Verlauf“ und nach Phasenwechsel. Zeitraum wählbar: eine Phase oder „seit Coaching-Start“.

Inhalt:
1. Kopf: Name, Zeitraum, Phase(n), Fokus.
2. Kennzahlen: erfüllte Wochen / ausgewertete Wochen, längste und aktuelle Streak, Trefferquote je Ziel, Stunden je Kategorie.
3. Raster Ziel × Woche und Wochenminuten-Diagramm.
4. Auffällige Kommentare (ausgelassene Einheiten mit Kommentar, Gefühl ≤ 2).
5. Kurze Auswertung durch Claude (3–6 Sätze: was lief gut, was nicht, Vorschlag für Gespräch) – über die `sample`-Capability, vor dem Export editierbar.

Technik: PDF clientseitig mit jsPDF (UMD von cdnjs, feste Version) erzeugen und über die `downloads`-Capability speichern. Alternativ kann Kai den Export auch per Chat anfordern (Skill `coaching-export`).

### 6.6 Wochenplan-Vorschlag

Button „Woche vorschlagen“ (für die angezeigte oder nächste Woche):
- Eingaben an Claude (`sample`-Capability): Ziele der Phase, schon geplante/erledigte Einheiten, Vorlagen, letzte 4 Wochen (Load, ausgelassene Einheiten, Kommentare), belegte Zeiten aus Google Calendar.
- Ausgabe: Liste vorgeschlagener Einheiten (Datum, Vorlage, Dauer, Begründung 1 Satz) als gestrichelte Entwurfskarten.
- Kai kann einzeln übernehmen/verwerfen oder „alle übernehmen“. Erst dann wird ins Sheet (und den Kalender) geschrieben, mit `quelle = vorschlag`.
- Regeln für den Vorschlag: keine zwei harten Kraft-Einheiten an aufeinanderfolgenden Tagen, Intervall nicht am Tag nach Fingerkraft Max, Wochen-Load nicht mehr als +15 % über dem 4-Wochen-Schnitt (Werte konfigurierbar, mit Michi abzustimmen).

## 7. Google Calendar

- Eigener Kalender „Training“ (ID in `Config.kalender_id`).
- Beim Anlegen einer geplanten Einheit: Event erstellen. Ohne Uhrzeit ganztägig und als „frei“ (blockiert nichts), mit Uhrzeit für die geplante Dauer.
- Titel: `Titel (Dauer)`, nach Abhaken `✓ Titel`. Beschreibung: Kurzbeschreibung + Anleitung + Link aufs Dashboard.
- Verschieben/Ändern im Dashboard oder per Sprache → Event aktualisieren. Soft-Delete oder `ausgelassen` → Event löschen bzw. als `✗ Titel` markieren (Entscheidung offen).
- Richtung nur Sheet → Kalender. Änderungen direkt im Kalender werden nicht zurück übernommen (v1).
- `kalender_event_id` wird in `Einheiten` gespeichert.

## 8. Sprachbefehle / Skills

Neue Skills (ersetzen die Notion-Versionen). Alle lesen die Spreadsheet-ID aus der Skill-Beschreibung bzw. einer festen Konstante und halten sich an die Regeln aus §5.

| Skill | Beispiele | Wirkung |
|---|---|---|
| `training-erfassen` | „Hab heute 50 min GA1 gemacht, lief zäh, Puls hoch.“ · „Fingerkraft erledigt.“ · „Gestern Klettern Gasi 90 Minuten, am Ende Repeaters.“ | Sucht passende geplante Einheit am Tag (Typ-Match) → setzt `erledigt`, Minuten, Kommentar. Sonst neue Einheit mit `erledigt`. Bestätigt kurz, was geändert wurde. |
| `training-planen` | „Plan Intervalle für Donnerstag 18 Uhr.“ · „Verschieb Core auf morgen.“ · „Mach mir einen Vorschlag für nächste Woche.“ | Legt an / verschiebt / schlägt vor (gleiche Logik wie §6.6), inkl. Kalender. |
| `training-woche` | „Wie steh ich diese Woche?“ · „Was fehlt mir noch?“ | Ziel-Checkliste der Woche als Text. |
| `training-auswertung` | „Analysier die letzten 4 Wochen.“ · „Bin ich überlastet?“ | Auswertung inkl. Kommentare, Trend, Streak. |
| `coaching-export` | „Mach den Export für Michi.“ | PDF wie §6.5. |
| `phase-starten` | „Neues Quartal nach dem Coaching heute: 4 h Laufen, 2× Finger …“ | Legt Phase und Ziele an, schließt die alte Phase ab, bietet Export an. |

Abnahme:
- [ ] Ein Satz wie „Fingerkraft erledigt“ führt ohne Rückfrage zu genau einer Änderung, wenn heute eine Fingerkraft-Einheit geplant ist.
- [ ] Bei Mehrdeutigkeit (zwei passende Einheiten, unbekannter Typ) fragt der Skill genau einmal nach.
- [ ] Der Skill nennt am Ende kurz, was geändert wurde und den Wochenstand des betroffenen Ziels („GA1 ✓ · Laufen 130/180 min“).

## 9. Migration aus Notion

Einmalig, ausgeführt von Claude mit Notion- und Sheets-Connector:
- Quelle: Notion „Trainingsplan DB“ (`collection://38e798fe-3ffc-80ca-a8df-000b9df8bcf1`).
- `Name` → `titel`; `date` → `datum`; `Status` Planned/Done/Declined → geplant/erledigt/ausgelassen; `Belastungszeit [Min]` → `dauer_ist_min` (bei erledigt) bzw. `dauer_geplant_min`.
- `typ` per Zuordnung aus Titel und `Belastung` (z.B. „GA 1 Lauf“, „GA1 Laufband“ → GA1; „Intervall…“ → Intervall; „Core Training“ → Core). Nicht eindeutig zuordenbare Einträge kommen in eine Prüfliste, die Kai bestätigt, bevor sie importiert werden.
- Notion-Templates (Core Training, Intervalle Pyramiden, Max Kraft Finger, Max Kraft Bouldern mit Ausdauer, GA1 Lauf, Klettern Gasi, Stabi Beine) → `Vorlagen`, Seiteninhalt → `anleitung`.
- Wochenziele aus der DB-Beschreibung → erste Phase `P-01` (Start = Coaching-Start).
- `quelle = migration`. Notion bleibt danach unverändert als Archiv.

## 10. Technische Vorgaben (für Claude Code)

- **Ein Artifact**, eine HTML-Datei, Vanilla JS oder Preact (UMD von cdnjs, feste Version). Keine Build-Pipeline nötig.
- **Capabilities**: `mcp` mit den Servern „Google Sheets“ (`get_values`, `append_values`, `update_values`; ggf. `get_spreadsheet`) und „Google Calendar“ (`create_event`, `update_event`, `delete_event`, `list_events`); `downloads` (PDF); `sample` (Vorschläge, PDF-Auswertung). Exakte Connector- und Tool-Namen vor dem Bau prüfen.
- **Lesen**: Alle Blätter beim Start einlesen (Datenmenge klein, < 2000 Zeilen), über `watchTool` aktuell halten (Refetch ca. 2 min) und nach jedem Schreibvorgang `invalidate`.
- **Schreiben**:
  - Neue Zeilen nur per `append_values`.
  - Änderungen: direkt vor dem Schreiben die `id`-Spalte neu lesen, Zeile über die `id` finden, dann `update_values` auf genau diese Zeile. Nie Zeilen physisch löschen (Soft-Delete), damit Zeilennummern stabil bleiben.
  - `geaendert_am` bei jeder Änderung setzen.
- **Datumswerte**: Datumsspalten im Sheet als „Nur Text“ formatieren und Werte als Text `YYYY-MM-DD` schreiben. Beim Lesen trotzdem auch Seriennummern und deutsche Formate (`30.10.2026`) parsen – das Sheet kann von Hand bearbeitet werden.
- **Fehlerbehandlung** nach Fehlercode der `mcp`-Capability (Neu verbinden, Connector fehlt, Zugriff erlauben, Server nicht erreichbar). Kein allgemeiner „Etwas ist schiefgelaufen“-Banner. Optimistische UI mit Zurücknehmen bei Fehler.
- **Kein localStorage für Daten**; höchstens für UI-Zustände (gewählte Ansicht).
- **Datenschutz**: Das Artifact bleibt privat. Michi bekommt nur PDFs.
- **Schema-Version** in `Config`; Skills und Dashboard prüfen sie und warnen bei Abweichung.

## 11. Garmin (Phase 2) – Optionen

Garmin bietet keine offene API für Privatpersonen (die offizielle Connect-API ist nur für Firmen-Partner).

| Option | Wie | Pro | Contra |
|---|---|---|---|
| **A: intervals.icu als Brücke** (Empfehlung) | Kostenloses intervals.icu-Konto mit Garmin verbinden (offizielle Synchronisation). intervals.icu hat eine REST-API mit persönlichem API-Key. Eine tägliche Claude-Routine holt neue Aktivitäten und schreibt/gleicht sie im Sheet ab. | Offiziell, stabil, liefert Dauer, Typ, Puls, Load. Kann sogar geplante Workouts auf die Uhr schicken. | Ein weiteres Konto; API-Key muss als Secret in der Routine liegen. |
| B: Strava als Brücke | Garmin → Strava-Sync, Strava-API (OAuth) | Offiziell | Strava-Konto nötig, OAuth-App-Setup aufwändiger als A. |
| C: Inoffizielle Garmin-Bibliothek (`python-garminconnect`) | Login mit Garmin-Zugangsdaten in einem Skript | Direkt, kein Drittanbieter | Nutzt dein Passwort, kann bei Garmin-Änderungen brechen, Grauzone der Nutzungsbedingungen. |
| D: Manueller Upload | Garmin-Export (CSV) im Dashboard hochladen | Kein Setup | Handarbeit. |

Abgleich-Logik (für A–D gleich): Aktivität am selben Tag mit passendem Typ (Laufen, Klettern, …) → geplante Einheit wird `erledigt`, `dauer_ist_min` und `garmin_activity_id` gesetzt. Ohne Treffer → neue Einheit, im Dashboard als „von Garmin, bitte Typ prüfen“ markiert.

## 12. Meilensteine

1. **M1 – Fundament**: Sheet anlegen (Blätter, Kopfzeilen, Formate), Typen und Vorlagen befüllen, Notion-Migration, Skills `training-erfassen` und `training-woche`.
2. **M2 – Dashboard Woche**: Ansicht „Woche“ komplett (§6.1).
3. **M3 – Phasen, Ziele, Verlauf**: §6.2–6.4, Skill `phase-starten`.
4. **M4 – Kalender**: §7.
5. **M5 – Export & Vorschläge**: §6.5, §6.6, Skills `coaching-export`, `training-planen`, `training-auswertung`.
6. **M6 – Garmin**: §11 Option A.

## 13. Offene Fragen

1. Wann war die erste Coaching-Session mit Michi (= `coaching_start`), und wann ist die nächste?
2. Typenliste (§4.2): passt die Einteilung? Fehlen Typen (z.B. Skitour, Eisklettern, Hangboard-Ausdauer)?
3. Welche Ziele gelten für die aktuelle Phase, und welche davon sind Kernziele?
4. Feld `gefuehl` (1–5) beim Abhaken behalten oder weglassen? (Die alte `training-analyse` nutzt einen gefühlten Fitness-Score.)
5. Kalender: eigener Kalender „Training“ ok? Standardmäßig ganztägig oder mit Uhrzeit planen? Ausgelassene Einheiten löschen oder als `✗` stehen lassen?
6. Garmin: Ist ein intervals.icu-Konto als Brücke für dich ok?
7. Regeln für den Wochenvorschlag (§6.6): mit Michi abstimmen.
8. Sollen Touren aus der Notion-Touren-DB automatisch als Einheit im Sheet landen (der Skill `tour-eintrag` schreibt heute in den Notion-Trainingsplan)?
