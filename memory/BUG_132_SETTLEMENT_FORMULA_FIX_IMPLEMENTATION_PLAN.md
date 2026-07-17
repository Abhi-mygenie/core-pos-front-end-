# BUG-132 — Settlement Formula Fix: Implementation Plan

**Created:** 2026-06-12
**Gate:** 3 (Implementation Plan)
**Item:** BUG-132 (Settlement business logic broken)
**File:** `components/panels/SettlementPanel.jsx` (497 lines) — single file, all fixes
**Approach:** 5 micro-phases, each independently verifiable

---

## SCOPE LOCK

### Files I WILL change
| File | Change Type |
|------|-------------|
| `components/panels/SettlementPanel.jsx` | Formula fixes + add Total Funds KPI card |

### Files I will NOT touch
| File | Reason |
|------|--------|
| `api/transforms/settlementTransform.js` | Transform is a clean passthrough — maps API fields correctly. No formula issues there. |
| `api/services/settlementService.js` | API calls are correct |
| `pages/reports-module/SettlementReportMockup.jsx` | Different surface (Insights), not in scope |

---

## MICRO-PHASE PLAN (5 phases, verify after each)

### Micro-Phase A: Add "Total Funds" KPI card
**What:** Add 6th KPI card between "Cash Collected" and "Settled".
**Why:** Owner confirmed 6 cards needed. Total Funds = Opening + Cash Collected. Currently invisible.

**Edit A1 — Insert Total Funds KPI card (after L198, before L199)**

After the Cash Collected card (L197-198) and before the Settled card (L199), insert:
```jsx
            <KpiCard icon={Wallet} label="Total Funds" value={totals.totalFunds} color={COLORS.darkText} sub={`Opening ${fmt(totals.openingBalance)} + Cash ${fmt(totals.cashCollected)}`} />
```

**Verify:** Open Settlement panel → see 6 KPI cards: Opening Balance, Cash Collected, **Total Funds**, Settled, Remaining, Pilferage. Total Funds should = Opening Balance + Cash Collected.

**Needs import?** No — `Wallet` icon already imported (L4). But it's currently used for the "Remaining" card. Need a different icon for Total Funds to avoid visual confusion.

**Better icon choice:** Use `Banknote` for Opening (already), `TrendingUp` for Cash Collected (already), use `CreditCard` for Total Funds (already imported L5), keep `ArrowDownToLine` for Settled, `Wallet` for Remaining, `AlertTriangle` for Pilferage.

**Final Edit A1:**
```jsx
            <KpiCard icon={CreditCard} label="Total Funds" value={totals.totalFunds} color={COLORS.darkText} sub={`Opening ${fmt(totals.openingBalance)} + Cash ${fmt(totals.cashCollected)}`} />
```

---

### Micro-Phase B: Fix per-waiter "Expected" formula
**What:** Remove pilferage from Expected calculation.
**Why:** Expected = "how much cash should be in the drawer" = Total Funds − Settled. Pilferage is a RESULT (Expected − Actual), not an input. Subtracting pilferage from Expected creates circular logic and produces wrong numbers.

**Edit B1 — Fix per-waiter Expected (L249)**
**Current:** `const expected = w.totalFunds - w.settled - w.pilferage;`
**New:** `const expected = w.totalFunds - w.settled;`

**Edit B2 — Fix TOTAL row Expected (L354)**
**Current:** `{fmt((totals.totalFunds || 0) - (totals.settled || 0) - (totals.pilferage || 0))}`
**New:** `{fmt((totals.totalFunds || 0) - (totals.settled || 0))}`

**Verify:** Open Settlement panel with a date that has data → per-waiter "Expected" column should show `Total Funds − Settled` (higher than before). TOTAL row Expected should match. Expected should NOT equal Settled unless everything was truly settled with zero opening balance.

---

### Micro-Phase C: Fix per-waiter "Pilferage" column to show API value
**What:** Show backend pilferage by default, not FE-computed ₹0.
**Why:** Currently L251 computes `pilf = actual !== undefined ? expected - actual : 0`. When user hasn't entered actual balance, this shows ₹0 regardless of backend pilferage. Backend pilferage from previous settlements should be visible.

**Edit C1 — Fix per-waiter pilferage (L251)**
**Current:** `const pilf = actual !== undefined ? expected - actual : 0;`
**New:** `const pilf = actual !== undefined ? (expected - actual) : w.pilferage;`

**Logic:** If user entered an actual balance → compute live pilferage (expected − actual). If not → show backend's recorded pilferage from previous settlements.

**Verify:** Open Settlement panel → Pilferage column shows backend values (may be ₹0 if no prior pilferage). Enter an actual balance lower than expected → Pilferage updates live to show the difference.

---

### Micro-Phase D: Fix Settle Modal formulas (same pattern as B+C)
**What:** Remove pilferage from Expected in the settle modal — 4 locations use `w.totalFunds - w.settled - w.pilferage`.
**Why:** Same circular logic as the table. Expected in the modal should be `totalFunds - settled`.

**Edit D1 — handleSettle expected (L104)**
**Current:** `const expected = w.totalFunds - w.settled - w.pilferage;`
**New:** `const expected = w.totalFunds - w.settled;`

**Edit D2 — openSettleModal expected (L145)**
**Current:** `const expected = w.totalFunds - w.settled - w.pilferage;`
**New:** `const expected = w.totalFunds - w.settled;`

**Edit D3 — Settle modal amount input border validation (L385)**
**Current:** `settleAmount > (settleModal.totalFunds - settleModal.settled - settleModal.pilferage)`
**New:** `settleAmount > (settleModal.totalFunds - settleModal.settled)`

**Edit D4 — Settle modal "Cannot settle more" error text (L387-388)**
**Current:**
```jsx
{settleAmount > (settleModal.totalFunds - settleModal.settled - settleModal.pilferage) && (
  <p ...>Cannot settle more than expected balance ({fmt(settleModal.totalFunds - settleModal.settled - settleModal.pilferage)})</p>
)}
```
**New:**
```jsx
{settleAmount > (settleModal.totalFunds - settleModal.settled) && (
  <p ...>Cannot settle more than expected balance ({fmt(settleModal.totalFunds - settleModal.settled)})</p>
)}
```

**Edit D5 — Settle modal "Expected" display (L403)**
**Current:** `{fmt(settleModal.totalFunds - settleModal.settled - settleModal.pilferage)}`
**New:** `{fmt(settleModal.totalFunds - settleModal.settled)}`

**Edit D6 — Settle modal pilferage display (L404)**
**Current:** Complex inline expression using `settleModal.totalFunds - settleModal.settled - settleModal.pilferage`
**New:** Replace with `settleModal.totalFunds - settleModal.settled` in the comparison.

**Edit D7 — Full type button expected recalc (L394)**
**Current:** `const exp = settleModal.totalFunds - settleModal.settled - settleModal.pilferage;`
**New:** `const exp = settleModal.totalFunds - settleModal.settled;`

**Edit D8 — Confirm button disabled guard (L409)**
**Current:** `settleAmount > (settleModal.totalFunds - settleModal.settled - settleModal.pilferage)`
**New:** `settleAmount > (settleModal.totalFunds - settleModal.settled)`

**Verify:** Click "Settle" on a waiter → modal Expected shows `Total Funds − Settled`. Enter amount > Expected → red border + error text. Enter valid amount → Confirm enables.

---

### Micro-Phase E: Fix Settled KPI sub-text (division by zero guard)
**What:** Guard against `totalFunds = 0` in percentage computation.
**Why:** L199: `Math.round(totals.settled / totals.totalFunds * 100)` → `NaN` when totalFunds = 0.

**Edit E1 — Add zero guard (L199)**
**Current:**
```jsx
sub={totals.totalFunds ? `${Math.round(totals.settled / totals.totalFunds * 100)}% of funds` : ""}
```
This is already guarded (`totals.totalFunds ?` is truthy check). **But** `totalFunds = 0` is falsy → shows empty string. Actually this IS correct. Let me verify... `0` is falsy in JS, so `totals.totalFunds ? ... : ""` returns `""` when 0. That's fine — no percentage shown when no funds.

**Actually no issue here — the existing guard works.** Skip this edit.

But add a sub-text for the zero case:
**Current:** `sub={totals.totalFunds ? `${Math.round(totals.settled / totals.totalFunds * 100)}% of funds` : ""}`
**New:** `sub={totals.totalFunds ? `${Math.round(totals.settled / totals.totalFunds * 100)}% of funds` : "No funds today"}`

**Verify:** On a date with zero activity → Settled card shows ₹0 with "No funds today" sub-text.

---

## Execution Sequence (total ~20 min)

```
Phase A: Add Total Funds KPI card               → VERIFY (6 cards visible, math correct)
Phase B: Fix Expected formula (table)            → VERIFY (Expected = TotalFunds − Settled)
Phase C: Fix Pilferage column (show API value)   → VERIFY (shows backend pilferage, not ₹0)
Phase D: Fix Settle Modal (8 formula locations)  → VERIFY (modal Expected matches table)
Phase E: Settled sub-text polish                 → VERIFY (zero-funds message)
```

Each phase is independently deployable and verifiable. If any phase produces unexpected results, you can stop and investigate before proceeding.

---

## Complete Edit Map (all in SettlementPanel.jsx)

| Edit | Line | Phase | What |
|------|------|-------|------|
| A1 | After L198 | A | Insert Total Funds KPI card |
| B1 | L249 | B | Remove `- w.pilferage` from per-waiter expected |
| B2 | L354 | B | Remove `- (totals.pilferage \|\| 0)` from TOTAL row expected |
| C1 | L251 | C | Show `w.pilferage` when no actual balance entered |
| D1 | L104 | D | Remove `- w.pilferage` from handleSettle expected |
| D2 | L145 | D | Remove `- w.pilferage` from openSettleModal expected |
| D3 | L385 | D | Remove pilferage from input border validation |
| D4 | L387-388 | D | Remove pilferage from error text |
| D5 | L403 | D | Remove pilferage from modal Expected display |
| D6 | L404 | D | Remove pilferage from modal Pilferage display comparison |
| D7 | L394 | D | Remove pilferage from Full-type button recalc |
| D8 | L409 | D | Remove pilferage from Confirm button disabled guard |
| E1 | L199 | E | Add "No funds today" sub-text |

**Total: 13 edits, 1 file, 5 verifiable phases.**

---

## Verification Checklist (for owner)

### After Phase A (Total Funds card):
- [ ] 6 KPI cards visible: Opening Balance, Cash Collected, **Total Funds**, Settled, Remaining, Pilferage
- [ ] Total Funds value = Opening Balance + Cash Collected

### After Phase B (Expected formula):
- [ ] Per-waiter Expected column = Total Funds − Settled (NOT minus pilferage)
- [ ] TOTAL row Expected = sum of Total Funds − sum of Settled
- [ ] Expected ≠ Settled (unless truly all settled with zero opening)

### After Phase C (Pilferage column):
- [ ] Pilferage column shows backend value (from previous settlements), NOT ₹0
- [ ] Entering an actual balance → pilferage updates to Expected − Actual
- [ ] Not entering actual balance → pilferage shows backend recorded value

### After Phase D (Settle Modal):
- [ ] Modal "Expected" = Total Funds − Settled (matches table)
- [ ] Red border when amount > Expected
- [ ] Confirm disabled when amount > Expected
- [ ] Pilferage in modal = Expected − Actual Balance (when entered)

### After Phase E (polish):
- [ ] Zero-activity date → Settled card shows "No funds today"

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | Removing pilferage from Expected changes settle amounts | CERTAIN (intended) | MEDIUM | This is the fix — Expected was wrong. Settled amounts will now be higher (correct). |
| R-2 | Backend `pilferage` field might be cumulative, not per-session | LOW | MEDIUM | Phase C shows API value; if wrong, it's backend data issue not FE. |
| R-3 | Existing settled records computed with old formula | ZERO | — | Historical settlements are stored on backend. FE formula change only affects display + future settle actions. |
| R-4 | Insights Settlement Report (SettlementReportMockup) has same bugs | LIKELY | MEDIUM | Out of scope for this fix. If same formulas are used, a follow-up CR should fix them. |

---

*BUG-132 Implementation Plan — 2026-06-12. 5 micro-phases, each independently verifiable.*
