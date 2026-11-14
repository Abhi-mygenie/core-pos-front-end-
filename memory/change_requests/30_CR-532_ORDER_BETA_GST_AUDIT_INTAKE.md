# CR-532 — Order Beta Report: GST Audit Tab / View

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Owner wants a **GST Audit** tab or section within the Order Beta report that shows the GST (CGST + SGST + total tax) breakdown per order, filterable by date range, for tax compliance and audit purposes.

**Current behaviour:** Order Beta report shows order totals and payment details but does not have a dedicated GST breakdown view for audit purposes.

**Expected behaviour:** A GST audit view within Order Beta (or as a separate tab) showing:
- Per-order: CGST, SGST, Total Tax, Taxable Amount, Grand Total
- Summary row: Total CGST / SGST / Tax for the filtered period
- Filterable by date range (day / week / month / custom)
- Export option (Excel/PDF)

---

## 2. Classification

- **Type:** CR
- **Severity:** P0 — Critical (tax compliance/audit requirement; no current GST breakout per order in reports)
- **Risk:** HIGH — financial/tax data, new report tab, backend dependency
- **Area:** Reports / Analytics
- **Fast Lane:** NOT eligible (new report, financial/tax data)

---

## 3. Duplicate Check

- BUG-646 (Inclusive Tax Items inflate Grand Total — INVESTIGATION_COMPLETE): related GST calculation bug; different scope
- CR-509 (Order Beta: Order Details + Activity Logs): extends Order Beta; different scope
- Searched: "gst audit", "gst report", "tax audit" — no prior registration
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 revised batch)
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- Order Beta report page (`AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx`) — add GST tab/section
- `reportService.js` — new data fetch or extend existing order data with GST fields
- Backend: confirm GST fields (cgst, sgst, total_tax, taxable_amount) in `ORDER_REPORT_BETA_COMBINED` API — backend dependency
- **Estimated scope:** MEDIUM (2–3 FE files, backend confirm required)

---

## 6. Open Questions

- OD-532-01: Should GST audit be a **new tab** in Order Beta or a **toggle/column group** within the existing table?
- OD-532-02: Line-item level GST breakdown, or order-level totals only?
- OD-532-03: Export to Excel/PDF needed for the GST audit view?
- OD-532-04: Does the backend `ORDER_REPORT_BETA_COMBINED` API already return `cgst`, `sgst`, `total_gst` per order?

---

## 7. Code Reality

- **Status:** NONE — no GST audit tab/section in Order Beta

---

## 8. Related

- BUG-646 (Inclusive Tax double-counting — INVESTIGATION_COMPLETE)
- BUG-647 (GST OFF payload still sends GST — INVESTIGATION_COMPLETE)
- CR-509 (Order Beta: Order Details + Activity Logs — GATE_1_INTAKE_COMPLETE)
- REACT_APP_SHOW_AUDIT_TAB=true env var suggests audit tab infrastructure may already exist
