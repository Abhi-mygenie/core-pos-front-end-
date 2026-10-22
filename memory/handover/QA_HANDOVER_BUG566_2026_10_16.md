# QA Handover — BUG-566
## Status Filter Guard Fix — 2026-10-16

**Role handover to:** QA Agent (re-test V7)
**Registry sync:** YES — BUG-566 → GATE_5A_IMPLEMENTED
**EXIT GATE:** 5/5 PASS

---

## 1. What Was Changed

| Edit | File | Lines | Change |
|---|---|---|---|
| E-1 | `src/components/layout/Header.jsx` | L247–248 (2 lines inserted) | Added `visibleNext` guard in `handleStatusToggle` |

**Before (L241–249):**
```js
const handleStatusToggle = (statusId) => {
  if (activeStatuses.includes(statusId)) {
    const next = activeStatuses.filter(s => s !== statusId);
    if (next.length === 0) return;
    setActiveStatuses(next);
  } ...
```

**After (L241–253):**
```js
const handleStatusToggle = (statusId) => {
  if (activeStatuses.includes(statusId)) {
    const next = activeStatuses.filter(s => s !== statusId);
    if (next.length === 0) return;
    // BUG-566: guard against removing last VISIBLE filter
    const visibleNext = next.filter(s => visibleStatusFilters.some(f => f.id === s));
    if (visibleNext.length === 0) return;
    setActiveStatuses(next);
  } ...
```

---

## 2. Test Cases

| # | Test | Viewport | Steps | Expected |
|---|---|---|---|---|
| **V7** | **Last status guard — cannot deselect last** | **600×960** | 1. Open dashboard (Channel view). 2. Open `[data-testid="tablet-filter-dropdown-btn"]`. 3. Deselect all visible status filters one by one until 1 remains. 4. Click the last remaining active filter. | Last filter stays checked — check mark remains — dashboard still shows orders |
| **V7b** | Orders still visible after guard fires | 600×960 | After V7 guard fires, view dashboard | Orders are shown (not 0) |
| **V7c** | Can deselect all-but-last normally | 600×960 | Remove filters until 1 remains; each removal ABOVE last should work | Filters above last remove cleanly |
| **V7d** | Desktop pill guard also works | 1280×800 | On pills nav, deselect all but last status pill | Last pill stays active |
| **V-reg1** | Adding filter after guard fires works | 600×960 | After guard blocks removal, tap a different filter to add it | Filter adds correctly |
| **V-reg2** | Channel view dropdown still opens | 600×960 | Open dropdown in status view | Channel filters shown correctly |
| **V-compile** | Compile clean | — | `tail -3 /var/log/supervisor/frontend.out.log` | `webpack compiled with 1 warning` (pre-existing only) |

---

## 3. Regression Context

This fix is part of CR-414 / BUG-537 QA re-test. After V7 PASS here, run the **full CR-414 re-test**:
- V1 (BUG-565 overflow) — already fixed ✅
- V7 (BUG-566 guard) — this fix
- V12 (localStorage spec conflict — MINOR, owner decision pending)

---

## 4. Registry Sync Confirmation
```
Registry synced: YES
Item: BUG-566 → GATE_5A_IMPLEMENTED (sprint: oct_cr_batch)
EXIT GATE: ALL 5 PASSED
  ✅ 1. registry.json updated
  ✅ 2. BUG_TRACKER.md updated
  ✅ 3. FILE_OWNERSHIP.md updated
  ✅ 4. Code marker: // BUG-566 at Header.jsx:245
  ✅ 5. Compile: 1 pre-existing warning, 0 new
```

## 5. Credentials + Environment
- App URL: https://genie-pos-app.preview.emergentagent.com
- Test credentials: `/app/memory/control/test_credentials.md`
- Viewport: 600×960 via browser DevTools device emulation
