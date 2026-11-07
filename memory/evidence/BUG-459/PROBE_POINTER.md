# BUG-459 evidence pointer
- Code-trace arithmetic: `evidence/BUG-459/getDrift_analysis.json`
- Live probe (add-stock recount matrix A1–A9, restore/repair C1–C2): `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/` — `PROBE_REPORT.md` §1, §3, §4; runners `run_a_audit.py`, `run_c_restore.py`; raw `a_*.json`, `c_*.json`; request bodies `a_requests.jsonl`, `c_requests.jsonl`
- Baseline read-back with corrupted rows: `s0_stock_inventory_raw.json` (ANGARA GREAVY #20320 2,300,000 gm; UAT BIRYANI MASALA #20329 250,000 gm)
