# BUG-583 — Card color logic broken for bill-config restaurants: should stay ORANGE until bill printed, turn GREEN only on bill print

**ID:** BUG-583
**Type:** BUG
**Registered:** 2026-10-17
**Registered by:** INTAKE agent (owner voice — session 2026-10-17)
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE

---

## 1. Description

For restaurants where `defaultOrderStatus` is configured as "bill" (bill-first flow), the card border and label colour logic is wrong.

**Owner's requirement:**
> "For restaurants where defaultOrderStatus = 'bill', there is no preparation and serving stage — they directly bill. So colour will always be ORANGE for this configuration. Only when cashier prints bill should it become GREEN. fOrderStatus does not change when bill is printed."

**Current behaviour:**
- `getStatusColor(fOs)` in `colors.js` returns GREEN for both `fOs === 5` (served) and `fOs === 6` (billed/paid)
- For bill-config restaurants, orders go directly to `fOs=5` and stay there
- Card shows GREEN immediately — before the bill is printed
- Card never correctly reflects "bill not yet printed" state

**Expected behaviour:**
- Bill-config restaurant → card shows ORANGE from order appearance until bill is printed
- Card turns GREEN only when `order.billPrinted === true` (backend field: `print_bill_status === 'Yes'`)

---

## 2. Investigation Findings (from Investigation session 2026-10-17)

### Finding 1 — `defaultOrderStatus === 'bill'` is a DEAD CONDITION
The proposed fix in the prior handover used `restaurant?.defaultOrderStatus === 'bill'` as the detection condition. This is wrong:

```javascript
// profileTransform.js line 233
defaultOrderStatus: F_ORDER_STATUS_API[api.def_ord_status] || null

// F_ORDER_STATUS_API (constants.js)
{ 1:'cooking', 2:'ready', 3:'cancelled', 5:'serve', 6:'paid', 7:'pending', 8:'running', 9:'pendingPayment', 10:'reserved' }
```

`'bill'` does not exist in `F_ORDER_STATUS_API`. This condition can never be true. Any fix using it would silently never fire.

### Finding 2 — `fOs === 6` ≠ bill printed
`fOs === 6` maps to `'paid'` — meaning the cashier has completed payment via Collect Bill. This is NOT the same as printing the bill. Owner confirmed `fOrderStatus` does not change when a bill is printed.

### Finding 3 — Correct signal: `order.billPrinted`
```javascript
// orderTransform.js line 301
billPrinted: api.print_bill_status === 'Yes',
```
`order.billPrinted` is already in the order transform, derived from `api.print_bill_status`. This is the correct field indicating that a bill has been physically printed. It is NOT currently used in `OrderCard.jsx` or `TableCard.jsx` for any colour logic.

### Finding 4 — How to identify a bill-config restaurant (OPEN QUESTION)
The correct condition for detecting a bill-config restaurant is NOT `defaultOrderStatus === 'bill'`. Two candidates:
- **Option A:** `restaurant?.settings?.autoBill === true` — already in profileTransform
- **Option B:** A specific `api.def_ord_status` value for bill-config restaurants (needs owner/backend to confirm what value the API sends for `owner@18march.com`)

**Owner decision needed before implementation:** Which field correctly identifies a bill-config restaurant?

---

## 3. Classification

- **Type:** BUG — color logic incorrect for a specific restaurant configuration
- **Severity:** P1 — feature visually broken for all bill-config restaurants (they see GREEN when they should see ORANGE)
- **Risk:** MEDIUM — touches `OrderCard.jsx` (R5 hotspot), `TableCard.jsx`, `colors.js`. Color display only, no financial/order logic.
- **Fast Lane eligible:** NO — MEDIUM risk, R5 hotspot file (OrderCard.jsx)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (voice — 2026-10-17) + AGENT-CONFIRMED via investigation
- **Test account:** `owner@18march.com / Qplazm@10` (Default Order Status = Bill)
- **Steps to reproduce:** Login as 18march → Dashboard → place/view any order → card shows GREEN → expected ORANGE until bill is printed
- **Confidence:** CONFIRMED (code traced, dead condition verified, correct signal identified)
- **Investigation report:** SESSION_HANDOVER_2026_10_17_NOV_BATCH_SESSION2_CLOSE.md §Gap A + investigation session 2026-10-17

---

## 5. Blast Radius

- **Files:** 2–3
  - `src/components/cards/OrderCard.jsx` (R5 hotspot — 3 `getStatusColor` call sites)
  - `src/components/cards/TableCard.jsx` (1 `getStatusColor` call site)
  - `src/constants/colors.js` (optional — if `getStatusColor` signature is updated)
- **Estimated scope:** MEDIUM (3 files, 4-6 edits)
- **Hotspot files touched:** YES — `OrderCard.jsx` is R5

---

## 6. Duplicate Check

- **CR-433:** Implemented `getStatusColor` + status borders. Gap A was noted but NOT implemented. This bug is the formal registration of Gap A. **RELATED to CR-433 (Gap A) but DISTINCT — new implementation required.**
- **Duplicate check result:** RELATED to CR-433 / DISTINCT registration

---

## 7. Open Questions (MUST resolve before Gate 3)

| # | Question | Options | Owner decision needed |
|---|---|---|---|
| OD-583-01 | Which profile field correctly identifies a bill-config restaurant? | A: `restaurant.settings.autoBill` · B: specific `api.def_ord_status` value · C: new backend field | YES |

---

## 8. Next Step

Gate 2 (Impact Analysis) — after OD-583-01 resolved by owner. Full gate flow required (MEDIUM risk, R5 hotspot).
