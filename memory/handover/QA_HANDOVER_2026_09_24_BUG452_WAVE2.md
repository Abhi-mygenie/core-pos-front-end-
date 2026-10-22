# QA HANDOVER — sep_bug_closure Wave 2 · BUG-452 (Gate 5A → Gate 5B)

**Date:** 2026-09-24 · **From:** IMPLEMENTATION (ALPHA v0.7) · **Risk:** HIGH (R5 ×2 — `DashboardPage.jsx` + `OrderEntry.jsx`)
**Owner words:** "ok lock and update docs and decision and gate 4 go" (2026-09-24) · VD-8 = **Option C** (OD-452-06)
**Plan:** `plans/SEP_BUG_CLOSURE_CONSOLIDATED_GATE3_IMPLEMENTATION_PLAN.md` §D · **Combined QA spec:** `handover/QA_SUPPLEMENT_WAVE1_WAVE2_COMBINED_2026_09_24.md`

## 0. What changed (Option C shape)
Both `handleTableClick` (D-1, before `setOrderEntryTable(tableEntry)`) and `handleOrderTypeChange` (D-2, first statement) now contain:
```js
if (orderEntryType !== null) {
  setOrderEntryResetNonce(n => n + 1);
  setInitialShowMerge(false); setInitialShowShift(false); setInitialShowPayment(false); setInitialTransferItem(null);
}
```
→ any type/table switch **while OrderEntry is open** remounts `<OrderEntry key={orderEntryResetNonce}>` (empty unplaced cart, all `useState` reset) **and** forgets how the session was entered, so a dismissed Merge/Shift/Payment modal never re-opens. Dashboard-entry paths are untouched (`orderEntryType === null` at that moment). D-3: `OrderEntry.jsx` L506–508 BUG-334 comment rewritten to REVERSED, branch kept as no-op. D-4: `src/__tests__/pages/DashboardPage.bug452.test.jsx` (structural fallback per plan §D1 — recorded).

## 1. Inherited from Plan (Verification Matrix D) — self-test results
| # | Check | How | Self-Test |
|---|---|---|---|
| VD-1 | Type switch clears | test D-2 block + preprod walk-in 3 items → TakeAway → empty, silent | PASS (structural) · preprod → QA |
| VD-2 | Table switch clears | test D-1 block + preprod T-A items → T-B → empty | PASS (structural) · preprod → QA |
| VD-3 | Old key stays empty | preprod reopen T-A after VD-2 → empty | → QA |
| VD-4 | Occupied A → occupied B | B's placed items from server; reopen A fresh | → QA |
| VD-5 | Placed items never lost | no API call on switch (by construction) | PASS (code) · preprod → QA |
| VD-6 | No remount when closed | test: guard `orderEntryType !== null` precedes bump | PASS |
| VD-7 | Prepaid null path | test: `if (!tableEntry)` return precedes bump | PASS · preprod → QA |
| VD-8 | Modal across in-OE switch — **Option C** | preprod: Merge on table → close modal → switch table via header → **no modal**; cart per VD-2 | → QA |
| VD-9 | R13 walk-in full flow | preprod | → QA |
| VD-10 | PROD-004 stay-on-order | test: `handleCollectBillStayOnOrder` untouched · preprod | PASS · → QA |
| VD-11 | Sidebar Refresh with OE closed | preprod | → QA |
| VD-12 | BUG-334 bookkeeping | `grep -c "BUG-334" OrderEntry.jsx` = 1 (reversed comment) · registry `reversed_by` present | PASS |
| VD-13 | Existing OE tests | `craco test --testPathPattern="bug452\|order-entry"` → 4 suites, **69/69** | PASS |
| VD-14 | Build | `yarn build` exit 0, 0 new warnings (pre-existing exhaustive-deps only) | PASS |
| VD-15 | R25 | no API calls | N/A |

Self-test: **8/8 automated PASS**; 8 preprod checks handed to QA.

## 2. Additional test cases (discovered during implementation)
| # | Test | Steps | Expected |
|---|---|---|---|
| VD-8b | Shift path, Option C | Table card ⋮ → Shift → OrderEntry opens with Shift modal → close modal → header dropdown → other table | No Shift modal on new table; new table's cart correct |
| VD-8c | Payment path, Option C | Card "Collect Bill/Pay" entry (`initialShowPayment`) → close payment panel → switch type via badge | Payment panel does NOT re-open |
| VD-16 | Dashboard Merge entry unchanged | OrderEntry **closed** → table card ⋮ → Merge | Merge modal opens normally (flags set before `handleTableClick`, `orderEntryType` null → no reset) |
| VD-17 | Console clean | Throughout VD-1..VD-8 | 0 new console errors (React key/remount warnings none) |

## 3. Regression tests (R5 ×2 — mandatory)
REG-1..REG-4 from `QA_SUPPLEMENT_WAVE1_WAVE2_COMBINED_2026_09_24.md` §3, plus Wave 1 outstanding VB-4/5/6/8/9 (+ VB-7 visual) per §1 of the same doc. Cross-flow: place walk-in order end-to-end; open occupied table → edit → place.

## 4. Registry Sync Confirmation
```
Registry synced: YES  (registry.json BUG-452 → GATE_5A_IMPLEMENTED, gate 5, sprint_key sep_bug_closure; BUG-334 notes + status_history appended)
Items: BUG-452 (Wave 2) — Wave 1 CR-386 / BUG-453 / BUG-451 already GATE_5A_IMPLEMENTED
Sprint: sep_bug_closure
EXIT GATE: ALL 5 PASSED
  1 registry.json            ✅ script assert PASS
  2 BUG_TRACKER.md           ✅ BUG-452 row → GATE 5A IMPLEMENTED
  3 FILE_OWNERSHIP.md        ✅ 3 rows (DashboardPage, OrderEntry, bug452 test) BUG-452 IMPL 2026-09-24
  4 Code markers             ✅ // BUG-452 ×4 DashboardPage.jsx, ×2 OrderEntry.jsx, test header
  5 Compile                  ✅ yarn build exit 0, webpack dev "compiled with 1 warning" (pre-existing)
```

## 5. Credentials + Environment
- Account alias: `cafe103 owner` (see `/app/memory/test_credentials.md`; password masked `***` here per R20)
- Preview: `REACT_APP_BACKEND_URL` in `/app/frontend/.env` · API preprod `preprod.mygenie.online`
- Useful testids: `login-email`, `login-password`, `login-submit`(verify), `table-card-<id>`, `add-table-btn`, `order-entry-screen`, `menu-item-<id>`, `order-type-badge`, `order-type-<walkIn|takeAway|delivery|dineIn>`, `table-search-input`, `select-table-<id>`, `merge-tables-btn`, `shift-table-btn`
- Known pre-existing (NOT regression): `ScanOrderPopOut.test.jsx` 22/29 red upstream.
