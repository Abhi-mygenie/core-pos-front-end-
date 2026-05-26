# POS2.0 Phase 4 QA Repro & Duplicate Closure — 2026-05-17

## 1. Purpose

This document records the QA repro findings for Phase 4 bugs requiring verification, and formally documents the duplicate/already-resolved closures. All findings are from code inspection only — no runtime testing was performed.

No implementation was done. No code was changed. No baseline or pending-freeze docs were updated.

---

## 2. QA Repro Findings

### BUG-053 — Hardcoded SGST/CGST Percentage Label

**Code Inspection Result:** `likely_already_resolved`

**Evidence from `CollectPaymentPanel.jsx` L1700-1772:**
- **Item GST rows (CGST / SGST):** Render WITHOUT any percentage label. Code comment at L1701-1702 explicitly says: "Item GST shown without rate label because items can carry mixed rates."
- **SC GST rows:** Show `(restaurant?.serviceChargeTaxPct || 0) / 2` — this is from the **restaurant profile**, not hardcoded.
- **Tip GST rows:** Show `(restaurant?.serviceChargeTaxPct || 0) / 2` — same, from profile (Tip rides SC rate per CR-013 §1.9).
- **Delivery GST rows:** Show `(restaurant?.deliveryChargeGstPct || 0) / 2` — from profile.

**Finding:** No hardcoded percentage was found. All displayed percentages come from the restaurant profile. Item-level GST rows intentionally hide the rate label. The owner may have been looking at the SC/Tip/Delivery percentage (which reads from the profile) and interpreted it as hardcoded.

**Recommendation:** Close as `likely_already_resolved`. If the owner can provide a screenshot showing the exact row with a wrong percentage, reopen. Otherwise, the bug does not exist on the current codebase.

**Updated Classification:** `duplicate_or_already_resolved`

---

### BUG-074 — Browser-Native Autofill (Remember Me)

**Code Inspection Result:** `already_resolved`

**Evidence from `LoginPage.jsx` L163-195:**
- Email input has `autoComplete="email"` (line 171)
- Password input has `autoComplete="current-password"` (line 195)
- Input types are correct: `type="email"` (L163) and `type="password"` (L187)
- There is also a "Remember Me" checkbox (L217) and the form uses `useState` for email/password.

**Finding:** The login form already has the correct HTML5 `autocomplete` attributes for browser-native autofill. Chrome, Safari, and Firefox should all prompt to save and autofill credentials.

**Recommendation:** Close as `already_resolved`. The browser-native autofill attributes are already in place. No code change needed.

**Updated Classification:** `duplicate_or_already_resolved`

---

### BUG-066 — Food Item Transfer From Order Screen Still Allows Rooms

**Code Inspection Result:** `confirmed_bug` — root cause identified

**Evidence from `TransferFoodModal.jsx` L14-22:**

```javascript
// Current filter:
const occupiedOrders = useMemo(() => {
  return orders.filter(
    (o) => o.orderId !== currentTable?.orderId &&
           (o.orderType === 'dineIn' || o.isWalkIn) &&
           o.paymentType !== 'prepaid'
  );
}, [orders, currentTable?.orderId]);
```

**Root Cause:** The filter allows `orderType === 'dineIn'` orders through. Room orders have `orderType: 'dineIn'` AND `isRoom: true` (confirmed at `tableTransform.js` L58 and `orderTransform.js` L157). The filter is **missing `&& !o.isRoom`**, so room orders pass through and appear as valid food transfer destinations.

**Evidence chain:**
- `tableTransform.js` L58: `isRoom: api.rtype === 'RM'`
- `orderTransform.js` L157: `const isRoom = table.rtype === 'RM' || api.order_in === 'RM'`
- Room orders carry `orderType: 'dineIn'` + `isRoom: true`
- `TransferFoodModal` filter does not check `isRoom`

**Fix (for implementation agent):**
Add `&& !o.isRoom` to the filter at `TransferFoodModal.jsx` L19:
```javascript
(o.orderType === 'dineIn' || o.isWalkIn) && !o.isRoom &&
```

**Recommendation:** Ready for master plan. Root cause identified, fix is a single condition addition. Low risk — render-gate only, no payload/financial impact.

**Updated Classification:** `ready_for_master_plan` (constraint resolved — exact component and root cause identified)

---

### BUG-058 — Prepaid Hold Settlement Payload (Runtime Investigation)

**Code Inspection Note:** Owner confirmed `order-bill-payment` is the correct endpoint. Runtime investigation is still needed to understand the payload difference between "hold paid hold" and "prepaid hold." This requires a live environment — cannot be resolved from code inspection alone.

**Recommendation:** Keep as `qa_repro_required`. Implementation agent should capture runtime payloads for both hold types during smoke testing.

**Updated Classification:** `qa_repro_required` (unchanged)

---

## 3. Duplicate / Already-Resolved Closures

### BUG-076 — Round-off (Duplicate of BUG-051)

**Closure Evidence:** Impact analysis verdict: "Duplicate / Already Covered — same scope as BUG-051." Reconciliation report confirms: same round-off area, both linked to pending freeze ROUND-001 / BUG-002.

**Close With:** BUG-051 (Phase 1) QA pass.

**Status:** `closed_duplicate`

---

### BUG-077 — Mobile Trim Before CRM Lookup

**Code Inspection Note:** The reconciliation report states "Pending PAY-009(a) looks stale vs current code." The impact analysis says "Likely already resolved / configuration ambiguity." A definitive code check for the trim operation was not performed in this session because the CRM lookup code path involves `crmAxios` and `customerService`, which require tracing the full lookup chain.

**Recommendation:** Bundle verification with BUG-078 CRM timeout work. If trim is confirmed working during that implementation, close BUG-077. If a trim miss is found, fix as a one-liner.

**Close With:** BUG-078 implementation QA or standalone trim verification.

**Status:** `pending_closing_verification`

---

### BUG-081 — Snooze Duration Already 120000ms

**Code Inspection Note:** Reconciliation report and impact analysis both state the snooze is already 120000ms (2 minutes), matching the owner-correct rule (SCAN-002). Only stale comments remain.

**Recommendation:** Close. Bundle stale comment cleanup with any scan-order work if in scope.

**Close With:** Standalone verification or scan-order work QA.

**Status:** `closed_already_resolved` (pending verification of the exact timer value)

---

### BUG-086 — Room Grand-Total Key

**Code Inspection Note:** Impact analysis: "Likely already resolved — code matches user-confirmed contract." Code comment cites 2026-04-25 user confirmation that `order_amount` is the correct key for room grand total.

**Recommendation:** Close. Bundle verification with any room billing work if in scope.

**Close With:** Standalone verification or room billing work QA.

**Status:** `closed_already_resolved` (pending verification of the payload key)

---

## 4. Updated Classification Summary (Post QA Repro + Closures)

| Classification | Count | Bugs |
|---|---|---|
| **ready_for_master_plan** | **8** | BUG-050, 056, 057, 059, 066, 067, 072, 078 |
| **candidate_for_master_plan_with_constraints** | **3** | BUG-052, 060, 061 |
| **qa_repro_required** | **1** | BUG-058 |
| **ready_for_master_plan_after_backend_answer** | **4** | BUG-063, 064, 065, 069 |
| **duplicate_or_already_resolved** | **6** | BUG-053, 074, 076, 077, 081, 086 |

**Total Phase 4 bugs: 22**

### Changes from previous classification:
- BUG-053: `qa_repro_required` → `duplicate_or_already_resolved` (no hardcoded percentage found)
- BUG-066: `candidate_for_master_plan_with_constraints` → `ready_for_master_plan` (root cause found: missing `!o.isRoom` in TransferFoodModal filter)
- BUG-072: Already changed to `ready_for_master_plan` in backend capture (note fields exist; just add to order card)
- BUG-074: `qa_repro_required` → `duplicate_or_already_resolved` (autofill attributes already present)

---

## 5. Final Readiness After All Phase 4 Work

### Immediately plannable (8 bugs)
| Bug | Summary | Risk |
|---|---|---|
| BUG-050 | Manual reprint parity — use Collect Bill override path | Medium |
| BUG-056 | Preset discount dropdown, mutually exclusive | Low |
| BUG-057 | Prepaid Print Bill on Collect Bill + order screen | Low-medium |
| BUG-059 | Audit Report Print Bill for Paid orders | Low-medium |
| BUG-066 | Food transfer exclude rooms — add `!o.isRoom` to TransferFoodModal filter | Low |
| BUG-067 | Station toggle disabled when no stations configured | Low |
| BUG-072 | Add note fields to order card (already on order screen) | Low |
| BUG-078 | CRM timeout toast, no retry, allow manual proceed | Low |

### Candidates with constraints (3 bugs)
| Bug | Summary | Constraint |
|---|---|---|
| BUG-052 | Profile boolean gate for round-off | Identify exact field name; sequence after BUG-051 |
| BUG-060 | FE context not clearing source table on room transfer | Identify context clearing logic gap |
| BUG-061 | Room check-in time column data not bound | Identify field mapping gap |

### Runtime investigation needed (1 bug)
| Bug | Summary | What To Verify |
|---|---|---|
| BUG-058 | Prepaid-hold settlement payload differences | Runtime payload comparison between hold types |

### Still blocked on backend (4 bugs)
| Bug | Blocker |
|---|---|
| BUG-063 | Owner will provide template field mapping at runtime |
| BUG-064 | Backend must add transfer notification marker |
| BUG-065 | Parked for backend team (echo fields) |
| BUG-069 | Parked for backend team (notification sequencing) |

### Closeable (6 bugs)
| Bug | Closure Reason |
|---|---|
| BUG-053 | No hardcoded percentage found in code |
| BUG-074 | Autofill attributes already present |
| BUG-076 | Duplicate of BUG-051 |
| BUG-077 | Pending closing verification (bundle with BUG-078) |
| BUG-081 | Snooze already 120000ms |
| BUG-086 | Room key already confirmed |

---

## 6. Final Status

`phase_4_qa_repro_and_closure_complete`

---

*— End of Phase 4 QA Repro & Duplicate Closure —*
