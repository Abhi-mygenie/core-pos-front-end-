# INV-021115 — Credit/TAB customer suggestions at Collect Bill (Order #021115)

Role: INVESTIGATION (no code changed) · Date: 2026-06 · Restaurant: cafe103 (owner login, creds masked)
Evidence: `/app/memory/evidence/INV-021115/` (running_orders.json, single_order.json, crm_search_name.json, crm_search_phone.json, crm_lookup.json)

## 1. Summary
- Q1 (source): Suggestions come from **CRM live search**, not local state. CRM holds **one** record for prashant / 9535004327 (id f917cc7a…). The "duplicate" is **two dropdowns open at once** (name dropdown + phone dropdown), each showing the same single CRM record.
- Classification: FE_BUG · Confidence: HIGH (code traced + CRM data verified + LIVE REPRODUCED) · Steps used: 10/10
- Q1b (CRM create at order time): **Yes**. CartPanel `handleFieldBlur` (L1032-1077) does lookup → createCustomer when a valid phone + name are entered and not picked from dropdown. CollectPaymentPanel L582-605 also does lookup → create (no-op here since lookup finds it).
- Q2 (other user sees only number): **NOT reproduced**. Backend currently returns `user_name: "prashant"` + `user.f_name/phone` for order 1537930 in both employee-orders-list and get-single-order-new. Needs owner repro data (see §5).

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result |
|---|---|---|---|
| H1 | CRM has duplicate customer records | CRM GET /pos/customers?search= (name & phone), POST /pos/customer-lookup | ELIMINATED — 1 record |
| H2 | Both name + phone suggestion dropdowns open together on prefilled credit form | Code trace CollectPaymentPanel L517-623, L3271-3340 | CONFIRMED |
| H3 | Backend order lacks customer name (Q2) | POS API probes | ELIMINATED for current data; root cause for Q2 still open |

## 3. Data Flow Trace (Q1)
Order API `user_name`/`user.phone` → orderTransform.js L176/L217-218 → OrderEntry setCustomer (L425-447 / L473-480) → CollectPaymentPanel `tabName`/`tabPhone` seeded from `customer` (L517-518), `tabIsCustomerSelected` always seeded `false` (L541, BUG-038 GAP-A) → name effect (L607-623, ≥2 chars) AND phone effect (L559-575, ≥3 chars) both call CRM `searchCustomers` and both set `show…Suggestions=true` → two absolute dropdowns render (L3285 name, L3317 phone) → UI shows the same customer twice.
BREAK POINT: prefilled values are never treated as "selected", so both typeaheads auto-open on panel mount.

## 4. Order data (masked)
order id 1537930 / #021115, dinein, unpaid, user_id 50297, user_name "prashant", phone 9535004327, crm_customer_id null.

## 5. Recommendations
- Q1 FE_FIX (1 file: CollectPaymentPanel.jsx, ~5-10 lines). Options for owner: (a) don't auto-open suggestions on mount for prefilled values (only open on user typing), or (b) show only one dropdown at a time (whichever field is focused), or (c) treat a prefilled name+phone that matches a CRM record as already selected. Billing/customer-data surface + hotspot file → Risk HIGH → full gate flow (Planning), not Fast Lane.
- Minor side note: `crm_customer_id` is null on the order; the CRM id is only sent at bill collection (BUG-183), not at placement.
- Q2 needs repro: which second user/role, which device/screen (dashboard card → Collect Bill, or reopen order), was the order opened before the first user's name blur finished, and a screenshot. Then probe socket payload (`update-order*` v2 payload `user_name`) for that event.

## 6. Retroactive Candidates
NONE

## 7. Re-investigation (owner follow-up)
- Owner observation: Order screen (CartPanel) shows prashant / +91 9535004327 correctly; problem appears only after Collect Bill → Credit.
- Live repro (preview, owner login, order 1537930, no payment submitted): after selecting `payment-TAB-btn`:
  `tab-customer-name-suggestions` OPEN (1 item, y=528) AND `tab-customer-phone-suggestions` OPEN (1 item, y=576). Name field = "prashant".
  → Two separate dropdowns, each with the same single CRM record, stacked → appears as a duplicate. CONFIRMED.
- Why the order screen is fine: CartPanel suggestion gate is seeded from customer selection state; CollectPaymentPanel seeds `tabIsCustomerSelected=false` (L541) so both typeaheads search & auto-open on mount with prefilled values.
- Owner decision: **Option (c)** — treat a prefilled customer that matches a CRM record as already selected (no dropdowns auto-open; tabCrmId captured).
- Next: PLANNING (Risk HIGH — billing/customer data, hotspot CollectPaymentPanel.jsx) → Gate 4 GO → IMPLEMENTATION.
