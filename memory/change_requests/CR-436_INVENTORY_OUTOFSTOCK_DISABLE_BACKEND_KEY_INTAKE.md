# CR-436 — Inventory: Out-of-Stock Auto-Disable via Backend Key

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P1
**Risk:** HIGH
**Area:** Inventory / Order Entry
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

Need a backend-driven key per menu item that controls whether the item is automatically disabled on the POS when it goes out of stock. When stock is replenished and the key changes, the item should re-enable automatically — no manual intervention required.

**Expected behaviour:**
- Backend sends a flag per product (e.g. `stock_disabled: true/false`) in the products/menu API
- When `stock_disabled = true` → item appears greyed out / unavailable on Order Entry
- When stock is updated and `stock_disabled = false` → item re-enables automatically (via next data refresh or socket)

---

## Duplicate Check

**DISTINCT** — existing inventory CRs (CR-019, CR-072) cover stock tracking and migration. None covers automatic POS disable/enable driven by a backend flag.

---

## Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED — exact backend field name TBC

---

## Open Decisions

- **OD-436-01:** What is the backend field name for the stock-disable flag? (needed for orderTransform / productTransform mapping)
- **OD-436-02:** Real-time disable via socket update, or only on next full product refresh?
- **OD-436-03:** Visual treatment — greyed out with "Out of Stock" label, or completely hidden?
- **OD-436-04:** Does this apply to ingredients/sub-recipes too, or only to top-level menu items?

---

## Blast Radius (estimate)

- `src/api/transforms/menuManagementTransform.js` or `productTransform.js` — map new field
- `src/components/order-entry/OrderEntry.jsx` (R5) — gate item display/availability
- Possibly `LoadingPage.jsx` (R5) — product boot load
- Estimated scope: MEDIUM (3–4 files, 1 R5)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Blocked on OD-436-01 (backend field name needed)
