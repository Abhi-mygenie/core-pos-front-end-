# SESSION HANDOVER — 2026-10-09 (Full Session Close — Investigation + Planning)

**Date:** 2026-10-09
**Sessions covered:** Deployment → BUG-525/519-FIX implementation + testing → Investigation ×4 → BUG-526 full gate cycle (G1→G3) → BUG-527 full gate cycle (G1→G3)
**Role sequence:** DEPLOYMENT → IMPLEMENTATION (BUG-525-FIX, BUG-519-FIX) → INVESTIGATION ×4 → INTAKE (BUG-526) → PLANNING G2+G3 (BUG-526) → INVESTIGATION (BUG-527 revised) → INTAKE (BUG-527) → PLANNING G2+G3 (BUG-527)
**Registry items touched:** BUG-525, BUG-526, BUG-527 (812 total)

---

## 1. WHAT WAS DONE THIS SESSION

### A. Deployment
- Cloned `5oct-1` from `github.com/Abhi-mygenie/core-pos-front-end-.git`
- Rsynced `frontend/` → `/app/frontend/`, `memory/` → `/app/memory/`
- Wrote all env vars to `.env`, `yarn install --ignore-engines`, supervisor restarted
- App live at `https://core-pos-web.preview.emergentagent.com` (login page confirmed)
- **Compile:** webpack 1 pre-existing warning (no new warnings)

---

### B. BUG-525-FIX + BUG-519-FIX — Implemented + Tested

**BUG-525-FIX:** Extended `roomSplitOverBalance` to block UNDER-balance too (not just over).
- `effectiveRoomBalance` useMemo added (L289)
- `roomSplitOverBalance` condition: `roomSplitTotal !== effectiveRoomBalance`
- Directional alert text (over vs under)
- `handlePaid` guard + dep array updated
- `effectiveRoomBalance` prop added to `RoomDiscountControls`

**BUG-519-FIX (layout):** CPP Pay button was clipped by `overflow:hidden` on `.frontdesk-bill`.
- `frontdesk.css`: added `display:flex; flex-direction:column` to `.frontdesk-bill`
- `FolioCheckoutPanel.jsx`: wrapped Suspense/CPP in `<div className="flex-1 min-h-0 overflow-hidden">`

**Testing:** `iteration_1.json` — 6/6 PASS (over-balance blocked, under-balance blocked, exact-balance allowed, layout fix, position, regression).

---

### C. Investigations (4 owner-reported issues)

Investigated 4 issues against `bonk` guest (room r4, MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D):

| Issue | Finding | Action |
|---|---|---|
| BUG-525 cap bypass | PLAN_GAP — under-balance not blocked | Fixed (BUG-525-FIX above) |
| Checkout btn not appearing | FE_BUG — CSS overflow:hidden clips CPP Pay btn | Fixed (BUG-519-FIX above) |
| Room discount position | Same root as layout bug | Fixed by same FIX |
| Balance ₹827 vs ₹848 | DATA_EDGE — SC(₹21) in `order.amount` not in `charge.balance_due` | Backend brief filed (`backend_briefs/BACKEND_BRIEF_BALANCE_DISCREPANCY_2026-10-09.md`) |

---

### D. BUG-526 — Gate 1 → Gate 3

**Scenario:** Folio checkout gray when room split legs + CPP split both active.

**Root cause:** `FolioCheckoutPanel.jsx:413` always passes `balance_due = effectiveRoomBalance(500)` to CPP → CPP `roomBalance=500` → `effectiveTotal=691` → CPP split sum (food=191) < 691 → disabled.

**Fix plan (Gate 3 complete):**
- Single edit: `FolioCheckoutPanel.jsx:413`
- Condition: `(roomSplitEnabled && !roomSplitOverBalance && effectiveRoomBalance > 0) ? 0 : Math.max(0, ...)`
- Reuses `!roomSplitOverBalance` (BUG-525-FIX contract: true only when legs === balance)
- CPP shows food-only totals when active (per OD-INV2-01)
- Backend `payment_amount = fbOnlyTotal = 248` unchanged

**ODs locked:** OD-BUG526-01 (backend safe with room_balance=0), OD-BUG526-02 (Remaining stays food-only)

**Status: GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO**

---

### E. BUG-527 — Gate 1 → Gate 3

**Scenario:** Dashboard CPP → Room section shows wrong balance (₹1,600 not ₹600); check-in discount line absent; CPP split button gray.

**Root cause:**
- Sub-A: `CPP:L200` `roomBalance = remainingRoomBalance(1600)` — `discountAmount(1000)` never subtracted; no check-in discount line in Room section JSX
- Sub-B: `CPP:L3311` split check uses `effectiveTotal(848)` not `effectiveTotal-roomBalance(248=food)`
- PmsDrawer: `L278` BUG-425 formula excludes `discountAmount`

**Fix plan (Gate 3 complete — 4 edits, 2 files):**

| Edit | File | Change |
|---|---|---|
| E1 | `CollectPaymentPanel.jsx:200` (R5) | `roomBalance` subtract `discountAmount`: 1600-1000=600 |
| E2 | `CollectPaymentPanel.jsx:1843` (R5) | Insert "Check-in Discount −₹1,000" line (data-testid: `checkout-room-checkin-discount`) |
| E3 | `CollectPaymentPanel.jsx:3311` (R5) | Split check: `< (isRoom ? effectiveTotal-roomBalance : effectiveTotal)` → 248<248=false → enabled |
| E4 | `PmsCheckoutDrawer.jsx:279` | BUG-425 formula: subtract `discountAmount` → 600 |

**Backend payload:** `payment_amount = fbOnlyTotal = effectiveTotal-roomBalance = 248` — UNCHANGED in both cases.

**ODs locked:** OD-BUG527-01 (check-in discount read-only), OD-BUG527-02 (food-only split, discounted balance)

**Status: GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO**

---

## 2. CURRENT STATUS — ALL OPEN ITEMS (oct_bug_batch)

| ID | Title | Status | QA Handover |
|---|---|---|---|
| BUG-516 | Folio VAT/GST label | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG516_519_2026_10_09.md` |
| BUG-517 | maxCheckoutDiscount formula | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG516_519_2026_10_09.md` |
| BUG-518 | Both cap + halves | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG516_519_2026_10_09.md` |
| BUG-519 | RoomDiscountControls placement + layout | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG516_519_2026_10_09.md` |
| BUG-522 | Room discount independent of food | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG522_2026_10_09.md` |
| BUG-523 | profileTransform payment_types (neutral no-op) | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG523_524_2026_10_09.md` |
| BUG-524 | Discount alert clamped | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG523_524_2026_10_09.md` |
| FU-385-D | Split button re-enabled (D88 reversal) | GATE_5A_IMPLEMENTED_FIX | `QA_HANDOVER_FU385D_BUG525_2026_10_09.md` |
| BUG-525 | Room split legs cap (over + under) | GATE_5A_IMPLEMENTED_FIX | `QA_HANDOVER_FU385D_BUG525_2026_10_09.md` + `iteration_1.json` |
| **BUG-526** | **Folio CPP split gray (folio path)** | **GATE_3_PLAN_COMPLETE** | Plan: `plans/BUG-526_IMPLEMENTATION_PLAN.md` |
| **BUG-527** | **Dashboard CPP split gray + check-in discount** | **GATE_3_PLAN_COMPLETE** | Plan: `plans/BUG-527_IMPLEMENTATION_PLAN.md` |

**All items at GATE_5A: pending Gate 5B (QA).**
**BUG-526 + BUG-527: pending Gate 4 GO → Implementation.**

---

## 3. FILES CHANGED THIS SESSION

| File | Changed by | Nature |
|---|---|---|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | BUG-525-FIX + BUG-519-FIX | 8 edits — effectiveRoomBalance useMemo, roomSplitOverBalance updated, alert directional text, handlePaid guard+deps, RoomDiscountControls prop, flex-1 CPP wrapper |
| `src/components/pms/frontdesk/frontdesk.css` | BUG-519-FIX | `display:flex; flex-direction:column` added to `.frontdesk-bill` |
| `/app/frontend/.env` | Deployment | All env vars written |

---

## 4. OPEN ITEMS / NEXT SESSION

### Priority 1 — Gate 4 GO decisions (owner approval needed)
1. **BUG-526 Gate 4 GO** → `plans/BUG-526_IMPLEMENTATION_PLAN.md`
   - 1 file: `FolioCheckoutPanel.jsx`, ~4 lines
   - Uses `!roomSplitOverBalance` condition
   - NOT R5

2. **BUG-527 Gate 4 GO** → `plans/BUG-527_IMPLEMENTATION_PLAN.md`
   - 2 files: `CollectPaymentPanel.jsx` (R5, E1+E2+E3) + `PmsCheckoutDrawer.jsx` (E4)
   - ~10 lines total
   - **R5 required** — full gate cycle

### Priority 2 — QA Gate 5B (can run after Gate 4 implementations)
All 9 items at Gate 5A await QA:
- Batch A: `QA_HANDOVER_BUG516_519_2026_10_09.md` (BUG-516..519)
- Batch B: `QA_HANDOVER_BUG522_2026_10_09.md` (BUG-522)
- Batch C: `QA_HANDOVER_BUG523_524_2026_10_09.md` (BUG-523, BUG-524)
- Batch D: `QA_HANDOVER_FU385D_BUG525_2026_10_09.md` (FU-385-D, BUG-525)
- Batch E (write after impl): BUG-526, BUG-527

### Priority 3 — Backend ask
- Balance discrepancy (₹827 vs ₹848): brief at `backend_briefs/BACKEND_BRIEF_BALANCE_DISCREPANCY_2026-10-09.md`
  - Ask backend: confirm if `charge.balance_due` should include SC on food orders

---

## 5. ENVIRONMENT STATE

| Service | Status | Note |
|---|---|---|
| Frontend | RUNNING (port 3000) | webpack 1 pre-existing ESLint warning |
| Backend | RUNNING (port 8001) | FastAPI |
| MongoDB | RUNNING | |

**App URL:** `https://core-pos-web.preview.emergentagent.com`

---

## 6. TEST CREDENTIALS

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D | — | room r4, order #000361 |
| bonk key values | booking_charge=₹3,000 · check-in discount=₹1,000 · advance=₹1,500 · baseBalance=₹600 (post-discount) · maxCheckoutDiscount=₹525 | — | Used for all folio + dashboard tests |
| PMS URL | `/pms/front-desk-v2?tab=inhouse` | — | Leaving today tab → Bill (bonk) |
| Dashboard URL | `/dashboard` → Room tab → bonk r4 | — | BUG-527 test path |

---

## 7. KEY DECISIONS LOCKED THIS SESSION

| Decision | Value |
|---|---|
| OD-BUG526-01 | Backend safe with `room_balance=0` when `partial_payments_room` present |
| OD-BUG526-02 | CPP "Remaining" display stays food-only |
| OD-BUG527-01 | Check-in discount shown read-only in CPP Room section (no discount input in dashboard) |
| OD-BUG527-02 | Food-only split validation; discounted room balance displayed |
| OD-INV2-01 | CPP = food only; room rent via Split room payment legs (folio) / paid_room=yes (dashboard) |
| BUG-519-FIX | CSS flex layout restores CPP Pay button — `.frontdesk-bill` is now `flex flex-col` |
| Balance ₹827 vs ₹848 | DATA_EDGE — backend ask filed; no FE change pending backend confirmation |

---

## 8. NEXT AGENT BOOT SEQUENCE

```
STEP -1: Read THIS file → 1-line summary:
  "Last session (2026-10-09 FULL): BUG-525/519 implemented+tested; BUG-526 at Gate 3
   (folio CPP split gray, 1 file); BUG-527 at Gate 3 (dashboard CPP check-in discount
   + split gray, 2 files R5); 9 items at Gate 5A awaiting QA."

STEP 0: Ask owner what they want:
  a) Gate 4 GO BUG-526 (folio, 1 file) → IMPLEMENTATION role
  b) Gate 4 GO BUG-527 (dashboard CPP R5, 2 files) → IMPLEMENTATION role
  c) QA on any Gate 5A batch → QA role
  d) Something else → match to role
```

---

## 9. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|---|---|
| Investigation | `BUG-INV-OCT09_INVESTIGATION_REPORT.md` (4-issue initial investigation) |
| Investigation | `BUG-526_INVESTIGATION_REPORT_2026-10-09.md` |
| Investigation | `BUG-527_INVESTIGATION_REPORT_2026-10-09.md` (V1, superseded) |
| Investigation | `BUG-527_INVESTIGATION_REPORT_V2_2026-10-09.md` (definitive) |
| Backend Brief | `backend_briefs/BACKEND_BRIEF_BALANCE_DISCREPANCY_2026-10-09.md` |
| Intake | `change_requests/BUG-526_FOLIO_CHECKOUT_GRAY_ROOM_SPLIT_CPP_SPLIT_INTAKE.md` |
| Intake | `change_requests/BUG-527_DASHBOARD_CPP_CHECKIN_DISCOUNT_SPLIT_GRAY_INTAKE.md` |
| Impact Analysis | `impact/BUG-526_IMPACT_ANALYSIS.md` |
| Impact Analysis | `impact/BUG-527_IMPACT_ANALYSIS.md` |
| Plan | `plans/BUG-526_IMPLEMENTATION_PLAN.md` |
| Plan | `plans/BUG-527_IMPLEMENTATION_PLAN.md` |
| Test Report | `test_reports/iteration_1.json` (BUG-525-FIX + BUG-519-FIX — 6/6 PASS) |
| Session Handover | `handover/SESSION_HANDOVER_2026-10-09_INV_BUGFIX.md` (mid-session) |
| PRD | `memory/PRD.md` (updated with deployment record) |
| Session Handover | `handover/SESSION_HANDOVER_2026-10-09_FULL_SESSION_CLOSE_3.md` (THIS FILE) |
