# SEARCH BUGS BATCH — Implementation Plan (Gate 3)
## BUG-576 · BUG-584 · BUG-585 · BUG-586

**Stage:** Gate 3 — Implementation Plan
**Date:** 2026-10-17
**Batch rationale:** BUG-576, BUG-584 and BUG-586 converge on the same 4 lines of `DashboardPage.jsx` (rooms search block L1257-1261). Separate sessions would cause edit conflicts. BUG-585 is independent but co-located — implementing all four in one session eliminates re-entry risk.

---

## Pre-Implementation Entry Verification (MANDATORY before any code)

Implementation agent MUST confirm each starting state matches before writing a single line:

| Edit | File | Line | Expected current text |
|---|---|---|---|
| E-1 | DashboardPage.jsx | 103 | `return { exact, partial: partial.slice(0, 5) };` |
| E-2 | DashboardPage.jsx | 1232 | `id: item.id,` (inside tables searchItems call) |
| E-3 | DashboardPage.jsx | 1233 | `all: [opts.includes('table no') && (item.label \|\| item.id), opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean) // BUG-332` |
| E-4 | DashboardPage.jsx | 1258 | `id: item.id,` (inside rooms searchItems call) |
| E-5 | DashboardPage.jsx | 1259 | `all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName \|\| item.guest \|\| '')].filter(Boolean) // BUG-332` |
| E-6 | profileTransform.js | 236 | `searchOptions: api.search_by \|\| ['order id', 'table no', 'user id'],` |

If ANY line differs from expected → **STOP. Return to Planning agent.**

---

## Execution Order

```
1. E-1 (BUG-585) — independent, no conflict risk
2. E-2 + E-3 (BUG-584 tables) — tables block
3. E-4 + E-5 (BUG-576 + BUG-584 + BUG-586 rooms) — combined rooms block
4. E-6 (BUG-586 profileTransform) — separate file
5. Compile check after each file
```

---

## Edit E-1 — Remove partial results cap
**File:** `src/pages/DashboardPage.jsx`
**Line:** 103
**Bug:** BUG-585

```
FIND (exact):
  return { exact, partial: partial.slice(0, 5) };

REPLACE WITH:
  return { exact, partial }; // BUG-585: removed 5-result cap — show all partial matches
```

**Verification:** After edit, line 103 reads `return { exact, partial }; // BUG-585`

---

## Edit E-2 — Tables exact match: DB ID → display label
**File:** `src/pages/DashboardPage.jsx`
**Line:** 1232
**Bug:** BUG-584

```
FIND (exact):
        id: item.id,
        all: [opts.includes('table no') && (item.label || item.id), opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean) // BUG-332

REPLACE WITH:
        id: item.label, // BUG-584: exact match on display label, DB ID never used in search
        all: [opts.includes('table no') && item.label, opts.includes('user id') && item.customer, opts.includes('phone no') && item.phone].filter(Boolean) // BUG-332 BUG-584
```

**What changed:**
- `id: item.id` → `id: item.label` — typing "2" now exact-matches Table 2
- `(item.label || item.id)` → `item.label` — DB ID fallback removed per owner directive

**Verification:** Line 1232 reads `id: item.label,` with BUG-584 comment.

---

## Edit E-3 — Rooms block: combined fix for BUG-576 + BUG-584 + BUG-586
**File:** `src/pages/DashboardPage.jsx`
**Lines:** 1257-1261
**Bugs:** BUG-576 (label not DB ID in all[]) + BUG-584 (exact match on label) + BUG-586 (add phone)

```
FIND (exact, including all whitespace):
      results.rooms = searchItems(enrichedRooms, query, item => ({
        id: item.id,
        all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean) // BUG-332
      }));

REPLACE WITH:
      results.rooms = searchItems(enrichedRooms, query, item => ({
        id: item.label, // BUG-584 BUG-576: exact match on room display label, DB ID never used
        all: [
          opts.includes('table no') && item.label,                          // BUG-576 BUG-584: room number e.g. "109"
          opts.includes('user id') && (item.guestName || item.guest || ''), // BUG-332: guest name
          opts.includes('phone no') && (item.order?.phone || ''),           // BUG-586: guest phone via order
        ].filter(Boolean)
      }));
```

**What changed:**
- `id: item.id` → `id: item.label` — typing "109" now exact-matches Room 109
- `item.id` in all[] → `item.label` — room display number used, not DB ID (BUG-576 + BUG-584)
- Added `item.order?.phone` — guest phone now searchable for rooms (BUG-586)
- Note: `item.order?.phone` uses optional chaining — available rooms have no order, returns `''`, safely filtered

**Verification:** Lines 1257-1264 match the REPLACE WITH block exactly.

---

## Edit E-4 — Add 'phone no' to default searchOptions
**File:** `src/api/transforms/profileTransform.js`
**Line:** 236
**Bug:** BUG-586

```
FIND (exact):
      searchOptions: api.search_by || ['order id', 'table no', 'user id'],

REPLACE WITH:
      searchOptions: api.search_by || ['order id', 'table no', 'phone no', 'user id'], // BUG-586: phone search on by default
```

**What changed:** Added `'phone no'` to the default array — phone search is now active by default for all restaurants without a custom `search_by` config.

**Verification:** Line 236 contains `'phone no'` in the default array.

---

## Compile Checkpoint (after all 4 edits)

```bash
tail -5 /var/log/supervisor/frontend.out.log
# Expected: "webpack compiled with 1 warning"
# The pre-existing SettlementReportMockup.jsx warning is acceptable
# ANY new warning = STOP and fix before continuing
```

---

## Verification Matrix (inherits to QA handover)

| # | Bug | Test | Steps | Expected |
|---|---|---|---|---|
| V1 | BUG-585 | All partial matches shown | Type "10" → scroll dropdown | 10, 101, 102, 103, 104, 105… ALL visible, no 5-cap |
| V2 | BUG-584 | Table exact match works | Type "2" exactly | Table 2 appears under **Exact Match** green header |
| V3 | BUG-584 | Room exact match works | Type "109" exactly | Room 109 appears under **Exact Match** green header |
| V4 | BUG-576 | Room found by display number | Type "109" → partial | Room 109 appears in dropdown |
| V5 | BUG-586 | Phone search on by default | Type guest phone number | Table/room result appears |
| V6 | BUG-586 | Room guest phone searchable | Type room guest phone | Room result appears |
| V7 | Regression | Customer name still works | Type partial guest name | Table and room results still appear |
| V8 | Regression | Delivery/Takeaway unaffected | Type order number | Delivery results unaffected |
| V9 | Regression | Available room search | Type room number of available room | Available room appears (no crash) |

---

## Regression Checklist (R5 hotspot — DashboardPage.jsx)

- [ ] Dashboard loads without blank screen after changes
- [ ] Table search (dine-in) returns correct tables
- [ ] Room search returns correct rooms  
- [ ] Delivery search returns correct orders
- [ ] Takeaway search returns correct orders
- [ ] Selecting a search result navigates correctly (handleSearchSelect fires)
- [ ] Clearing search (×) restores full dashboard view
- [ ] Dashboard with no active orders — search returns empty gracefully

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` — L103, L1232-1233, L1257-1264 (4 edits)
- `src/api/transforms/profileTransform.js` — L236 (1 edit)

**Files WILL NOT touch:**
- `Header.jsx` (search dropdown renderer — no change needed)
- `searchItems` function logic itself — no structural change
- `tableTransform.js`, `roomListTransform.js` — not involved
- Any service, context, or API file
- Any financial / order / billing logic

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-576, BUG-584, BUG-585, BUG-586 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: all 4 rows updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + profileTransform.js rows updated with all 4 IDs + date
- [ ] Code markers: // BUG-XXX comment on every edited line
- [ ] Compile check: webpack compiled with 1 warning (pre-existing), 0 new
```

---

*Gate 3 complete — 2026-10-17. Awaiting Gate 4 GO from owner.*
