# CR-393 — Configurable GST: Food and Room Charges Taxed Separately — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | **CRITICAL** — changes GST calculation; financial/tax logic |
| Area | PMS / GST / Settings / Tax Calculation |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — `roomGstCalculator.js` exists for room GST; food GST is in `orderTransform.js` |
| Fast Lane | NO |

---

## Requirement

Properties need to apply **different GST rates or rules** for:
- Food/F&B orders (e.g. 5% or 18%)
- Room charges (e.g. 12% or 18% slab-based)

Currently both may use the same configuration. This CR requires a **per-property, per-category GST config** in Restaurant Settings.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-393-01: Is food GST currently configurable per-item or globally? What needs to change?
- OD-393-02: Is room GST already separate (via `room_gst` in profile)? What’s missing?
- OD-393-03: Which screen does the owner use to configure this — Restaurant Settings Step?
- OD-393-04: Does this affect existing orders/reporting retroactively?

---

## Next Step
**CRITICAL risk — owner must answer all ODs before Gate 2 GO.** Financial/tax logic requires full gate flow + owner approval.
