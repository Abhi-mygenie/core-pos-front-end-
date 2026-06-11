# FE-3: Audit Report — SRM `transferToRoom` Badge Derivation Fix

**Ticket type:** Frontend-only
**Owner CR:** CR-001 (Audit Report status derivation)
**Drafted:** 2026-04-29
**Status:** `ready_to_implement` — independent of all other CR-001/004 tickets
**Estimated effort:** ~1–2 hours including manual smoke

**Supersedes:** Bucket B / **G1** in `CR_004_BACKEND_EXT_sub_cr.md` (no longer a backend ask — frontend has the data it needs).

---

## 1. Problem Statement

In the Audit Report (`/reports/audit` and the All-Orders report's All / Paid / Unpaid tabs that include SRMs), `transferToRoom` rows are misclassified.

### Current (broken) frontend rule
There is an existing override in `reportService.js` / `reportTransform.js` that forces every row with `payment_method === 'transferToRoom'` to `status = 'running'`, regardless of any other field. This was put in place because the backend stamps `payment_status: "paid"` at transfer-time (premature — the room hasn't paid yet). Forcing-to-running was correct for the *in-house* case.

### What's wrong
The override is too blunt. It stays `running` *forever*, even after the room has actually checked out and the SRM is genuinely settled. Operators see settled SRMs perpetually parked under "Running".

### What you've now confirmed about the data
After the room is checked out and associated orders are settled, on the SRM row itself:
- `f_order_status` flips to **6**
- `payment_method` is replaced with a real method (`cash` / `card` / `upi` / etc.) — i.e. it stops saying `"transferToRoom"`

These two transitions on the SRM row alone are enough — no need for a new backend field, no need to look at the parent room.

---

## 2. The fix — replace the blunt override with a conditional rule

```js
// Current (broken) — pseudo:
if (row.payment_method === 'transferToRoom') {
  row.status = 'running';
}

// Replace with:
if (row.payment_method === 'transferToRoom') {
  row.status = 'running';                       // still attached, room not checked out
}
// Else: let the existing derivation chain handle it. Once payment_method has
// flipped to cash/card/upi AND f_order_status === 6, it will already derive to 'paid'
// via the standard CR-001 rules. NO NEW BRANCH NEEDED — we're just removing the
// over-broad override.
```

**Insight:** the override only needs to handle the `transferToRoom` case (room not yet settled). After settlement the `payment_method` is no longer `transferToRoom`, so the override doesn't fire and the row falls into the normal derivation chain — which already produces `paid` for `f_order_status === 6` + real payment method. **The fix is to *narrow* the override, not to add a new rule.**

---

## 3. File to modify

Search the codebase for the existing override. Most likely location:
- `frontend/src/api/transforms/reportTransform.js` — the audit report row transform
- `frontend/src/api/services/reportService.js` — possibly a post-transform massage step

```bash
cd /app/frontend/src
grep -rn -E "transferToRoom" api/transforms api/services pages components | head -20
```

The override is a single conditional. Confirm by inspection that:
1. The override fires ONLY when `payment_method === 'transferToRoom'` (don't broaden the trigger).
2. The fall-through path correctly derives `paid` when `f_order_status === 6` AND `payment_method ∈ {cash, card, upi, online, …}`. (CR-001 Phase 2 derivation should already do this — verify with one cancelled-and-settled SRM in preprod.)

---

## 4. Acceptance Criteria

- AC-3.1 (in-house SRM): An SRM with `payment_method: "transferToRoom"`, `payment_status: "paid"`, `f_order_status: 6` displays as `Running`.
- AC-3.2 (settled SRM): The same SRM, after the room has checked out and the SRM has `payment_method: "cash"`, `f_order_status: 6` displays as `Paid`.
- AC-3.3 (cancelled SRM): An SRM with `payment_method: "transferToRoom"` that was later cancelled (`f_order_status: 3` or `payment_method: "Cancel"`) displays as `Cancelled` (existing CR-001 derivation handles this — verify no regression).
- AC-3.4 (audit tab): On `/reports/all-orders` Audit tab, no SRM rows misclassified.
- AC-3.5 (regression — non-room orders): Dine-in / takeaway / delivery orders are unaffected.

---

## 5. Test cases (manual)

### 5.1 Live preprod
1. Find a room currently in-house with at least one SRM transferred (e.g. `r1` mid-stay). On `/reports/all-orders`, confirm the SRM appears under Running.
2. Check out the room. On the next list refresh, the SRM should now appear under Paid (not Running).
3. Open the SRM row's side panel → status badge reads `Paid`. *(Note: pending the §0 audit-side-panel stale-Paid investigation in FE-2; if backend `/get-single-order-new` is stale, the side-panel issue stays separate from this ticket's scope.)*

### 5.2 Edge cases
| Case | Expected |
|---|---|
| SRM transferred, room still in-house | `Running` |
| SRM transferred, room checked out, this SRM settled | `Paid` |
| SRM transferred, then cancelled before checkout | `Cancelled` |
| SRM transferred, then merged | `Merged` |
| SRM with `payment_method: "transferToRoom"` and `f_order_status: 1` (queue) | `Running` |

---

## 6. Out of scope

- Backend changes (G1 in the parent sub-CR is now obsolete).
- Side-panel stale-Paid issue (separate — `OrderDetailSheet.jsx`, see FE-2 §0).
- Room Orders Report — different page, unaffected by this fix.
- The two-source data layer for Room Orders Report (FE-1).

---

## 7. Risk

**Low.** Single conditional, well-scoped. Reviewer must confirm the override doesn't fire on other `payment_method` values (it shouldn't — the existing condition is exact-match).

---

## 8. Definition of Done

- [ ] Override narrowed to fire only when `payment_method === 'transferToRoom'` (verify it doesn't accidentally fire on related strings).
- [ ] AC-3.1 through AC-3.5 pass on preprod with at least one room mid-stay and one room recently checked out.
- [ ] Parent sub-CR `CR_004_BACKEND_EXT_sub_cr.md` updated: G1 marked **withdrawn — superseded by FE-3**.
- [ ] CR-001 implementation summary noted with this fix.

---

## 9. TL;DR

> The audit-report override that forces `transferToRoom` rows to `Running` is too blunt — it never lets them flip to `Paid`. Backend already provides the data we need (after room checkout, the SRM's `payment_method` changes to a real method and `f_order_status` becomes 6). Just narrow the override to fire only while `payment_method === "transferToRoom"`, and let the existing CR-001 derivation chain handle the post-settlement case naturally. ~1 file, ~3 lines, ~2 hours.
