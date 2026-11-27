# BUG-585 — Impact Analysis (Gate 2)
## Search partial results hard-capped at 5

**ID:** BUG-585  **Stage:** Gate 2  **Date:** 2026-10-17  **Risk:** LOW  **Priority:** P1

---

## Code Reality: NONE
No fix exists. `grep -rn "BUG-585"` → 0 matches in `src/`.

---

## Conflict Pre-Check

| Open item | Touches DashboardPage.jsx? | Conflict? |
|---|---|---|
| BUG-452 | YES — different function | NO |
| BUG-453 | YES — different function | NO |
| BUG-576 | YES — L1259 search block | NO — different line (L103 vs L1259) |
| BUG-584 | YES — L1231, L1258 | NO — different lines |
| BUG-586 | YES — L1259, profileTransform | NO — different lines |

**No conflict.** BUG-585 touches only L103 (`searchItems` return statement) — no other open item touches this line. Can be batched with BUG-584/576/586 in the same session.

---

## Data Flow Trace

```
searchItems(items, query, getFields):
  → loops all items, classifies each as exact or partial
  → return { exact, partial: partial.slice(0, 5) }
                                        ↑
                    Cap: only first 5 partials survive, rest silently dropped
                    Order: API insertion order — no relevance sorting
                    Effect: short labels like "2" displaced by longer ones like "20","21"
```

---

## Exact Edit Required

### Edit E-1 — Remove slice cap (DashboardPage.jsx L103)
```javascript
// BEFORE (L103):
return { exact, partial: partial.slice(0, 5) };

// AFTER:
return { exact, partial }; // BUG-585: show all partial matches, no cap
```

**1 line. That is the entire fix.**

---

## Downstream impact
`searchResults` is consumed by Header.jsx dropdown and by `matchingTableIds / matchingRoomIds / matchingDeliveryIds / matchingTakeAwayIds`. All consumers loop over the arrays — no hard-coded size assumption anywhere. Removing the cap is safe.

---

## Verification Matrix

| # | Test | How |
|---|---|---|
| V1 | Type "2" → all tables with "2" in name visible (2, 12, 20, 21, 22…) | Browser: any restaurant with many tables |
| V2 | Type "10" → 10, 101, 102, 103, 104, 105… all visible | Browser |
| V3 | Exact match (BUG-584, once fixed) appears at top above all partials | Browser |
| V4 | Delivery/Takeaway search results still shown correctly | Browser |

---

## Scope Lock
**WILL change:** `src/pages/DashboardPage.jsx` — L103 only (1 word removed)
**WILL NOT touch:** Header.jsx · profileTransform · any other file

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-585 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + BUG-585 + date
- [ ] Code marker: // BUG-585 on L103
- [ ] Compile: 0 new warnings
```
*Gate 2 complete 2026-10-17. Fast Lane eligible — awaiting owner FAST LANE APPROVED.*
