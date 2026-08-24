# Implementation Plan — BUG-273 (Auto Settle Local Settings Removal)

**ID:** BUG-273
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 4 (Hotspot R5 — extra care)
**Risk:** MEDIUM
**Files:** 5 | **Lines removed:** ~100

---

## Step 0 — Starting Code State

| File | Lines | What |
|---|---|---|
| `StatusConfigPage.jsx` | L70-71 (constants), L199 (state), L337-338 (localStorage read), L419 (reset), L550 (localStorage write), L963-1001 (toggle UI) | Full toggle UI + persistence |
| `DashboardPage.jsx` | L1526-1571 (queue processor), L1576-1602 (enqueue useEffect), L1609-1610 (cleanup) | Auto-settle queue + enqueue logic |
| `OrderCard.jsx` | L1153 | Inline localStorage check hides Settle button |
| `TableCard.jsx` | L622 | Same inline localStorage check |
| `utils/autoSettlePrefs.js` | All 29 lines | Helper functions (exported but only used in StatusConfigPage internally) |

---

## Edits

### Edit 1 — StatusConfigPage.jsx: Remove constants
**Remove L70-71:**
```js
const AUTO_SETTLE_KEY = 'mygenie_auto_settle_enabled';
const AUTO_SETTLE_FACTORY = false;
```

### Edit 2 — StatusConfigPage.jsx: Remove state
**Remove L199:** `const [autoSettleEnabled, setAutoSettleEnabled] = useState(AUTO_SETTLE_FACTORY);`

### Edit 3 — StatusConfigPage.jsx: Remove localStorage read
**Remove L337-338:** `const storedAutoSettle = localStorage.getItem(AUTO_SETTLE_KEY); if (storedAutoSettle === 'true') setAutoSettleEnabled(true);`

### Edit 4 — StatusConfigPage.jsx: Remove reset
**Remove L419:** `setAutoSettleEnabled(AUTO_SETTLE_FACTORY);`

### Edit 5 — StatusConfigPage.jsx: Remove localStorage write
**Remove L550:** `localStorage.setItem(AUTO_SETTLE_KEY, autoSettleEnabled ? 'true' : 'false');`

### Edit 6 — StatusConfigPage.jsx: Remove toggle UI block
**Remove L963-1001:** The entire auto-settle toggle `<div>` block (including `data-testid="auto-settle-toggle"`).

### Edit 7 — DashboardPage.jsx: Remove auto-settle queue processor
**Remove L1526-1571:** `AUTO_SETTLE_DELAY_MS`, `AUTO_SETTLE_MAX_RETRIES`, `autoSettleQueue` ref, `autoSettleProcessing` ref, `autoSettleKnown` ref, and `processAutoSettleQueue()` function.

### Edit 8 — DashboardPage.jsx: Remove enqueue useEffect
**Remove L1576-1602:** The useEffect that watches for eligible orders and enqueues them.

### Edit 9 — DashboardPage.jsx: Remove cleanup
**Remove L1609-1610:** `autoSettleQueue.current = []; autoSettleProcessing.current = false;`

### Edit 10 — OrderCard.jsx: Remove auto-settle condition from Settle button
**L1153:** Remove the inline localStorage check. The condition:
```js
(order.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) &&
```
**Replace with:**
```js
(order.paymentMethod?.toLowerCase() === 'paylater' || true) &&
```
Or simplify the entire condition since `true` is always truthy.

### Edit 11 — TableCard.jsx: Same removal
**L622:** Same pattern as Edit 10.

### Edit 12 — Delete `utils/autoSettlePrefs.js`
Remove the entire file.

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: no `AUTO_SETTLE_KEY` in StatusConfigPage | grep | 0 matches |
| V2 | Code: no `autoSettleQueue` in DashboardPage | grep | 0 matches |
| V3 | Code: no `auto_settle_enabled` in OrderCard/TableCard | grep | 0 matches |
| V4 | Code: `autoSettlePrefs.js` deleted | ls | file not found |
| V5 | Compile: webpack | log | compiled successfully |
| V6 | Runtime: StatusConfigPage loads without toggle | Playwright | no auto-settle toggle visible |
| V7 | Runtime: Settle button always visible on OrderCard | Playwright | button present |

## Rollback
Restore all removed blocks. Restore `autoSettlePrefs.js` from git.
