# BUG-356 — Customer Name / Phone Not Saved on Order

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 7)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P1 |
| Risk | HIGH |
| Side | Frontend |
| Root cause | NEEDS_LIVE_TEST |
| Duplicate check | DISTINCT |
| Code reality | NONE (bug not verified in code trace alone) |
| Blast radius | MEDIUM (~3 files: CartPanel, OrderEntry, orderTransform) |
| Fast Lane eligible | NO (HIGH risk, needs live test first) |

## Description

Customer name and phone entered at order time are not saved on the placed order. The data appears in the UI during entry but does not persist in the submitted order.

## Update — 2026-08-26

**Owner confirmed:** "we have fixed this now always a customer is created"

**Fix already in codebase — BUG-183 Layer 3 (`CartPanel.jsx:1015-1022`):**
When staff types a name manually (no CRM match found), `createCustomer()` fires silently. On success, `onCustomerChange?.({ ...merged, id: created.id })` updates the parent `customer` prop with the CRM-assigned ID + the typed name/phone. `placeOrder` then reads the correct `customer?.name` and `customer?.phone`.

**Live test still needed to close this bug** — code path appears complete but needs Network tab verification that `cust_name` / `cust_mobile` fields carry the correct values in the actual API payload for a manual-entry order.

**Live test blocked** — no credentials in `test_credentials.md`. Once credentials are available: type name manually → place order → inspect `/place-order` payload → confirm `cust_name` and `cust_mobile` are populated.

## Root Cause (original hypothesis — likely resolved by BUG-183 Layer 3)

`CartPanel.jsx` had `customerName` / `customerPhone` local state that could diverge from the parent `customer` prop. BUG-183 Layer 3 closes this by auto-creating the CRM profile on manual entry, ensuring the parent prop is updated before `placeOrder` fires.

## Evidence

- File: `src/components/order-entry/CartPanel.jsx` lines 846-847, 857-858, 876, 890
- Confidence: MEDIUM (hypothesis, not confirmed)

## Owner Decisions Needed

None yet — needs live test before planning.
