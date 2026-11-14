# SESSION HANDOVER — 2026-10-06 — FULL SESSION

**Date:** 2026-10-06
**Roles used:** DEPLOYMENT → IMPLEMENTATION (BUG-493) → IMPLEMENTATION (BUG-492) → INVESTIGATION (INV-492B check-in discount + GST rule) → INTAKE (BUG-494 + BUG-495) → PLANNING Gate 2 (BUG-494 + BUG-495) → PLANNING Gate 3 (BUG-494 + BUG-495)
**App URL:** https://core-pos-react-6.preview.emergentagent.com
**Branch deployed:** `5oct-1` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Registry:** 778 items (was 776 at session start)

---

## 1. MANDATORY READING FOR NEXT AGENT

Read these before anything else:
1. `memory/control/AGENT_PROMPT_ALPHA.md` — role selection, gate rules
2. This handover (current file)
3. `memory/control/CONTROL_DASHBOARD.md` — live sprint state

---

## 2. DEPLOYMENT STATE

- `5oct-1` branch running on port 3000 ✅
- All env vars in `/app/frontend/.env` (Firebase, API base, Socket, CRM, Maps, WDS_SOCKET_PORT=443)
- Supervisor: frontend RUNNING (pid 303, webpack compiled with 1 pre-existing warning)
- Pre-existing warning: `allDays` useMemo deps — NOT from this session

---

## 3. ITEMS IMPLEMENTED THIS SESSION

| ID | Title | Risk | Files changed | Status |
|----|-------|------|---------------|--------|
| **BUG-493** | pmsService: `row.charge` never set → `chargeGst` always 0 → BALANCE missing GST | MEDIUM | `pmsService.js` (L68 + L114) | GATE_5A_IMPLEMENTED |
| **BUG-492** | Checkout Bill panel: discount not in Checkout total + no % cap alert/disable | HIGH | `FolioCheckoutPanel.jsx` · `CheckInPage.jsx` · `CheckInForm.jsx` | GATE_5A_IMPLEMENTED |

### BUG-493 code changes (2 edit sites in pmsService.js):
- L68: `row.charge = match.res.charge ?? null;` — exposes LR charge.sgst/cgst for Step 3 chargeGst
- L114: `bp===0 ? 0` guard (OD-493-01 Option B: bp=0 → GST waived)

### BUG-492 code changes (14 edit sites across 3 files):
- **Sub-A:** `FolioCheckoutPanel.jsx` L339-342 — override `remainingRoomBalance` in roomInfo prop with `charge.balance_due - roomDiscountInfoRs`
- **Sub-B:** All 3 components — `maxPct` useMemo + `discountOverMax` + red alert JSX + button/formValid disable
  - `CheckInForm.jsx` L68-74/196/211-217/236
  - `CheckInPage.jsx` L271-279/896/910-917
  - `FolioCheckoutPanel.jsx` L53-59/99/114-121/225-234/254

### QA Handovers written:
- `handover/QA_HANDOVER_BUG493_2026_10_06.md` — TC-493-01..05 + R1-R2
- `handover/QA_HANDOVER_BUG492_2026_10_06.md` — TC-492-A1..A4 + TC-492-B1..B10 + R1-R4

---

## 4. INVESTIGATION COMPLETED THIS SESSION

| Report | Finding | Action |
|--------|---------|--------|
| `investigations/INV-492B-CHECKIN-DISCOUNT_INVESTIGATION_2026_10_06.md` | 3-layer bug: `charge.balance_due` and `charge.sgst/cgst` (LR) are STATIC after check-in discounts. Folio `order.roomInfo.balancePayment` IS correct (= ₹0 for order #000325 with 89% check-in discount). | Registered as BUG-494 + BUG-495 |

### Key investigation findings:
1. **LR `charge.balance_due`** = `booking_charge + SGST_full + CGST_full − advance` — NEVER updated after check-in discount
2. **LR `charge.sgst/cgst`** = GST on FULL booking_charge — wrong per owner rule (GST should be on discounted price)
3. **Folio `ri.balance_payment`** = `room_price − advance − room_discount_amount` = ₹0 for order #000325 — correct
4. **Owner rule confirmed:** GST = on discounted price. 100% discount → GST nullified.
5. **OD-INV492B-01 LOCKED = Option B:** When `balance_payment = 0` → show ₹0 (advance covers GST too)
6. **OD-494-01 LOCKED = Option B (derived):** SGST/CGST = ₹0 when baseBalance=0 (mathematical consistency)

### Owner rule for maxDiscount (→ BUG-495):
> "GST of advance paid must be reserved — max discount = `booking_charge − advance × (1 + gstRate)`"
> Example: room ₹1,500, advance ₹300, GST 5% → maxDiscount = 1500 − 315 = **₹1,185 (79%)**
> Current BUG-492 Sub-B formula gives 80–85% which is TOO HIGH for GST hotels.

---

## 5. ITEMS REGISTERED THIS SESSION — AWAITING ACTION

| ID | Title | Severity | Risk | Gate | Plan |
|----|-------|----------|------|------|------|
| **BUG-494** | FolioCheckoutPanel Bill: stale `charge.*` when check-in discount applied (SGST/CGST/balance/Checkout wrong) | P1 | CRITICAL | 3 — PLAN COMPLETE | `plans/BUG-494_IMPLEMENTATION_PLAN.md` |
| **BUG-495** | maxDiscount/maxPct formula ignores GST on advance for GST hotels (current 80–85%, correct 79%) | P1 | HIGH | 3 — PLAN COMPLETE | `plans/BUG-495_IMPLEMENTATION_PLAN.md` |

---

## 6. BUG-495 — READY FOR GATE 4 GO → IMPLEMENTATION

**Plan:** `plans/BUG-495_IMPLEMENTATION_PLAN.md`
**All ODs LOCKED. 4 edit sites across 3 files.**

| Edit | File | Change |
|------|------|--------|
| E-495-1 | `CheckInForm.jsx` L69-73 | maxPct useMemo: `floor((bc−adv×(1+gstRate))/bc×100)` |
| E-495-2 | `CheckInPage.jsx` L272-276 | maxPct useMemo: `computeRoomGst` on advance amount |
| E-495-3 | `FolioCheckoutPanel.jsx` L54-58 | RoomSection maxPct: same GST-aware formula |
| E-495-4 | `FolioCheckoutPanel.jsx` L227-233 | Parent `discountOverMax`: same formula (consistency with RoomSection) |

**No new imports** — gstRate derived from existing `c.sgst/cgst/booking_charge`.

---

## 7. BUG-494 — READY FOR GATE 4 GO → IMPLEMENTATION

**Plan:** `plans/BUG-494_IMPLEMENTATION_PLAN.md`
**All ODs LOCKED. 8 edit sites, 1 file only.**

| Edit | Location | Change |
|------|----------|--------|
| E-494-1 | L15 (after frontDeskService import) | Add `import { computeRoomGst }` |
| E-494-2 | L39 (RoomSection signature) | +3 props: `baseBalance=null, displaySgst=null, displayCgst=null` |
| E-494-3 | L161-165 (SGST/CGST/balance lines) | `displaySgst ?? c.sgst`, `displayCgst ?? c.cgst`, `baseBalance ?? c.balance_due` |
| E-494-4 | L172 (Statement signature) | +3 props: `baseBalance, displaySgst, displayCgst` |
| E-494-5 | L180-187 (Statement → RoomSection) | Pass `baseBalance/displaySgst/displayCgst` |
| E-494-6 | after L244 (`const order = ...`) | New `{ baseBalance, displaySgst, displayCgst }` useMemo |
| E-494-7 | L313-320 (Statement call in JSX) | Pass 3 props to Statement |
| E-494-8 | L341-344 (roomInfo override) | `(baseBalance ?? charge.balance_due) - roomDiscountInfoRs` |

**⚠️ CRITICAL EXECUTION ORDER:** Run **BUG-495 FIRST** (E-495-3 + E-495-4 in FolioCheckoutPanel), then BUG-494 (E-494-1 through E-494-8). Both touch FolioCheckoutPanel at different line ranges.

---

## 8. QA GATE 5b — FULL PENDING QUEUE

| ID | QA Handover | Priority |
|----|-------------|---------|
| **BUG-493** | `handover/QA_HANDOVER_BUG493_2026_10_06.md` — TC-493-01..05 | Medium |
| **BUG-492** | `handover/QA_HANDOVER_BUG492_2026_10_06.md` — TC-492-A1..A4 + B1..B10 | High |
| **BUG-494** | New QA needed after implementation | Critical |
| **BUG-495** | New QA needed after implementation | High |
| BUG-490 | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` — TC-490-01..05 | High |
| BUG-491 | same — TC-491-01..08 + R1..R5 | High |
| BUG-485..489 | Various handovers | Medium |

---

## 9. WHAT THE NEXT AGENT SHOULD DO (PRIORITY ORDER)

1. **Gate 4 GO for BUG-495** → IMPLEMENTATION (simpler: 4 useMemo edits, no new imports)
   - Execute E-495-1 → E-495-2 → E-495-3 → E-495-4
   - Compile check → EXIT GATE 5/5

2. **Gate 4 GO for BUG-494** → IMPLEMENTATION (after BUG-495 done)
   - Execute E-494-1 through E-494-8 in order
   - Compile check → EXIT GATE 5/5

3. **QA Gate 5b batch** — BUG-492 + BUG-493 + BUG-494 + BUG-495 combined
   - Write QA handovers for BUG-494 and BUG-495
   - Run all test cases on preprod (RID 69, order #000325, #000324)

4. **QA Gate 5b** — BUG-490 + BUG-491 (from previous session)

---

## 10. UNCHANGED FROM PREVIOUS SESSION

- **CR-390** — Gate 3 OPEN / OWNER REVIEW. No Gate 4 GO.
- **BUG-486** — BACKEND_BLOCKED.

---

## 11. ODS LOCKED THIS SESSION (REFERENCE)

| OD | Decision | Locked by |
|----|---------|-----------|
| OD-493-01 | `bp=0 → ₹0` for BALANCE column (GST waived when advance covered everything) | Previous session |
| OD-INV492B-01 | `balance_payment=0 → Checkout=₹0` (advance covers GST too) | Owner 2026-10-06 |
| OD-494-01 | SGST/CGST = ₹0 when baseBalance=0 (derived from OD-INV492B-01 for math consistency) | Planning agent (derived) |
| OD-495-01 | GST hotel maxDiscount = `booking_charge − advance×(1+gstRate)` | Owner 2026-10-06 |
| OD-495-02 | Non-GST hotel maxDiscount unchanged: `booking_charge − advance` | Owner 2026-10-06 |

---

## 12. CREDENTIALS + ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-react-6.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Key probe orders | 1232973 (#000325, 89% discount, bp=0) · 1232972 (#000324, 100% intent, bp=0) · 1232965 (₹200 discount, bp=750) · 1232903 (no discount, bp=950) |
| In-house tab | `/pms/front-desk-v2?tab=inhouse` |
| Bill panel | Click "Bill" on any in-house row |
| Branch | `5oct-1` |

---

## 13. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|------|------|
| Implementation | `src/api/services/pmsService.js` — BUG-493 L68+L114 |
| Implementation | `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — BUG-492 Sub-A+B (14 sites) |
| Implementation | `src/pages/pms/CheckInPage.jsx` — BUG-492 Sub-B |
| Implementation | `src/components/pms/frontdesk/CheckInForm.jsx` — BUG-492 Sub-B |
| QA Handover | `handover/QA_HANDOVER_BUG493_2026_10_06.md` |
| QA Handover | `handover/QA_HANDOVER_BUG492_2026_10_06.md` |
| Investigation | `investigations/INV-492B-CHECKIN-DISCOUNT_INVESTIGATION_2026_10_06.md` |
| Evidence | `evidence/INV-492B-CHECKIN-DISCOUNT/probe_000325_2026_10_06.json` |
| Intake | `change_requests/BUG-494_FOLIOCHECKOUTPANEL_STALE_CHARGE_CHECKIN_DISCOUNT_INTAKE.md` |
| Intake | `change_requests/BUG-495_MAXPCT_FORMULA_GST_ON_ADVANCE_INTAKE.md` |
| Impact Analysis | `impact/BUG-494_IMPACT_ANALYSIS.md` |
| Impact Analysis | `impact/BUG-495_IMPACT_ANALYSIS.md` |
| Implementation Plan | `plans/BUG-494_IMPLEMENTATION_PLAN.md` |
| Implementation Plan | `plans/BUG-495_IMPLEMENTATION_PLAN.md` |
| Deployment Record | `memory/PRD_DEPLOYMENT_RECORD_2026-10-06_EMERGENT.md` |
| Session Handover | `handover/SESSION_HANDOVER_2026_10_06_FULL.md` (this file) |

---

## 14. SELF-ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Registry synced?** | ✅ YES | BUG-492/493 GATE_5A_IMPLEMENTED · BUG-494/495 GATE_3_PLAN_COMPLETE · 778 items |
| **Scope drift?** | ✅ NO | Investigation findings drove new registrations; no unregistered code |
| Role correctly identified? | ✅ | DEPLOYMENT → IMPL → IMPL → INV → INTAKE → PLANNING |
| Outputs complete? | ✅ | Code + QA handovers + investigations + intake docs + IA + plans |
| EXIT GATE (BUG-492/493) | ✅ 5/5 PASS | Compile clean, registry synced |
| Plans complete (BUG-494/495) | ✅ | Exact edits, verification matrix, registry checklist, execution order |
