# POS REGISTRAR run report — 2026-10-09 (contract v1.4, CR-418 rework)

Sheet: https://docs.google.com/spreadsheets/d/18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY
Script: `memory/reports/sheets_sync.py --push` · baseline: `memory/reports/sheet_push_snapshot.json`

| Metric | Value |
|---|---|
| Rows pushed (All Items) | 771 |
| INTAKE / PLANNING / IMPLEMENTED / QA / SMOKE | 91 / 8 / 54 / 170 / 175 |
| CLOSED / PARKED / DUPLICATE | 255 / 16 / 2 |
| Unclassified | **0** |
| PRIORITY DEFAULTED (P2) | 150 (296 had no `priority`; 146 recovered from `severity`) |
| Missing Registered | 176 |
| Missing Last updated | 114 (no date anywhere in item) |
| Closed-type missing Closed | 121 |
| Area recognised | 221 (15 raw free-form values unrecognised → blank) |
| Live blockers (Blocked on) | 15 (all BACKEND) |
| Stale blockers dropped | 29 items (old Blockers tab: 16 legacy rows) |
| Change Log | 0 new · 0 applied · 0 pending |

Tabs (contract §2 order): All Items · Intake · Planning · Implemented · QA · Smoke · Closed · Blockers · Change Log · Summary.
