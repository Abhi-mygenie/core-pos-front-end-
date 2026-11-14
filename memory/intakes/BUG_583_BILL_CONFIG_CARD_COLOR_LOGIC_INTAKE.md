# BUG-583 — When bill is printed, table card and order card turn green (border + background)

**ID:** BUG-583
**Type:** BUG
**Registered:** 2026-10-17
**Registered by:** INTAKE agent (owner voice — session 2026-10-17)
**Sprint:** nov_cr_batch
**Status:** GATE_2_READY (backend unblocked 2026-11-06 — `bill_print` field confirmed in orders-list + socket)

---

## 1. Description

**Requirement (owner confirmed 2026-10-17, DESIGN LOCKED 2026-11-06 — supersedes all earlier descriptions):**

When a bill is physically printed, both the **table card** and the **order card** must visually turn green:
1. **Border** → solid green `#329937` (2px) — overrides status-based colour
2. **Background** → light green `#E8F5E9` — overrides white `#FFFFFF`

This applies regardless of the current kitchen order status (Preparing/Ready/Served).

Current behaviour: `billPrinted` flag exists in the FE order model (`orderTransform.js:310`) but reads the wrong field (`print_bill_status` instead of `bill_print`), and nothing on either card responds to it visually.

**Expected behaviour:**
- `order.billPrinted === false` → white background, status-based border colour (unchanged)
- `order.billPrinted === true` → light green `#E8F5E9` background + green `#329937` border

**No change to existing status colour logic when bill is NOT printed.**

### Design Mockups (owner-approved 2026-11-06)
- BEFORE (Table View): https://static.prod-images.emergentagent.com/jobs/5120ca3f-5a7a-43f9-99a0-889c61255031/images/0616853a59a1c8df604c1b0af9a29ed7105f77e8af848b955dd71f6dbaa887e8.jpeg
- AFTER (Table View — green background): https://static.prod-images.emergentagent.com/jobs/5120ca3f-5a7a-43f9-99a0-889c61255031/images/7461f7108ec530bd45e66f503ee47c31cfc7c11c58469c31fbac98b9d43069b6.jpeg
- AFTER (Order Card — green background): https://static.prod-images.emergentagent.com/jobs/5120ca3f-5a7a-43f9-99a0-889c61255031/images/856f33af45762ce50117711c9dcbfbaf0365ba73bcd73d7c6c45a3aa29f89938.jpeg

---

**BACKEND BLOCKER:** The `print_bill_status` field (`Yes` / `No`) must be present in the running orders API response. The FE transform already maps it (`orderTransform.js:301`). If the backend is not returning this field on the orders list endpoint, the FE will always see `billPrinted = false`. **Backend must confirm / ship the field before FE implementation can begin.**

---

## 2. Investigation Findings (updated 2026-10-17)

### Finding 1 — Requirement clarified (supersedes earlier findings)
Original description was about bill-config restaurants needing orange. Owner confirmed 2026-10-17: **current colour behaviour is fine.** The only change needed is: bill printed → green border on both cards.

### Finding 2 — `order.billPrinted` is the correct signal
```javascript
// orderTransform.js:301 — already implemented
billPrinted: api.print_bill_status === 'Yes',
```
This is the field to drive the green border override.

### Finding 3 — BACKEND BLOCKER
`print_bill_status` must be returned by the running orders list API (`/api/v1/vendoremployee/pos/employee-orders-list`). If absent, `billPrinted` will always be `false`. FE cannot implement until backend confirms the field is returned.

### Finding 4 — OD-583-01 CLOSED (no longer needed)
Original OD asked which field identifies a bill-config restaurant. Requirement change makes this irrelevant — the fix applies to ALL restaurants equally (no restaurant-type check needed). The condition is simply `order.billPrinted === true`.

### Finding 5 — Investigation probe (2026-10-17)
Probed `owner@18march.com` profile:
- `billing_auto_bill_print: 'Yes'` → `restaurant.settings.autoBill = true`
- `def_ord_status: 1` (same as palmhouse — cannot distinguish bill-config)
- This data is now moot given requirement change but saved at `/app/memory/evidence/BUG-583/`

---

## 3. Classification

- **Type:** BUG — missing visual signal when bill is printed
- **Severity:** P1 — every restaurant is affected (not just bill-config)
- **Risk:** LOW-MEDIUM — border colour override only, no financial/order logic. Touches OrderCard.jsx (R5 hotspot) and TableCard.jsx.
- **Fast Lane eligible:** NO — R5 hotspot (OrderCard.jsx)

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

## 7. Open Questions

| # | Question | Status |
|---|---|---|
| OD-583-01 | ~~Which profile field identifies a bill-config restaurant?~~ | **CLOSED — no longer needed. Requirement change: fix applies to all restaurants. No restaurant-type check required.** |
| **OD-583-02** | Does `/api/v1/vendoremployee/pos/employee-orders-list` currently return `print_bill_status` in each order? | **OPEN — BACKEND MUST CONFIRM before Gate 2 can start** |

---

## 8. Backend Ask

**Filed:** 2026-10-17
**Recipient:** Backend team

> BUG-583 requires the `print_bill_status` field (`"Yes"` / `"No"`) to be present on every order object returned by the running orders list endpoint (`/api/v1/vendoremployee/pos/employee-orders-list`). The FE transform already maps it at `orderTransform.js:301`. Please confirm whether this field is currently returned, and if not, add it. FE implementation cannot begin until this is confirmed.

---

## 9. Next Step

**BLOCKED on backend.** Once backend confirms `print_bill_status` is in the orders list response → Gate 2 (Impact Analysis) can begin immediately. Scope will be small: `OrderCard.jsx` + `TableCard.jsx`, border colour override only.
