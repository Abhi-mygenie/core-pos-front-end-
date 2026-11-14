# Session Handover — CR-358-P5 Design Approved + Gate 2 Ready

**Date:** 2026-09-08
**Role:** INVESTIGATION + INTAKE + DESIGN
**Item:** CR-358-P5 — PMS Phase 5: Rates & Restrictions (S8-C) + Mark No-Show (S8-D)
**Sprint:** pos_pms_1
**Code changes:** ZERO in `src/` — investigation, doc, mock only

---

## Summary

Full P5 readiness session. 15 fresh API probes on preprod. All 4 owner decisions locked. Design agent called, spec approved by owner. Interactive V3 HTML mock built and live. Backend brief filed. CR-358-P5 is now **Gate 2 Ready**.

---

## Work Done This Session

### 1. Fresh API Probes (15 probes — all P5 endpoints)

| Endpoint | Result |
|---|---|
| `POST fetch-rates` | ✅ HTTP 200 — real data (8 rateplans, 2 room types, per-date) |
| `POST push-rates` | ✅ HTTP 200 — "Rates pushed successfully" · schema: `{room_code, rateplan_code, rate}` (snake_case) |
| `POST push-inventory-restrictions` | ✅ Route live, hits Aiosell. Restrictions[] schema unknown (Aiosell "Payload Parsing Failed" on empty array) |
| `POST push-rate-restrictions` | ✅ Route live, hits Aiosell. Same restrictions[] gap |
| `POST mark-no-show` | ⚠️ 422 "Failed to mark noshow" for BDC7497606 (booking.com, past checkin) — endpoint mechanism confirmed, sandbox booking may be stale |
| `POST fetch-inventory` | ✅ HTTP 200 — available counts per roomCode per date |

**Key discovery:** push-rates uses snake_case (`room_code`, `rateplan_code`) but fetch-rates returns camelCase (`roomCode`, `rateplanCode`) → frontend transform must convert before push.

### 2. Owner Decisions Locked

| OD | Decision |
|---|---|
| OD-P5-01 | All roles can push rates. Role-gating deferred (separate item). |
| OD-P5-02 | **Hybrid matrix.** Click cell → Quick Edit Popover (±₹100/₹500 chips, stage). Bulk Editor drawer. |
| OD-P5-03 | **Staged bar + Before/After diff modal.** Nothing pushes live without explicit Review + Confirm. |
| OD-P5-04 | **Both surfaces.** Arrivals Late/Today row action + Tape Chart block popover. OTA channels only. |

### 3. Design Agent Called — Spec Approved

- File: `/app/design_guidelines.json`
- Color tokens confirmed: Green `#329937`, Orange `#F26B33`, Danger `#EF4444`, border `#E5E5E5`
- Weekend column shading (amber `#FFFBEB`)
- Staged cells: orange `#F26B33` border, `#FFF7ED` background, corner triangle tag
- Mark No-Show: `btn-danger-outline` (red outline + UserX icon), destructive confirm dialog with guest summary card

### 4. V3 HTML Mock Built and Live

**Path:** `/app/frontend/public/cr358-p5-v3-mockup.html`
**URL:** `<preview>/cr358-p5-v3-mockup.html`

Screens covered:
- Channel Manager → Rates & Restrictions tab (full hybrid matrix with real preprod data)
- Cell Quick-Edit Popover (interactive, ±chips, Stage Change)
- Inventory Restrictions sub-tab (toggles per room type, Stop Sell / CTA / CTD / Min Stay)
- Rate Restrictions sub-tab (per rate plan)
- Staged Review Bar (sticky, count, Discard All, Review & Push)
- Before/After Diff Modal (6-column table, delta colors, critical warning, Confirm CTA)
- Bulk Editor Drawer
- Arrivals Page → Late tab with No-Show button on booking.com + gommt rows; Direct rows have no button
- Mark No-Show destructive confirmation dialog (guest card + red warning + remark field)

### 5. Bugs Registered (from OG-PMS probe session earlier today)

| BUG | Title | Priority |
|---|---|---|
| BUG-383 | HK filter count always 0 — roomStatusTransform.js L28 counts displayStatus not manualStatus | P1 MEDIUM |
| BUG-384 | room-payment 403 — sandbox permission gap | P1 HIGH BACKEND-BLOCKED |
| BUG-385 | no_show field missing from LR + kpis | P2 LOW BACKEND-BLOCKED |

### 6. Backend Brief Filed

**Path:** `/app/memory/backend_briefs/BACKEND_BRIEF_CR358_P5_2026_09_08.md`

| Q | Topic | Blocks |
|---|---|---|
| Q1 | `restrictions[]` schema for push-inventory + push-rate-restrictions | Inventory/rate restriction sub-features |
| Q2 | mark-no-show failure state for past-checkin booking | QA only |
| Q3 | GAP-09 — checkout inventory release | Regression/closure |
| Q4 | room-payment 403 (BUG-384) | CR-364 Record Payment |

**None of Q1-Q4 block Gate 2.**

---

## CR-358-P5 Status

| Field | Value |
|---|---|
| Status | **GATE 2 READY — Design Approved** |
| Gate | 1→2 |
| All ODs | LOCKED |
| Design | APPROVED (design_guidelines.json + cr358-p5-v3-mockup.html) |
| Backend brief | Filed (non-blocking for Gate 2) |

---

## Files Updated This Session

| File | Change |
|---|---|
| `control/registry.json` | CR-358-P5 → GATE 2 READY; BUG-383/384/385 added (628 items) |
| `control/CR_REGISTRY.md` | CR-358-P5 row → Gate 2 Ready + Last Updated |
| `control/CONTROL_DASHBOARD.md` | 3 new header entries (investigation, intake, design approval) |
| `control/BUG_TRACKER.md` | BUG-383/384/385 rows appended |
| `control/OPEN_GAPS_REGISTER.md` | OG-PMS-010/013/014/015 updated with fresh probe verdicts |
| `change_requests/CR-358-P5_*.md` | All 4 ODs locked + design approval section + gate tracker |
| `change_requests/BUG-383/384/385_*.md` | NEW intake docs |
| `backend_briefs/BACKEND_BRIEF_CR358_P5_2026_09_08.md` | NEW |
| `evidence/INV-OG-PMS-*/INVESTIGATION_REPORT_2026_09_08.md` | NEW |
| `design_guidelines.json` | NEW — P5 full UX spec |
| `frontend/public/cr358-p5-v3-mockup.html` | NEW — V3 interactive mock |
| `handover/SESSION_HANDOVER_2026_09_08_AUDIT_STATE_SNAPSHOT.md` | NEW |

---

## Next Steps

```
1. GATE 2 — Impact Analysis for CR-358-P5
   → Planning agent reads this handover + design_guidelines.json + CR-358-P5 intake
   → Probes: verify ChannelManagerPage.jsx Tab 3 placeholder line ref
   → Write: impact/CR-358-P5_IMPACT_ANALYSIS.md
   → No backend reply needed to start Gate 2

2. Gate 3 — Implementation Plan
   → After Gate 2
   → Restrictions sub-feature plan can note "pending B-P5-01 reply" and be written conditionally

3. BUG-383 fix (HK filter count)
   → roomStatusTransform.js L28 + RoomStatusPage.jsx L78
   → 2-line fix, MEDIUM risk, owner decision OD-383-01 still needed
   → Can be done in parallel with P5 Gate 2

4. Gate 6 Owner Smoke for P1–P4 + CR-360
   → Walk owner through preprod, no code needed
   → Can be done in parallel with P5 Gate 2
```

---

## Key File Paths

```
CR-358-P5 intake:        memory/change_requests/CR-358-P5_PMS_RATES_RESTRICTIONS_NO_SHOW_INTAKE.md
Design spec:             app/design_guidelines.json
V3 mock:                 frontend/public/cr358-p5-v3-mockup.html
Backend brief:           memory/backend_briefs/BACKEND_BRIEF_CR358_P5_2026_09_08.md
Investigation report:    memory/evidence/INV-OG-PMS-010-013-014-015/INVESTIGATION_REPORT_2026_09_08.md
BUG-383 intake:          memory/change_requests/BUG-383_HK_FILTER_COUNT_ZERO_*.md
BUG-384 intake:          memory/change_requests/BUG-384_ROOM_PAYMENT_403_*.md
BUG-385 intake:          memory/change_requests/BUG-385_NO_SHOW_FIELD_MISSING_*.md
```

---

*2026-09-08 | Investigation+Intake+Design session | 0 src/ changes | CR-358-P5 Gate 2 Ready*
