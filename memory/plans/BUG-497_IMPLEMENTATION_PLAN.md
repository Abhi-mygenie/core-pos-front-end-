# BUG-497 — Implementation Plan (Gate 3)

**ID:** BUG-497
**Date:** 2026-10-06
**Author:** PLANNING agent
**Risk:** MEDIUM
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx`
**Files WILL NOT touch:** CheckInPage.jsx, FolioCheckoutPanel.jsx, frontDeskService.js, pmsService.js, any other file

---

## Scope Lock

1 file · 1 edit site · ~4 lines changed.

The `missing[]` array (L51-54) is intentionally NOT modified — it is defined before `roomDiscountRs` useMemo (L59-67), so referencing `roomDiscountRs` there would require a risky const reordering. The `max` attribute + `onChange` clamp at the input itself is the correct, idiomatic fix.

---

## E-497-1 — CheckInForm.jsx L225: add `max` + clamp `onChange`

**Current (L225):**
```jsx
<input type="number" min={0} value={collect.amount} onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))} className={inputCls} data-testid="checkin-collect-amount" disabled={busy} />
```

**After:**
```jsx
<input type="number" min={0} max={Math.max(0, Number(c.balance_due || 0) - roomDiscountRs)}
  value={collect.amount}
  onChange={(e) => { const cap = Math.max(0, Number(c.balance_due || 0) - roomDiscountRs); setCollect((k) => ({ ...k, amount: e.target.value === '' ? '' : String(Math.min(Math.max(0, parseFloat(e.target.value) || 0), cap)) })); }} // BUG-497
  className={inputCls} data-testid="checkin-collect-amount" disabled={busy} />
```

**What changes:**
- `max={...}` — browser enforces the cap via spinner arrows / mobile / submit
- `onChange` clamp — clamps to `[0, cap]` on every keystroke; preserves `''` (empty) so user can clear the field naturally
- `e.target.value === '' ? ''` — empty string passthrough prevents locking the field at "0" when user backspaces

**Why `c.balance_due − roomDiscountRs`:**
- `c.balance_due` = LR charge balance (room total incl. GST − booking advance) — the outstanding amount at check-in
- `roomDiscountRs` = memoised check-in discount in ₹ (from BUG-490/491 useMemo at L59-67, already in scope)
- Together = "Balance due" shown in the bill at L176 — exactly what the guest still owes
- `Math.max(0, ...)` guards against `roomDiscountRs > c.balance_due` (cannot happen due to BUG-490 cap, but defensive)

**No new imports.** No new state. No new hooks. `c` and `roomDiscountRs` are already in scope before L225.

---

## Verification Matrix

| # | Check | How to verify |
|---|-------|--------------|
| V1 | `max` attr = balance_due − discount | DevTools: inspect `checkin-collect-amount` → `max` attribute = correct value (e.g. 335) |
| V2 | Typing 5000 clamps to max | Type 5000 in Collect Now → value snaps to `collectMax` |
| V3 | Typing 0 or clearing → accepted | Type 0 or backspace to empty → no clamping to "0" when empty |
| V4 | Max updates when discount changes | Enter a discount → observe collect now max decreases |
| V5 | Typing exactly = max → accepted | Type `collectMax` value → accepted, no clamp |
| V6 | Check-in with valid collect proceeds | Enter collect ≤ balance, confirm → check-in succeeds |
| V7 | Balance due display unchanged | L176 still shows correct balance — no regression |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-497 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-497 row updated → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + BUG-497 2026-10-06
- [ ] Code marker: // BUG-497 on the edited line
- [ ] Compile check: webpack 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `c.balance_due` = 0 (fully-paid advance at booking) → max = 0 → no collect-now possible | Correct business logic — if guest already paid in full, nothing to collect at check-in |
| Discount = 0 → max = `c.balance_due` | Correct — full balance collectable |
| User pastes a value > cap | `onChange` clamp fires on paste (React synthetic event) |
| Empty string passthrough → `collectAmt = 0` downstream | `Number('' || 0) = 0` — safe |
| `roomDiscountRs` not yet computed at L225 | Non-issue — L225 is in JSX return, all hooks/memos already evaluated |

---

## Execution Sequence

1. Single edit: E-497-1 (L225)
2. Compile check — expect 0 new warnings
3. Browser self-test: V1–V7
4. Registry sync

**Gate 4 GO → IMPLEMENTATION.**
