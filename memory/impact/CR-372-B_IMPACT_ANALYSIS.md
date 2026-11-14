# CR-372-B — Delete /settlement/preview + Unguarded Routes — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL (most routes guarded). Risk: LOW. File: `src/App.js` (BUG-661 open GATE_5A on App.js — sequence after).

## Owner decision (locked)
Delete `/settlement/preview` demo page. `/local-printer-setup` — decide at impact.

## Unguarded routes at HEAD (grep, 2026-11-14)
`/` (login, public), `/restaurant-picker`, `/settlement/preview` L244 (SettlementMockup), `/local-printer-setup` L251 (LocalPrinterSetupView), and nested preview routes under `/reports-module/*` (L177-192, L238-239) — the parent `/reports-module/*` is wrapped in PermissionRoute(report) L171, so these are guarded by the parent.

## Change (estimate)
Remove route L244 + import of SettlementMockup (and the mockup file if unused elsewhere — verify Gate 3).

## Open owner decisions
- OD-372B-A: `/local-printer-setup` — require login, or keep open because the printer device opens it without logging in? OPEN.
- OD-372B-B: `/restaurant-picker` unguarded — intended (multi-restaurant chooser after login)? OPEN.
