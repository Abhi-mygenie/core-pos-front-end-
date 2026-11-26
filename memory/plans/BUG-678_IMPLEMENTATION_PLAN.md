# BUG-678 — Implementation Plan (Gate 3)

**ID:** BUG-678
**Gate:** 3 — Implementation Plan
**Role:** PLANNING
**Date:** 2026-11-16
**Risk:** CRITICAL (money)
**IA verified at HEAD:** YES (same session, lines confirmed at L1719-1720 and L2505-2506)

---

## 1. Scope Lock

**Files WILL change:**
- `frontend/src/components/order-entry/OrderEntry.jsx` (R5 hotspot)

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx`
- `orderTransform.js`
- `CartPanel.jsx`
- `DashboardPage.jsx`
- Any service, context, transform, or test file

---

## 2. Exact Edits

### Edit E1 — OrderEntry.jsx L1719-1720 (QSR prepaid path)

```
CURRENT (L1719-1720):
        const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
          && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);

REPLACE WITH:
        const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
          && paymentData?.serviceCharge > 0; // BUG-678: trust CPP toggle, not autoServiceCharge
```

**What changes:** Remove `!!restaurant?.autoServiceCharge ||` from the AND condition. `scApplicable` now depends solely on the cashier's toggle state via `paymentData.serviceCharge`.

### Edit E2 — OrderEntry.jsx L2505-2506 (Scenario 2 prepaid path)

```
CURRENT (L2505-2506):
                        && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0) // BUG-662

REPLACE WITH:
                        && paymentData?.serviceCharge > 0 // BUG-678: trust CPP toggle, not autoServiceCharge
```

**What changes:** Identical logical change as E1, applied to the non-QSR (Scenario 2) prepaid path.

---

## 3. Execution Sequence

1. Apply E1 (L1719-1720)
2. Apply E2 (L2505-2506)
3. Verify webpack compiles with 0 new warnings
4. Run self-verification matrix (§4)
5. Execute EXIT GATE checklist (§5)

**No ordering dependencies between E1 and E2** — they are independent code paths. Can be applied in any order or simultaneously.

---

## 4. Verification Matrix

| # | Edit | File | Change Description | How to Verify | Automated? |
|---|------|------|--------------------|---------------|:---:|
| V1 | E1 | OrderEntry.jsx:1719-1720 | Remove `autoServiceCharge \|\|` from QSR prepaid | grep: `paymentData?.serviceCharge > 0; // BUG-678` at L1720 | YES |
| V2 | E2 | OrderEntry.jsx:2505-2506 | Remove `autoServiceCharge \|\|` from Scenario 2 | grep: `paymentData?.serviceCharge > 0 // BUG-678` at L2506 | YES |
| V3 | — | OrderEntry.jsx | No `autoServiceCharge` in scApplicable | grep: 0 hits for `autoServiceCharge.*serviceCharge > 0` | YES |
| V4 | — | OrderEntry.jsx | `// BUG-678` marker present | grep: 2 hits | YES |
| V5 | — | — | Webpack compiles | `yarn build` or dev server output | YES |
| V6 | — | — | Auto=Yes, toggle OFF, prepaid | Browser: Network tab → `service_tax=0` | NO |
| V7 | — | — | Auto=Yes, toggle ON, prepaid | Browser: Network tab → `service_tax > 0` | NO |
| V8 | — | — | Collect bill path unchanged | Browser: collect bill with SC OFF → `service_tax=0` | NO |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: BUG-678 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add OrderEntry.jsx L1719-1720, L2505-2506
- [ ] Code markers: // BUG-678 comment at both edit sites
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Line drift before implementation | LOW (IA verified same session) | Re-plan needed | Verify L1719-1720 and L2505-2506 content before editing |
| R2 | Regression on `placeOrder` (unpaid) | ZERO | — | Unpaid path uses `autoServiceCharge` only (no `paymentData` toggle) — untouched |
| R3 | Regression on `collectBillExisting` | ZERO | — | Reads ₹ amount directly — different code path, untouched |
| R4 | BUG-662 original fix broken | ZERO | — | BUG-662 fix for manual SC ON (auto=No) is preserved: `paymentData.serviceCharge > 0` is true when cashier toggles ON |

---

```
Planning complete: BUG-678
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: CRITICAL
Files WILL change: OrderEntry.jsx (L1719-1720, L2505-2506)
Files WILL NOT touch: CollectPaymentPanel.jsx, orderTransform.js, CartPanel.jsx, all others
Owner decisions: NONE
Verification matrix: 8 checks (5 automated, 3 manual browser)
Docs: plans/BUG-678_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
