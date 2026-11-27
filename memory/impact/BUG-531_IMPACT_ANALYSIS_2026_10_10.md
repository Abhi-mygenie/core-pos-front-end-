# BUG-531 — Impact Analysis (Gate 2)

## InHouse/Departures Balance Column Shows Rack Rate After Snapshot Refresh

**Date:** 2026-10-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — fix not applied
**Conflict Pre-check:** NONE
**Risk:** HIGH (financial display — incorrect balance drives cashier decisions at checkout)

---

## Code Reality Check

```bash
grep -n "setBalances(undefined)" /app/frontend/src/pages/pms/FrontDeskWorkstationPage.jsx
# → L36: let live = true; setBalances(undefined);  ← confirmed present, not fixed
```

No `BUG-531` marker anywhere in codebase. Fix not applied.

---

## Conflict Pre-check

Last modifier of `FrontDeskWorkstationPage.jsx`: BUG-515 IMPL 2026-10-08 (L102 +roomGstSlabs).  
`useRowBalances` hook at L31-41: not touched by BUG-515, BUG-527, or any other recent item.  
**No conflict.**

---

## Data Flow Trace

### The three `balances` states (by design — `DeparturesPanel.jsx:L24`):

```
balanceOf(balances) = (r) =>
  balances === undefined  → undefined   → GuestTable renders "…" (loading spinner)
  balances === null       → r.charge?.balance_due  → rack rate ₹1,650 (LR snapshot, pre-discount)
  balances === {...}      → balances[row.orderId]?.display ?? r.charge?.balance_due → enriched ₹600
```

### The trigger sequence:

```
1. snap.loadedAt changes (every snapshot refresh, ~every N seconds)
2. useRowBalances useEffect fires (dependency: [loadedAt, inHouseCount])
3. L36: let live = true; setBalances(undefined)   ← RESET — balance shows "…"
4. getRowBalances(opts) fires (Step 3 folio API call)
5a. SUCCESS → setBalances(b) → enriched ₹600 shown ✓
5b. FAILURE → setBalances(null) → balanceOf(null) → charge.balance_due = ₹1,650 ✗
```

### Why getRowBalances fails (Step 3 folio call):

`getRowBalances` (in `frontDeskService.js`) calls `getInHouseGuests()` which calls multiple endpoints including the folio balance endpoint. In some environments / under load, this call fails or times out → `null` path → rack rate shown. The `setBalances(undefined)` reset also causes transient "…" on every healthy refresh (flicker).

### Balance column rendering path:

```
FrontDeskWorkstationPage → balances prop
  ↓
InHousePanel.jsx:L16   → amountOf: balanceOf(balances)
DeparturesPanel.jsx:L41 → amountOf: balanceOf(balances)
  ↓
GuestTable.jsx → commonColumns amountOf(r) → rendered as balance cell
  ↓
GuestTable.jsx:L133-134 (RowExpansionStub):
  r.effectiveBalanceDue ?? r.charge?.balance_due  (enriched path)
  or r.charge?.balance_due (fallback when no enrichment)
```

---

## Affected Files

| File | Lines | R5? | Change |
|------|-------|-----|--------|
| `src/pages/pms/FrontDeskWorkstationPage.jsx` | L36 (remove) + L37 (modify) | **NO** | Remove `setBalances(undefined)`; change catch behavior |

**Files WILL NOT touch:**
- `DeparturesPanel.jsx` — `balanceOf` logic unchanged (null path still used for first-load failure)
- `InHousePanel.jsx` — no change
- `frontDeskService.js` — no change
- `GuestTable.jsx` — no change

---

## Fix Options

### Option A — 1 line (remove reset only)

```js
// BEFORE:
let live = true; setBalances(undefined);
getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });

// AFTER:
let live = true;
getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });
```

- **Fixes:** "…" flicker on healthy refreshes
- **Does NOT fix:** rack rate shown when getRowBalances fails → still sets `null` → ₹1,650
- **When safe:** if getRowBalances only fails on first boot (unlikely edge case)

### Option B — 2 lines (remove reset + no-op catch on subsequent refreshes) ← RECOMMENDED

```js
// BEFORE:
let live = true; setBalances(undefined);
getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });

// AFTER:
let live = true;
getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(prev => prev === undefined ? null : prev); });
```

- **Fixes:** "…" flicker AND preserves previous correct balance on transient failures
- **Behavior:**
  - First load failure (balances still `undefined`): → falls to `null` → rack rate shown (safe fallback)
  - Subsequent failures (balances has prior enriched value): → keeps ₹600 (no regression)
- **Risk:** stale balance shown if guest pays room between refreshes and all subsequent fetches fail. Acceptable — the alternative (rack rate) is worse and misleading.

---

## OD-531-01 — OPEN: Option A (1 line) vs Option B (2 lines)?

| | Option A | Option B |
|---|---|---|
| Lines changed | 1 | 2 |
| Fixes flicker | YES | YES |
| Fixes rack rate on failure | NO | YES (subsequent failures) |
| Fast Lane eligible | YES | YES (both ≤10 lines, 1 file, NOT R5) |
| **Recommendation** | | **Option B** |

**Owner: approve Option A or Option B?**

---

## Risk Classification

| Dimension | Assessment |
|---|---|
| Risk | **HIGH** — incorrect balance (₹1,650 vs ₹600) could cause cashier to over-charge guest at checkout |
| Financial payload? | NO — display only, no API payload change |
| R5? | NO |
| Fast Lane eligible | YES (both options) — owner must approve |

---

## Verification Matrix

| # | Test | How | Auto? |
|---|------|-----|:---:|
| V1 | Balance column shows ₹600 (enriched) after initial load | Browser: bonk booking → InHouse tab | NO |
| V2 | No "…" flicker between snapshot refreshes | Browser: wait 30s, observe column | NO |
| V3 | Simulated fetch failure: balance stays ₹600 (Option B) | Code: mock getRowBalances to reject, observe | NO |
| V4 | InHousePanel and DeparturesPanel both correct | Browser: check both tabs | NO |
| V5 | Regression: non-discounted rooms still show correct balance | Browser: any non-discounted room | NO |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-531 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: FrontDeskWorkstationPage.jsx + date + BUG-531
- [ ] Code marker: // BUG-531 comment in modified line(s)
- [ ] webpack: 0 new warnings
```
