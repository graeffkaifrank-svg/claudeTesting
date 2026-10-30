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

Bekannte Lücken
- Kommentare aus den Notion-Seiteninhalten (Juli–Oktober) wurden nicht übernommen, nur Titel, Typ, Dauer und Status. Notion bleibt als Archiv.
- Kalender-Sync schreibt in den Hauptkalender (`Config.kalender_id`). Für einen eigenen Kalender „Training“ den Kalender in Google anlegen und seine ID in `Config` eintragen; `kalender_sync = nein` schaltet den Sync ab.
