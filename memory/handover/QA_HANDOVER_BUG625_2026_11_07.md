# QA HANDOVER — BUG-625
**Date:** 2026-11-07
**Item:** BUG-625 — Active First pill missing from tablet dropdown
**Agent:** IMPLEMENTATION
**Sprint:** nov_cr_batch

---

## 1. Verification Matrix (self-test results)

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E1 | Header.jsx:L436 | Active First button inserted after Schedule in tablet dropdown else-branch | ✅ grep confirmed — `tablet-filter-active-first` at L438, `BUG-625` marker at L436 |

---

## 2. Test Cases for QA

| # | Test | Steps | Expected | Severity if fails |
|---|------|-------|----------|---|
| TC-1 | Active First visible in tablet dropdown (Channel View) | Set viewport <1280px. Open filter dropdown. | "Active First" button appears after Schedule | BLOCKER |
| TC-2 | Toggle ON → orange text + check visible | Click Active First in dropdown. | Text turns orange (`COLORS.primaryOrange`), Check icon visible | MAJOR |
| TC-3 | Toggle OFF → grey text + check hidden | Click again (or was already ON, click to OFF). | Text turns grey, Check icon hidden | MAJOR |
| TC-4 | Toggle actually reorders dashboard | Click Active First ON. Close dropdown. | Channel columns reorder: busiest/active tables sort to top | BLOCKER |
| TC-5 | Button ABSENT in Status View | Switch dashboardView to Status. Open dropdown. | No "Active First" button — only channel filters | MAJOR |
| TC-6 | xl pills unaffected at ≥1280px | Set viewport ≥1280px. | xl nav Active First pill still present and functional | MAJOR |
| TC-7 | Active count badge unchanged on toggle | Note badge number. Toggle Active First. | Badge number does NOT change | MINOR |
| TC-8 | Webpack compile clean | Check `tail frontend.out.log` | `webpack compiled with 1 warning` (pre-existing lint only) | BLOCKER |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Schedule button still works from tablet dropdown | Adjacent to insertion point — must remain functional |
| R2 | Status filter buttons in tablet dropdown still work | Same dropdown branch — must remain functional |
| R3 | Active First xl pill at ≥1280px unchanged | Different nav, no code change, verify no regression |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-625 → GATE_5A_IMPLEMENTED, sprint: nov_cr_batch
EXIT GATE: ALL 5 PASSED
  □1 registry.json ✅  □2 BUG_TRACKER.md ✅  □3 FILE_OWNERSHIP.md ✅  □4 code marker // BUG-625 ✅  □5 compile ✅
```

---

## 5. Credentials + Environment

- Preview URL: https://genie-pos-web-2--312lqkk9.preview.emergentagent.com
- Test viewport: set browser/DevTools to <1280px to trigger tablet mode
- Test account: see `/app/memory/control/test_credentials.md`
- File changed: `src/components/layout/Header.jsx` (L436-445)
