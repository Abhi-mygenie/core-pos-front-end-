# CR-018: Schedule Order — Expanded Scope
## Intake + Impact Analysis + Implementation Plan
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1
**Status:** DONE — All 10 gaps (G1-G10) implemented and verified
**Owner:** Abhi

---

## 1. INTAKE

### 1.1 What is CR-018?
CR-018 adds the ability for POS staff to schedule an order for a future date/time instead of placing it immediately. The original implementation was partial — this CR expands scope to cover gaps discovered during review.

### 1.2 Original Implementation (already in codebase)
- Schedule checkbox + date/time picker in CartPanel (15-min interval slots)
- `isScheduled` / `scheduleAt` state in OrderEntry
- Payload fields: `scheduled: 0/1`, `schedule_at: "YYYY-MM-DD HH:mm:ss"`
- Blue "SCH" badge on OrderCard (expanded card view)
- Dashboard schedule filter in `filteredGridItems` (but no UI trigger)
- ScanOrderPopOut exclusion for scheduled POS orders

### 1.3 Gaps Identified (this CR scope)

| ID | Gap | Severity |
|----|-----|----------|
| CR-018-G1 | Schedule UI hidden for delivery orders — should be visible | High |
| CR-018-G2 | Schedule state force-cleared on delivery switch — should only clear on dineIn | High |
| CR-018-G3 | Schedule UI visible for dine-in (with table) — should be hidden | High |
| CR-018-G4 | Collect Bill button has no schedule validation — can proceed with incomplete schedule | Medium |
| CR-018-G5 | TableCard has zero schedule indication — no badge/icon | High |
| CR-018-G6 | OrderEntry header has no schedule indicator when re-engaging scheduled order | Medium |
| CR-018-G7 | Status View column order wrong — YTC appears after Ready due to JS numeric key sorting | Medium |
| CR-018-G8 | Status filter pills (YTC/Preparing/Ready/Served) in Channel View are disconnected — toggling does nothing | High |
| CR-018-G9 | No "Schedule" filter pill in header — no UI to filter scheduled orders | High |
| CR-018-G10 | TableSection schedule filter broken — checks `status === 'scheduled'` instead of `scheduled === true` (dead code, hygiene) | Low |

### 1.4 Schedule Visibility Rules (updated)

| Order Type | Schedule Available? |
|------------|-------------------|
| Delivery | YES |
| Takeaway | YES |
| Walk-in (no table) | YES |
| Dine-in (with table) | NO |
| Room | NO |
| QSR | NO |

---

## 2. IMPACT ANALYSIS

### 2.1 Files Affected

| File | Changes | Risk |
|------|---------|------|
| `CartPanel.jsx` | G1: visibility condition, G4: Collect Bill disabled guard | Low — isolated JSX conditions |
| `OrderEntry.jsx` | G2: useEffect reset condition, G6: header badge | Low — state logic + JSX |
| `TableCard.jsx` | G5: add SCH badge | Low — additive JSX |
| `DashboardPage.jsx` | G7: statusGroups ordering, G8: re-enable statusMatchesFilter in channel data | Medium — channelData memo is critical path |
| `Header.jsx` | G9: add Schedule pill to allStatusFilters | Low — additive |
| `TableSection.jsx` | G10: fix broken filter check | Low — dead code path |
| `constants.js` | No change — STATUS_COLUMNS order is already correct (YTC first) |

### 2.2 Risk Assessment

**G8 is the highest-risk change.** Re-enabling `statusMatchesFilter` in channel view was intentionally removed with this comment:
> "CR (May-2026) channel-view stability: statusMatchesFilter was dropped from channel-view membership — status-chip selection (activeStatuses) must NOT remove a card from a channel column when its status flips."

The original concern was: if a card's status flips from Preparing to Ready while the user has "Preparing" selected, the card would vanish from the channel column mid-interaction. 

**Mitigation:** This is acceptable UX — it's the expected behavior of a filter. The card doesn't vanish randomly; it moves to a different status, and if that status is filtered out, it disappears. This is how every status-based filter works.

### 2.3 Cross-dependencies
- No backend changes required — all fields (`scheduled`, `schedule_at`) already exist in the API contract
- No new API endpoints needed
- No database schema changes
- OrderCard SCH badge already works — no change needed there

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Already Done (G1-G4)

These fixes have already been applied and compiled clean:

| Gap | File | Change | Status |
|-----|------|--------|--------|
| G1 | `CartPanel.jsx:1215` | `orderType !== 'delivery'` changed to `orderType !== 'dineIn'` | DONE |
| G2 | `OrderEntry.jsx:182` | `orderType === 'delivery'` changed to `orderType === 'dineIn'` | DONE |
| G3 | `CartPanel.jsx:1215` | Same line as G1 — dineIn is now the excluded type | DONE |
| G4 | `CartPanel.jsx:1469` | Added schedule validation to Collect Bill disabled conditions | DONE |

### Phase 2: DONE (G5-G10 verified in code Jun-10-2026)

#### G5 — TableCard schedule badge
**File:** `TableCard.jsx`
**Location:** Header pill area (lines 306-316), same slot as PAID/HOLD badges
**Change:** Add conditional SCH badge when `table.scheduled === true`
**Style:** Match OrderCard badge — `backgroundColor: '#E3F2FD', color: '#1565C0'`, 10px text

#### G6 — OrderEntry header schedule indicator
**File:** `OrderEntry.jsx`
**Location:** Header bar area near order number
**Change:** Add blue "SCH {date}" pill when `isScheduled && scheduleAt`

#### G7 — Status View column order
**File:** `DashboardPage.jsx`
**Location:** `statusData` memo (around line 982-1005)
**Change:** After building `statusGroups` object, convert to ordered array by mapping over `STATUS_COLUMNS` and looking up each in `statusGroups`. Filter out empty ones. This guarantees YTC -> Preparing -> Ready -> Served order regardless of JS numeric key sorting.

**Before:**
```js
return statusGroups; // Object with numeric keys — JS sorts: 1,2,5,7
```

**After:**
```js
// Map STATUS_COLUMNS order -> ordered array
const ordered = {};
STATUS_COLUMNS.forEach(col => {
  if (statusGroups[col.id]) ordered[col.id] = statusGroups[col.id];
});
return ordered;
```
Note: Need to use string keys or explicit ordering to preserve insertion order.

#### G8 — Re-enable status pills in Channel View
**File:** `DashboardPage.jsx`
**Location:** `channelData` memo (lines 837-878)
**Change:** Re-add `statusMatchesFilter` to the `.filter()` chain for each channel's items.

Currently (disconnected):
```js
...allTablesList.filter(t => !t.isRoom && !t.isWalkIn).map(enrichTable).filter(platformMatches)
```

After (re-enabled):
```js
...allTablesList.filter(t => !t.isRoom && !t.isWalkIn).map(enrichTable).filter(statusMatchesFilter).filter(platformMatches)
```

Apply to all 5 channels: dineIn, takeAway, delivery, room, walkIn (if separate).

#### G9 — Add "Schedule" filter pill
**File:** `Header.jsx`
**Location:** `allStatusFilters` array (line 24-33)
**Change:** Add a "Schedule" entry to the array. Unlike other status pills (which are additive toggles on `activeStatuses`), Schedule is a cross-cutting boolean filter. Two options:
- **Option A:** Add as a special pill that sets `tableFilter='schedule'` via `setTableFilter` (already passed as prop but unused)
- **Option B:** Add as a pseudo-status in `activeStatuses` with special handling in `statusMatchesFilter`

Option A is cleaner — Schedule is not a status, it's an overlay.

#### G10 — Fix TableSection schedule filter (hygiene)
**File:** `TableSection.jsx:15`
**Change:**
```js
// Before (broken):
if (tableFilter === 'schedule') return t.status === 'scheduled';
// After (fixed):
if (tableFilter === 'schedule') return t.scheduled === true || t.order?.scheduled === true;
```

### Phase 2 Execution Order
1. G8 first (highest risk — re-enable status filtering in channel view)
2. G9 (add Schedule pill — depends on G8 working)
3. G7 (column order — independent)
4. G5 + G6 (badges — independent, can parallelize)
5. G10 (hygiene — last)

---

## 4. TESTING PLAN

### Smoke Tests
- [ ] Channel View: Toggle YTC pill OFF -> YTC orders disappear from all channel columns
- [ ] Channel View: Toggle Preparing pill OFF -> Preparing orders disappear
- [ ] Channel View: Toggle Schedule pill ON -> Only scheduled orders visible
- [ ] Status View: Columns appear in order: YTC -> Preparing -> Ready -> Served
- [ ] TableCard: Scheduled order shows "SCH" badge
- [ ] OrderEntry: Re-engaging scheduled order shows "SCH" indicator in header
- [ ] CartPanel: Schedule checkbox visible for delivery, takeaway, walk-in
- [ ] CartPanel: Schedule checkbox hidden for dine-in (with table), room, QSR
- [ ] Collect Bill: Disabled when schedule is checked but date/time incomplete

### Regression
- [ ] Channel View: All orders still visible when all status pills are ON
- [ ] Status View: Channel pills still work (Dine toggle hides dine-in orders)
- [ ] Place Order: Schedule payload still sends `scheduled: 1, schedule_at: "..."` correctly
- [ ] Non-scheduled orders: No SCH badge, no behavioral change

---

## 5. ARTIFACT TRACKER

| # | Artifact | Status | Path |
|---|----------|--------|------|
| 1 | Intake | DONE | `memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` (this file, Section 1) |
| 2 | Impact Analysis | DONE | `memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` (this file, Section 2) |
| 3 | Implementation Plan | DONE | `memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` (this file, Section 3) |
| 4 | Code Gate | DONE | Phase 1 (G1-G4) + Phase 2 (G5-G10) all in codebase |
| 5 | Implementation Summary | DONE | Verified in code Jun-10-2026 |
| 6 | QA Report | PENDING — needs login creds for live verification | — |
| 7 | Owner Smoke / Signoff | PENDING | — |
