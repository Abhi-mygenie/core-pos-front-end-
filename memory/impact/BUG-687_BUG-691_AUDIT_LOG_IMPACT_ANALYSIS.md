# BUG-687 + BUG-691 — Impact Analysis (Gate 2) — grouped (same file)

**IDs:** BUG-687 (MAJOR / spec), BUG-691 (MINOR / clipped time) · **Area:** Reports / Analytics
**File:** `frontend/src/pages/reports-module/AuditLogMockup.jsx`
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

Grouped because both touch the **same file**. Gate 3 must batch all `AuditLogMockup.jsx` edits in one pass (bottom-up), together with the already-planned BUG-695…700 IA (`memory/impact/AUDIT_REPORT_QA_BUGS_695-700_IMPACT_ANALYSIS.md`).

---
## BUG-687 — Audit Log renders CR-546 design, not CR-528 spec
### Code Reality
**FULL** — the page currently renders the CR-546 redesign (4 KPI cards + 3 collapsible cards), not the CR-528 3-tab / 10-column layout. Per QA (`memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md`) the page matches the **LOCKED v3 design** (`memory/design/AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md`); the "mismatch" is against the **stale CR-528 plan**.
### Conflict Pre-Check
- Same file as BUG-695…700 (already `GATE_2_IA_COMPLETE`) and BUG-691 → **must batch**.
- RELATED: CR-528 (original spec), CR-546 (redesign currently shipping).
### Classification
Likely **NOT a code defect** — intended current design. Needs owner reconciliation/close decision before any change.
### Owner decisions
- **OD-687-01:** Is CR-546 the intended Audit Log design (→ close BUG-687 as "working as designed / reconcile CR-528"), OR must it revert to the CR-528 3-tab / 10-column spec (→ scope a redesign, LARGE)? **No code until decided.**
### Blast radius
Unknown until OD-687-01; if "close" → 0 code. If "revert to CR-528" → full report-page rework (LARGE, HIGH risk).

---
## BUG-691 — TIME cells clipped at "2026-"
### Code Reality
**FULL** — `AuditLogMockup.jsx`:
- L24 `const fmtTime = (dt) => dt ? dt.split(' ').pop()?.slice(0,5) || dt : '—';` — intends HH:MM. If the value has **no space** (date-only, e.g. `"2026-11-18"`), `split(' ').pop()` returns the whole date and `.slice(0,5)` yields `"2026-"` → the observed clip.
- L147 drill-down cell renders `fmtTime(e.cancel_time || e.discount_time || e.edit_time || '')` with `whitespace-nowrap`.
Root cause candidate: input timestamps for some events arrive **date-only / different format**, so `fmtTime` slices the date prefix rather than a time. (Column width is not the cause — `fmtTime` output itself is `"2026-"`.)
### Conflict Pre-Check
Same file as BUG-687 / 695-700 → batch together.
### Affected lines
| Lines | Nature |
|-------|--------|
| L24 (`fmtTime`) + L147 (cell) | make `fmtTime` robust to date-only / full-ISO inputs; verify at HEAD whether clip still reproduces with v3 data |
### Risk
LOW (display formatter). MEDIUM process because shared report file.
### Owner decisions
None (formatter fix). Confirm expected display = HH:MM.
### Verification seeds
1. Event with `"YYYY-MM-DD HH:MM:SS"` → shows `HH:MM`.
2. Event with date-only / ISO `T` separator → shows a valid time or `—`, never `"2026-"`.
