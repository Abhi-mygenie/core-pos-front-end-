# SESSION HANDOVER — 2026-10-10 (INVESTIGATION: BUG-534, BUG-535 + Full Sprint State)

**Date:** 2026-10-10
**Role sequence this session:** DEPLOYMENT → INVESTIGATION × 4 → INTAKE × 5 → PLANNING (Gate 2+3) × 4 → IMPLEMENTATION × 4 → INVESTIGATION (post-extend)
**Registry items touched:** BUG-526, BUG-527 (full scope), BUG-528 (closed), BUG-529, BUG-530, BUG-531, BUG-532, BUG-533, BUG-534, BUG-535 (total 819 items)

---

## 1. LAST INVESTIGATION — POST-EXTEND BUGS

### What was found

Two new bugs discovered after BUG-533 (ExtendStayForm enrich+discount/collect-now removal) was implemented.

**BUG-534 — ExtendStayForm result panel missing "Check-in discount" row (GATE_1_INTAKE)**
- After clicking Confirm on extend, result panel shows: Booking ₹13,400 → SGST ₹335 → Total ₹14,070 → Paid ₹2,000 → Balance ₹11,020
- No "Check-in discount" row → cashier sees ₹1,050 unexplained gap (₹14,070−₹2,000=₹12,070≠₹11,020)
- Root cause: result panel JSX (lines ~77-82) has no discount row
- Fix: +2 JSX lines in result panel using `row.roomDiscountAmount` from enrichedRow (BUG-533)
- `rc.balance_due = ₹11,020` is CORRECT (server authority) — do NOT subtract from it
- **Fast Lane eligible** (1 file, +2 lines, NOT R5, display only)
- Intake: `change_requests/BUG-534_EXTEND_RESULT_PANEL_MISSING_DISCOUNT_ROW_INTAKE.md`

**BUG-535 — FolioCheckoutPanel `discountedPrice * nights` wrong GST slab (GATE_1_INTAKE)**
- Folio shows SGST=CGST=₹2,052, Room balance ₹14,504 instead of ₹11,020
- InHouse balance column shows ₹11,020 (correct) — same booking
- Root cause: `FolioCheckoutPanel.jsx:L248` — `discountedPrice * nights` passes doubled total to computeRoomGst → nightlyUnit=₹12,400 (not per-night ₹6,200) → 18% slab instead of 5% → gstTotal ₹4,464 instead of ₹620 → base ₹14,504
- L253: same `* nights` bug in gstRate denominator (affects maxCheckoutDiscount)
- Latent for 1-night bookings (nights=1 = no-op)
- MUST CO-DEPLOY with BE fix: `AiosellReservationChargeService.php` + `AiosellLocalReservationService.php` must write rack `booking_charge` to LR snapshot
- **BE fix alone → ₹14,864 (still wrong). FE fix alone → ₹10,970 (still wrong). Both → ₹11,020 ✓**
- Intake: `change_requests/BUG-535_FOLIO_DISCOUNT_PRICE_TIMES_NIGHTS_WRONG_GST_INTAKE.md`
- Backend brief: `backend_briefs/BACKEND_BRIEF_BUG535_EXTEND_CHARGE_BOOKING_CHARGE_2026_10_10.md`

### Contract doc

`extend_stay_charge_fe.md` (owner-uploaded) — **Option B LOCKED**:
- `charge.booking_charge` = rack rent always
- `charge.room_discount_amount` = check-in discount (NOT enlarged for added nights)
- `charge.balance_due` = server authority (already net)

---

## 2. COMPLETE SPRINT STATE (oct_bug_batch)

### Awaiting Gate 4 GO

| ID | Title | Files | Plan | Notes |
|---|---|---|---|---|
| **BUG-534** | Extend result panel missing discount row | `ExtendStayForm.jsx` (NOT R5, +2 lines) | Fast Lane eligible | Independent |
| **BUG-535** | Folio `discountedPrice * nights` wrong GST | `FolioCheckoutPanel.jsx` (NOT R5, 2 lines) | Gate 2+3 needed | MUST co-deploy BE |
| **BUG-530** | CPP split auto-fill overfills UPI | `CollectPaymentPanel.jsx` (R5, ~3 lines) | Gate 3 COMPLETE | Separate GO |
| **BUG-532** | Dashboard tile SC gap | `DashboardPage.jsx` (R5, 1 line) | Gate 3 COMPLETE | Backend-blocked (different brief) |

### Gate 5A — Awaiting QA Gate 5B

| ID | QA Handover |
|---|---|
| BUG-516, 517, 518, 519 | `QA_HANDOVER_BUG516_519_2026_10_09.md` |
| BUG-522 | `QA_HANDOVER_BUG522_2026_10_09.md` |
| BUG-523, 524 | `QA_HANDOVER_BUG523_524_2026_10_09.md` |
| FU-385-D, BUG-525 | `QA_HANDOVER_FU385D_BUG525_2026_10_09.md` |
| BUG-526 | `QA_HANDOVER_BUG526_2026_10_10.md` |
| BUG-527 E1-E4 | `QA_HANDOVER_BUG527_2026_10_10.md` |
| BUG-527 F1-F4 | `QA_HANDOVER_BUG527_F1F4_2026_10_10.md` |
| BUG-529, BUG-531 | `QA_HANDOVER_BUG529_531_2026_10_10.md` |
| BUG-530 | `QA_HANDOVER_BUG530_2026_10_10.md` |
| BUG-533 | `QA_HANDOVER_BUG533_2026_10_10.md` |

---

## 3. FILES CHANGED THIS SESSION (cumulative)

| File | Changed by | What |
|------|-----------|------|
| `src/api/services/frontDeskService.js` | BUG-529 | L175: `discountAmount:0` in roomInfoFromCharge |
| `src/pages/pms/FrontDeskWorkstationPage.jsx` | BUG-531 | L36-37: setBalances reset + catch fix |
| `src/components/order-entry/CollectPaymentPanel.jsx` | BUG-530 | onBlur: `splitCap = isRoom ? effectiveTotal-roomBalance : effectiveTotal` |
| `src/components/pms/frontdesk/InHousePanel.jsx` | BUG-533 | enrichedRow hoisted above extend/bill exits |
| `src/components/pms/frontdesk/DeparturesPanel.jsx` | BUG-533 | same hoist |
| `src/components/pms/frontdesk/ExtendStayForm.jsx` | BUG-533 | Removed Discount+CollectNow; two-row bill display |

**NOT yet changed (pending Gate 4 GO):**
- `ExtendStayForm.jsx` — BUG-534 (result panel discount row)
- `FolioCheckoutPanel.jsx` — BUG-535 (`* nights` removal)
- `CollectPaymentPanel.jsx` — BUG-530 (Gate 4 not given for this session)
- `DashboardPage.jsx` — BUG-532 (backend-blocked)

---

## 4. KEY DECISIONS LOCKED THIS SESSION

| Decision | Value |
|---|---|
| OD-INV-EXTEND-01/01b | Remove Discount + Collect Now from ExtendStayForm (BUG-533 done) |
| OD-INV-EXTEND-02 | Two-row bill: rack crossed out → discount → discounted total (BUG-533 done) |
| OD-INV-EXTEND-03 | Both panels (BUG-533 done) |
| extend_stay_charge_fe.md | Option B: `charge.booking_charge` = rack. `charge.balance_due` = server authority |
| BUG-535 co-deploy | BE + FE must ship simultaneously; neither alone fixes folio |
| BUG-532 | Held — wait for backend SC brief |

---

## 5. OWNER DECISIONS PENDING (NEXT SESSION)

```
1. BUG-534 Fast Lane GO
   → "Fast Lane BUG-534" or "GO BUG-534"
   → IMPLEMENTATION: ExtendStayForm.jsx +2 JSX lines, display-only

2. BUG-535 Gate 2 GO (then Gate 3, then Gate 4 co-timed with BE)
   → "Gate 2 GO BUG-535" → PLANNING
   → Backend brief already filed — forward to backend team

3. BUG-530 Gate 4 GO (R5, CPP onBlur fix)
   → "GO BUG-530" → IMPLEMENTATION (already has QA handover)

4. QA Gate 5B on any batch (A-J all handovers written)
   → "QA BUG-529 BUG-531 BUG-533" etc → QA role

5. Forward backend brief:
   → `backend_briefs/BACKEND_BRIEF_BUG535_EXTEND_CHARGE_BOOKING_CHARGE_2026_10_10.md`
   → `backend_briefs/BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md`
```

---

## 6. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|---|---|
| Investigation | `investigations/INV-EXTEND-STAY-POST-EXTENSION-BUGS_2026_10_10.md` |
| Intake | `change_requests/BUG-534_EXTEND_RESULT_PANEL_MISSING_DISCOUNT_ROW_INTAKE.md` |
| Intake | `change_requests/BUG-535_FOLIO_DISCOUNT_PRICE_TIMES_NIGHTS_WRONG_GST_INTAKE.md` |
| Backend brief | `backend_briefs/BACKEND_BRIEF_BUG535_EXTEND_CHARGE_BOOKING_CHARGE_2026_10_10.md` |
| Registry | `control/registry.json` — BUG-534, BUG-535 added (819 total) |
| Tracker | `control/BUG_TRACKER.md` — BUG-534, BUG-535 headers added |
| QA Handovers | `QA_HANDOVER_BUG529_531_2026_10_10.md` · `QA_HANDOVER_BUG530_2026_10_10.md` · `QA_HANDOVER_BUG533_2026_10_10.md` |
| Plans | `plans/BUG-530_IMPLEMENTATION_PLAN_2026_10_10.md` · `plans/BUG-531_IMPLEMENTATION_PLAN_2026_10_10.md` · `plans/BUG-532_IMPLEMENTATION_PLAN_2026_10_10.md` · `plans/BUG-533_IMPLEMENTATION_PLAN_2026_10_10.md` |
| Impact Analyses | `impact/BUG-530_IMPACT_ANALYSIS_2026_10_10.md` · `impact/BUG-531_IMPACT_ANALYSIS_2026_10_10.md` · `impact/BUG-532_IMPACT_ANALYSIS_2026_10_10.md` · `impact/BUG-533_IMPACT_ANALYSIS_2026_10_10.md` |
| PRD deployment record | `PRD_DEPLOYMENT_RECORD_2026-10-10_EMERGENT_E1_DEPLOY_5OCT1.md` |

---

## 7. ENVIRONMENT STATE

| Service | Status |
|---|---|
| Frontend | RUNNING port 3000 — webpack compiled successfully, 0 new warnings |
| Backend | RUNNING port 8001 |
| MongoDB | RUNNING |

**App URL:** `https://genie-pos-preview.preview.emergentagent.com`

---

## 8. TEST CREDENTIALS

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | `MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D` | — | Room r4, order #000361 (for BUG-529/530/531/533 tests) |
| nobo booking | `MG-69-FDE76CE1-DE34-4667-8891-A4EE98ED0C9B` | — | Room r4 extended to 2 nights (for BUG-534/535 tests) |
| Key values (bonk) | booking ₹3,000 · discount ₹1,000 · advance ₹1,500 · post-discount balance ₹600 · food ₹248 · CPP total ₹848 | — |
| Key values (nobo extend) | rack ₹6,700/night · discount ₹1,000 · 2 nights = ₹13,400 · discounted ₹12,400 · GST ₹620 · total ₹13,020 · paid ₹2,000 · balance ₹11,020 | — |
| PMS InHouse URL | `/pms/front-desk-v2?tab=inhouse` | — | All PMS tests |
| Folio path | `/pms/front-desk-v2?tab=inhouse` → nobo/bonk → Bill | — | BUG-533/534/535 |
| Extend path | `/pms/front-desk-v2?tab=inhouse` → Extend → set date → Confirm | — | BUG-534/535 |

---

## 9. NEXT AGENT BOOT SEQUENCE

```
STEP -1: Read THIS file → 1-line summary:
  "Last session (2026-10-10 FULL): BUG-529/530/531 IMPL (folio CPP ₹848, split auto-fill, balance reset);
   BUG-533 IMPL (extend stay: discount/collectnow removed, two-row bill, enrichedRow hoisted);
   BUG-534 INTAKE (extend result panel missing discount row, Fast Lane eligible);
   BUG-535 INTAKE (folio discountedPrice*nights wrong GST, co-deploy BE required);
   Registry 819 items. 10 QA batches ready."

STEP 0: Ask owner what they want:
  a) "Fast Lane BUG-534" → IMPLEMENTATION (ExtendStayForm.jsx +2 lines, instant)
  b) "Gate 2 GO BUG-535" → PLANNING (FolioCheckoutPanel, co-deploy BE)
  c) "GO BUG-530" → IMPLEMENTATION (CPP onBlur R5, 3 lines, Gate 4 already given)
  d) QA Gate 5B on any batch → QA role
  e) Forward backend briefs to backend team → agent prepares summary

RECOMMENDED ORDER:
  1. Fast Lane BUG-534 (2 lines, instant, high visible fix)
  2. Gate 2+3 BUG-535 → coordinate BE deployment
  3. QA batches (10 ready)
  4. GO BUG-530 (R5)
  5. Backend: forward both briefs
```
