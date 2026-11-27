# Investigation Report: CR-526 — Credit Management Print + Unpaid Buttons

**Date:** 2026-11-17 (UPDATED)
**Investigator:** Agent (Investigation Role)
**Confidence:** HIGH (reproduced + traced)
**Steps used:** 6/10

---

## 1. Summary

**Root cause (Unpaid/Remove button):** Property name mismatch — `CreditRow` checks `coverage.status` (lines 156, 166) but `computeFifoCoverage()` returns objects with `coverage.type` (lines 65-68). **`coverage.status` is ALWAYS `undefined`**, so the condition `coverage.status === 'open'` is ALWAYS false → button never renders regardless of permission.

**Secondary:** No Print button exists in `CreditRow` — never implemented.

**Classification:** FE_BUG (property name mismatch) + FE_FEATURE_GAP (Print button)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Permission `order_unpaid` missing for user | Screenshot analysis | 1 | ELIMINATED | DevTools response shows `order_unpaid` in role array for owner@mantri.com |
| H2 | `hasPermission` doesn't match the permission string | Code trace: AuthContext.jsx | 1 | ELIMINATED | `permissions.includes('order_unpaid')` — simple string match, correct |
| H3 | Coverage property name mismatch hides button | Code trace: CreditRow + computeFifoCoverage | 2 | **CONFIRMED** | `computeFifoCoverage` returns `{ type: 'open' }` but CreditRow checks `coverage.status === 'open'` |
| H4 | Print button exists but hidden | Code trace | 1 | ELIMINATED | No print logic in CreditRow at all |

---

## 3. Data Flow Trace

### The Bug — Property Name Mismatch:

```
computeFifoCoverage() (lines 55-69):
  Returns: { type: 'open' }  |  { type: 'covered' }  |  { type: 'partial', coveredAmount, totalAmount }
                 ^^^^                   ^^^^                    ^^^^
                 KEY IS "type"

CoverageBadge (lines 72-109):  ✅ CORRECT
  Reads: status.type === 'covered'    (line 74)
  Reads: status.type === 'partial'    (line 86)
  → Badges render correctly

CreditRow ACTION column (lines 156-168):  ❌ BUG
  Reads: coverage.status === 'open'    (line 156)  → ALWAYS undefined → ALWAYS false
  Reads: coverage.status === 'partial' (line 166)  → ALWAYS undefined → ALWAYS false
  → Button NEVER renders

FIX: Change to coverage.type on lines 156 and 166
```

### Full chain:
```
API: order_unpaid ∈ permissions[] ✅
AuthContext: hasPermission('order_unpaid') = true ✅
CreditCustomerDetailSheet: canRemoveCredit = true ✅
Open bucket: canRemove={canRemoveCredit} = true ✅
CreditRow: canRemove=true BUT coverage.status=undefined ❌ ← BREAKS HERE
  → canRemove && coverage.status === 'open'
  → true && (undefined === 'open')
  → true && false
  → false → button hidden
```

---

## 4. Evidence Artifacts

- Screenshot: User-provided — owner@mantri.com with `order_unpaid` permission visible in DevTools, ACTION column empty
- Code: `CreditCustomerDetailSheet.jsx` lines 156, 166 (bug), lines 65-68 (correct `.type` returns)
- Saved to: `/app/memory/evidence/CR-526/`

---

## 5. Recommendations

### A. Unpaid/Remove Button Fix (BUG — 2 lines)
**Classification:** FE_BUG — DIRECT_BUG_FIX
**Files:** `CreditCustomerDetailSheet.jsx`
- Line 156: Change `coverage.status === 'open'` → `coverage.type === 'open'`
- Line 166: Change `coverage.status === 'partial'` → `coverage.type === 'partial'`
**Planning skip eligible:** YES — 2 lines, 1 file, not hotspot. OWNER APPROVAL REQUIRED.

### B. Print Button (NEW FEATURE)
**Classification:** FE_FEATURE_GAP
- Add Print button alongside Remove in CreditRow ACTION column
- Reuse `handlePrintBill` pattern from `OrderDetailSheet`
- **Planning skip eligible:** NO — new feature in financial area

---

## 6. Retroactive Candidates
None.
