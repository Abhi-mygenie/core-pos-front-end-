# Session Handover — 2026-07-07 Investigation Session (BUG-163 + Variance/Room Investigations)

**Date:** 2026-07-07
**Agent Role:** INVESTIGATION AGENT (AGENT_PROMPT_ALPHA v0.7)
**Session Type:** Investigation × 3
**Code changes this session:** NONE
**Protocol:** AGENT_PROMPT_ALPHA.md v0.7

---

## 1. What Happened This Session

Three investigations completed. All reports saved and BUG_TRACKER updated.

---

## 2. Investigations Completed

### BUG-VQTY — Variance Quantity Not Multiplied in Billing Payload
- **Root cause:** `orderTransform.js` — `variation_amount` at L703 (buildCartItem) and L1492 (collectBillExisting food_detail builder) is NOT multiplied by item quantity
- **Example:** 3× Masala Dosa + Cheese (₹20) → bill shows `variation_amount: 20` (should be `60`)
- **Affects:** All 5 order flows — QSR Place & Pay, QSR placed-edge, Non-QSR Place Order, Non-QSR prepaid, Non-QSR Collect Bill
- **Fix:** L703: `variationAmount * (item.qty || 1)` · L1492: `variationAmount * qty`
- **Fast Lane:** NO — financial/billing logic, hotspot file
- **Report:** `/app/memory/evidence/BUG-VQTY/INVESTIGATION_REPORT_BUG_VQTY.md`
- **BUG_TRACKER:** Registered under custom ID `BUG-VQTY` (assign next sequential ID if registering formally)

### BUG-ROOM-PAIDROOM — `paid_room` Not Sent on Room Order Collect Bill
- **Root cause:** `orderTransform.js` L1632 — `paid_room: ''` hardcoded, never reads `table.isRoom`
- **`table.isRoom` IS available** on effectiveTable — just unused
- **`room_id` NOT required** — backend resolves via `order_id` (owner confirmed)
- **Fix:** L1632: `paid_room: table?.isRoom ? 'yes' : ''`
- **Fast Lane:** NO — payment/billing logic, hotspot file
- **Report:** `/app/memory/evidence/BUG-ROOM-PAIDROOM/INVESTIGATION_REPORT_BUG_ROOM_PAIDROOM.md`
- **BUG_TRACKER:** Registered under custom ID `BUG-ROOM-PAIDROOM` (assign next sequential ID if registering formally)

### BUG-163 — Expense Setup Export Fails ("The type field is required.")
- **Root cause:** `expenseService.js` L65 — `exportStockMaster()` sends empty POST body to `/expense/bulk-export-expense`. Backend requires `{ type: 'all' }`
- **Evidence:** `bulk_export.json` from CR-059 discovery phase confirms `{ type: "all" }` is the correct payload. Same backend pattern as CR-014 menu export.
- **Fix:** 1 line — add `{ type: 'all' }` to `api.post(EXPENSE_ENDPOINTS.BULK_EXPORT, { type: 'all' })`
- **Fast Lane:** ✅ YES — 1 file, 1 line, non-financial, non-hotspot
- **Report:** `/app/memory/evidence/BUG-163/INVESTIGATION_REPORT_BUG_163.md`
- **BUG_TRACKER:** Registered as BUG-163 ✅

---

## 3. Fast Lane Bugs — Full List for Bug Fix Agent

| Bug | Description | File | Line | Change | Fast Lane? |
|---|---|---|---|---|---|
| **BUG-163** | Export fails — missing `{ type: 'all' }` in POST body | `expenseService.js` | L65 | Add `{ type: 'all' }` | ✅ YES |
| BUG-VQTY | Variance qty not multiplied in billing | `orderTransform.js` | L703 + L1492 | `variationAmount * qty` | ❌ NO — financial |
| BUG-ROOM-PAIDROOM | `paid_room` never set to `'yes'` for room collect bill | `orderTransform.js` | L1632 | `table?.isRoom ? 'yes' : ''` | ❌ NO — payment logic |
| BUG-159 | Add Category silently fails — awaiting owner UX decision | `ExpenseSetupPanel.jsx` | ~L154 | Depends on UX decision | ❌ NO — blocked |
| BUG-160 | Rename Category — no backend endpoint | Backend only | — | Backend must deliver endpoint | ❌ NO — backend blocked |
| BUG-162 | Expense Setup panel flickers on mutation | `ExpenseSetupPanel.jsx` | 5 handlers | ~50 lines optimistic updates | ❌ NO — >10 lines |

**Only BUG-163 qualifies for Fast Lane.**

---

## 4. Priority Order for Bug Fix Agent

| Order | Bug | Type | Reason |
|---|---|---|---|
| 1 | **BUG-163** | FAST LANE | 1 line, trivial, unblocks export feature for owner |
| 2 | **BUG-VQTY** | STANDARD | P0 — wrong billing amounts affect every varied order |
| 3 | **BUG-ROOM-PAIDROOM** | STANDARD | P1 — room checkout sends wrong flag |
| 4 | **BUG-162** | STANDARD (PLAN first) | P2 — UX flicker, needs Gate 2 planning |
| — | BUG-159 | BLOCKED (UX decision) | Owner must decide UX before fix |
| — | BUG-160 | BLOCKED (backend) | No fix possible until backend delivers rename endpoint |

---

## 5. Also Open from Previous Sessions (not touched this session)

| Item | Type | Status |
|---|---|---|
| CR-061 | IMPLEMENTATION | Gate 4 GO — all decisions resolved, plan complete |
| BUG-158 | Investigation done | Workaround in place — re-verify after BUG-VQTY fix |

---

## 6. Environment State

- All services RUNNING: frontend (3000), backend (8001), training-backend (8002)
- No code changes made this session
- BUG_TRACKER.md updated with BUG-163

---

*Session closed: 2026-07-07*
*Protocol: AGENT_PROMPT_ALPHA.md v0.7*
*Next role: BUG FIX agent — start with BUG-163 (Fast Lane) → BUG-VQTY → BUG-ROOM-PAIDROOM*
