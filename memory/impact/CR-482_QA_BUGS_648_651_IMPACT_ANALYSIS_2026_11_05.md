# IMPACT ANALYSIS — CR-482 QA Bugs (BUG-648, BUG-649, BUG-650, BUG-651)

**Date:** 2026-11-05
**Stage:** Gate 2 — Impact Analysis ONLY (no Implementation Plan written — Gate 3 not started)
**Agent role:** PLANNING (Role 2)
**Source:** `test_reports/CR-482_QA_REPORT_P6_P10_2026_11_05.md` (F4, F1, F2, F3)
**Code read at:** branch `main` HEAD `7613d3f`
**Zero code changed.**

---

## 0. Batch summary

| ID | Sev | Risk (verified) | Code Reality | Files WILL change | R5 hotspot? | Lines (est.) | Owner decisions | Fast Lane |
|---|---|---|---|---|---|---|---|---|
| **BUG-648** | P0 | **CRITICAL** (kept) | PARTIAL | `WeightEntryModal.jsx` | NO | 1–3 | OD-648-01, OD-648-02 | **NO** (money) |
| **BUG-649** | P2 | **LOW** (kept) | PARTIAL | `OrderEntry.jsx` | **YES** | 1–2 (move 1 line) | none | **NO** (R5) |
| **BUG-650** | P3 | **LOW** (kept) | FULL (code = "first") | `OrderEntry.jsx` **or** docs only | YES (if code) | 0 / 2–3 | **OD-650-01** (blocker) | NO |
| **BUG-651** | P3 | **LOW** (kept) | FULL (bug present) | `index.css` | NO | 1 (additive) | Fast Lane approval | **YES — eligible** |

No risk downgrades. Total code footprint if all fixed: **3 files, ~5–9 lines.**

### Conflict pre-check (all 4)
| File | Last modifier (FILE_OWNERSHIP) | Other OPEN items on file | Verdict |
|---|---|---|---|
| `WeightEntryModal.jsx` | CR-482 P6 | none except BUG-648 | CLEAR |
| `OrderEntry.jsx` | CR-482 (P3/P4/P6–P10), BUG-462/464 | BUG-646/647 (tax batch, L886–925 area), BUG-602 (backend-blocked), CR-482 | **Region-separate** — BUG-649/650 edit only L636–662 (keyboard handler). Parallel-safe with BUG-646/647 at line level, but same file → **declare order: tax batch (A) first, then 649+650** per handover §5, OR 649+650 first since it's a 1-region change — owner picks. Same-session rebase check mandatory for whichever goes second. |
| `index.css` | CR-482 P0 | none except BUG-651 | CLEAR |
| `CartPanel.jsx` | — | **NOT touched** by this batch (see BUG-651 §Fix shape) | n/a |

---

## 1. BUG-648 — Weight popup pre-fill not selected → typing appends (P0 / CRITICAL)

**Code Reality:** PARTIAL — `autoFocus` + pre-fill exist; no select-on-focus.
**Conflict:** CLEAR.

### Data flow (traced)
```
OrderEntry search Enter (L665-683) → addToCart(item) → item.isWeightItem → setWeightEntryItem(item)
→ <WeightEntryModal item kbdEnabled /> (OrderEntry.jsx L2942-2948)
→ useState(family.defaultSmall) = 1000 (WEM L74-75; Kg/L=1000, gm/ml=100 — L12-15)
→ <input type="number" value="1000" autoFocus> (WEM L184-197) — caret at END, nothing selected
→ cashier types "500" → onChange (L90-98) → inputValue "1000500" → weightSmall 1000500
→ Enter → handleInputKeyDown (L119-130, CR-482 P6, kbd ON only) → onConfirm(1000.5)
   OR mouse "Add to Cart" → handleConfirm (L110-116) → onConfirm(weightBase) — SAME bad value
→ confirmWeightAndAdd (OrderEntry.jsx L831-840) → qty 1000.5, totalPrice = unitPrice × 1000.5 — NO upper bound anywhere
→ cart line ₹4,60,230 → Collect Bill / order payload
```
**Break point:** WEM L196 `autoFocus` without selecting the pre-filled value.

### Findings
1. **Pre-existing, not CR-482-only.** The append happens with shortcuts OFF too (mouse user types into the box, then clicks Add to Cart → `handleConfirm` sends the same wrong value). CR-482 P6 only removed the extra click.
2. **`type="number"` constraint:** `setSelectionRange()` throws on number inputs. Fix MUST use `e.target.select()` (supported on number inputs). Planning note for Gate 3.
3. **React `autoFocus` fires `onFocus`** (React calls `.focus()` on mount; synthetic onFocus runs). So `onFocus={(e) => e.target.select()}` covers the open-popup path without a ref/effect.
4. **Mouse-click caveat:** in Chromium a mouse click into an already-focused-then-selected box can collapse the selection on mouseup. Not a money path (user sees caret), note only.
5. **No upper-bound guard exists** in WEM or `confirmWeightAndAdd`. Even with the fix, a cashier can type `1000500` deliberately/accidentally. Surfaced as OD-648-02 (policy — R3, not invented).
6. **Downstream consumers of the bad value:** cart line `qty`/`totalPrice` → CartPanel totals → CollectPaymentPanel → orderTransform payload. **None need changing** — the fix is at the input source. No API / transform / tax change.

### Fix shape (for Gate 3 — not a plan)
- WEM L184–197: add `onFocus={(e) => e.target.select()}` (gated or not per OD-648-01). ~1–3 lines.
- If OD-648-02 = YES: add a max check in `handleInputKeyDown` + `handleConfirm` (same file, +~4 lines, still 1 file).

### Files
- **WILL change:** `frontend/src/components/order-entry/WeightEntryModal.jsx`
- **WILL NOT touch:** `OrderEntry.jsx` (`confirmWeightAndAdd`), `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, any API/service file.

### Risk
**CRITICAL (kept)** — money on order line. Full gate flow + owner Gate 4 GO + E2E money regression (weight line → collect bill → payload amount) required. Fast Lane NOT eligible (money).

### Owner decisions
- **OD-648-01 (open, from intake):** select-all on focus for **everyone** (recommended — mouse path has the same money bug, finding 1) or **only when shortcuts ON**?
- **OD-648-02 (NEW):** add a sanity maximum to the weight box (e.g. block/confirm above N Kg)? If YES, owner gives the limit per unit (Kg / L / gm / ml). If NO, scope stays select-on-focus only.

### Regression checklist (seeds Gate 3)
- P6 6.1–6.11 re-run (Kashi, Gopal Bhog ₹460/Kg): open popup → type 500 → Enter → 500 gm ₹230.
- Mouse: pill 250 gm → Add (6.10); type into box with mouse → Add → correct value.
- 6.3/6.4 empty/0 error; 6.7 min-50 clamp; −/+ buttons still work after re-focus.
- Shortcuts OFF: popup opens, box behaviour per OD-648-01.
- Money E2E: weight line → Collect Bill amount → order payload `order_amount`.

---

## 2. BUG-649 — `+`/`−` typed into search when no last-added item (P2 / LOW)

**Code Reality:** PARTIAL — P8 handler exists; skip path lacks `preventDefault`.
**Conflict:** `OrderEntry.jsx` (R5) — see §0.

### Data flow (traced)
```
window keydown (capture) — useKeyboardShortcuts (hooks L56-67) → OrderEntry handler L633
→ P8 branch L648-662:
   L653 inEmptySearch / L654 onNeutral → L655 return if neither   (correct: "ab-" case 8.6 must still type)
   L656 line = cartItems.find(_cartKey === lastAddedKeyRef.current)
   L657 if (!line || line.placed || line.isWeightItem) return;   ← BREAK: returns BEFORE L658 preventDefault
   L658 e.preventDefault()
→ browser default inserts "+"/"-" into focused empty search → searchQuery "+" → grid filters to 0 items
```
Three trigger states (all hit L657): (a) only placed items / `lastAddedKeyRef` null, (b) new order before first add, (c) last add was a weight item (N3 behaviour kept).

### Fix shape
Move `e.preventDefault()` from L658 to directly after L655 (i.e. once we know the key is "ours": empty search or neutral focus). L657 still returns without changing qty. 1 line moved, 0 added logic.

### Side-effect check
- 8.6 (text in search → `-` typed): unaffected — still returns at L655 before preventDefault. ✅
- Cart-row `+`/`−` (P10): active element is the row → L655 returns; row handler (`CartPanel.jsx` kbdRowProps L229+) unaffected. ✅
- Modal open: L651 returns first. ✅
- Shortcuts OFF: hook disabled (`enabled: kbdEnabled`) → OFF-3 unchanged. ✅
- Grid item focused (`onNeutral`) + no line: `+` now swallowed instead of no-op — no visible difference.

### Files
- **WILL change:** `frontend/src/components/order-entry/OrderEntry.jsx` (L655–658 only)
- **WILL NOT touch:** `CartPanel.jsx`, `useKeyboardShortcuts`, any cart/qty logic.

### Risk
**LOW (kept).** No data/money. Full gate (R5 hotspot) but trivial. R5 regression: P8 8.0–8.11 + OFF-3.

### Owner decisions
None.

---

## 3. BUG-650 — Ctrl+↓ start row: oldest vs newest unsent (P3 / LOW)

**Code Reality:** FULL — code deliberately targets the FIRST unsent row.
**Conflict:** `OrderEntry.jsx` (R5) — same region as BUG-649 → **batch with BUG-649**.

### Data flow (traced)
```
OrderEntry L637-644: Ctrl+ArrowDown from search
→ document.querySelector('[data-kbd-cart-row="new"]')  → FIRST new row in DOM
   || document.querySelector('[data-kbd-cart-row]')    → first row overall (placed)
→ CartPanel renders visibleCartItems in array order (L1287 .map); new lines appended at END
   (addToCart / confirmWeightAndAdd use [...cartItems, new]) → first "new" row = OLDEST unsent
```

### Doc reality (correction to intake)
| Source | Wording | Means |
|---|---|---|
| `handover/CR-482_HANDOVER_P0_TO_P9.md` L58 | "starting at the newest item" | newest |
| `plans/CR-482_IMPLEMENTATION_PLAN.md` L213 | "focus first `[data-kbd-cart-row]` (newest-unplaced first if present)" | ambiguous — "first" row but "newest-unplaced" |
| `plans/...` L214 smoke | "first cart row ringed" | first |
| Code comment OrderEntry L636 | "first unplaced row" | first |

Intake said "plan and PRD say first unsent". The plan's own parenthetical says **newest-unplaced** — so docs are split, not 2-vs-1. Owner must decide (R3).

### Options (for OD-650-01)
- **A — keep code (oldest unsent / top):** 0 code lines. Fix wording in handover L58 + plan L213. No R5 touch.
- **B — newest unsent (bottom new row):** OrderEntry L639: take the LAST match of `querySelectorAll('[data-kbd-cart-row="new"]')`. ~2 lines. ⚠ Intake's suggested `:last-of-type` selector **will not work** (it matches element type, not attribute) — Gate 3 must use `querySelectorAll` + last.
- **C — last-touched line (`lastAddedKeyRef`):** differs from B when a repeat add merges into an existing row (row stays in place). Needs a `data-cart-key` attribute on rows → **adds `CartPanel.jsx`** (2 files). Not recommended unless owner wants it.

Fallback (no new rows → first placed row, test 10.11) unchanged under A/B/C.

### Files
- A: docs only (`handover/CR-482_HANDOVER_P0_TO_P9.md`, `plans/CR-482_IMPLEMENTATION_PLAN.md`)
- B: `OrderEntry.jsx` L639 only
- C: `OrderEntry.jsx` L639 + `CartPanel.jsx` row attrs (L76, L261)

### Risk
**LOW (kept).** Focus target only.

### Owner decisions
- **OD-650-01 (BLOCKER for Gate 3):** A / B / C.

---

## 4. BUG-651 — Cart-row orange highlight clipped (P3 / LOW)

**Code Reality:** FULL — bug present.
**Conflict:** CLEAR.

### Data flow (traced)
```
index.css L2: .kbd-focus:focus-visible, .kbd-highlight { outline: 3px solid #F97316; outline-offset: 2px; }
CartPanel kbdRowProps L229-231 → className 'kbd-focus' + data-kbd-cart-row on PlacedItemRow (L75-77) / NewItemRow (L261)
Rows are full-width children of the scroll box CartPanel L1279 `flex-1 overflow-y-auto`
→ overflow-y:auto forces overflow-x to clip → outline drawn 2px OUTSIDE the row is cut on left/right,
  and on the first row the top edge is cut at the scroll box top → only bottom line visible
```

### Blast-radius finding (important)
The same global rule L2 is used by **4 other surfaces**: CategoryPanel L68 + L82 (category list, P9), OrderEntry L1977 (`kbd-highlight` grid pills, P2/P3). Changing L2 itself would restyle all of them. → Fix must be **scoped to cart rows**, not edit L2.

### Fix shape
Add ONE scoped rule in `index.css` after L2, e.g. `[data-kbd-cart-row].kbd-focus:focus-visible { outline-offset: -3px; }` (inset ring — sits inside the row, never clipped). CartPanel needs no change (rows already carry `data-kbd-cart-row`). Exact value (inset outline vs inset box-shadow) decided in Gate 3 / Fast Lane.

### Files
- **WILL change:** `frontend/src/index.css` (+1 line)
- **WILL NOT touch:** `CartPanel.jsx`, `CategoryPanel.jsx`, `OrderEntry.jsx`, L2 rule itself.

### Risk
**LOW (kept).** CSS only, scoped selector, only active when shortcuts ON.

### Fast Lane eligibility (all rules checked)
| Rule | Result |
|---|---|
| 1 file | ✅ `index.css` |
| ≤10 lines | ✅ 1 |
| No API/transform/state/localStorage/provider/socket/env | ✅ |
| Not R5 hotspot | ✅ |
| Not financial/order/report/print/auth logic | ✅ (visual only) |
| No FILE_OWNERSHIP conflict | ✅ |
| Owner says `FAST LANE APPROVED` | ⏳ **PENDING** |

### Owner decisions
- **Fast Lane approval** for BUG-651 (else normal Gate 3).

---

## 5. Recommended Gate 3 grouping & order

| Plan | Items | Files | Blocked by |
|---|---|---|---|
| **P-1** | BUG-648 | WeightEntryModal.jsx | OD-648-01, OD-648-02 |
| **P-2** | BUG-649 + BUG-650 | OrderEntry.jsx (L636–662) | OD-650-01 (649 alone is unblocked) |
| **P-3 / Fast Lane** | BUG-651 | index.css | Fast Lane approval |

Order: P-1 first (P0, unblocks P6 smoke) → P-2 → P-3. P-2 vs tax batch (BUG-646/647) on OrderEntry.jsx: different regions; whichever implements second must re-verify L636–662 / L886–925 anchors (Implementation Step 0).

## 6A. Owner Decisions — LOCKED 2026-11-05
| OD | Decision | Scope effect |
|---|---|---|
| OD-648-01 | **Everyone** (shortcuts ON and OFF) — `onFocus` select NOT gated by `kbdEnabled` | WEM 1 line |
| OD-648-02 | **NO** max-weight limit | No extra validation; scope = select-on-focus only |
| OD-650-01 | **B — newest (bottom) unsent row.** Owner: "user/cashier experience is priority", delegated to agent recommendation (predictable "always bottom", most likely row to fix, ↑ reaches older rows) | OrderEntry L639 → last of `querySelectorAll('[data-kbd-cart-row="new"]')`; fallback unchanged. Also update CR-482 plan L213/L214 + OrderEntry L636 comment wording |
| FL-651 | **PENDING** — Fast Lane approval not yet given | — |

BUG-648, BUG-649, BUG-650 → **GATE_2_CLOSED**. BUG-651 stays GATE_2_IMPACT_ANALYSIS until Fast Lane decision.

## 6. Owner Decision Queue (original)
| OD | Item | Question | Agent note (non-binding) |
|---|---|---|---|
| OD-648-01 | BUG-648 | Select-on-focus for everyone, or shortcuts ON only? | Mouse path has the same money bug |
| OD-648-02 | BUG-648 | Add a max-weight sanity limit? If yes, limits per unit | New — policy, needs owner |
| OD-650-01 | BUG-650 | Ctrl+↓ lands on A oldest / B newest / C last-touched | Docs split; A = docs only |
| FL-651 | BUG-651 | `FAST LANE APPROVED`? | All 6 eligibility rules pass |
