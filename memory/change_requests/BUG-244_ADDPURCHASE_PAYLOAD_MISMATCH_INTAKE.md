# BUG-244 — add-purchase Payload: Wrong Payment Key + Missing Header Totals

**ID:** BUG-244
**Type:** BUG
**Created:** 2026-07-25
**Severity:** P0 (every purchase has null payment type and total=1)
**Risk:** MEDIUM
**Module:** Inventory — Purchase Entry (shared transform)
**Duplicate Check:** RELATED to BUG-243 (Stock Not Credited — same endpoint, different root cause). DISTINCT: BUG-243 is a backend bug (stock not incremented). BUG-244 is an FE bug (wrong payload keys).
**Code Reality:** NONE — fix code does not exist. Bug confirmed at `inventoryTransform.js:167-186`.
**Source:** INVESTIGATION — discovered during Smart Purchase submit structure investigation (2026-07-25)
**Confidence:** CONFIRMED (backend contract doc provided by owner + curl-verified against preprod)

---

## Description

The FE `toAPI.addPurchase()` transform sends wrong/missing keys per the backend contract (`add_purchase_payload_frontend.md`). This affects **every purchase** submitted via both `SmartPurchasePanel` and `PurchaseEntryPanel`.

### Sub-Bugs

| Sub | Severity | What | Current | Expected | Effect |
|-----|----------|------|---------|----------|--------|
| **A** | P0 | Wrong payment key | `payment_method: "Cash"` | `payment_type: "Cash"` | **Ignored → `payment_type: null`** on every purchase |
| **B** | P0 | Missing header totals | *(not sent)* | `tot_amount` = sum of line Amount | **Defaults to `1`** → purchase headers show total=1 |
| **C** | P0 | Missing item total | *(not sent)* | `item_total` = sum of line Amount | **Defaults to `1`** |
| **D** | P2 | Missing tax/fair | *(not sent)* | `tot_fair: 0`, `tot_tax: 0` | **Defaults to `1`** instead of `0` |
| **E** | P2 | converion_factor always 1 | `converion_factor: 1` | Omit unless real conversion | Backend stores `1` for all |

---

## Evidence

- **Backend contract:** `add_purchase_payload_frontend.md` (owner-provided 2026-07-25) — defines correct keys
- **Code:** `inventoryTransform.js:172` — `payment_method` (wrong key, should be `payment_type`)
- **Code:** `inventoryTransform.js:167-186` — no `tot_amount`, `item_total`, `tot_fair`, `tot_tax`
- **Code:** `inventoryTransform.js:181` — `converion_factor: item.conversionFactor || 1` (always sends 1)
- **Curl proof (bad response):** Backend returns `{ tot_amount: 1, item_total: 1, payment_type: null }` for every purchase
- **Investigation report:** `/app/memory/reports/INVESTIGATION_SMART_PURCHASE_SUBMIT_2026_07_25.md`

---

## Blast Radius

- **1 file to change:** `api/transforms/inventoryTransform.js` (the `toAPI.addPurchase` function)
- **2 callers** affected (both benefit from fix):
  - `SmartPurchasePanel.jsx:160` — Smart Purchase submit
  - `PurchaseEntryPanel.jsx:95` — Manual purchase entry
- **~6-8 lines** change
- **Scope:** SMALL (1 file, additive changes)
- **Hotspot files (R5):** NO — `inventoryTransform.js` is not in R5 list
- **Financial logic (R6):** NO — not tax/discount/settlement. Purchase header totals are display/audit, not financial calculation.

---

## Open Questions

None. Backend contract is definitive.

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation
