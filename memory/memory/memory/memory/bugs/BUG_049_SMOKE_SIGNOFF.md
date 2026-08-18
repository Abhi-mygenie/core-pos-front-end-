# BUG-049 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-049
> **Title:** PayLater payment leaves "NA" on available table card
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Related docs:**
> - Impact Analysis: `/app/memory/bugs/BUG_049_PAYLATER_NA_TABLE_CARD_IMPACT_ANALYSIS.md`
> - Implementation Summary: `/app/memory/bugs/BUG_049_IMPLEMENTATION_SUMMARY.md`
> - QA Report: `/app/memory/bugs/BUG_049_QA_REPORT.md`
> - Related closed bug: `/app/memory/bugs/BUG_042_C_SMOKE_SIGNOFF.md`

---

## 1. Owner Smoke Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Dine-In running order → Collect Bill → PayLater → confirm → return to dashboard | ✅ PASS | Table card flips to standard `🍴 N ➕ Available` chip |
| 2 | After PayLater settle — card does NOT render `🍴 N NA` | ✅ PASS | Stale "NA" bug eliminated |
| 3 | Hold/Park action on another running order (non-paid channel) → card stays Occupied with waiter name | ✅ PASS | BUG-042-C contract preserved 1:1 |
| 4 | Cash/UPI/Card settle (fOrderStatus=6) → card flips to Available | ✅ PASS | Regression anchor clean |
| 5 | Cancel order (fOrderStatus=3) → card flips to Available | ✅ PASS | Regression anchor clean |
| 6 | Yet-to-Confirm order (fOrderStatus=7) → card stays in YTC state, not removed | ✅ PASS | CRITICAL GUARD upheld |
| 7 | Audit → Hold tab still lists the PayLater-settled order | ✅ PASS | Audit Hold data source is independent of OrderContext |

**Smoke result: 7/7 PASS.** Owner explicitly confirmed.

---

## 2. What Was Verified

### 2.1 Primary fix (PayLater bill-collect path)
- `update-order-paid` + `fOrderStatus === 9` arrives at `handleOrderDataEvent`.
- New predicate `isPayLaterSettle = (fOrderStatus===9) && (eventName==='update-order-paid')` evaluates true.
- Order removed from `OrderContext.orders`.
- Table flipped to `'available'` via `syncTableStatus(order, updateTableStatus, 'available')`.
- `TableCard` enters the `!isActive` branch and renders the standard Available chip — the `|| 'NA'` fallback never fires.

### 2.2 BUG-042-C Hold contract preserved
- `update-order` / `update-order-target` / `update-order-source` / `update-item-status` + `fOrderStatus === 9` still produce `'occupied'` (NOT `'available'`).
- 4 narrowed parametrized tests + 1 explicit regression test lock this behaviour.

### 2.3 Regression anchors (all green)
- Status 6 (paid) → removed + Available.
- Status 3 (cancelled) → removed + Available.
- Status 7 (YTC) → updated in place, not removed.
- Status 8 / Status 9 insertion guards on `new-order` / `scan-new-order` preserved.

### 2.4 Static + automated verification (re-stated)
- ESLint clean on `socketHandlers.js` + tests.
- 15/15 tests pass (BUG_042_C_handlers.test.js).
- No new external imports; no payload-shape change.

---

## 3. What Was Intentionally NOT Changed (re-stated)

- `TableCard.jsx` `|| 'NA'` fallback — not touched; auto-corrects via upstream fix.
- `TableContext.updateTableStatus` reducer.
- `OrderContext.removeOrder`.
- `useSocketEvents` dispatcher.
- `statusHelpers.js` (`TABLE_ACTIVE_STATES`, `ORDER_TO_TABLE_STATUS`).
- `orderTransform.js` — no payload shape change.
- `CollectPaymentPanel.jsx` PayLater write path.
- Room / TakeAway / Delivery rendering branches.
- Backend / any API / any socket emission.
- `/app/memory/final/*`.
- `/app/memory/BUG_TEMPLATE.md`.
- Other bugs' surfaces (BUG-042-B, BUG-044 modal residue, BUG-038 CRM autofill).

---

## 4. Closure Checklist

- [x] Implementation complete — `BUG_049_IMPLEMENTATION_SUMMARY.md`.
- [x] QA passed — `BUG_049_QA_REPORT.md` (15/15 tests + lint clean).
- [x] Owner preprod smoke — 7/7 PASS (this document).
- [x] No code changes during smoke step.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-049 row in `BUG_TEMPLATE.md` to Closed.

---

## 5. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-049 is functionally complete and owner-smoke-verified on preprod. Ready for tracker keeper to mark Closed.

### Known follow-ups (out of scope)
- **BUG-044** — different surface (stale items in modals on freed tables, not stuck table-status label). Remains parked pending runtime reproduction; BUG-049 fix does not automatically resolve it.
- **Duplicate-invocation hygiene** — screenshot showed two copies of the status-9 handler sequence for one socket event. Harmless after BUG-049 fix; deferred as a separate hygiene ticket.

---

*End of BUG-049 Smoke Sign-off. Bug closed.*
