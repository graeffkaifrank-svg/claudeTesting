# Trainings-Dashboard – Umsetzungsstand

Stand: 2026-10-30

| Baustein | Status | Wo |
|---|---|---|
| Google Sheet „Trainingsplan 2.0“ (10 Tabs) | fertig | https://docs.google.com/spreadsheets/d/11K-STJj8Up1AUSRQ6nWIpm5yBMa3ftp42RNFDilQJZ0/edit |
| Migration Notion + altes Sheet (259 Einheiten seit 16.03.2026, Kommentare bis 28.06.) | fertig | Tab `Einheiten`, `quelle = migration` |
| Phasen P-01–P-04, Hauptziele, Subziele, Vorlagen mit Michis Anleitungen, 3 Lauf-Benchmarks | fertig | Tabs `Phasen`, `Hauptziele`, `Ziele`, `Vorlagen`, `Benchmarks` |
| Dashboard (Woche, Verlauf, Leistung, Ziele, Vorlagen, PDF, Wochenvorschlag, Kalender-Sync) | fertig | `dashboard/trainingsplan.html` → https://claude.ai/artifact/WXh8YAo3U8Txnop9YKShW9 |
| Skill für Sprachbefehle | fertig, muss in claude.ai hochgeladen werden | `skills/trainingsplan.zip` |
| Garmin via intervals.icu (M7) | offen | Notion-Task „Garmin-Schnittstelle über intervals.icu aufbauen“ |

Update 30.10. (Feedback Kai)
- Raster und PDF in Ampelfarben: grün = erfüllt, gelb = ≥ 50 %, rot = < 50 %.
- Charts im IBCS-Stil (Ist dunkel, Soll Umriss, Abweichung grün/rot, Wertbeschriftung, keine Gitterlinien).
- Nur noch Benchmark B-L1 Referenzlauf aktiv; 3 Ergebnisse mit exakter Zeit und Pace (19:39 · 18:08 · 18:53).
- Neue Spalten `distanz_km`, `puls_avg`; Pace in Karten, Detail und Tabelle „Letzte Läufe“.
- Kommentare/Werte aus den Notion-Seiten der Läufe Juli–Oktober übernommen.
- Lauf-Blog (Tab `Journal`): Claude analysiert die Läufe seit dem letzten Beitrag und gibt einen Tipp. Mit Garmin-Daten (M7) werden Pace und Puls für alle Läufe automatisch gefüllt.

Bekannte Lücken
- Kommentare aus Notion-Seiten sind nur für Läufe übernommen, nicht für Klettern/Kraft (Juli–Oktober).
- 18.10. „GA 1 Lauf“ hat in Notion 2 Minuten – vermutlich 2 h, bitte prüfen.
- Kalender-Sync schreibt in den Hauptkalender (`Config.kalender_id`). Für einen eigenen Kalender „Training“ den Kalender in Google anlegen und seine ID in `Config` eintragen; `kalender_sync = nein` schaltet den Sync ab.
