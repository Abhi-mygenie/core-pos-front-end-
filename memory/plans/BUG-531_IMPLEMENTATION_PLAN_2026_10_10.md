# BUG-531 — Implementation Plan (Gate 3)

## InHouse/Departures Balance Shows Rack Rate After Snapshot Refresh

**Date:** 2026-10-10
**Stage:** Gate 3 — Implementation Plan
**Based on:** `impact/BUG-531_IMPACT_ANALYSIS_2026_10_10.md`
**Risk:** HIGH / NOT R5
**OD-531-01 applied:** Option B (2 lines — fixes both flicker AND failure path)

---

## Scope Lock

**Files WILL change:**
- `src/pages/pms/FrontDeskWorkstationPage.jsx` — 2 lines (L36 + L37)

**Files WILL NOT touch:**
- `DeparturesPanel.jsx` — `balanceOf` logic unchanged
- `InHousePanel.jsx` — no change
- `frontDeskService.js` — no change
- `GuestTable.jsx` — no change
- Any test file

---

## Entry Verification (Implementation agent must run before coding)

```
Plan says: L36 currently reads:
  let live = true; setBalances(undefined);

Plan says: L37 currently reads:
  getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });

→ View FrontDeskWorkstationPage.jsx lines 34-40. Confirm both match exactly.
→ If mismatch → STOP. Return to Planning agent. Do not proceed.
```

---

## Edits

### E1 — `FrontDeskWorkstationPage.jsx:L36` — Remove `setBalances(undefined)` eager reset

**Current (L36):**
```js
    let live = true; setBalances(undefined);
```

**New (L36):**
```js
    let live = true;
```

**Rationale:** Removing the eager reset prevents the balance column from flashing to "…" on every snapshot refresh. The previous enriched value (e.g. ₹600) stays visible during the new fetch.

---

### E2 — `FrontDeskWorkstationPage.jsx:L37` — Change catch to functional update (Option B)

**Current (L37):**
```js
    getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });
```

**New (L37):**
```js
    getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(prev => prev === undefined ? null : prev); }); // BUG-531: keep stale enriched value on transient failure; only fall to null (rack rate) on first-load failure
```

**Rationale:**
- First-load failure (`prev === undefined`): falls to `null` → `balanceOf(null)` → `charge.balance_due` shown (safe ledger fallback, same as before)
- Subsequent failure (`prev` has enriched data): keeps stale ₹600 rather than resetting to rack rate ₹1,650

---

## Combined edit as one `search_replace` block

```
OLD:
    let live = true; setBalances(undefined);
    getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });

NEW:
    let live = true;
    getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(prev => prev === undefined ? null : prev); }); // BUG-531: keep stale enriched value on transient failure; only fall to null (rack rate) on first-load failure
```

---

## Verification Matrix

| # | Edit | Verification | How | Auto? |
|---|------|-------------|-----|:---:|
| V1 | E1+E2 | Balance column shows ₹600 on initial load | Browser: bonk → InHouse tab | NO |
| V2 | E1 | No "…" flicker between snapshot refreshes (wait 30s) | Browser: observe | NO |
| V3 | E2 | Simulated failure: balance stays ₹600, not ₹1,650 | Code: mock getRowBalances to reject → re-render | NO |
| V4 | E1+E2 | DeparturesPanel balance also correct | Browser: Departures tab | NO |
| V5 | regression | Non-discounted room shows correct balance | Browser: any room without discount | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-531 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row status → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: FrontDeskWorkstationPage.jsx entry — BUG-531 + 2026-10-10
- [ ] Code marker: // BUG-531 present on E2 line ✓ (in the new line above)
- [ ] webpack compile: 0 new warnings
```

---

## Execution Notes

- Can be implemented in the same session as BUG-529 (frontDeskService.js) and BUG-532 (DashboardPage.jsx)
- Fast Lane eligible if owner approves (2 lines, 1 file, NOT R5, not financial payload)
- No test file changes needed — this is a hook behavior fix, UI-verifiable
