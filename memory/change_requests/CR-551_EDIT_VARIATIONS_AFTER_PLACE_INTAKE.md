# CR-551 — Edit Variations / Add-ons on Placed Order Items

**Registered:** 2026-11-17
**Type:** CR
**Sprint:** nov_cr_batch
**Priority:** P0
**Risk:** HIGH (order flow, financial recalculation, kitchen impact)
**Status:** GATE_1_INTAKE_COMPLETE
**Client:** ALL (specifically reported by Woko — complex variations)
**Assignee:** Gyan (backend — new endpoint required) → Abhishek (FE after backend delivers)
**Routing reason:** Backend-blocked — no `edit-food-item` API endpoint exists

---

## 1. Description

After an order is placed, there is no way to edit the variations, add-ons, or size of an item. The only option is to cancel the item and re-add it with new customizations — which creates a new KOT, wastes the original item, and is confusing for staff.

**Current behaviour:**
- `PlacedItemRow` in CartPanel has: Cancel, Transfer, Qty Edit (pencil icon)
- `NewItemRow` (pre-placed) has: Customize button, Delete, Note, Qty Edit
- The "Customize" button and `ItemCustomizationModal` are ONLY wired for pre-placed items
- `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` in `constants.js` are both `'TBD'` (placeholder, tagged CHG-040, never implemented)
- All 5 probed backend edit endpoints returned HTTP 404

**Expected behaviour:**
- Placed items with variations/add-ons show an "Edit" button
- Clicking opens `ItemCustomizationModal` pre-populated with current selections
- User changes variations/add-ons/size → saves
- Backend updates the order line, recalculates amounts
- Kitchen receives modified KOT (optional, needs decision)

---

## 2. Classification

- **Type:** CR (new capability — not a bug, feature was never built)
- **Severity:** P0 — Core order editing workflow. Workaround (cancel + re-add) causes kitchen confusion, food waste, and double KOTs.
- **Risk:** HIGH — touches order flow, financial recalculation, kitchen KOT, 7+ FE files, backend dependency
- **Area:** Order Entry / Cart / Kitchen
- **Fast Lane:** NOT eligible (multi-file, backend dependency, financial area, kitchen impact)

---

## 3. Duplicate Check

| Checked Against | Result |
|----------------|--------|
| CR-145 (BulkEditor variation columns) | DISTINCT — menu management, not order editing |
| BUG-371 (Bulk Editor variation price) | DISTINCT — menu price editing, not placed order |
| BUG-374 (Cart variation qty bug) | DISTINCT — qty bug, not variation editing |
| CHG-040 (constants.js placeholder) | RELATED — CHG-040 reserved the endpoint constants but never implemented |

**Result: DISTINCT** — no existing CR covers editing variations/add-ons on placed order items. CHG-040 was a placeholder that was never executed.

---

## 4. Evidence

- **Source:** OWNER-REPORTED + AGENT-INVESTIGATED (Investigation session 2, 2026-11-17)
- **Confidence:** CONFIRMED (curl-probed 5 endpoints, all 404; code-traced full FE flow)
- **Investigation report:** `investigations/INV-CR-EDIT-VARIATIONS_AFTER_PLACE_2026_11_17.md`
- **Test account:** owner@woko.com / Qplazm@10, Order #002397 ("Your Wok. Your Way." — 5 variation groups)
- **Screenshots:** User-provided — Order with complex variations, only qty pencil icon visible, no edit button

### API probe results:
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v2/vendoremployee/order/edit-food-item` | POST | 404 |
| `/api/v2/vendoremployee/order/update-food-item` | POST | 404 |
| `/api/v2/vendoremployee/order/edit-order-item` | POST | 404 |
| `/api/v2/vendoremployee/order/modify-food-item` | POST | 404 |
| `/api/v1/vendoremployee/order/edit-food-item` | POST | 404 |

---

## 5. Root Cause

**BACKEND_GAP + FE_FEATURE_GAP:**
- Backend has no API endpoint for editing a placed item's variations/add-ons
- `update-place-order` only accepts NEW items in `cart-update[]` — cannot modify existing `orderDetails[].id` entries
- Frontend `PlacedItemRow` has no customize capability — only `NewItemRow` does
- `ItemCustomizationModal` CAN pre-populate from existing selections (lines 32-65) but is never wired for placed items
- `constants.js:92-93` has `EDIT_ORDER_ITEM: 'TBD'` and `EDIT_ORDER_ITEM_QTY: 'TBD'` — planned but never built

---

## 6. Blast Radius

**Backend (Gyan):**
- New `edit-food-item` endpoint (or similar)
- Must: update orderDetails row, recalculate amounts, emit socket update, optionally fire modified KOT

**Frontend (after backend delivers):**

| File | Change | Hotspot? |
|------|--------|----------|
| `api/constants.js:92` | Replace `'TBD'` with actual endpoint URL | NO |
| `api/transforms/orderTransform.js` | Add `editFoodItem()` transform | YES (R5) |
| `api/services/orderService.js` | Add `editFoodItem()` API call | NO |
| `CartPanel.jsx` PlacedItemRow | Add edit icon button (gated by permission + item status) | YES (R5) |
| `OrderEntry.jsx` | Wire edit click → open ItemCustomizationModal in edit mode | YES (R5) |
| `ItemCustomizationModal.jsx` | Add edit mode: pre-populate from placed item, different save callback | NO |
| `orderTransform.js` fromAPI | Ensure placed items carry variation catalog data for re-edit | YES (R5) |

- **Estimated scope:** LARGE (1 backend endpoint + 7 FE files)
- **Hotspot files touched:** orderTransform.js (R5), CartPanel.jsx (R5), OrderEntry.jsx (R5)

---

## 7. Open Questions

| # | Question | Recommended |
|---|----------|-------------|
| OD-551-01 | Should edit be allowed at any item status, or only before `ready`/`served`? | Only before `served` — once served, cancel + re-add is safer |
| OD-551-02 | Should a modified KOT be sent to kitchen? | YES — kitchen needs to know the change |
| OD-551-03 | Separate permission (`edit_customization`) or use existing `order_edit`? | Use existing `order_edit` — fewer settings |
| OD-551-04 | Price changes from variation edits — recalculate tax + service charge? | YES — amounts must be consistent |
| OD-551-05 | Should qty also be editable in the same modal, or keep separate qty pencil? | **Combine in one modal** — single modal for qty + variations + add-ons. Replaces the pencil icon. |

---

## 8. Dependencies

| # | Dependency | Status |
|---|-----------|--------|
| D1 | Backend: new `edit-food-item` endpoint | **BLOCKING** — does not exist, needs backend brief |
| D2 | ItemCustomizationModal pre-population | SATISFIED — already supports pre-fill (lines 32-65) |
| D3 | Response → selection data mapping | NEEDED — placed items carry API response shape, not selection shape |

---

## 9. Backend Brief Preview

```
New endpoint needed: PUT /api/v2/vendoremployee/order/edit-food-item

Payload: {
  order_id:        <order ID>,
  item_id:         <orderDetails[].id — specific line to edit>,
  food_id:         <food catalog ID (unchanged)>,
  quantity:        <qty (can also change)>,
  variations:      [{ name, values: { label: [selected] } }],
  add_on_ids:      [ids],
  add_on_qtys:     [qtys],
  food_amount:     <base price>,
  variation_amount: <new variation total>,
  addon_amount:    <new addon total>,
  food_level_notes: <optional>
}

Backend must:
1. Find orderDetails row by item_id
2. Replace variation, add_ons, prices
3. Recalculate order_amount, tax, service charge
4. Emit update-order socket event
5. Optionally fire modified KOT
6. Respect order_edit permission
```

---

## 10. Related

- CHG-040 (constants.js placeholder — same feature, never executed)
- BUG-237 (qty edit delta pattern — reference for how placed item edits work today)
- BUG-374 (variation qty bug — related variation handling)
- CR-489 / BUG-656 (edit lock — permission gating)

---

```
Intake complete: CR-551
Classification: CR, Severity: P0, Risk: HIGH
Duplicate check: DISTINCT (CHG-040 placeholder related)
Evidence: code-traced + API probed (5 endpoints 404) + user screenshots
Blast radius: LARGE (1 backend endpoint + 7 FE files, 4 R5 hotspots)
Client: ALL (Woko reported)
Assignee: Gyan (backend) → Abhishek (FE)
Docs updated: change_requests/CR-551_EDIT_VARIATIONS_AFTER_PLACE_INTAKE.md
Next: Owner answers 5 ODs → Backend brief to Gyan → Planning Gate 2
```

---

## 11. Owner Decisions — CORRECTED (2026-11-18 Re-Investigation)

| # | Question | Answer | Rationale |
|---|----------|--------|-----------|
| OD-551-01 | When should editing be allowed? | **CORRECTED: Only BEFORE placing order (while item is in cart)** | Original answer "before served" was wrong. Editing variations/add-ons is a pre-place operation. After placing → cancel + re-add is the designed workflow. |
| OD-551-02 | Should kitchen get a modified KOT? | **N/A** | Edit is pre-place — no KOT has been sent yet. Not applicable. |
| OD-551-03 | Which permission gates the edit button? | **N/A** | Cart items are always editable before placing. No permission needed. |
| OD-551-04 | Recalculate tax + service charge on price change? | **N/A** | Price recalculation handled locally by ItemCustomizationModal.calculateTotal(). No backend involved. |
| OD-551-05 | Qty in same modal or keep separate? | **LOCKED — Combine in one modal** | Customize modal already handles qty + variations + add-ons. |

### 2026-11-18 Re-Investigation Correction:
> Owner clarification: "Editing should be allowed only before placing order while item is already in cart. Editing after placing is more of cancel previous and add new."

**Root cause re-classified as FE-ONLY bug:**
- Clicking "Customize" on a NewItemRow (pre-placed cart item) opens the modal correctly and pre-populates selections ✅
- BUT: saving from the modal calls `addCustomizedItemToCart` which **always appends a new item** instead of replacing the existing cart item
- The original cart item with old customizations **remains in the cart** → duplicate
- Fix: ~8 lines in `OrderEntry.jsx` `addCustomizedItemToCart` — add replace-by-`_cartKey` path when item came from cart edit
- **No backend endpoint needed. Not backend-blocked.**

**All ODs finalized. FE-only fix. No backend brief needed for CR-551.**
