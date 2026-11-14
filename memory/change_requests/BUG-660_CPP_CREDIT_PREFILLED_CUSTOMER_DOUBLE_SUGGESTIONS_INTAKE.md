# BUG-660 — Collect Bill → Credit: prefilled customer shows duplicate CRM suggestions (both dropdowns auto-open)

**Type:** BUG · **Registered:** 2026-11-09 · **Registered by:** INTAKE agent (owner-reported) · **Sprint:** nov_cr_batch
**Severity:** P0 — owner override 2026-11-09 (agent had classified P2) · **Risk:** HIGH · **Fast Lane eligible:** NO
**Area:** Order Entry / Collect Payment / Credit (TAB) / CRM customer
**Related:** BUG-038 (CRM typeahead on TAB block, GAP-A seed=false), BUG-183 (tabCrmId capture), BUG-636 (TAB CRM lookup debounce)
**Investigation:** `INV-021115_INVESTIGATION_REPORT.md`

## Description
Order #021115 (id 1537930, cafe103), new customer prashant / +91 9535004327 entered at order time. Order screen shows name + phone correctly. On Collect Bill → select **Credit**, the "Credit Customer Details" block shows the same customer twice in stacked suggestion lists.

## Root cause (from investigation, HIGH confidence, live reproduced)
`CollectPaymentPanel.jsx` seeds `tabName`/`tabPhone` from `customer` (L517-518) but always seeds `tabIsCustomerSelected=false` (L541, BUG-038 GAP-A). On Credit select, the name effect (L607-623) and phone effect (L559-575) both call CRM `searchCustomers` and both set show=true → name dropdown (L3285) and phone dropdown (L3317) open simultaneously, each with the single CRM record. CRM has only ONE record (verified) — not a data duplicate.

## Owner decision (recorded)
**Option (c):** treat a prefilled customer that matches a CRM record as already selected — no dropdowns auto-open; capture CRM id (`tabCrmId`). Manual edit / blank-out must still re-enable search (BUG-038 GAP-A intent preserved).

## Evidence
- Screenshot: owner screenshots (chat, 2026-11-09); live repro `evidence/BUG-660/BUG-660_live_repro_credit_dropdowns.jpeg`
- Steps to reproduce: login owner cafe103 → Dine-In card "prashant ₹1,155" → Collect Bill → Credit → both `tab-customer-name-suggestions` and `tab-customer-phone-suggestions` visible (1 item each)
- Curl output: `evidence/BUG-660/crm_search_name.json`, `crm_search_phone.json`, `crm_lookup.json` (1 CRM record), `single_order.json`, `running_orders.json`
- Source: OWNER-REPORTED · Confidence: CONFIRMED (owner + agent live repro)

## Duplicate check
RELATED to BUG-038 / BUG-183 / BUG-636 (same TAB block, same file). Not a duplicate — BUG-038 closed, this is a new side effect of GAP-A seeding.

## Code reality
NONE (no BUG-660 marker in code).

## Blast radius
~1 file (`src/components/order-entry/CollectPaymentPanel.jsx`, R5 hotspot), `tabIsCustomerSelected` referenced 9×. Scope: SMALL. Hotspot: YES.

## Owner decisions (resolved 2026-11-09)
- OD-660-01 YES — phone (+cc) CRM match = selected, keep prefilled name
- OD-660-02 YES — CRM lookup failure → current behaviour (search fallback)
- OD-660-03 YES — editing either field after auto-select re-enables search
- Severity: P0 (owner)

## Out of scope
Q2 from investigation (second user sees only number) — NOT reproduced; owner to provide repro if it recurs (register separately).
