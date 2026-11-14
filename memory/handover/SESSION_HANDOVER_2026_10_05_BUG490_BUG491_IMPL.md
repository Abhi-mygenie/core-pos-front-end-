# SESSION HANDOVER — 2026-10-05 — BUG-490 + BUG-491 IMPLEMENTATION

**Date:** 2026-10-05
**Role:** IMPLEMENTATION
**Registry:** 774 items
**App URL:** https://mygenie-pos-frontend.preview.emergentagent.com

---

## 1. MANDATORY READING FOR NEXT AGENT

1. `memory/control/AGENT_PROMPT_ALPHA.md` — role selection, gate rules
2. This handover (current file)
3. `memory/control/CONTROL_DASHBOARD.md` — live sprint state

---

## 2. ITEMS IMPLEMENTED THIS SESSION

| ID | Title | Risk | Files | QA Handover |
|----|-------|------|-------|-------------|
| **BUG-490** | Room discount cap missing — cannot exceed balance due | MEDIUM | CheckInForm.jsx · CheckInPage.jsx · FolioCheckoutPanel.jsx | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` |
| **BUG-491** | In-House balance + discount display batch (4 sub-issues) | HIGH | pmsService.js · CheckInForm.jsx · FolioCheckoutPanel.jsx | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` |

**Status:** Both at `GATE_5A_IMPLEMENTED`. EXIT GATE: ALL 5 PASSED. Compile: PASS, 0 new warnings.

---

## 3. CODE CHANGES SUMMARY

### BUG-490 — 7 edit sites across 3 files

| File | Change |
|------|--------|
| `CheckInForm.jsx` L57-67 | roomDiscountRs useMemo: `cap = Number(c.balance_due\|\|0)`, both Percent+Amount capped via `Math.min`. Added `c.balance_due` to deps. |
| `CheckInForm.jsx` L188 | Amount input `max` = `Number(c.balance_due\|\|0) \|\| undefined` |
| `CheckInPage.jsx` L253-259 | NEW `effectiveBalanceDue` useMemo: `Math.max(0, orderAmount + gstTotal - advance)`. Uses `computeRoomGst` (already imported). |
| `CheckInPage.jsx` L261-270 | roomDiscountRs useMemo: both paths capped via `Math.min(…, effectiveBalanceDue)`. Added `effectiveBalanceDue` to deps. |
| `CheckInPage.jsx` L889 | Amount input `max` = `effectiveBalanceDue \|\| undefined` |
| `FolioCheckoutPanel.jsx` L89 | Amount input `max` = `Number(c.balance_due\|\|0) \|\| undefined` |
| `FolioCheckoutPanel.jsx` L92 | `onChange` clamps: `Math.min(value, c.balance_due != null ? Number(c.balance_due) : Infinity)` |

### BUG-491 — 8 edit sites across 3 files + React import fix

| File | Sub | Change |
|------|-----|--------|
| `FolioCheckoutPanel.jsx` L5 | — | `useMemo` added to React import |
| `pmsService.js` L103-114 | A | `const bp = ri.balance_payment != null ? Number(ri.balance_payment) : null; const chargeGst = row.charge?.sgst + row.charge?.cgst; roomBalance = bp != null ? bp + chargeGst : (old formula − room_discount_amount)` |
| `CheckInForm.jsx` L165-166 | B | `fmtINR(Math.max(0, Number(c.balance_due\|\|0) - roomDiscountRs))` — balance due now reactive |
| `FolioCheckoutPanel.jsx` L42-50 | C | NEW roomDiscountRs useMemo inside RoomSection: caps at `balanceDue` for both Percent + Amount |
| `FolioCheckoutPanel.jsx` L66 | C | Badge: `roomDiscountRs > 0 && fmtINR(roomDiscountRs)` (was raw `roomDiscount` state) |
| `FolioCheckoutPanel.jsx` L147 | B | Balance line: `Math.max(0, balance_due − roomDiscountRs)` |
| `FolioCheckoutPanel.jsx` L196-204 | D | NEW `roomDiscountInfoRs` useMemo in main component (uses `row.charge?.balance_due`) |
| `FolioCheckoutPanel.jsx` L291-296 | D | NEW info note JSX: `data-testid="bill-room-discount-info"` — green banner before CollectPaymentPanel. `total` prop unchanged per OD-491-D-01 Option B. |

---

## 4. CRITICAL NOTES FOR QA / BUG FIX AGENT

### pmsService Sub-A (BUG-491)
- `bp = ri.balance_payment` — backend pre-computes room_price − discount − advance
- `chargeGst = row.charge?.sgst ?? 0 + row.charge?.cgst ?? 0` — from booking snapshot
- **Fallback path** (when bp == null): `rp + gt - ap - rb - room_discount_amount` — preserves old formula with discount added. Old orders without `balance_payment` field fall here.
- `row` is the loop variable from `rows.forEach(row => { ... })` — in scope.

### effectiveBalanceDue (BUG-490, CheckInPage)
- Calls `computeRoomGst(roomGstApplicable, roomGstSlabs, base, formNights ?? 1, 1)` — pure math, no API call, useMemo cached
- When advance = 0: effectiveBalanceDue = orderAmount + gstTotal (full amount, no spurious cap)
- When advance > 0: effectiveBalanceDue = orderAmount + gstTotal − advance (correct cap)

### FolioCheckoutPanel RoomSection vs main scope
- `roomDiscountRs` (Sub-C) lives inside `RoomSection` — has `c.balance_due` in scope
- `roomDiscountInfoRs` (Sub-D) lives in `FolioCheckoutPanel` main — uses `row.charge?.balance_due`
- These are two separate memos computing the same value in different scopes — intentional

### CollectPaymentPanel `total` prop
- Still `total={order.amount || 0}` — unchanged per OD-491-D-01 Option B
- Server applies room discount via `payload.room_discount` in `handlePaid()`

---

## 5. QA GATE 5b — FULL PENDING QUEUE

All sprint items need QA Gate 5b. Recommended batch for next QA session:

| ID | QA Handover / Notes |
|----|---------------------|
| BUG-485 | `handover/QA_HANDOVER_BUG485_2026_10_05.md` — TC-1..TC-6 |
| BUG-487 | `handover/QA_HANDOVER_BUG487_2026_10_05.md` — TC-1..TC-5 |
| BUG-488 | No formal QA doc — verify To Room transfer end-to-end |
| BUG-489 | `handover/QA_HANDOVER_BUG489_2026_10_05.md` — TC-1..TC-7 |
| CR-407 | Owner smoke: `/pms/check-in` + FolioCheckoutPanel |
| **BUG-490** | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` — TC-490-01..05 |
| **BUG-491** | `handover/QA_HANDOVER_BUG490_BUG491_2026_10_05.md` — TC-491-01..08 + R1..R5 |

---

## 6. UNCHANGED FROM PREVIOUS SESSION

- **CR-390** — Gate 3 OPEN / OWNER REVIEW. No Gate 4 GO.
- **BUG-486** — BACKEND_BLOCKED. Brief: `backend_briefs/BACKEND_BRIEF_BUG486_PAYMENT_OTHER_LABELS_2026_10_05.md`

---

## 7. CREDENTIALS + ENVIRONMENT

| Item | Value |
|------|-------|
| App URL | `https://mygenie-pos-frontend.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Probe order (discount) | `order_id: 1232970` (balance_payment=2665, room_discount=2680, chargeGst≈335) |
| Branch | `5oct-1` |
| Env file | `/app/frontend/.env` — all vars written |

---

## 8. SELF-ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Registry synced?** | ✅ YES | BUG-490 + BUG-491 → GATE_5A_IMPLEMENTED |
| **Scope drift?** | ✅ NO | Only plan edits implemented; no improvisation |
| Role correctly identified? | ✅ | IMPLEMENTATION |
| Required docs read? | ✅ | AGENT_PROMPT_ALPHA, plans, FILE_OWNERSHIP, handover |
| Outputs complete? | ✅ | Code + QA handover + session handover |
| EXIT GATE | ✅ | 5/5 PASS |
