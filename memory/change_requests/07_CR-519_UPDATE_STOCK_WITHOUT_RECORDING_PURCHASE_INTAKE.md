# CR-519 — Inventory: Update Stock Without Recording a Purchase

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Currently, every stock update in the POS Inventory module is recorded as a **purchase transaction** (goes into purchase history). The owner wants an option to adjust/update stock quantities **without** creating a purchase record — for example, when correcting stock counts, handling returns, or manually reconciling physical stock.

**Current behaviour:** All stock additions go through `add-purchase` API, which records a purchase entry in the system every time. There is no way to update stock without creating a purchase record.

**Expected behaviour:** A new "Stock Adjustment" or "Update Stock Only" option that:
- Adjusts the inventory quantity
- Does NOT create a purchase record
- May optionally accept an adjustment reason/note
- Distinct from the existing "Receive Inventory" (purchase) flow

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (inflates purchase history; no clean way to correct stock counts)
- **Risk:** HIGH — touches inventory service, stock audit panel, possibly new API endpoint
- **Area:** Inventory / Stock
- **Fast Lane:** NOT eligible (new API call, inventory logic)

---

## 3. Duplicate Check

- Searched: "update stock without purchase", "stock adjustment", "non-purchase stock" in registry.json
- CR-387 (Smart Purchase unit breakdown) — different scope
- BUG-459 (Stock Audit inflation) — related symptom but different root cause
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `InventoryReceivePage.jsx` or `StockAuditPanel.jsx` — UI for new adjustment flow
- `inventoryService.js` — new API call (potentially `add-stock` vs `add-purchase`)
- Backend dependency: needs a separate `add-stock` endpoint or `add-purchase` with `is_purchase=false` flag
- **Estimated scope:** MEDIUM (2–3 files, backend dependency)

---

## 6. Open Questions

- OD-519-01: Does backend already have a separate `add-stock` / `stock-adjustment` endpoint distinct from `add-purchase`?
- OD-519-02: Where should this appear in the UI — (a) a new button on the existing "Receive Inventory" page (b) a separate "Stock Adjustment" page (c) a toggle on the existing form?
- OD-519-03: Should adjusted quantities appear in the purchase report or a separate adjustment log?

---

## 7. Code Reality

- **Status:** NONE — only `add-purchase` exists; no pure stock-adjustment path

---

## 8. Related

- CR-387 (Smart Purchase unit breakdown — GATE_5A_IMPLEMENTED)
- BUG-459 (Stock Audit quantity inflation)
- CR-421 (Inventory purchase-order workflow — GATE_1_INTAKE)
