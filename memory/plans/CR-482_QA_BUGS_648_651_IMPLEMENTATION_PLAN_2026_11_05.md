# IMPLEMENTATION PLAN — CR-482 QA Bugs (BUG-648, BUG-649, BUG-650, BUG-651)

**Date:** 2026-11-05
**Stage:** Gate 3 — Implementation Plan (owner: "Gate 3 GO: for all 4")
**Agent role:** PLANNING (Role 2)
**Inputs:** `impact/CR-482_QA_BUGS_648_651_IMPACT_ANALYSIS_2026_11_05.md` (ODs locked §6A)
**Anchors verified at:** `main` HEAD `7613d3f` — `frontend/src` unchanged vs HEAD (git diff clean) → IA line numbers still exact.
**Code Reality:** 648 PARTIAL · 649 PARTIAL · 650 FULL (old behaviour) · 651 FULL (bug present)
**Fast Lane:** NOT used — BUG-651 has no `FAST LANE APPROVED`, so it follows this normal plan.
**Zero code written by Planning.**

---

## 0. Locked decisions applied
| OD | Value | Applied in |
|---|---|---|
| OD-648-01 | Everyone (not gated by `kbdEnabled`) | E1 |
| OD-648-02 | NO max-weight limit | E1 scope only — no validation added |
| OD-650-01 | B — newest (bottom) unsent row | E3 + E5 |
| FL-651 | Not approved → normal gate | E4 |

## 1. Scope lock
**Files WILL change (3 code + 1 new test + 2 docs):**
1. `frontend/src/components/order-entry/WeightEntryModal.jsx` — E1
2. `frontend/src/components/order-entry/OrderEntry.jsx` — E2, E3 (L636–658 only) — **R5 hotspot**
3. `frontend/src/index.css` — E4
4. NEW `frontend/src/__tests__/components/WeightEntryModal.bug648.test.jsx` — E6
5. `memory/plans/CR-482_IMPLEMENTATION_PLAN.md` L213–214 + `memory/handover/CR-482_HANDOVER_P0_TO_P9.md` L58 — E5 (wording)

**Files WILL NOT touch:** `CartPanel.jsx`, `CategoryPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `useKeyboardShortcuts` hook, `confirmWeightAndAdd` / `addToCart` / `updateQuantity` in OrderEntry, `.kbd-focus` rule on index.css L2, any API/service/transform/localStorage/env file.

**Total:** ~7 changed code lines + 1 small test file.

## 2. Conflict / sequencing
- `OrderEntry.jsx` is shared with the tax batch BUG-646/647 (L886–925 area, not yet planned). This plan edits L636–658 only. **Whichever lands second must re-run Step 0 anchor check.** No other open item edits WEM or index.css.
- Execution sequence inside this plan: **E1 → E6 → E2 → E3 → E4 → E5** (P0 money fix first, then keyboard, then CSS, then docs).

---

## 3. Edits

### E1 — BUG-648 · `WeightEntryModal.jsx` — select pre-filled value on focus (everyone)
**Current (L132–136):**
```jsx
  useKeyboardShortcuts((e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  }, { enabled: kbdEnabled });

  return (
```
**New:** insert one line before `return (`:
```jsx
  const selectOnFocus = (e) => e.target.select(); // BUG-648: typing replaces pre-fill (all users, OD-648-01)

  return (
```
**Current (L195–196):**
```jsx
                  data-testid="weight-input"
                  autoFocus
```
**New:**
```jsx
                  data-testid="weight-input"
                  onFocus={selectOnFocus}
                  autoFocus
```
**Rules:**
- MUST use `e.target.select()` — NOT `setSelectionRange` (throws on `type="number"`).
- NOT gated by `kbdEnabled` (OD-648-01).
- Do NOT change `handleInputKeyDown`, `handleConfirm`, `handleInputBlur`, `updateWeight`, defaults, or add any max check (OD-648-02 = NO).
- Lines: +2.

### E2 — BUG-649 · `OrderEntry.jsx` — swallow `+`/`−` on the skip path
**Current (L655–658):**
```js
      if (!inEmptySearch && !onNeutral) return;
      const line = cartItems.find(ci => ci._cartKey && ci._cartKey === lastAddedKeyRef.current);
      if (!line || line.placed || line.isWeightItem) return;
      e.preventDefault();
```
**New:**
```js
      if (!inEmptySearch && !onNeutral) return;
      e.preventDefault(); // BUG-649: never type +/- into empty search, even with no last-added line
      const line = cartItems.find(ci => ci._cartKey && ci._cartKey === lastAddedKeyRef.current);
      if (!line || line.placed || line.isWeightItem) return;
```
**Rules:** move only; L655 return stays BEFORE preventDefault (keeps test 8.6 "ab-" typing). Lines: 1 moved (+1/−1).

### E3 — BUG-650 · `OrderEntry.jsx` — Ctrl+↓ lands on newest (bottom) unsent row
**Current (L636, L639):**
```js
    // CR-482 P10: Ctrl+↓ from search jumps into cart rows (first unplaced row, else first row)
...
      const target = document.querySelector('[data-kbd-cart-row="new"]') || document.querySelector('[data-kbd-cart-row]');
```
**New:**
```js
    // CR-482 P10 + BUG-650: Ctrl+↓ from search jumps into cart rows (newest/bottom unplaced row, else first row)
...
      const newRows = document.querySelectorAll('[data-kbd-cart-row="new"]'); // BUG-650 (OD-650-01 = B)
      const target = newRows[newRows.length - 1] || document.querySelector('[data-kbd-cart-row]');
```
**Rules:** do NOT use `:last-of-type` (matches element type, not attribute). Keep L638 guard, L640–644 (`!target` return, preventDefault, focus, scrollIntoView) unchanged. Fallback (no new rows → first placed row) unchanged. Lines: +1, 2 modified.

### E4 — BUG-651 · `index.css` — inset ring for cart rows only
**Current (L1–2):**
```css
/* CR-482: keyboard shortcut focus ring + highlight — only consumed when kbdEnabled=true */
.kbd-focus:focus-visible, .kbd-highlight { outline: 3px solid #F97316; outline-offset: 2px; }
```
**New:** insert after L2:
```css
/* BUG-651: cart rows sit in an overflow-y scroll box that clips an outer ring — draw it inside */
[data-kbd-cart-row].kbd-focus:focus-visible { outline-offset: -3px; }
```
**Rules:** do NOT edit L2 (shared by CategoryPanel L68/L82 + grid pills OrderEntry L1977). Higher specificity (attr + class + pseudo) overrides only the offset. Lines: +2.

### E5 — BUG-650 · docs wording (no code)
- `memory/plans/CR-482_IMPLEMENTATION_PLAN.md` L213: "focus first `[data-kbd-cart-row]` (newest-unplaced first if present)" → "focus the newest (bottom) unplaced `[data-kbd-cart-row="new"]`, else the first row (BUG-650)". L214 smoke: "first cart row ringed" → "newest new row ringed; ↑ → previous row".
- `memory/handover/CR-482_HANDOVER_P0_TO_P9.md` L58: already says "newest item" — append "(BUG-650: confirmed = bottom unsent row)".

### E6 — BUG-648 · NEW unit test `src/__tests__/components/WeightEntryModal.bug648.test.jsx`
- Spy `HTMLInputElement.prototype.select`; render `<WeightEntryModal item={{name:'Gopal Bhog', itemUnit:'Kg', itemUnitPrice:460}} onConfirm={jest.fn()} onClose={jest.fn()} />` with `kbdEnabled` **false** and again **true** → expect `select` called on mount (autoFocus) in both cases.
- `fireEvent.blur` then `fireEvent.focus(getByTestId('weight-input'))` → `select` called again.
- Add `// BUG-648` header comment. Mock `useKeyboardShortcuts` import only if the render needs it.
- Run: `cd /app/frontend && yarn craco test --watchAll=false --testPathPattern=bug648`

---

## 4. Verification Matrix (seeds Self-test + QA handover)
| # | Edit | File | How to verify | Auto? |
|---|---|---|---|:---:|
| V1 | E1 | WEM | Unit E6: `select()` called on mount, kbd ON and OFF | YES |
| V2 | E1 | WEM | Kashi, shortcuts ON: "Gopal Bhog" + Enter → box shows 1000 **highlighted** → type 500 → box shows `500` → Enter → line **500 gm ₹230** | NO |
| V3 | E1 | WEM | Shortcuts OFF: click Gopal Bhog → box highlighted → type 500 → Add to Cart → **500 gm ₹230** | NO |
| V4 | E1 | WEM | Regression P6 6.2–6.10: Esc, empty/0 error, min-50 clamp, −/+ buttons, 250 gm pill | NO |
| V5 | E1 | money E2E | Weight line ₹230 → Collect Bill shows ₹230 (+tax as configured) → do NOT settle | NO |
| V6 | E2 | OrderEntry | cafe103 C1 (sent items only), shortcuts ON: `+` / `-` → search stays **empty**, grid full, qty unchanged | NO |
| V7 | E2 | OrderEntry | New order before any add: `+` → search empty. After a weight add (Kashi): `+` → search empty, weight unchanged | NO |
| V8 | E2 | OrderEntry | Regression P8 8.0–8.11 — esp. 8.6 "ab" then `-` → **"ab-"** typed | NO |
| V9 | E3 | OrderEntry | Add Americano, Banana Shake, Blue Lagoon → Ctrl+↓ → **Blue Lagoon** ringed; ↑ → Banana Shake | NO |
| V10 | E3 | OrderEntry | Sent-only table: Ctrl+↓ → first sent row (10.11). Sent + new: lands on newest new row (10.16) | NO |
| V11 | E3 | OrderEntry | Regression P10 10.2–10.18 (↑/↓, +/−, Delete, Esc) | NO |
| V12 | E4 | index.css | Ctrl+↓ + ↑/↓: orange ring visible on **all 4 sides**, incl. first row | NO |
| V13 | E4 | index.css | Category list (Shift+Tab) and grid pill highlight look **unchanged** | NO |
| V14 | all | — | Shortcuts OFF regression OFF-1..4 + REG-1..5 | NO |
| V15 | all | — | `yarn build` / webpack 0 new warnings | YES |

R5 regression (OrderEntry touched): V8 + V11 + 2 cross-flow (add → place order → reopen table → Ctrl+↓). R6: V5 money check for BUG-648.

## 5. Risk register
| Risk | Item | Mitigation |
|---|---|---|
| `setSelectionRange` used by mistake → crash on number input | 648 | E1 rule: `select()` only |
| Mouse click re-selects text when user clicks to edit middle digits | 648 | Accepted (owner chose everyone); retype is the safe default |
| preventDefault moved above L655 by mistake → "ab-" broken | 649 | E2 rule + V8 |
| `:last-of-type` used → wrong row | 650 | E3 rule + V9 |
| Editing L2 restyles category/grid | 651 | E4 rule + V13 |
| Overlap with tax batch on OrderEntry.jsx | 649/650 | Step 0 anchor re-check by second implementer |

## 6. Post-Code Registry Checklist (Implementation agent MUST do)
- [ ] registry.json: BUG-648/649/650/651 → `GATE_5A_IMPLEMENTED`, sprint_key → owner to confirm (suggest `nov_cr_batch`, with CR-482)
- [ ] BUG_TRACKER.md: 4 rows → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: WEM (BUG-648), OrderEntry L636–658 (BUG-649/650), index.css (BUG-651), new test file (BUG-648)
- [ ] Code markers: `// BUG-648` WEM · `// BUG-649` + `// BUG-650` OrderEntry · `/* BUG-651 */` index.css
- [ ] CR-482 registry note: P6–P10 QA fixes landed → re-QA P6–P10 then owner smoke
- [ ] QA handover at `handover/QA_HANDOVER_BUG648_651_<DATE>.md` inheriting §4

## 7. Gate 4 preconditions
- Owner verbatim **"Gate 4 GO"** (mandatory — BUG-648 CRITICAL/money; OrderEntry R5).
- Owner confirms sprint_key.
