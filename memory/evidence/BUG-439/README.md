# BUG-439 evidence — 2026-09-21
- Runner report: `/app/test_reports/iteration_9.json` (REG-1_no_duplicate_data_testids FAIL MINOR; all other cases PASS)
- Runner screenshots: `memory/evidence/CR-385/qa_2026_09_21_p0_5/round2_*.jpg`
- Code refs: ArrivalsPanel.jsx L41–57 (`actions(row)` → columns + RowExpansionStub), DeparturesPanel.jsx L35, InHousePanel.jsx L20, GuestTable.jsx L156–176 (`RowExpansionStub` renders `{actions}`)
- Repro (browser console, Arrivals row 17 expanded): document.querySelectorAll('[data-testid="fd-row-17-checkin-btn"]').length → 2
