# CR-099 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_099_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** MEDIUM (R5 hotspot OrderCard, but display-only)
**Scope Lock:** 1 file WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `OrderCard.jsx` (top) | Add `useEffect` + `useState` for 1-minute timer | Code inspection: `now` state updates every 60s | NO |
| 2 | `OrderCard.jsx` (helper) | Add `formatElapsed(ms)` helper | Code inspection: returns "Xm" or "Xh Ym" | NO |
| 3 | `OrderCard.jsx:659` | Add prep time for Preparing items | Browser: "Prep: 8m" next to item name | NO |
| 4 | `OrderCard.jsx:659` | Add prep+wait time for Ready items | Browser: "Prep: 8m · Wait: 3m" next to item | NO |
| 5 | `OrderCard.jsx:734` | Add prep+serve time for Served items | Browser: "Prep: 8m · Serve: 3m" next to item | NO |

---

## Edits (Execution Sequence)

### Edit 1: `components/cards/OrderCard.jsx` — Add timer state

**File:** `components/cards/OrderCard.jsx`
**Line:** L1 (imports) — add `useEffect` to existing `useState` import
**Current:**
```js
import { useState } from "react";
```
**New:**
```js
import { useState, useEffect } from "react";
```

**Line:** Inside OrderCard component, after existing state declarations (~L52-60 area)
**New:** Add timer hook:
```js
  // CR-099: 1-minute timer for live elapsed prep/serve time on items
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
```

### Edit 2: Helper function — `formatElapsed`

**Line:** Before the OrderCard component (module level, ~L15 area after imports)
**New:**
```js
// CR-099: Format elapsed milliseconds as "Xm" or "Xh Ym"
const formatElapsed = (ms) => {
  if (!ms || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
```

### Edit 3-4: `OrderCard.jsx:659` area — Preparing + Ready items

**File:** `components/cards/OrderCard.jsx`
**Line:** After L659 (`{item.name} ({item.qty})`) — inside the `<div className="flex-1 min-w-0">` block
**Current:** Only name + qty + variants/addons + note
**New:** Add after the `<span>` containing item name, before the variants div:
```jsx
                    {/* CR-099: Elapsed prep/serve time per item */}
                    {item.createdAt && item.status === 'preparing' && (
                      <span className="ml-1 text-[9px] font-medium" style={{ color: COLORS.primaryOrange }}>
                        Prep: {formatElapsed(now - new Date(item.createdAt).getTime())}
                      </span>
                    )}
                    {item.readyAt && item.status === 'ready' && (
                      <span className="ml-1 text-[9px] font-medium" style={{ color: COLORS.primaryGreen }}>
                        Prep: {formatElapsed(new Date(item.readyAt).getTime() - new Date(item.createdAt).getTime())} · Wait: {formatElapsed(now - new Date(item.readyAt).getTime())}
                      </span>
                    )}
```

### Edit 5: `OrderCard.jsx:734` — Served items

**File:** `components/cards/OrderCard.jsx`
**Line:** After L734 (`{item.name} ({item.qty})`) — inside Served section
**New:** Add a time display after the name span:
```jsx
                  {/* CR-099: Final prep + serve duration for served items */}
                  {item.readyAt && item.createdAt && (
                    <span className="text-[9px] ml-1" style={{ color: COLORS.grayText }}>
                      Prep: {formatElapsed(new Date(item.readyAt).getTime() - new Date(item.createdAt).getTime())}
                      {item.serveAt ? ` · Serve: ${formatElapsed(new Date(item.serveAt).getTime() - new Date(item.readyAt).getTime())}` : ''}
                    </span>
                  )}
```

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Timer granularity | 60s (1 minute) | Matches `"63d"` / `"17d"` timeline format already on cards |
| 2 | Visual format | Plain text, 9px, inline after item name | Minimal, doesn't disrupt existing layout |
| 3 | Colors | Orange for Preparing, Green for Ready, Gray for Served | Matches existing status color scheme |
| 4 | Cancelled items | Skip — no prep time shown | Cancelled items have no meaningful prep duration |
| 5 | Performance | Single `setInterval(60s)` per OrderCard | Acceptable for 10-30 visible orders; re-evaluate if >50 |

---

## Scope Lock

**Files WILL change:**
- `components/cards/OrderCard.jsx` (~25 lines: timer hook + helper + 3 render spots)

**Files WILL NOT touch:**
- orderTransform.js (timestamps already mapped at L137-140)
- orderService.js, CartPanel.jsx, CollectPaymentPanel.jsx, DashboardPage.jsx, OrderTimeline.jsx

## Post-Code Registry Checklist

- [ ] registry.json: CR-099 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add OrderCard.jsx with CR-099
- [ ] Code markers: // CR-099 comment in every modified section

---

**Next:** Gate 4 GO → Implementation
