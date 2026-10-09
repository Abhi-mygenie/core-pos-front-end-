# Closure Pass — Legacy SHIPPED + Finished Investigations — 2026-10-09

Role: CLOSURE (Role 11), Phase A (administrative). Trigger: owner directive 2026-10-09 ("Close the 11 old shipped items and 6 finished investigations in a separate pass"), from QA batch plan §B (`plans/QA_BATCH_PLAN_2026_10_09_IMPLEMENTED_BACKLOG.md`).

## Items closed (17) — Closed date 2026-10-09

| ID | Type | Title | Previous status |
|---|---|---|---|
| POS2-005 | CR | f_status=8 Hold/Audit reroute | SHIPPED + VERIFIED |
| CR-002 | CR | Cross-Sell + Customer Intelligence | SHIPPED + VERIFIED |
| Audit Report Optimization | CR | Transform rewrite + dual-mode sheet | SHIPPED |
| BUG-095 | BUG | Socket handler + dead code cleanup | P3 HYGIENE — prerequisites shipped, dead code removal only |
| BUG-058 | BUG | Prepaid Pending Payment Fails When Collecting From Hold/Audit Report | CARRY-FORWARD |
| PROD-003 | BUG | PayLater table clear | FE-VERIFIED, BE-FOLLOWUP |
| PROD-004 | BUG | Walk-in cart not cleared on stay-on-order | SHIPPED |
| PROD-005 | BUG | Prepaid screen clear delay | SHIPPED |
| BUG-111 P1+P2 | BUG | Grand Total + server-driven breakdown | SHIPPED + VERIFIED |
| PROD-HOTFIX-004 | BUG | Walk-in cart not cleared on stay-on-order | SHIPPED |
| PROD-HOTFIX-005 | BUG | Prepaid screen clear delay | SHIPPED |
| BUG-267 | BUG | Inventory Setup — Category Not Selecting When Adding Ingredient | INVESTIGATION COMPLETE — NEEDS_MORE_DATA (cannot reproduce) |
| INV-ROOM-001 | INV | Room Module: Partial Payment Mid-Stay + Food-to-Table Transfer | INVESTIGATION COMPLETE |
| INV-OE-001 | INV | Order Entry: Default Walk-In + Pre-Place Table Switch Cart Reset | INVESTIGATION COMPLETE |
| INV-PG-001 | INV | PG Link: OrderEntry Closes After Send + No Payment Link in Daily Repor | INVESTIGATION COMPLETE |
| INV-GST-001 | INV | GST Disable Not Working + Full Settings Gate Audit | INVESTIGATION COMPLETE |
| INV-BACKEND-001 | INV | Aggregator Socket + Razorpay Refund + Station Config + Food Court Endp | INVESTIGATION COMPLETE |

New statuses:
- 11 legacy → `CLOSED — OWNER VERIFIED (closure pass 2026-10-09: legacy pre-gate item, shipped to production; owner-directed)`
- 5 INV-* → `CLOSED — INVESTIGATION COMPLETE (… findings delivered; owner-directed)`
- BUG-267 → `CLOSED — COULD NOT REPRODUCE (… re-open with repro steps)`

## Artifact audit
Legacy items pre-date the gate system (no Intake/IA/Plan/QA Report/Smoke artefacts expected). INV items: investigation reports are the deliverable; no code changed. Closure is owner-attested, not QA-verified.

## Residual risk (re-open triggers)
- **PROD-003** previous status "FE-VERIFIED, BE-FOLLOWUP" — backend follow-up was never tracked separately. Re-open / file backend brief if still pending.
- **BUG-058** previous status "CARRY-FORWARD" — closed per directive; re-open if the Hold/Audit prepaid collect failure recurs.
- **INV-*** findings not yet converted to CRs remain untracked; owner may spawn CRs (next ID CR-419).

## Not touched
BUG-268 (Blocked on BACKEND), CR-053 / CR-011 (implementation incomplete), CR-370 (doc-only) remain IMPLEMENTED.
