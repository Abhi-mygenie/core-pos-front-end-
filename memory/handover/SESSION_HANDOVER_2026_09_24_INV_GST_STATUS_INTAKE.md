# SESSION HANDOVER — 2026-09-24 — INVESTIGATION + INTAKE: GST architecture / `gst_status` / menu validation

**Role:** INVESTIGATION (10/10 steps) → INTAKE (3 items) · **Code changed:** NONE · **Registry:** 712 → 715 (BUG-454, BUG-455, CR-387) · **Branch:** `21implement` @ `a4c9196f`
**Summary:** `gst_status` (profile boolean) is already consumed by FE (`restaurant.tax.gstStatus`, CR-036-FU-03) for Bulk-Editor validation and Collect-Bill display — but NOT by the order payload (`orderTransform`, → BUG-454 P0), NOT by single-item ProductForm (→ BUG-455), NOT by the Aggregator 5 % rule (BUG-391) which also overrides the packaged-item exemption (→ CR-387). Settings wizard still reads/writes legacy `basic.gst.{status,code}`; new flat `basic.gst_status` unconsumed. No packaging-GST key exists in any API contract.

## Artifacts
- Report `/app/memory/INV_GST_MENU_VALIDATION_INVESTIGATION_REPORT_2026_09_24.md` (§1 architecture · §2 flow trace · §3 rules · §4 clashes X1–X4 · §5 new-key impact · §6 expected vs actual · §7 registered items · §8 pre-planning conditions · §9 assumptions)
- Intakes: `change_requests/BUG-454_…`, `BUG-455_…`, `CR-387_…`
- Backend brief `backend_briefs/BACKEND_BRIEF_CR-387_2026-09-24.md` (BQ-387-01..05)
- Evidence `evidence/INV-GST-KEY-2026-09-24/` (profile ×2, settings-list ×2, products sample; tokens masked)
- Trackers: BUG_TRACKER (BUG-454/455 rows + header), CR_REGISTRY (CR-387 row + header), registry.json

## Next agent
1. Owner routing: BUG-454 → PLANNING Gate 2 now (no OD blocker beyond OD-454-01; R5+R6 → full gate flow + E2E money regression). CR-387 + BUG-455 → wait for BQ-387-01..05 + OD-387-01..04.
2. **Not done (mutating):** the owner's ON/OFF `update-settings` curl with `basic.gst_status` was **not executed** on live tenants (both are `gst_status=true`, financial setting). To verify write-path equivalence (BQ-387-01) run it on a sandbox tenant with owner approval, then re-read profile + settings-list.
3. Earlier this session: BUG-408 re-validation (still BACKEND-BLOCKED), P&L/Consumption double-offset (2 files, unregistered — owner to decide), caching investigation (GAP-C1 CRM cache cross-tenant, GAP-C2 index.html no-cache — unregistered, owner to decide). See `SESSION_HANDOVER_2026_09_24_INV_BUG408_LAYOUT.md`.

## Environment notes
- preprod boot for owner@palmhouse.com still fails at "kitchen stations (BAR)" on the pod → browser QA blocked.
