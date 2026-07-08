# BUG-166 — addon_amount Not Multiplied by Item Qty

**ID:** BUG-166
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (agent-discovered, prompted by owner after BUG-VQTY fix)
**Sprint:** pos_5_0
**Status:** GATE 4 GO

---

## 1. Description

`addon_amount` in both place-order and collect-bill payloads is sent as a **per-unit**
value without being multiplied by the item's quantity (`qty`). This is identical to
**BUG-VQTY** (`variation_amount` same file, now fixed), which was discovered first.

**Example:**
- Menu item qty = 3, addon "Cheese" = ₹20
- `addonAmount` computed correctly as `20` (per unit)
- `addon_amount` sent to backend = `20` → **WRONG, should be `60`**
- Result: backend receives an understated addon total, reports undercount addon revenue

---

## 2. Root Cause

`addonAmount` is computed as a **per-unit** sum at both fix sites:

**Site 1 — `buildCartItem` (place-order payload) — L590-592:**
```js
const addonAmount = addons.reduce((sum, a) => {
  return sum + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1));
}, 0);
// → per-unit addon total. ✅ correct as unit price.
```

**Site 1 — L704 (payload field):**
```js
addon_amount: isRuntimeComp ? 0 : addonAmount,   // ❌ missing * (item.qty || 1)
```

**Site 2 — `collectBillExisting` (collect-bill payload) — L1461-1463:**
```js
addonAmount = item.addOns.reduce((sum, a) => {
  return sum + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1));
}, 0);
// → per-unit addon total. ✅ correct as unit price.
```

**Site 2 — L1493 (payload field):**
```js
addon_amount: isRuntimeComp ? 0 : addonAmount,   // ❌ missing * qty
```

---

## 3. Fields NOT Affected

| Field | Why correct |
|-------|-------------|
| `food_amount` | Computed as `basePrice * qty` (intermediate already × qty) |
| `variation_amount` | Fixed in BUG-VQTY: `variationAmount * qty` at both sites |
| `gst_amount` / `vat_amount` | Computed from `lineTotal = fullUnitPrice * qty` (per-unit fullUnitPrice includes addonAmount) → tax is **correct** |
| `complementary_price` / `complementary_total` | Intentionally per-unit price fields — correct as-is |

---

## 4. Proposed Fix

**2 lines. Same file as BUG-VQTY. Pattern identical.**

| Site | Line | Current | Fix |
|------|------|---------|-----|
| `buildCartItem` | L704 | `addonAmount` | `addonAmount * (item.qty \|\| 1)` |
| `collectBillExisting` | L1493 | `addonAmount` | `addonAmount * qty` |

---

## 5. Classification

| Field | Value |
|-------|-------|
| **Type** | BUG |
| **Priority** | P0 |
| **Risk** | MEDIUM |
| **Risk reason** | Hotspot file (`orderTransform.js`), financial field (`addon_amount`), identical to BUG-VQTY precedent |
| **Fast Lane eligible** | NO — MEDIUM risk (hotspot file), financial field |
| **Gate** | Gate 3 plan inline (fix is unambiguous). Gate 4 GO requires owner approval. |

**Severity rationale:** P0 — `addon_amount` is a billing field. Every item ordered with an addon AND qty > 1 sends an understated addon total. This means reports undercount addon revenue for the restaurant. Cannot defer.

---

## 6. Evidence

| Field | Value |
|-------|-------|
| **Source** | AGENT-DISCOVERED — owner prompted investigation after BUG-VQTY fix: *"is this similar thing happening in add-on also?"* |
| **Confidence** | CONFIRMED — code-traced at both sites. `addonAmount` confirmed per-unit by its reduction formula. |
| **Screenshot** | Not applicable (payload-level bug) |
| **Steps to reproduce** | Place an order for any item with an addon AND qty > 1. Inspect POST payload: `addon_amount` will equal `addonPrice × addonQty` (per-unit) instead of `addonPrice × addonQty × itemQty`. |
| **Curl** | Not applicable (FE payload builder — no network probe needed) |

---

## 7. Blast Radius

| Scope | Detail |
|-------|--------|
| Files to change | 1 — `api/transforms/orderTransform.js` |
| Lines to change | 2 (L704 + L1493) |
| Hotspot files | YES — `orderTransform.js` is a registered hotspot |
| Blast radius | **SMALL** (1 file, 2 lines) |
| Regression risk | LOW — pattern proven safe by BUG-VQTY fix on the adjacent `variation_amount` field |

---

## 8. Related Items

| ID | Relationship |
|----|-------------|
| **BUG-VQTY** | IDENTICAL PATTERN — `variation_amount` at same two sites, now fixed. BUG-166 is the addon counterpart. |

---

## 9. Duplicate Check

**DISTINCT** — no prior BUG registered for `addon_amount` quantity multiplication.
Related to BUG-VQTY (same file, same fix pattern, different field).

---

## 10. Owner Decisions Required

**None.** Fix is unambiguous — same pattern as BUG-VQTY, owner approval at Gate 4 GO only.

---

## 11. Next Gate

Gate 4 GO — owner approves → BUG FIX agent applies 2-line fix → testing agent verifies.

STATUS: GATE 4 GO (pending owner GO signal)
