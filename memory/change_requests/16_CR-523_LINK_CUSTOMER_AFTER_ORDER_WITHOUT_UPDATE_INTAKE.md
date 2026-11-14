# CR-523 — Link Customer to Order After Placing (Without Completing/Updating)

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Currently, when a customer is linked to an order, it typically requires either placing the order initially with a customer, or updating/completing the order to attach a customer. The owner wants to be able to **link (or change) the customer on an existing placed order** without having to Update or Complete the order first.

**Current behaviour:** Linking a customer to an existing order may require an order update action. The customer modal appears but saving it may trigger an order update, which is not always desired mid-service.

**Expected behaviour:** Staff can open the Customer modal on any active order and save a customer link **without** triggering an order update or completion flow. The customer association is applied silently in the background.

---

## 2. Classification

- **Type:** CR
- **Severity:** P2 — Medium (workflow friction; workaround exists via order update)
- **Risk:** MEDIUM — touches order update flow, customer modal, API call sequencing
- **Area:** Menu / Order Entry
- **Fast Lane:** NOT eligible (order flow, customer data, potential API call change)

---

## 3. Duplicate Check

- Searched: "link customer after", "customer after order", "attach customer" in registry.json — no match
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — Customer Details modal showing mahi2 customer with 0 visits, Bronze tier
- **Confidence:** CONFIRMED

---

## 5. Blast Radius

- `OrderEntry.jsx` (R5) — customer modal save path
- Customer modal component — save action
- `orderService.js` — `updateCustomer` or separate CRM customer-link endpoint
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

## 6. Open Questions

- OD-523-01: Does the backend have a dedicated "link customer to order" endpoint separate from "update order"?
- OD-523-02: Should the customer link be saved immediately (silent API call) or queued until next order action?

---

## 7. Code Reality

- **Status:** PARTIAL — customer modal exists and saves with order; separate "link only" path not implemented

---

## 8. Related

- CR-379 (PMS Check-In CRM link — GATE_5B_QA_PASS, same CRM concept)
