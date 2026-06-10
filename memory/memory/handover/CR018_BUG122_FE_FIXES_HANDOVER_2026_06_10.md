# Agent Handover — CR-018 / BUG-122 Remaining FE Fixes

**Date:** 2026-06-10
**Sprint:** POS 4.0
**Priority:** P1
**Status:** 3 fixes IMPLEMENTED (2026-06-10) — awaiting owner smoke test
**Predecessor Session:** BUG-122 closed (owner verified), CR-018 Gates 0–5 complete, backend fields confirmed working

---

## Context

### What happened before you
1. **BUG-122** (POS orders triggering web popup) was implemented and owner-verified. The fix split `isYetToConfirm` into `isWebYetToConfirm` / `isPosYetToConfirm` on OrderCard, and tightened the ScanOrderPopOut predicate to web-only.

2. **CR-018** (Schedule Order) was implemented end-to-end — checkbox in CartPanel, payload passthrough, badge on OrderCard, ScanOrderPopOut guard, dashboard filter fix. Gates 0–5 complete.

3. **Backend team** added the missing fields to the running-orders API (`employee-orders-list`):
   - `order_from: "pos"` (lowercase — confirmed working)
   - `scheduled: 1` (integer — confirmed working)
   - `schedule_at: "2026-06-10 00:00:00"` (was already present)

4. During owner testing, **3 gaps** were found that need FE fixes. These are documented below with exact file, line, current code, new code, and the reason.

### Credentials for testing
- **Email:** `manager@kunafamahal.com`
- **Password:** `Qplazm@10`
- **API Base:** `https://preprod.mygenie.online/`
- **Preview URL:** `https://pos-react-app-2.preview.emergentagent.com`

### How to test login via API
```bash
API_BASE="https://preprod.mygenie.online"
TOKEN=$(python3 -c "
import requests
r = requests.post('$API_BASE/api/v1/auth/vendoremployee/login', json={'email':'manager@kunafamahal.com','password':'Qplazm@10'}, headers={'Content-Type':'application/json','Accept':'application/json'})
print(r.json()['token'])
")
echo $TOKEN
```

---

## Fix #1 — Cancel (X) Button Missing on OrderCard for POS YTC

### Why
BUG-122 implementation intentionally removed the cancel/reject button for POS YTC orders on OrderCard (L871-881), showing only a tick (✓). However, during owner testing, owner confirmed **both X (cancel) and ✓ (confirm) should appear** for POS YTC orders — matching the TableCard behavior.

Currently:
- **TableCard** (Table View): Shows X + ✓ for ALL YTC orders ✅
- **OrderCard** (Channel View): Shows ✓ only for POS YTC ❌ — cancel is missing

### File
`/app/frontend/src/components/cards/OrderCard.jsx`

### Lines
L871-881

### Current Code
```jsx
        ) : isPosYetToConfirm ? (
          /* BUG-122: POS YTC — tick (✓) only, no Reject. Same confirm API. */
          <button
            data-testid={`pos-confirm-btn-${orderId}`}
            className={`min-h-[44px] min-w-[44px] px-6 rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
            onClick={handleAcceptClick}
            disabled={isActionInProgress}
          >
            {isAcceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
          </button>
```

### New Code
```jsx
        ) : isPosYetToConfirm ? (
          /* BUG-122 + CR-018: POS YTC — Cancel (X) + Confirm (✓). Matches TableCard. */
          <>
            <button
              data-testid={`pos-cancel-btn-${orderId}`}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-lg flex items-center justify-center ${isActionInProgress ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: COLORS.errorBg, color: COLORS.errorText }}
              onClick={() => onCancelOrder?.(order)}
              disabled={isActionInProgress}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              data-testid={`pos-confirm-btn-${orderId}`}
              className={`min-h-[44px] min-w-[44px] px-6 rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
              onClick={handleAcceptClick}
              disabled={isActionInProgress}
            >
              {isAcceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
            </button>
          </>
```

### What changes
- Adds a cancel (X) button before the confirm (✓) in the `isPosYetToConfirm` branch
- Cancel calls `onCancelOrder?.(order)` — same handler as web reject and TableCard cancel
- Styling matches the web reject button (pink background, red X icon)
- Wrapped in `<>...</>` fragment since there are now two sibling buttons

### Dependencies
- `X` icon is already imported from lucide-react (L2)
- `onCancelOrder` is already a prop (L42)
- `COLORS.errorBg` and `COLORS.errorText` are already defined in the component
- `isActionInProgress` is already computed

### Test cases
1. Place a POS order (not from web) → should land in YTC with fOrderStatus 7
2. OrderCard in Channel View should show **both X and ✓** buttons
3. Click X → should trigger cancel flow (same as reject)
4. Click ✓ → should confirm order (existing behavior, unchanged)
5. Web YTC orders should still show the existing Accept/Reject with text labels (unchanged)

---

## Fix #2 — Snooze Clock Showing for ALL YTC on TableCard (Should Be Web-Only)

### Why
The snooze button (clock icon) on TableCard shows for ALL `isYetToConfirm` orders. Snooze is a web-order-specific feature (mute the popup notification). On OrderCard, BUG-122 already correctly gates snooze to `isWebYetToConfirm` only (L473). TableCard was never updated with this gating.

Currently:
- **OrderCard** (L473): `isWebYetToConfirm && onToggleSnooze` ✅ web-only
- **TableCard** (L319): `isYetToConfirm && onToggleSnooze` ❌ shows for ALL YTC including POS

### File
`/app/frontend/src/components/cards/TableCard.jsx`

### Lines
L318-319

### Current Code
```jsx
          {/* Snooze Button - Only for yetToConfirm orders */}
          {isYetToConfirm && onToggleSnooze && (
```

### New Code
```jsx
          {/* Snooze Button - Only for web yetToConfirm orders (BUG-122 parity) */}
          {isYetToConfirm && table.isWebOrder && onToggleSnooze && (
```

### What changes
- Adds `table.isWebOrder` check so snooze only appears for web-origin YTC orders
- POS YTC orders on TableCard will no longer show the clock icon
- `table.isWebOrder` is derived from `order_from` via `fromAPI.order` transform (L243), which sets `isWebOrder: normaliseOrderFrom(api.order_from) === 'web'`

### Dependencies
- `table.isWebOrder` — this field must be present on the table object passed to TableCard. Verify that `DashboardPage.jsx` propagates `isWebOrder` from the order data to the table entry. If the table object doesn't have `isWebOrder`, you may need to check how `DashboardPage` builds the grid items and ensure `isWebOrder` is carried through.

### Test cases
1. POS order in YTC (Table View) → should NOT show clock icon
2. Web order in YTC (Table View) → should show clock icon
3. Clicking snooze on web YTC → should still work (mute/unmute)
4. OrderCard snooze behavior unchanged (already web-only)

### Risk note
If `table.isWebOrder` is `undefined` on the table object (because DashboardPage doesn't propagate it), the snooze button will be hidden for ALL YTC orders. Investigate DashboardPage grid-item building if this happens. A safer fallback would be:
```jsx
{isYetToConfirm && table.isWebOrder === true && onToggleSnooze && (
```
This explicitly requires `true`, so `undefined` is treated as "not web" (safe — POS orders don't need snooze).

---

## Fix #3 — `schedule_at` Time Sent as Empty (Midnight `00:00:00`)

### Why
When a user places a scheduled order, the backend received `schedule_at: "2026-06-10 00:00:00"` — the time component is midnight instead of the user's selected time. Investigation found that the CartPanel date picker sets `scheduleAt` with an empty time when the user picks a date before selecting a time.

### File
`/app/frontend/src/components/order-entry/CartPanel.jsx`

### Lines
L1243-1249 (date onChange handler)

### Current Code
```jsx
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = scheduleAt ? scheduleAt.split(' ')[1] : '';
                    if (setScheduleAt) {
                      if (date && time) setScheduleAt(`${date} ${time}`);
                      else if (date) setScheduleAt(`${date} `);
                    }
                  }}
```

### Problem
Line `else if (date) setScheduleAt(`${date} `)` sets `scheduleAt` to `"2026-06-10 "` (date + trailing space, no time). When this reaches `orderTransform.js`, it sends `schedule_at: "2026-06-10 "` to backend, which interprets empty time as `00:00:00`.

### New Code
```jsx
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = scheduleAt ? scheduleAt.split(' ')[1] : '';
                    if (setScheduleAt) {
                      if (date && time) setScheduleAt(`${date} ${time}`);
                      else if (date) setScheduleAt(date);
                    }
                  }}
```

### What changes
- When date is selected but no time yet, stores just the date string (`"2026-06-10"`) instead of `"2026-06-10 "` (with trailing space)
- The Place Order button is already disabled when schedule is incomplete (L1354: `isScheduled && !scheduleAt?.trim()`) — but since `"2026-06-10"` is truthy, we also need to verify the disable guard catches date-without-time

### Additional check needed
Verify the Place Order disable guard at L1354:
```jsx
disabled={... || (isScheduled && !scheduleAt?.trim())}
```
This checks if `scheduleAt` is empty/whitespace. But `"2026-06-10"` (date only, no time) would pass this check. Consider strengthening to:
```jsx
disabled={... || (isScheduled && (!scheduleAt?.trim() || !scheduleAt?.includes(':')))}
```
This ensures both date AND time (contains `:` from `HH:mm:ss`) are present before allowing Place Order.

### Test cases
1. Check "Schedule Order" → pick date → DON'T pick time → Place Order should be disabled
2. Check "Schedule Order" → pick date → pick time (e.g. 16:00) → Place Order enabled
3. Place scheduled order → check payload in Network tab → `schedule_at` should be `"2026-06-10 16:00:00"` (with correct time, not `00:00:00`)
4. Place non-scheduled order → payload should have `scheduled: 0`, `schedule_at: null` (unchanged behavior)

---

## Files Summary

| # | File | Lines | Change | Impact |
|---|---|---|---|---|
| 1 | `OrderCard.jsx` | L871-881 | Add X cancel to POS YTC | ~8 lines added |
| 2 | `TableCard.jsx` | L319 | Add `&& table.isWebOrder` | 1 line changed |
| 3 | `CartPanel.jsx` | L1248 + L1354 | Fix empty time + strengthen disable guard | 2 lines changed |

**Total: ~11 lines across 3 files. Zero new files. Zero new dependencies.**

---

## Related Documents

| Document | Path |
|---|---|
| BUG-122 Intake + Plan | `/app/memory/memory/bugs/BUG_122_POS_YTC_POPUP_INTAKE_AND_PLAN.md` |
| BUG-122 Code Gate | `/app/memory/memory/bugs/BUG_122_CODE_GATE_2026_06_10.md` |
| CR-018 Intake | `/app/memory/memory/crs/intake/CR_018_INTAKE_2026_06_09.md` |
| CR-018 Impact Analysis | `/app/memory/memory/change_requests/CR_018_IMPACT_ANALYSIS.md` |
| CR-018 Implementation Plan | `/app/memory/memory/change_requests/CR_018_IMPLEMENTATION_PLAN.md` |
| CR-018 Code Gate | `/app/memory/memory/change_requests/code_gates/CR_018_SCHEDULE_ORDER_CODE_GATE_2026_06_09.md` |
| CR Registry | `/app/memory/control/CR_REGISTRY.md` |

---

## After Implementation

1. Test all 3 fixes per test cases above
2. Verify no regression on web YTC flow (Accept/Reject unchanged)
3. Verify non-scheduled orders are unaffected (payload: `scheduled: 0`, `schedule_at: null`)
4. Update CR_REGISTRY.md — CR-018 status to CLOSED after owner smoke
5. Update BUG-122 entry if the cancel button fix changes the documented behavior

---

*Handover document — 2026-06-10. 3 FE fixes, 3 files, ~11 lines. Backend fields confirmed working. Ready for implementation + testing.*
