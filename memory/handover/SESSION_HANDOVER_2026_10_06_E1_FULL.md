# SESSION HANDOVER — 2026-10-06 — FULL SESSION (E1 Agent)

**Date:** 2026-10-06
**Roles used:** DEPLOYMENT → IMPLEMENTATION (BUG-495) → IMPLEMENTATION (BUG-494) → INVESTIGATION (INV-496, INV-497) → INTAKE (BUG-496..499) → PLANNING (BUG-497 G2+G3) → PLANNING (BUG-496 G2+G3) → PLANNING (BUG-498+499 G2+G3)
**App URL:** https://react-pos-app-7.preview.emergentagent.com
**Branch deployed:** `5oct-1` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Registry:** 782 items (was 776 at session start)

---

## 1. MANDATORY READING FOR NEXT AGENT

Read in this order before anything else:
1. `memory/control/AGENT_PROMPT_ALPHA.md` — role selection, gate rules
2. This handover (current file)
3. `memory/control/CONTROL_DASHBOARD.md` — live sprint state

---

## 2. DEPLOYMENT STATE

- Branch `5oct-1` running on port 3000 ✅
- All env vars in `/app/frontend/.env` (Firebase, API base, Socket, CRM, Maps, WDS_SOCKET_PORT=443)
- Supervisor: frontend RUNNING, webpack compiled with 1 pre-existing warning (allDays useMemo — NOT from this session)
- Deployment record: `memory/PRD_DEPLOYMENT_RECORD_2026-10-06_EMERGENT_E1.md`

---

## 3. ITEMS IMPLEMENTED THIS SESSION

| ID | Title | Files | Status |
|----|-------|-------|--------|
| **BUG-495** | maxDiscount formula: reserves GST on advance (4 useMemo edits) | CheckInForm.jsx · CheckInPage.jsx · FolioCheckoutPanel.jsx | GATE_5A_IMPLEMENTED |
| **BUG-494** | FolioCheckoutPanel: stale charge.* fields when check-in discount applied (8 edits) | FolioCheckoutPanel.jsx | GATE_5A_IMPLEMENTED |

### ⚠️ CRITICAL: BUG-495 formula is SUPERSEDED

BUG-495 changed maxPct in 3 files using `floor((bc−adv×(1+gstRate))/bc×100)`.

- **CheckInForm.jsx + CheckInPage.jsx** → BUG-496 plan **replaces** this formula with `floor(advance/bc×100)` (OD-496-01)
- **FolioCheckoutPanel.jsx** → BUG-498 plan **replaces** this with `floor(baseBalance/bc×100)` (OD-498-01)

When implementing BUG-496 and BUG-498, the agent will target the **BUG-495 comment text** as the anchor. This is correct — the Gate 3 plans already contain the exact current→new with the BUG-495 text as old_str.

### BUG-494 code changes (8 edit sites in FolioCheckoutPanel.jsx):
- L16: `computeRoomGst` import
- L40: RoomSection +3 optional props (`baseBalance`, `displaySgst`, `displayCgst`)
- L165-169: SGST/CGST/balance display use `displaySgst??c.sgst`, `displayCgst??c.cgst`, `baseBalance??c.balance_due`
- L176: Statement +3 props
- L191: RoomSection call +3 props
- L254-274: new `{ baseBalance, displaySgst, displayCgst }` useMemo from folio `balancePayment`
- L350: Statement JSX +3 props
- L372-374: roomInfo override uses `baseBalance??charge.balance_due`

### QA Handovers written:
- `handover/QA_HANDOVER_BUG495_2026_10_06.md` — TC-495-01..06 + REG-1..4
- `handover/QA_HANDOVER_BUG494_2026_10_06.md` — TC-494-01..07 + REG-1..5

---

## 4. INVESTIGATIONS COMPLETED THIS SESSION

| Report | Finding | Action |
|--------|---------|--------|
| `investigations/INV-496-BILL-GST-DISCOUNT-LINE_2026_10_06.md` | Bill panel P1: missing check-in discount line. P2: OD-494-01 wrongly zeroed SGST/CGST. P3: wrong GST at check-in (full price) and checkout (₹0) | Registered BUG-498 (covers P1+P3) |
| `investigations/INV-497-FOUR-POINTS_2026_10_06.md` | Point 1: maxDiscount allows 81%, should be advance-only (17%). Point 2: Collect Now no cap. Point 3: checkout discount uses stale LR booking_charge, handlePaid sends ₹0. Point 4: Both discount sends wrong amounts | Registered BUG-496, 497, 498, 499 |

---

## 5. ITEMS REGISTERED THIS SESSION — GATE 3 COMPLETE

| ID | Title | Severity | Risk | Gate | Plan |
|----|-------|----------|------|------|------|
| **BUG-496** | maxDiscount/maxPct formula: should cap at advance only + wrong GST at check-in | P1 | HIGH | GATE_3_PLAN_COMPLETE | `plans/BUG-496_IMPLEMENTATION_PLAN.md` |
| **BUG-497** | Collect Now input: no max cap at balance due | P1 | MEDIUM | GATE_3_PLAN_COMPLETE | `plans/BUG-497_IMPLEMENTATION_PLAN.md` |
| **BUG-498** | Checkout Bill: discount uses stale booking_charge; check-in discount line missing; handlePaid sends ₹0; UX restructure (discount moves to right panel) | P1 | CRITICAL | GATE_3_PLAN_COMPLETE | `plans/BUG-498-499_PROPER_PLAN.md` |
| **BUG-499** | Both discount: doesn't split 50/50; wrong payment_amount sent; no F&B preview | P1 | CRITICAL | GATE_3_PLAN_COMPLETE | `plans/BUG-498-499_PROPER_PLAN.md` |

---

## 6. ODs LOCKED THIS SESSION

| OD | Decision | Locked by |
|----|---------|-----------|
| OD-496-01 | maxDiscount = advance paid only (₹); maxPct = `floor(advance/bc×100)` | Owner 2026-10-06 |
| OD-497-01 | (same as OD-496-01) | Owner 2026-10-06 |
| OD-498-01 | Checkout discount base = folio `balancePayment`; maxPct = `floor(bp/bc×100)`. Example: 1500 room, 300+600 advance = bp 600, maxDiscount ₹600, maxPct 40% | Owner 2026-10-06 |
| OD-499-01 | Both = 50/50 split per handover_5 §4.4: send `room_discount=room_half`, deduct `food_half` from `payment_amount` | Owner 2026-10-06 (via handover_5) |

---

## 7. WHAT IS MISSING BEFORE GATE 4 GO — OWNER MUST APPROVE

The following are blockers that must be resolved **before** the next agent starts implementation:

### BUG-496 — R11 API probe needed
- **Gap:** E-496-5 changes `gstBase` at check-in → affects `gst_tax` sent to `pmsCheckIn` API. Investigation shows `folio.room_info.gst_tax = null` always. Need to confirm: does the backend read/store `gst_tax` from check-in payload? If not, E-496-5 may be a no-op.
- **What to do:** Curl probe `pmsCheckIn` with two scenarios (full price vs discounted price as gstBase) and read back the UID via `get-single-order-new` to see if `gst_tax` is stored.

### BUG-498/499 — Visual mockup needed
- **Gap:** Major UX restructure: discount controls move from LEFT panel to RIGHT panel. No visual mockup exists. Owner needs to approve the layout before implementation.
- **What to do:** Build a quick HTML mockup (like `public/cr385-frontdesk-mockup.html`) showing the new bill-right layout with RoomDiscountSection above CollectPaymentPanel. Get owner sign-off.

### BUG-498/499 — B0 validation probe needed
- **Gap:** The plan relies on handover_5 historical proofs (orders 1232889-1232892). A fresh B0 probe with the new `baseBalance`-based formula should confirm the backend handles `room_discount` correctly when `balancePayment = 0`.
- **What to do:** Curl probe the preprod settle endpoint with a room where bp=0 and `room_discount` set to correct amount. Verify 200 (not 422).

---

## 8. SUGGESTED NEXT AGENT PRIORITY ORDER

**1. Address missing pieces first (role: PLANNING / INVESTIGATION):**
- BUG-496 R11 probe + update plan if gst_tax is unused by backend
- BUG-498/499 HTML mockup for owner approval
- BUG-498/499 B0 probe

**2. Gate 4 GO batch (all need owner approval):**
- BUG-497 — simplest, no dependencies, no missing pieces
- BUG-496 — check-in surfaces only (after R11 probe confirmed)
- BUG-498 + BUG-499 — FolioCheckoutPanel, execute BUG-498 first then BUG-499 (after mockup approved)

**3. QA Gate 5b batch after implementation:**
- QA for BUG-492 + BUG-493 (QA handovers already written from previous session)
- QA for BUG-494 + BUG-495
- QA for BUG-496 + BUG-497 + BUG-498 + BUG-499 (write QA handovers after implementation)

---

## 9. PLAN FILE REFERENCE — AUTHORITATIVE SOURCES

| Bug | Gate 2 IA | Gate 3 Plan | Notes |
|-----|-----------|-------------|-------|
| BUG-496 | `impact/BUG-496_IMPACT_ANALYSIS.md` | `plans/BUG-496_IMPLEMENTATION_PLAN.md` | 5 edits, 2 files (CheckInForm + CheckInPage) |
| BUG-497 | `impact/BUG-497_IMPACT_ANALYSIS.md` | `plans/BUG-497_IMPLEMENTATION_PLAN.md` | 1 edit, 1 file (CheckInForm L225) |
| BUG-498 | `plans/BUG-498-499_PROPER_PLAN.md` §GATE 2 | `plans/BUG-498-499_PROPER_PLAN.md` §GATE 3 | 13 edits, 1 file (FolioCheckoutPanel) |
| BUG-499 | same | same | Edits E-499-1, E-499-2 within above |

**⚠️ DISCARD:** `plans/BUG-498-499_COMBINED_PLAN.md` — first attempt, superseded by `BUG-498-499_PROPER_PLAN.md` which has exact line anchors.

---

## 10. QA GATE 5b PENDING QUEUE (from this + previous sessions)

| ID | QA Handover | Priority |
|----|-------------|---------|
| **BUG-492** | `handover/QA_HANDOVER_BUG492_2026_10_06.md` — TC-492-A1..A4 + B1..B10 | High |
| **BUG-493** | `handover/QA_HANDOVER_BUG493_2026_10_06.md` — TC-493-01..05 | Medium |
| **BUG-494** | `handover/QA_HANDOVER_BUG494_2026_10_06.md` — TC-494-01..07 | Critical |
| **BUG-495** | `handover/QA_HANDOVER_BUG495_2026_10_06.md` — TC-495-01..06 | High |
| **BUG-496..499** | Write QA handovers after implementation | — |
| BUG-490, BUG-491 | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` | High |

---

## 11. UNCHANGED FROM PREVIOUS SESSIONS

- **CR-390** — Gate 3 OPEN / OWNER REVIEW. No Gate 4 GO.
- **BUG-486** — BACKEND_BLOCKED.

---

## 12. CREDENTIALS + ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://react-pos-app-7.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Test login (owner) | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test login (staff) | `boi@bang.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Key probe orders | 1232976 (#000326, 80% discount, bp=0) · 1232973 (#000325, 89% discount, bp=0) · 1232965 (₹200 discount, bp=750) |
| In-house tab | `/pms/front-desk-v2?tab=inhouse` |
| Bill panel | Click "Bill" on any in-house row |
| Branch | `5oct-1` |

---

## 13. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|------|------|
| Deployment record | `memory/PRD_DEPLOYMENT_RECORD_2026-10-06_EMERGENT_E1.md` |
| Investigation | `investigations/INV-496-BILL-GST-DISCOUNT-LINE_2026_10_06.md` |
| Investigation | `investigations/INV-497-FOUR-POINTS_2026_10_06.md` |
| Evidence probe | `evidence/INV-492B-CHECKIN-DISCOUNT/probe_000325_2026_10_06.json` |
| Intake | `change_requests/BUG-496_MAXDISCOUNT_ADVANCE_ONLY_GST_INTAKE.md` |
| Intake | `change_requests/BUG-497_COLLECT_NOW_NO_CAP_INTAKE.md` |
| Intake | `change_requests/BUG-498_CHECKOUT_DISCOUNT_WRONG_BASE_INTAKE.md` |
| Intake | `change_requests/BUG-499_BOTH_DISCOUNT_FNB_WRONG_INTAKE.md` |
| Impact Analysis | `impact/BUG-496_IMPACT_ANALYSIS.md` |
| Impact Analysis | `impact/BUG-497_IMPACT_ANALYSIS.md` |
| Implementation Plan | `plans/BUG-496_IMPLEMENTATION_PLAN.md` |
| Implementation Plan | `plans/BUG-497_IMPLEMENTATION_PLAN.md` |
| Implementation Plan (AUTHORITATIVE) | `plans/BUG-498-499_PROPER_PLAN.md` |
| Implementation Plan (SUPERSEDED) | `plans/BUG-498-499_COMBINED_PLAN.md` ← DISCARD |
| QA Handover | `handover/QA_HANDOVER_BUG495_2026_10_06.md` |
| QA Handover | `handover/QA_HANDOVER_BUG494_2026_10_06.md` |
| Session Handover | `handover/SESSION_HANDOVER_2026_10_06_E1_FULL.md` (this file) |

---

## 14. SELF-ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Registry synced? | ✅ YES | 782 items, BUG-494/495 GATE_5A, BUG-496..499 GATE_3_PLAN_COMPLETE |
| Scope drift? | ✅ NO | FolioCheckoutPanel E5-E8 correctly moved from BUG-496 to BUG-498 |
| BUG-495 supersession noted? | ✅ YES | Clearly flagged in §3 |
| R11 probes complete? | ⚠️ PARTIAL | BUG-496 gst_tax probe missing; BUG-498/499 B0 probe missing |
| Mockup for BUG-498/499? | ❌ MISSING | Major UX change needs visual before Gate 4 GO |
| Plans have exact anchors? | ✅ YES | BUG-498-499_PROPER_PLAN.md has exact current→new |
| Gate 4 requested without owner approval? | ✅ NO | Correctly blocked |
| EXIT GATE (BUG-494/495) | ✅ 5/5 PASS | Registry sync, tracker, ownership, markers, compile |
