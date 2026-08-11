# Impact Analysis — BUG-273: Auto Settle Local Settings Removal

**ID:** BUG-273
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-28
**Code Reality:** CONFIRMED — 5 files, ~100 lines of auto-settle logic
**Conflict Pre-Check:** DashboardPage.jsx is R5 hotspot. CR-056 also touches DashboardPage (scan popup toggle) but different section. No line conflict.
**Risk:** MEDIUM (DashboardPage is hotspot R5)

---

## Data Flow Trace

### Current Auto-Settle Flow
```
1. StatusConfigPage.jsx: Toggle UI → localStorage('mygenie_auto_settle_enabled')
2. DashboardPage.jsx:
   - useEffect watches for orders reaching served/delivered status
   - If auto-settle ON → enqueue to autoSettleQueue
   - Queue processor (L1536-1560) calls settle API per order (800ms delay, max 2 retries)
3. OrderCard.jsx L1151-1153: If auto-settle ON + not PayLater → HIDE Settle button
4. TableCard.jsx L621-622: Same hide logic
5. utils/autoSettlePrefs.js: Helper to read/write localStorage
```

### Removal Plan
```
1. StatusConfigPage.jsx: Remove toggle UI block (~17 lines) + constants (~3 lines)
2. DashboardPage.jsx: Remove queue processor + refs + useEffect (~35 lines)
3. OrderCard.jsx: Remove conditional hide → Settle button ALWAYS shows (~3 lines)
4. TableCard.jsx: Same → Settle button ALWAYS shows (~3 lines)
5. utils/autoSettlePrefs.js: DELETE entire file (29 lines)
```

## Affected Files

| File | Lines | Change |
|---|---|---|
| `StatusConfigPage.jsx` | L70-71, L984-1001 | Remove AUTO_SETTLE_KEY constant + toggle UI |
| `DashboardPage.jsx` | L1526-1560 (approx) | Remove autoSettleQueue, autoSettleProcessing, autoSettleKnown refs + processAutoSettleQueue function + enqueue logic |
| `OrderCard.jsx` | L1151-1153 | Remove auto-settle condition → Settle always shows |
| `TableCard.jsx` | L621-622 | Same removal |
| `utils/autoSettlePrefs.js` | All (29 lines) | DELETE file |

## Downstream Consumers
- Settle button visibility on OrderCard/TableCard
- Order settlement timing (now server-side)
- StatusConfig page layout (toggle removed)

## OWNER QUESTIONS

1. **After removing FE auto-settle, should the Settle button ALWAYS be visible?**
   - Option A: Always visible (user can manually settle even if server already settled)
   - Option B: Hide if order is already `payment_status === 'paid'` (server settled it)
   - Which is correct?

2. **Should we also clean up the localStorage key `mygenie_auto_settle_enabled` on app boot?** (Old installs may have it set to 'true' — any stale side-effects?)

3. **The auto-settle queue in DashboardPage has a useEffect that watches for order status changes. Is there any OTHER logic in that same useEffect that should be preserved?** (Need to verify we don't accidentally remove non-auto-settle logic.)

4. **Are there any other files importing `autoSettlePrefs.js`?** (Need to check for import breakage.)

5. **Does the StatusConfigPage have other toggles in the same section?** (Removing auto-settle may leave a visual gap if it's between other settings.)

---
