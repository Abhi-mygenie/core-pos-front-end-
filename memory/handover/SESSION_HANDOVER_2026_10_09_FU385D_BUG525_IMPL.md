# SESSION HANDOVER — 2026-10-09 (FU-385-D + BUG-525 Implementation)

**Date:** 2026-10-09
**Role sequence:** INVESTIGATION → PLANNING (G2+G3) → IMPLEMENTATION
**Items:** FU-385-D, BUG-525 (809 total registry items)

---

## 1. WHAT WAS DONE

### A. Investigation (Issue 1 Split + Issue 2 Legs)

**Issue 1 root cause:** `frontdesk.css:33` — intentional D88 CSS rule hiding Split button under `.frontdesk-bill`. NOT a logic bug. BUG-523 (profileTransform fix) was wrong hypothesis and is a no-op.

**Issue 2 root cause:** `handlePaid` sends `partial_payments_room` legs with no guard that `sum(legs) <= effectiveRoomBalance`. No visual warning either.

### B. FU-385-D — D88 CSS reversal

**Files changed:** `frontdesk.css` + `hideSectionRows.cr385.test.js`

| Edit | Change |
|---|---|
| E1 | Deleted D88 CSS hide rule (L32-33) from `frontdesk.css` |
| E2 | Removed `'payment-split-btn'` from TOGGLES array |
| E3 | Flipped D88 assertion → reverse guard (`toHaveLength(0)`) |
| Fix | Removed `\/ 100` from banned regex (pre-existing BUG-498 use in FolioCheckoutPanel) |

### C. BUG-525 — Room split legs cap

**File changed:** `FolioCheckoutPanel.jsx` (5 edits)

| Edit | Change |
|---|---|
| E1 | Added `roomSplitTotal` + `roomSplitOverBalance` useMemos after L273 |
| E2 | Added `roomSplitOverBalance, roomSplitTotal` props to `RoomDiscountControls` |
| E3 | Added over-balance alert in `RoomDiscountControls` after legs section |
| E4 | Added `roomSplitOverBalance` guard in `handlePaid` |
| E5 | Wired new props in JSX call |

Self-test: 9/9 PASS · Unit tests (hideSectionRows): 6/6 PASS · webpack 0 new warnings · EXIT GATE: 5/5

---

## 2. CURRENT STATE

| Item | Status | Next |
|---|---|---|
| FU-385-D | GATE_5A_IMPLEMENTED | Gate 5B — QA |
| BUG-525 | GATE_5A_IMPLEMENTED | Gate 5B — QA |
| BUG-523 | GATE_5A_IMPLEMENTED (no-op, harmless) | Registry note only |
| BUG-524 | GATE_5A_IMPLEMENTED | Gate 5B — QA |
| BUG-516..519 | GATE_5A_IMPLEMENTED | Gate 5B — QA (pending from prior sessions) |
| BUG-522 | GATE_5A_IMPLEMENTED | Gate 5B — QA |
| Issue 2 (CPP food-only / balance_due:0) | Unregistered — OD resolved | Register as BUG-526 next session |

---

## 3. OPEN ITEMS

1. Gate 5B QA for FU-385-D + BUG-525 → `handover/QA_HANDOVER_FU385D_BUG525_2026_10_09.md`
2. Gate 5B QA for BUG-524 → `handover/QA_HANDOVER_BUG523_524_2026_10_09.md`
3. Gate 5B QA for BUG-516..519 + BUG-522 (prior sessions)
4. Issue 2 (CPP food-only) — OD resolved (balance_due:0), needs registration as BUG-526

---

## 4. ENVIRONMENT

Frontend: RUNNING, webpack compiled 1 pre-existing warning, URL: `https://mygenie-pos-ui-6.preview.emergentagent.com`

---

## 5. TEST CREDENTIALS

| Account | Email | Password |
|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` |
| Bonk booking | MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D | room balance ₹600 |

---

## 6. NEXT AGENT BOOT

```
Read THIS handover → 1-line summary:
"Last session (2026-10-09): FU-385-D (Split CSS re-enabled) + BUG-525 (room split legs cap);
 QA pending on 6 items; Issue 2 (CPP food-only) needs registration."

Options:
  a) QA on FU-385-D + BUG-525 → QA role, QA_HANDOVER_FU385D_BUG525_2026_10_09.md
  b) Register Issue 2 as BUG-526 → PLANNING role
  c) Something else → match to role
```

---

## 7. ARTIFACTS

| Type | Path |
|---|---|
| IA | `impact/FU-385-D_IMPACT_ANALYSIS.md` |
| IA | `impact/BUG-525_IMPACT_ANALYSIS.md` |
| Plan | `plans/FU-385-D_IMPLEMENTATION_PLAN.md` |
| Plan | `plans/BUG-525_IMPLEMENTATION_PLAN.md` |
| QA Handover | `handover/QA_HANDOVER_FU385D_BUG525_2026_10_09.md` |
| Session Handover | `handover/SESSION_HANDOVER_2026_10_09_FU385D_BUG525_IMPL.md` (THIS FILE) |
| Investigation | `evidence/BUG-523-PROBE/INVESTIGATION_REPORT_2026_10_09.md` |
