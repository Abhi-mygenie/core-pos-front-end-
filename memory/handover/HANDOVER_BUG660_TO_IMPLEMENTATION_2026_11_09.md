# HANDOVER — BUG-660 → next agent (registry sync + Gate 4 ask → IMPLEMENTATION)

**Date:** 2026-11-09 · **From:** INVESTIGATION → INTAKE → PLANNING (Gate 2 + Gate 3) · **To:** next agent (target branch)
**Item:** BUG-660 — Collect Bill → Credit: prefilled customer shows duplicate CRM suggestions (name + phone dropdowns both auto-open)
**Severity:** P0 (owner override of P2) · **Risk:** HIGH · **Fast Lane:** NOT eligible · **Gate 4 GO:** NOT yet given

## 0. FIRST ACTIONS (mandatory, in order)
1. **Check registry on THIS branch:** `grep -n "BUG-660" /app/memory/control/registry.json /app/memory/control/BUG_TRACKER.md`
   - Check that BUG-660 is not already used by a DIFFERENT item. If it is → take the next free `BUG-<n>` and rename consistently in all docs, code-marker plan (`// BUG-<n>`) and evidence folder. Tell the owner the new ID.
2. **Register / update** (bundle `registry/` folder has the exact entry + tracker row):
   - Append `registry/BUG-660_registry_entry.json` to `registry.json` `items` (update `meta.total`, `meta.total_items`, `meta.last_updated`, `meta.last_action`). Validate JSON after.
   - Insert `registry/BUG-660_BUG_TRACKER_row.md` into `control/BUG_TRACKER.md` (after the highest BUG row).
3. **Save docs** to their paths on this branch (paths are kept inside the zip):
   - `INV-021115_INVESTIGATION_REPORT.md` → `/app/memory/`
   - `change_requests/BUG-660_CPP_CREDIT_PREFILLED_CUSTOMER_DOUBLE_SUGGESTIONS_INTAKE.md`
   - `impact/BUG-660_IMPACT_ANALYSIS.md`
   - `plans/BUG-660_IMPLEMENTATION_PLAN.md`
   - `handover/HANDOVER_BUG660_TO_IMPLEMENTATION_2026_11_09.md` (this file)
   - `evidence/BUG-660/*`
4. **Entry verification against code on this branch** (Implementation Step 0): open `src/components/order-entry/CollectPaymentPanel.jsx` and confirm the "Current" blocks in plan §2 (L541-542, L566-575, L594-595, L614-619, L645-652, L657-677). If lines/text differ → note the drift, re-anchor line numbers in the plan (same logic), tell the owner. Also confirm BUG-183 (`tabCrmId`) and BUG-636 (debounce timer) code exists — the plan builds on both.
5. **Explain the plan to the owner in plain words** (see §3) and **ask for Gate 4 GO** using the OWNER APPROVAL REQUIRED block (§5). **Write no code before GO.**

## 1. Problem (owner-reported, CONFIRMED)
Order #021115 (id 1537930, cafe103). New customer prashant / +91 9535004327 entered at order time. Order screen shows name+phone correctly. Collect Bill → Credit → "Credit Customer Details" shows the customer twice.
- CRM has ONE record (`f917cc7a-4713-44e8-9ddd-24efa238f326`) — not a data duplicate.
- Live repro: `tab-customer-name-suggestions` AND `tab-customer-phone-suggestions` both open (1 item each).

## 2. Root cause
`CollectPaymentPanel.jsx` seeds `tabName`/`tabPhone` from `customer` (L517-518) but `tabIsCustomerSelected=false` always (L541, BUG-038 GAP-A). On Credit, name effect (L607-623) + phone effect (L559-575) both call CRM `searchCustomers` and both open their dropdowns. Lookup effect (L582-605) captures `tabCrmId` but never marks the customer selected.

## 3. Plan summary (explain to owner)
One file, 6 edits, ~20 lines — TAB block only.
| Edit | What | Owner decision |
|---|---|---|
| E1 L541-542 | If order customer already has CRM id + phone → start "selected", crmId seeded, no dropdowns | OD-660-01 |
| E2 L566-575 | Ignore phone-search results that arrive after selection / next keystroke | — |
| E3 L594-595 | Lookup finds phone in CRM → mark selected (keep typed name), once per phone | OD-660-01 |
| E4 L614-619 | Same stale guard for name search | — |
| E5 L645-652 | Dropdown pick records phone (no re-auto-select later) | — |
| E6 L657-677 | ANY edit resets selection; phone edit clears old crmId; blank-out unchanged | OD-660-03 |
CRM failure → no selection, search lists work as today (OD-660-02). Not touched: orderTransform, OrderEntry, CartPanel, customerService, sockets, contexts, JSX/testids, payload builder, validation, discount/print.

## 4. Verification (12 checks, plan §5) — key ones
V1 #021115 Credit → 0 dropdowns · V2 payload `crm_customer_id` = CRM id (needs owner-approved test order to pay) · V3 late enrichment closes dropdowns · V5 name edit re-enables search · V7 blank-out parity · V8 new number → CRM create still fires · V10 intl debounce (BUG-636) · V12 jest `src/tests/cr385/hideSectionRows.cr385.test.js`.

## 5. Gate 4 ask (use exactly)
```
OWNER APPROVAL REQUIRED
Reason: Gate 4 GO for BUG-660 — billing/customer-data surface, R5 hotspot CollectPaymentPanel.jsx
Risk: HIGH (Severity P0)
Proposed next step: Apply plan E1-E6 (1 file, ~20 lines), compile, self-test V1-V12, registry sync
I will not proceed until owner approves.
```
Also ask: which preprod order may actually be paid for V2 (or skip V2 and verify payload by intercept).

## 6. Context / credentials
- Preprod POS: `REACT_APP_API_BASE_URL`; CRM: `REACT_APP_CRM_BASE_URL`; CRM auth = `crm_token` from login response (X-API-Key).
- Test login: see `/app/memory/control/test_credentials.md` (owner cafe103 alias). Never print passwords/tokens.
- Do NOT submit Pay on order #021115 without owner permission (real preprod order).

## 7. Out of scope
Investigation Q2 ("second user sees only number") — NOT reproduced; register separately only if owner re-reports with repro.

## 8. Post-code checklist (from plan §7)
registry → GATE_5A_IMPLEMENTED · BUG_TRACKER row · FILE_OWNERSHIP row · `// BUG-660` markers on E1-E6 · QA handover `handover/QA_HANDOVER_BUG660_<date>.md`.
