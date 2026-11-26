# Session Handover — 2026-10-19 — INTAKE: Priority Upgrade + Code Reality Check (11 items)

**Role this session:** INTAKE (Role 1)
**Date:** 2026-10-19
**Code changed:** NO
**Next agent role:** PLANNING or IMPLEMENTATION (owner drives)

---

## Task Summary

Owner requested two things for 11 items (BUG-190, BUG-328, CR-393, BUG-544, CR-423,
CR-424, CR-426, BUG-570, BUG-579, BUG-580, BUG-583):
1. Priority upgrades (P1/P2 → P0, except CR-424 → P1)
2. Code Reality Check — is "INTAKE" status accurate, or has code already been written?

---

## Priority Updates Applied

All 3 stores updated: `registry.json` + `BUG_TRACKER.md` + `CR_REGISTRY.md`

| ID | Old | New | Code Reality |
|----|:---:|:---:|-------------|
| BUG-190 | P1 | **P0** | NONE — BACKEND_BLOCKED (CRM token auth). Status confirmed correct. |
| BUG-328 | P1 | **P0** | NONE — BUT title drift: registry="Discount Type Config", tracker="Phone on Bill Wrong Number". ⚠ Two different bugs sharing same ID — needs CLOSURE reconciliation. |
| CR-393  | P2 | **P0** | NONE — GATE_1_INTAKE confirmed. roomGstCalculator.js exists for BUG-386 (separate scope). |
| BUG-544 | P1 | **P0** | NONE — `showComingSoon` still active in Sidebar.jsx L363. Status confirmed open. |
| CR-423  | P2 | **P0** | NONE — CancellationsMockup has `enabled: false` on both Excel/PDF buttons. RoomOrders has buttons but `buildExportPayload` gap. Status confirmed open. |
| CR-424  | P2 | **P1** | NONE — No code. GATE_1_INTAKE correct. Sprint=future (needs BSP API). |
| CR-426  | P2 | **P0** | NONE — Tax rate % not printed anywhere. GATE_1_INTAKE confirmed. |
| BUG-570 | P2 | **P0** | NONE — No code markers. GATE_1_INTAKE_COMPLETE confirmed. |
| BUG-579 | P2 | **P0** | NONE — BACKEND_BLOCKED. insights-cancellations doesn't return ₹ fields. |
| BUG-580 | P2 | **P0** | NONE — BACKEND_BLOCKED. Custom discount types not in API response. |
| BUG-583 | P1 | **P0** | **PARTIAL** — `orderTransform.js:310` already maps `billPrinted: api.print_bill_status === 'Yes'`. FE transform written; backend must return `print_bill_status` in `employee-orders-list`. Registry note updated. |

---

## Flags for Follow-up

### 🚨 BUG-328 Title Drift (CLOSURE needed)
- `registry.json` title: "Discount Type Configuration Not Accessible / Missing"
- `BUG_TRACKER.md` title: "Phone on Bill: Wrong Number Prints on Receipt"
- These are TWO DIFFERENT bugs with the same ID. Developer appears to have
  used BUG-328 to mark the phone-on-bill fix (which belongs to BUG-346).
- Action: CLOSURE agent to reconcile which title is canonical and create a
  separate ID if needed.

### BUG-583 Partial Code Reality
- `orderTransform.js:310` has FE mapping ready.
- Only blocker is backend returning `print_bill_status` in orders list API.
- Once backend confirms / adds the field, FE can proceed directly to implementation.
  No Gate 2 planning needed — just backend unblock + 2-file card border change.

---

## Registry State After Session

All 11 items updated in registry.json, BUG_TRACKER.md, CR_REGISTRY.md.
Total registry items: 918.
