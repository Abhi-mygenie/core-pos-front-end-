# SESSION HANDOVER — 2026-10-10 (PLANNING Gate 3: BUG-530, BUG-531, BUG-532)

**Date:** 2026-10-10
**Role:** PLANNING — Gate 3 (Implementation Plans)
**Items:** BUG-530, BUG-531, BUG-532
**All three: GATE_3_PLAN_COMPLETE**

---

## 1. WHAT WAS DONE THIS SESSION

Gate 3 Implementation Plans written for BUG-530, BUG-531, BUG-532. All anchors verified at HEAD before writing.

---

## 2. PLAN SUMMARIES

### BUG-530 — CPP split auto-fill (Gate 3 COMPLETE)
- **File:** `CollectPaymentPanel.jsx` (R5)
- **Edit E1:** One `search_replace` block — insert `splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal` const + replace `effectiveTotal` with `splitCap` in both `maxForThisRow` (L2885) and `remaining` (L2895)
- **Net change:** +1 line (const) + 2 substitutions = 3 changed lines total
- **Pattern:** mirrors BUG-527 E3 split threshold
- **Marker:** `// BUG-530` on the `splitCap` line
- **Plan:** `plans/BUG-530_IMPLEMENTATION_PLAN_2026_10_10.md`

### BUG-531 — Balance rack rate after refresh (Gate 3 COMPLETE)
- **File:** `FrontDeskWorkstationPage.jsx` (NOT R5)
- **Edit E1+E2 (one `search_replace`):**
  - L36: `let live = true; setBalances(undefined);` → `let live = true;`
  - L37: catch `setBalances(null)` → `setBalances(prev => prev === undefined ? null : prev)` + `// BUG-531` comment
- **Net change:** 2 lines, 1 file, NOT R5
- **Fast Lane:** eligible (owner to confirm)
- **Plan:** `plans/BUG-531_IMPLEMENTATION_PLAN_2026_10_10.md`

### BUG-532 — Dashboard tile SC gap (Gate 3 COMPLETE)
- **File:** `DashboardPage.jsx` (R5)
- **Edit E1:** L49 `const food = Number(order?.amount) || 0;` → `const food = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0); // BUG-532`
- **Net change:** 1 line, R5
- **Plan:** `plans/BUG-532_IMPLEMENTATION_PLAN_2026_10_10.md`

---

## 3. GATE 4 GO PATHS

### Path 1 — Bundle: BUG-529 + BUG-531 + BUG-532 (recommended first)
Files: `frontDeskService.js` (1 line) + `FrontDeskWorkstationPage.jsx` (2 lines) + `DashboardPage.jsx` (1 line)
None of these three conflict. Two are NOT R5 (529, 531); one is R5 (532, 1 line only).
Owner says: **"GO BUG-529 + BUG-531 + BUG-532"** → IMPLEMENTATION role

### Path 2 — BUG-530 separately (R5, onBlur block)
File: `CollectPaymentPanel.jsx` (R5, 3 lines)
Owner says: **"GO BUG-530"** → IMPLEMENTATION role (can do same or separate session)

---

## 4. VERIFICATION MATRICES (for QA handover)

### BUG-531
| V# | Test | How |
|---|------|-----|
| V1 | Balance ₹600 on initial load | Browser: bonk InHouse tab |
| V2 | No "…" flicker on refresh | Browser: wait 30s |
| V3 | Failure: stale ₹600 preserved | Mock getRowBalances to reject |
| V4 | DeparturesPanel also correct | Browser: Departures tab |
| V5 | Regression: non-discounted room | Browser |

### BUG-530
| V# | Test | How |
|---|------|-----|
| V1 | Cash=190 blur → UPI=₹1 | Browser: bonk CPP split |
| V2 | Cash=200 → clamps to 191 | Browser |
| V3 | Non-room: unchanged | Browser: dine-in split |
| V4 | BUG-527 E3 L3318 unchanged | Code review |
| V5 | webpack 0 warnings | Terminal |

### BUG-532
| V# | Test | How |
|---|------|-----|
| V1 | Room tile ₹848 (was ₹827) | Browser: bonk Dashboard |
| V2 | Tile matches CPP | Browser: compare |
| V3 | Non-room tiles unchanged | Browser |
| V4 | SC=0 restaurant: no change | Code/Browser |
| V5 | webpack 0 warnings | Terminal |

---

## 5. ARTIFACTS

| Type | Path |
|---|---|
| Plan | `plans/BUG-530_IMPLEMENTATION_PLAN_2026_10_10.md` |
| Plan | `plans/BUG-531_IMPLEMENTATION_PLAN_2026_10_10.md` |
| Plan | `plans/BUG-532_IMPLEMENTATION_PLAN_2026_10_10.md` |
| Registry | `control/registry.json` — BUG-530/531/532 → GATE_3_PLAN_COMPLETE |

---

## 6. NEXT AGENT BOOT

```
Last session (2026-10-10 PLANNING Gate 3):
  BUG-530 Gate 3 COMPLETE — CPP onBlur splitCap, R5, 3 lines
  BUG-531 Gate 3 COMPLETE — balance reset fix, NOT R5, 2 lines, Fast Lane eligible
  BUG-532 Gate 3 COMPLETE — dashboard SC gap, R5, 1 line, NOT backend-blocked

Full bundle ready:
  BUG-529 (frontDeskService.js L174, 1 line, NOT R5) — Gate 3 COMPLETE since last session
  BUG-531 (FrontDeskWorkstationPage.jsx L36-37, 2 lines, NOT R5)
  BUG-532 (DashboardPage.jsx L49, 1 line, R5)
  BUG-530 (CollectPaymentPanel.jsx onBlur, 3 lines, R5) — separate GO

Owner choices:
  a) "GO BUG-529 BUG-531 BUG-532" → IMPLEMENTATION (3 files, 4 lines total)
  b) "GO BUG-530" → IMPLEMENTATION (R5, onBlur, 3 lines) — same or separate session
  c) Both in one session → IMPLEMENTATION (4 files, 7 lines)
```
