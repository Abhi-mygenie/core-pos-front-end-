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
| OD-P5-01 | Rate push permission — owner/manager only? |
| OD-P5-02 | Rate edit UX: grid by date × rateplan (like tape chart) or single-date form? |
| OD-P5-03 | Confirmation step before any push (shows diff vs fetched rates)? |
| OD-P5-04 | No-show action placement: Arrivals only, or also tape popover / Front Desk? |

---

## Files (expected)
`ChannelManagerPage.jsx` (Tab 3 real content), `aiosellService.js` (+5), `aiosellTransform.js` (+`fromRates`), `pmsService.js` (+`markNoShow`), `ArrivalsPage.jsx` (+action), `ReservationsPage.jsx` (+popover action). NOT touched: CollectPaymentPanel, OrderEntry, App.js, Sidebar.

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (**can start now** — entry gate cleared)

*Intake: 2026-09-04 | Intake agent | Code reality: PARTIAL | Duplicate: DISTINCT | Blast radius: MEDIUM | Risk: HIGH | UNBLOCKED*
