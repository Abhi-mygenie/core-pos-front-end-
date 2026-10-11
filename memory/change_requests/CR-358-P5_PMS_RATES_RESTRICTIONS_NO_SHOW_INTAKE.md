# CR-358-P5 — INTAKE
## PMS Phase 5 — Rates & Restrictions tab (S8-C) + Mark No-Show (S8-D) + module regression

**ID:** CR-358-P5
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** OWNER-REPORTED (scoped in `plans/CR-358_EXECUTION_PLAN_PHASED.md` §PHASE 5 and `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` NS-01) — registered as its own item on owner instruction 2026-09-04
**Related:** CR-358-P1 (ChannelManagerPage Tab 3 placeholder L466), CR-358-P4 (parent phase), CR-362 (consumes Mark No-Show), OG-PMS-004 (inventory roomCode field gap — probe at P5), GAP-09 (checkout inventory release verification)
**Type:** CR (planned phase of parent CR-358)

---

## Classification

| Field | Value |
|---|---|
| Type | CR (phase) |
| Area | PMS → Channel Manager (S8) |
| Priority | **P1** (parent CR-358 P0/P1; owner to confirm) |
| Risk | **HIGH** — pushes rates/restrictions to OTAs (revenue-affecting external writes); mark-no-show releases inventory |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **DISTINCT** — planned phase never registered as an item; only referenced in CR-358 parent docs |
| Code reality | **PARTIAL** — 5 endpoint constants declared (`PUSH_RATES`, `FETCH_RATES`, `PUSH_INVENTORY_RESTRICT`, `PUSH_RATE_RESTRICT`, `MARK_NO_SHOW` — inert), `ChannelManagerPage.jsx` Tab 3 renders "Available in Phase 5" placeholder; `aiosellTransform.fromInventory` exists. No service functions, no UI |
| Blast radius | MEDIUM — ChannelManagerPage.jsx (Tab 3 + Tab 4 or no-show in Arrivals), aiosellService.js (+5 fns), aiosellTransform.js (+rates transform), ArrivalsPage.jsx / ReservationsPage.jsx (no-show action). Hotspots: NO |
| Backend blocked | **NO — entry gate CLEARED this session**: all 5 endpoints live on preprod (405 on GET, 422 validation on empty POST, `fetch-rates` 200 with data) |

---

## Description

Complete the Channel Manager per the CR-358 phased plan.

### S8-C Rates & Restrictions tab
| Function | Endpoint (verified) | Required body |
|---|---|---|
| View current rates by date × room type × rateplan | `POST aiosell/fetch-rates` | `{start_date, end_date}` → `data.aiosell.body.updates[{startDate,endDate,rates[{roomCode,rateplanCode,rate}]}]` (8 rateplans in sandbox) |
| Push rates | `POST aiosell/push-rates` | `{start_date, end_date, rates[...]}` (rates[] item shape → Gate 2 probe) |
| Stop-sell / min-stay inventory restrictions | `POST aiosell/push-inventory-restrictions` | `{start_date, end_date, to_channels[], rooms[]}` |
| Rate restrictions (CTA/CTD/min-LOS) | `POST aiosell/push-rate-restrictions` | `{start_date, end_date, to_channels[], rates[]}` |

### S8-D Mark No-Show
- `POST aiosell/mark-no-show {booking_id | aiosell_reservation_id}` — **rule confirmed live:** 422 *"Mark no-show only supports booking.com and gommt. Got: direct"* → action visible only for `channel ∈ {booking.com, gommt}` and `operationalStatus === 'pending'`.
- Surface: Arrivals Late/Today tab row action + tape popover; confirm dialog; refetch ops.

### Regression / closure items (from phased plan)
- GAP-09: verify checkout → inventory release (probe `fetch-inventory` before/after) → BACKEND_BRIEF if not.
- OG-PMS-004: `fromInventory` roomCode field name vs `room_id`.
- Full cross-phase regression matrix + registry closure prep for parent CR-358.

---

## Evidence

- Curl: `probe_07_discovery_routes.txt` (405/422 for all 5), `probe_08_validation_shapes.txt` (required fields), `probe_09_fetch_rates.json` (live rates), `probe_15_mark_no_show_direct.json` (channel rule)
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2.8 / Track C
- Source: OWNER-REPORTED (planned phase) · Confidence: CONFIRMED (endpoints live)

---

## Backend Dependency

| # | Ask | Type |
|---|---|---|
| B-P5-01 | Document `rates[]` item schema for `push-rates` / `push-rate-restrictions` and `rooms[]` for inventory restrictions; valid `to_channels[]` values | CONTRACT |
| B-P5-02 | Does `mark-no-show` push inventory release and set `status=no_show` on LR? | CLARIFICATION |
| B-P5-03 | GAP-09 answer (checkout inventory release) | VERIFY |

---

## Open Questions (Owner Decisions)

| OD | Question |
|---|---|
| OD-P5-01 | Rate push permission — owner/manager only? | **LOCKED 2026-09-08:** All roles can push rates for now. Role-gating deferred to a separate item. |
| OD-P5-02 | Rate edit UX: grid or single-date form? | **LOCKED 2026-09-08:** Option C — Hybrid. Interactive date×rateplan matrix (scannable, read-only by default). Click any cell → Quick Edit Popover (current rate, ±₹100/₹500 chips, stage). Bulk Editor drawer for multi-date/rateplan changes. |
| OD-P5-03 | Confirmation before push? | **LOCKED 2026-09-08:** Option B+C combo. Sticky review bar ("X changes staged → Review & Push"). Clicking opens Before/After diff modal (Date, Room, Rate Plan, Live Rate strikethrough, New Rate, Delta). Amber critical warning. Explicit "Confirm & Push Live Rates" CTA. |
| OD-P5-04 | No-Show action placement? | **LOCKED 2026-09-08:** Option C — Both surfaces. (1) Arrivals page Late/Today tab — row-level "No-Show" button (red outline, UserX icon). (2) Tape Chart block popover — same button for eligible pending OTA blocks. Conditions both: channel ∈ {booking.com, gommt}, operationalStatus=pending, checkin ≤ today. Both open identical destructive confirmation dialog. |

---

## Design Approval — 2026-09-08

**Status: APPROVED BY OWNER**

- Design spec: `/app/design_guidelines.json` (generated by design agent 2026-09-08)
- V3 HTML mock: `/app/frontend/public/cr358-p5-v3-mockup.html` (interactive, live probed data)
- All 4 ODs locked — no further design decisions needed before Gate 3 coding

### Key design decisions locked

| Feature | Decision |
|---|---|
| Rate matrix | Scannable grid, not inline editable. Click-to-edit popover only. |
| Staged state | Orange border + corner triangle. Nothing pushed until explicit Review flow. |
| Weekend columns | Amber background (SAT/SUN) for rate parity visibility. |
| Diff modal | 6-column table: Date, Room, Rate Plan, Live Rate (strikethrough), New Rate, Delta. |
| Mark No-Show button style | Red outline `btn-danger-outline`, UserX icon. Appears only for booking.com/gommt + pending + overdue. |
| Destructive dialog | Guest summary card + red warning box + optional remark + "Mark No-Show & Release Room" danger CTA. |

---

## Backend Brief (non-blocking for Gate 2)

Filed: `backend_briefs/BACKEND_BRIEF_CR358_P5_2026_09_08.md`

| Q | Topic | Status |
|---|---|---|
| Q1 | `restrictions[]` item schema (push-inventory + push-rate-restrictions) | Awaiting reply |
| Q2 | mark-no-show failure state for BDC7497606 | Awaiting reply |
| Q3 | GAP-09 checkout inventory release | Awaiting reply |
| Q4 | room-payment 403 (BUG-384) | Awaiting reply |

**B-P5-01 partially resolved:** push-rates schema confirmed from probes — `{room_code, rateplan_code, rate}` (snake_case). Restrictions schema still needed for inventory/rate-restriction sub-features only.

---

## Files (expected)
`ChannelManagerPage.jsx` (Tab 3 real content), `aiosellService.js` (+5 functions), `aiosellTransform.js` (+`fromRates` transform), `pmsService.js` (+`markNoShow`), `ArrivalsPage.jsx` (+No-Show row action), `ReservationsPage.jsx` (+No-Show popover action). NOT touched: CollectPaymentPanel, OrderEntry, App.js, Sidebar.

## Gate status
- [x] Gate 0/1 — Intake (2026-09-04)
- [x] Gate 1b — Design approved + all ODs locked (2026-09-08) ✅
- [x] Gate 2 — Full-scope Impact Analysis DONE (2026-09-08 v2) ✅
- [x] **Gate 3 — Implementation Plan DONE (2026-09-08)** ✅ `plans/CR-358-P5_IMPLEMENTATION_PLAN.md`
- [ ] **Gate 4 — GO ← NEXT: owner approval needed**
- [ ] Gate 5 — Implementation (8 files, 2 NEW)
- [ ] Gate 5b — QA (28 checks)
- [ ] Gate 6 — Owner Smoke

*Gate 3: 2026-09-08 | Risk: HIGH | Zero blockers | Awaiting Gate 4 GO*
