# INVESTIGATION REPORT — TAB Holder vs Diner & Prepaid/Resettle Credit-Ledger Gap

**ID:** INV-TAB-HOLDER-CREDIT-2026-11-22
**Role:** INVESTIGATION (Role 6) — in-gate, NO code edited
**Date:** 2026-11-22
**Account used for repro context:** pms@macha.com (activity log "by macha")
**Source evidence:** owner screenshots (order-entry → collect payment → credit management → order detail) + owner-supplied place-order payload (`evidence/INV-TAB-HOLDER-CREDIT-2026-11-22/placeorder_payload_sample.json`)

> Note on live probe: I did **not** curl the live Laravel backend. The owner message carried a Bearer token but it was security-masked (`***`), and no password for `pms@macha.com` was provided, so an authenticated probe of `preprod.mygenie.online` was not possible this session. Findings below are from the owner-supplied real payload + screenshots + full FE data-flow trace (HIGH confidence on FE; MEDIUM on backend persistence pending a live probe). Owner can authorise a credentialled probe to confirm §3 BREAK POINTs.

---

## 1. Summary

**Two distinct defects, one shared root family (TAB holder vs order-customer/diner identity + orders-table vs tap-ledger divergence).**

- **Issue 1 — "order report shows tab holder as mown (should be koji)":** The POS correctly sends the TAB **holder** (koji) in `name`/`mobile`/`crm_customer_id` and the **diner/customer** (mown) in `cust_name`/`diner_name`. But the Order Report (Credit & Paid tabs) renders its customer column from **`api.user_name`**, which for a TAB/prepaid order is populated by the backend from `cust_name` (= mown, the diner), **not** from the holder field `name` (= koji). The report has no holder field to read.
  - **Classification: BACKEND_BUG (identity mapping) + FE report gap. Confidence: HIGH (FE) / MEDIUM (backend).**

- **Issue 2 — "unpaid → resettle shows credit in report but Credit Management has no matching record; same for prepaid":** The Order Report Credit tab is driven purely by `payment_method === 'TAB'` on the **orders** table, while Credit Management reads a **separate tap/credit ledger** (`employee-tap-list` / `customer-transaction-list`). On the make-unpaid→resettle path and the prepaid-TAB place+pay path, the backend does not create a correct tap-ledger credit row (or creates it under the wrong person — see Issue 1), so the order appears as "credit" in the report but is missing/misfiled in Credit Management. FE has no code that writes the credit ledger on settle (it is backend-created), so FE cannot be the cause of the missing row.
  - **Classification: BACKEND_BUG (orders-table vs tap-ledger sync). Confidence: MEDIUM (traced, not live-reproduced).**

**Steps used: 8/10.**

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | FE sends the holder into the wrong field (swaps koji/mown) | Code trace of place+pay payload builder vs owner payload | **ELIMINATED** — FE is correct: holder→`name`, diner→`cust_name`/`diner_name` | `orderTransform.js` L1793–1806 & L1517–1524; payload matches exactly |
| H2 | Order Report reads holder from a holder field but transform drops it | Code trace of report transforms | **CONFIRMED (gap)** — report reads only `api.user_name`; no holder field exists on the transform/endpoint | `reportTransform.js` L85, L172, L265 |
| H3 | Backend stores `user_name = cust_name (diner)` for TAB orders, so report shows mown | Inference from owner payload (`cust_name=mown`) + observed report output | **CONFIRMED (medium)** — consistent with symptom; needs live probe to lock | screenshots + payload |
| H4 | Credit tab inclusion and Credit Management use the same data source | Code trace of report vs credit services | **ELIMINATED** — two independent sources (orders table vs tap ledger) | `reportTransform.deriveOrderStatus` L708; `creditService.js` L18–57 |
| H5 | FE fails to write the credit ledger on resettle/prepaid | Code trace of settle + make-unpaid services | **ELIMINATED (as FE cause)** — FE never writes the credit entry; only clearance/debit via `insertTabPayment`. Ledger credit row is backend-created at settle | `paymentMutationService.js` L99–106; `creditService.js` L64–75 |

---

## 3. Data Flow Trace

### Issue 1 — holder shown as diner
```
UI capture  CollectPaymentPanel.jsx L1317-1318
   tabContact  = { name: "koji", phone, crmId }        (HOLDER)
   dinerContact= { name: "mown", phone }               (DINER)
   customer    = "mown"                                 (order-entry customer)
        │
Payload   orderTransform.placeOrderWithPayment (prepaid TAB)
   cust_name       = customer.name     = "mown"         L1793
   name            = tabContact.name   = "koji"         L1798   (holder)
   mobile          = tabContact.phone                   L1799
   crm_customer_id = tabContact.crmId                   L1800
   diner_name      = dinerContact.name = "mown"         L1804
   (place-order variant: same mapping at L1517-1524)
        │  → POST /api/v2/vendoremployee/order/place-order  (matches owner payload exactly)
        ▼
Backend persists order row → exposes `user_name`
        │
Report fetch  getCreditOrders / getPaidOrders
Report xform  reportTransform.creditOrder L265 / paidOrder L172:
   customer = api.user_name || 'Guest'
   extractCustomerContact L85: name = api.user_name || api.cust_name
        ▼
UI renders customer = user_name
BREAK POINT: backend `user_name` == cust_name (= "mown", the diner), and NO holder
             field (`name`) is surfaced on paid-order-list / paid-in-tab-order-list.
             The report therefore shows the diner, never the holder (koji).
```

### Issue 2 — report=credit but Credit Management empty/misfiled
```
Make unpaid:  paymentMutationService.makeOrderUnpaid → POST /make-order-unpaid {order_id}   L99-106
Resettle TAB: order settled again → orders.payment_method = "TAB"
        │
Report Credit tab: reportTransform.deriveOrderStatus L708
   payment_method === 'TAB'  →  status = 'credit'      (reads ORDERS table only)
        │
Credit Management: creditService
   getTabCustomerList   → res['employee-tap-list']          (TAP LEDGER)   L18-31
   getTabCustomerRecords→ res['customer-transaction-list']  (TAP LEDGER)   L38-57
        ▼
BREAK POINT: ORDERS table (payment_method='TAB') and the TAP/CREDIT LEDGER are
             independent. On make-unpaid→resettle and on prepaid place+pay (BUG-672),
             the backend does not (re)create a correct tap-ledger credit row keyed to
             the holder. So: report shows 'credit', Credit Management has no/wrong row.
             FE never writes this ledger row (insertTabPayment is debit/clearance only),
             so the missing credit row is NOT an FE defect.
```

---

## 4. Evidence Artifacts

Saved to `/app/memory/evidence/INV-TAB-HOLDER-CREDIT-2026-11-22/`:
- `placeorder_payload_sample.json` — owner payload (Bearer token masked, phone digits partially masked) with field-by-field holder/diner interpretation.

Owner screenshots (described, not re-stored): order-entry cart (customer "mown"); Collect Payment → Credit, Credit Customer = koji / Diner = mown; Credit Management → "Mown ₹200 / order 000036 / diner —" (misfiled under diner) and "Koji ₹709" (earlier rows); Order 000036 "Added to Credit", activity log: paid prepaid 01:26 → make unpaid 01:29 → paid prepaid 02:11.

Key source lines:
- `frontend/src/api/transforms/orderTransform.js` L1517-1524 (place-order TAB block), L1793-1806 (place+pay TAB block)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1317-1318 (tabContact/dinerContact)
- `frontend/src/api/transforms/reportTransform.js` L85, L172, L265 (customer = user_name), L708 (payment_method 'TAB' → credit)
- `frontend/src/api/services/creditService.js` L18-57 (tap-ledger reads), L64-75 (debit/clearance insert — not a credit writer)
- `frontend/src/api/services/paymentMutationService.js` L99-106 (make-order-unpaid)

---

## 5. Recommendations

**Issue 1 — Classification: BACKEND_ASK (primary) + FE follow-up.**
- **Backend ask:** For TAB/prepaid orders, either (a) persist `user_name` from the TAB **holder** (`name`), or (b) surface a dedicated `holder_name`/`holder_mobile` on `paid-order-list` and `paid-in-tab-order-list` so the report can show the holder distinctly from the diner (`diner_name`). Confirm with a live probe what `user_name` currently contains for order 000036 / a fresh TAB order on rest 69.
- **FE follow-up (only once backend exposes holder):** extend `reportTransform.creditOrder`/`paidOrder` to render holder (and optionally diner, mirroring the Credit Management sheet from CR-527). No FE fix is viable today because the holder is not present on the report endpoints.
- **Note:** `crm_customer_id` in the payload equals `cust_membership_id` (mown's membership), not a koji-specific CRM id — worth confirming whether the holder should carry its own CRM id (ties to CR-527 "diner is plain-text, holder is CRM").

**Issue 2 — Classification: BACKEND_ASK.**
- **Backend ask:** On make-unpaid→resettle-to-TAB and on prepaid place+pay (TAB), ensure the backend creates the tap-ledger credit row (`customer-transaction-list`) keyed to the **holder** (`name`/`mobile`/`crm_customer_id`), so Credit Management matches the report's Credit tab. Reproduce on order 000036 and compare `paid-in-tab-order-list` vs `tap-customer-record-list`.
- **FE:** none — FE does not author the credit ledger.

**Confidence & next step:** FE trace HIGH; backend persistence MEDIUM. Single highest-value next action = one authenticated probe (owner creds) of `paid-in-tab-order-list`, `paid-order-list`, and `tap-customer-record-list` for a freshly placed TAB order on rest 69 to lock H3 and the Issue-2 ledger gap. I can run this if the owner authorises credentials via the secure secrets card.

**Planning-skip eligibility:** NOT eligible — both are financial/credit (R6 CRITICAL) and primarily backend. Route to PLANNING (Gate 2) with a BACKEND_BRIEF, not DIRECT_BUG_FIX.

---

## 6. Retroactive / Duplicate Candidates

- **Issue 1** → **RELATED to CR-527 / BUG-744 / BUG-745** (holder-vs-diner family; "stop seeding holder from diner"). This is a **DISTINCT new facet**: *Credit/Paid Order Report customer column shows the diner (`user_name`/`cust_name`), not the TAB holder* — CR-527 work covered Credit Management + capture UI, not the Order Report columns. Recommend INTAKE as a new sub-item under the CR-527 family.
- **Issue 2** → **DUPLICATE/overlap with BUG-672** ("Prepaid Order Unable to Move to Credit", P0/HIGH, GATE_1_INTAKE) and **RELATED to BUG-740** ("prepaid placement saves/credits a higher amount", P0/CRITICAL). The make-unpaid→resettle credit-ledger gap should be folded into / cross-referenced from BUG-672.

---

## Handover

Root cause: (1) Report shows diner not holder because report reads `user_name` (=cust_name) and no holder field is exposed — backend mapping + FE report gap. (2) Report Credit tab (orders table, `payment_method='TAB'`) diverges from Credit Management (separate tap ledger) because the backend does not write the holder-keyed credit row on resettle/prepaid-TAB — backend. Confidence: HIGH (FE) / MEDIUM (backend). Steps: 8/10. FE fix: Issue 1 = deferred until backend exposes holder; Issue 2 = none (FE does not write the ledger). Backend ask: YES (both — see §5). Planning-skip eligible: NO (financial → full Gate 2 + BACKEND_BRIEF). Retroactive/duplicate: Issue 1 = new facet under CR-527 family; Issue 2 = overlaps BUG-672 (+related BUG-740). Report at `/app/memory/INV-TAB-HOLDER-CREDIT-2026-11-22_INVESTIGATION_REPORT.md`.
