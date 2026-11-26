# BUG-628 — Implementation Plan (Gate 3)
## Delivery Dispatch Button → "On The Way" (No Rider, Manual Dispatch Only)

**Date:** 2026-10-29
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM
**Scope:** Manual dispatch only (no rider). Rider-assigned flow UNTOUCHED.

---

## Corrected Understanding

After dispatch (no rider), the button becomes **"On The Way"** and stays that way.
- Clicking **"On The Way" button** → `handlePrintBill()` → prints bill → CPP opens
- Clicking **the card itself** → opens order entry → can also print bill from there
- **No further button changes** after bill is printed — "On The Way" stays until payment collected
- After payment → order disappears from screen

---

## File 1: TableCard.jsx

### Edit T1 — L579: Hide Dispatch when already dispatched (no rider)

**Current (L578-579):**
```js
                    {isDelivery ? (
                      !hasRiderAssigned ? (
```

**Replace with:**
```js
                    {isDelivery ? (
                      !hasRiderAssigned && table.order?.riderStatus !== 'dispatched' ? ( // BUG-628: hide Dispatch after manual dispatch
```

### Edit T2 — L669: Same fix in second rendering branch

**Current (L669):**
```js
                    {isDelivery && !hasRiderAssigned && (
```

**Replace with:**
```js
                    {isDelivery && !hasRiderAssigned && table.order?.riderStatus !== 'dispatched' && ( // BUG-628
```

### Edit T3 — L691: Allow "On The Way" to render for manual dispatch + make clickable

**Current (L691-703):**
```js
                    {(!isDelivery || hasRiderAssigned) && (isDelivery && table.order?.riderStatus === 'dispatched' ? (
                      <TextButton
                        backgroundColor="#FFF3E8"
                        textColor={COLORS.primaryOrange}
                        borderColor={COLORS.primaryOrange}
                        testId={`rider-on-the-way-btn-${table.id}`}
                        ariaLabel={`Rider on the way for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
                        disabled
                      >
                        On the way..
                      </TextButton>
```

**Replace with:**
```js
                    {(!isDelivery || hasRiderAssigned || table.order?.riderStatus === 'dispatched') && (isDelivery && table.order?.riderStatus === 'dispatched' ? ( // BUG-628: allow gate for manual dispatch (no rider)
                      hasRiderAssigned ? (
                        // Rider-assigned flow: existing disabled label (UNCHANGED)
                        <TextButton
                          backgroundColor="#FFF3E8"
                          textColor={COLORS.primaryOrange}
                          borderColor={COLORS.primaryOrange}
                          testId={`rider-on-the-way-btn-${table.id}`}
                          ariaLabel={`Rider on the way for table ${table.id}`}
                          fullWidth={false}
                          className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
                          disabled
                        >
                          On the way..
                        </TextButton>
                      ) : (
                        // BUG-628: No rider — clickable "On The Way" → prints bill
                        <TextButton
                          onClick={handlePrintBill}
                          backgroundColor="#FFF3E8"
                          textColor={COLORS.primaryOrange}
                          borderColor={COLORS.primaryOrange}
                          testId={`on-the-way-btn-${table.id}`}
                          ariaLabel={`Order on the way — print bill for table ${table.id}`}
                          fullWidth={false}
                          className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                          disabled={isActionInProgress}
                        >
                          {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : 'On The Way'}
                        </TextButton>
                      )
```

---

## File 2: OrderCard.jsx

### Edit O1 — L1147: Hide Dispatch when already dispatched (no rider)

**Current (L1147):**
```js
                !hasRiderAssigned ? (
```

**Replace with:**
```js
                !hasRiderAssigned && order.riderStatus !== 'dispatched' ? ( // BUG-628: hide Dispatch after manual dispatch
```

### Edit O2 — L1215: Same fix in fOS=5 branch

**Current (L1215):**
```js
            {!isAggregator && fOrderStatus === 5 && isDelivery && !hasRiderAssigned && (
```

**Replace with:**
```js
            {!isAggregator && fOrderStatus === 5 && isDelivery && !hasRiderAssigned && order.riderStatus !== 'dispatched' && ( // BUG-628
```

### Edit O3 — L1237: Allow "On The Way" for manual dispatch + make clickable

**Current (L1237):**
```js
            {!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned) && (
              isDelivery && order.riderStatus === 'dispatched' ? (
                <button
                  data-testid={`rider-on-the-way-btn-${orderId}`}
                  className="min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
                  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                  disabled
                >
                  Rider is on the way
                </button>
```

**Replace with:**
```js
            {!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned || order.riderStatus === 'dispatched') && ( // BUG-628: allow gate for manual dispatch
              isDelivery && order.riderStatus === 'dispatched' ? (
                hasRiderAssigned ? (
                  // Rider-assigned: existing disabled label (UNCHANGED)
                  <button
                    data-testid={`rider-on-the-way-btn-${orderId}`}
                    className="min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
                    style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                    disabled
                  >
                    Rider is on the way
                  </button>
                ) : (
                  // BUG-628: No rider — clickable "On The Way" → prints bill
                  <button
                    data-testid={`on-the-way-btn-${orderId}`}
                    className={`min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isPrintingBill ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                    onClick={handlePrintBill}
                    disabled={isPrintingBill}
                  >
                    {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : 'On The Way'}
                  </button>
                )
```

---

## Execution Sequence

| Step | File | Edit | What |
|---|---|---|---|
| 1 | TableCard.jsx | T1 | L579: add `riderStatus !== 'dispatched'` check |
| 2 | TableCard.jsx | T2 | L669: same check |
| 3 | TableCard.jsx | T3 | L691: open gate + split into rider/no-rider branches |
| 4 | OrderCard.jsx | O1 | L1147: add `riderStatus !== 'dispatched'` check |
| 5 | OrderCard.jsx | O2 | L1215: same check |
| 6 | OrderCard.jsx | O3 | L1237: open gate + split into rider/no-rider branches |

Steps 1-3 and 4-6 can run in parallel (different files).

---

## Verification Matrix

| # | Check | How |
|---|---|---|
| V1 | Dispatch hides after manual dispatch | Place delivery → Dispatch → socket arrives → no Dispatch button |
| V2 | "On The Way" appears (clickable) | Same flow → "On The Way" button visible |
| V3 | Click "On The Way" → prints bill | Click → handlePrintBill fires |
| V4 | Click card → opens order entry | Card click → order entry screen (existing behavior) |
| V5 | Rider-assigned flow unchanged | Assign rider → Waiting/Reassign + disabled "On the way.." |
| V6 | Dine-in Serve unchanged | Dine-in → Ready → Serve → Bill → works |
| V7 | Compile clean | webpack 0 new warnings |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-628 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: TableCard.jsx + OrderCard.jsx
- [ ] Code markers: // BUG-628 on all 6 edits
- [ ] Compile check: 0 new warnings
```

---

```
Planning complete: BUG-628
Stage: Gate 3 — Line-by-line Implementation Plan
Risk: MEDIUM
Files WILL change: TableCard.jsx (3 edits), OrderCard.jsx (3 edits)
Files WILL NOT touch: anything else, any rider-assigned branch
Key behavior: "On The Way" stays after bill print — no further button change
Bill print: via button click OR card click
Rider flow: UNTOUCHED
Next: Gate 4 GO → Implementation
```
