# BUG-584 — Impact Analysis (Gate 2)
## Search exact match fires on DB ID — should use display label

**ID:** BUG-584  **Stage:** Gate 2  **Date:** 2026-10-17  **Risk:** MEDIUM  **Priority:** P1

---

## Code Reality: NONE
No fix code exists. `grep -rn "BUG-584"` → 0 matches in `src/`. Proceeding with full plan.

---

## Conflict Pre-Check

| Open item | Touches DashboardPage? | Lines | Conflict? |
|---|---|---|---|
| BUG-452 | YES | handleOrderTypeChange / handleTableClick | NO — different function |
| BUG-453 | YES | toggleSnooze | NO — different function |
| **BUG-576** | YES | L1259 rooms `all[]` | **OVERLAP — both fix rooms search block** |
| BUG-585 | YES | L103 searchItems return | NO — different line |
| BUG-586 | YES | L1259 rooms `all[]` | **OVERLAP — all three touch rooms search block** |

**Resolution:** BUG-576, BUG-584, BUG-585, BUG-586 **MUST be implemented in a single batch session** to avoid repeated edits to the same lines. Recommended execution order within batch: BUG-585 first (independent), then BUG-584 + BUG-576 + BUG-586 together on the search block.

---

## Data Flow Trace

```
User types "2" in search bar
  → searchQuery = "2"
  → searchResults useMemo fires
  → tables bucket: searchItems(allSearchableTables, "2", item => ({
        id: item.id,          // ← "4563" (DB primary key)
        all: [item.label || item.id, customer, phone]
    }))
  → searchItems: idMatch = "4563".toLowerCase() = "4563"
  → "4563" === "2" → FALSE → no exact match
  → falls to partial: "2" ∈ "2".toLowerCase() → TRUE
  → BUT also: "2" ∈ "12", "20", "21", "22", "32" → all partial
  → partial.slice(0, 5) → Table 2 may be position 6+ → DROPPED
```

---

## Exact Edits Required

### Edit E-1 — Tables getFields `id` field (DashboardPage.jsx L1231)
```javascript
// BEFORE:
results.tables = searchItems(allSearchableTables, query, item => ({
  id: item.id,
  all: [opts.includes('table no') && (item.label || item.id), ...]

// AFTER:
results.tables = searchItems(allSearchableTables, query, item => ({
  id: item.label,              // BUG-584: exact match on display label, not DB ID
  all: [opts.includes('table no') && item.label, ...]  // BUG-584: remove || item.id fallback
```
**Owner directive:** DB ID never used in search — remove `|| item.id` fallback from `all[]` too.

### Edit E-2 — Rooms getFields `id` field (DashboardPage.jsx L1258)
```javascript
// BEFORE:
results.rooms = searchItems(enrichedRooms, query, item => ({
  id: item.id,
  all: [opts.includes('table no') && item.id, ...]

// AFTER:
results.rooms = searchItems(enrichedRooms, query, item => ({
  id: item.label,             // BUG-584 + BUG-576: exact match on room display label
  all: [opts.includes('table no') && item.label, ...]  // BUG-584 + BUG-576: label not DB ID
```
**Note:** This edit absorbs BUG-576's fix. BUG-576 IA update needed — `|| item.id` fallback removed per owner directive.

### No change: Delivery / TakeAway
`id: String(item.orderId)` kept — owner confirmed order ID search works for delivery/takeaway. Exact match on orderId (internal order key) is acceptable for these buckets.

---

## Verification Matrix

| # | Test | How |
|---|---|---|
| V1 | Type "2" → Table 2 appears in Exact Match (green header) | Browser: palmhouse or cafe103 |
| V2 | Type "109" → Room 109 appears in Exact Match | Browser: palmhouse |
| V3 | Type "C-10" → Table C-10 Exact Match | Browser |
| V4 | Partial still works: type "10" → 10, 101, 102, 103 all appear under partial | Browser |
| V5 | Delivery/Takeaway search unaffected | Browser |

---

## Scope Lock
**WILL change:** `src/pages/DashboardPage.jsx` (L1231-1233 tables + L1258-1259 rooms)
**WILL NOT touch:** `searchItems` function body · profileTransform · Header.jsx · any other file

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-584 → IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + BUG-584 + date
- [ ] Code marker: // BUG-584 on each edited line
- [ ] Compile: 0 new warnings
```
*Gate 2 complete 2026-10-17. Ready Gate 3 on owner GO.*
