# CR-348 — Add GST / Tax Field to Custom Item Modal

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 2)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | CR (MISSING_FEATURE) |
| Severity | P2 |
| Risk | HIGH |
| Side | Frontend |
| Duplicate check | DISTINCT |
| Code reality | NONE (no tax state or field exists in AddCustomItemModal) |
| Blast radius | MEDIUM (AddCustomItemModal + orderTransform API payload) |
| Fast Lane eligible | NO (HIGH risk, 2+ files) |

## Description

`AddCustomItemModal.jsx` has no GST / tax fields. Current state only has: `name`, `categoryId`, `price`, `qty`, `notes`. The API payload for custom items is sent without any tax fields → custom items always submit with **0% tax** regardless of restaurant settings.

This causes revenue reporting discrepancies: custom items appear as tax-exempt even when the restaurant applies GST.

## Scope

1. Add a **GST %** numeric input to `AddCustomItemModal`
2. Add a **Tax Type** selector (GST / VAT / None) to match existing item tax model
3. Wire new fields to the `addCustomItem` API payload

## Owner Decisions — LOCKED 2026-08-26

| OD | Decision | Owner directive |
|---|---|---|
| **OD-1** | Staff **manually types** the GST % — shown conditionally only when restaurant has GST enabled (`restaurant.gstPercentage > 0` or `gstStatus = true`). No auto-populate. | "staff should type in if restaurant has GST" |
| **OD-2** | `tax_calc` (inclusive/exclusive) field **is required** — cannot default to Exclusive only. Not all items are exclusive. Must let staff choose, or default to restaurant-level setting. | "not right not all exclusive only" |
| **OD-3** | **RESOLVED via code probe.** Backend already accepts `tax`, `tax_type`, `tax_calc` — all three are in the current payload at `orderTransform.js:1012-1019`, just hardcoded to `0`, `'GST'`, `'Exclusive'`. No backend contract change needed — just wire to user input. | Code-confirmed |

## Evidence

- File: `src/components/order-entry/AddCustomItemModal.jsx`
- Steps: Add a custom item → check order payload → `gst_tax_amount` field missing/zero
- Confidence: HIGH (code-verified: no tax state in modal)

## Next Gate

Gate 2 (Impact Analysis) — trace `addCustomItem` API contract + backend field names before planning.
