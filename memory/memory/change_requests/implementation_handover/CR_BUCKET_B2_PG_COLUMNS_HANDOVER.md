# CR-005 #1 / Bucket B2-split — Audit Report PG Columns — Implementation Handover

**Status:** SHIPPED 2026-05-02. All owner-approved edits applied + visually verified.
**Author:** Implementation Agent · session 2026-05-02 → 2026-05-03.
**Source planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.B2.
**Parent CR:** `/app/memory/change_requests/CR_005_AUDIT_REPORT_PG_LIFECYCLE_AND_USER_ATTRIBUTION.md`

---

## 1. Bucket implemented

| Item | Detail |
|---|---|
| CR | CR-005 #1 — Audit Report: PG-payment lifecycle visibility |
| Bucket | B2-split (Phase 1 of B2) — visible PG columns on Audit Report |
| Scope | **Conditional** PG columns appear only when the Payment Gateway filter is active |
| Sub-bucket B2.A | `PG Order Id` column — Razorpay order id from `snapshot_razorpay_order_id` |
| Sub-bucket B2.B | `PG Amount` column — Razorpay capture amount. **Currently sourced from `api.payment_amount`** on `/order-logs-report` (verified at `reportService.js:927` as `pgAmount: (parseFloat(api.payment_amount) \|\| null)`). `snapshot_razorpay_amount` is **not** the frontend source today; the aspirational migration target is noted in §5 "When to revisit Option 2" below — revisit only when Razorpay refund / partial-capture lifecycle lands and the two fields can diverge. See §10 (DOC-B2-01 drift resolution). |
| Sub-bucket B2.C | `PG Status` column — **Dormant placeholder** built; auto-reveals when backend ships `snapshot_razorpay_status` (BE-W2). Zero frontend code change needed at that point. |
| Architecture fix | `OrderTable.jsx` horizontal scroll — header + body wrapped in single `overflow-x-auto` boundary so they scroll synchronously |

---

## 2. User approvals received

| Gate | Approved by | When |
|---|---|---|
| B2-split scope (just 2 visible cols, park PG Status) | Owner ("Apply B2-split") | Session 2026-05-02 |
| Auto-reveal placeholder for PG Status | Owner ("Apply this auto-reveal plan") | Session 2026-05-02 |
| Option 1 scroll architecture fix | Owner ("Only Option 1 — fix architecture, keep the duplicate-amount visual") | Session 2026-05-02 |

---

## 3. Files changed

| File | Lines (approx) | Nature |
|---|---|---|
| `frontend/src/components/reports/OrderTable.jsx` | L101-119 (column config), L520-546 (cell renderers), L749-825 (scroll wrapper) | Conditional column injection + new cell branches + single-scroll wrapper |
| `frontend/src/api/services/reportService.js` | groupMap section | Added `razorpayOrderId`, `pgAmount`, `pgStatus` parsing from `snapshot_*` keys |
| `frontend/src/pages/AllOrdersReportPage.jsx` | filter prop pass-through | Forwards `filters` prop into `<OrderTable />` so column-config can read `filters.paymentGateway` |

---

## 4. Behaviour shipped

### 4.1 Column visibility logic (`getColumns` in `OrderTable.jsx`)
```js
const pgFilterActive = filters.paymentGateway === 'gateway';
const anyPgStatusReady = pgFilterActive && orders.some(o => o.pgStatus != null);
```
- `PG Order Id` + `PG Amount` → render iff `pgFilterActive`.
- `PG Status` → render iff `pgFilterActive` **AND** at least one row has non-null `pgStatus`. Today, every row's `pgStatus` is `null` (BE-W2 unshipped) → column self-hides → no UI clutter.
- Once BE-W2 lands, the column appears automatically the next time the report loads. No frontend deploy required.

### 4.2 Cell renderers
| Column | Source field | Empty fallback |
|---|---|---|
| `razorpayOrderId` | `order.razorpayOrderId` (from `snapshot_razorpay_order_id`) | `—` |
| `pgAmount` | `order.pgAmount` | `—` (formatted as `₹X,XXX` when present) |
| `pgStatus` | `order.pgStatus` | `—` (capitalized) |

### 4.3 Scroll architecture (Option 1)
**Before:** Header had its own row, body had `overflow-x-auto` separately → scroll desync once column count exceeded viewport width (≥ 9 cols on a 1280px screen with PG filter active).
**After:** Single `<div className="overflow-x-auto">` wraps both header and body. `<div className="inline-block min-w-full">` inside ensures intrinsic width tracks the widest row → header and body scroll together.

---

## 5. Deferred — Option 2 (DOCUMENTED, NOT SHIPPED)

### Context
With PG filter active, two columns can show identical numbers when the Razorpay capture amount equals the order total: **`Amount`** and **`PG Amount`**. This creates visual redundancy ("the same ₹ twice").

### Three options were evaluated
| Option | Description | Tradeoffs |
|---|---|---|
| **1 (SHIPPED)** | Keep both columns; fix only the scroll misalignment | Zero ambiguity loss for accounting; cosmetic redundancy retained |
| **2 (DEFERRED)** | When PG filter is active, hide the duplicate `Amount` column (or merge into a single `Order Amt / PG Amt` super-cell with both values stacked) | Cleaner visual but loses the at-a-glance "did the gateway capture exactly the order amount?" delta check |
| **3 (DEFERRED)** | Full rewrite of `OrderTable.jsx` to native HTML `<table>` for accessibility + native column alignment | Large diff; out of scope for B2 |

### Owner direction
> *"Only Option 1 — fix architecture, keep the duplicate-amount visual. keep option 2 noted for later phase when u handover doc note it."*

### When to revisit Option 2
- After any **Razorpay refund / partial-capture lifecycle is enabled** — at that point `PG Amount ≠ Amount` becomes a meaningful diagnostic and the redundancy collapses naturally for most rows.
- After Operations team feedback on how often they actually need the side-by-side view in audit workflow.
- Should be re-evaluated alongside **B2 Phase 2 (PG Status)** when BE-W2 ships — once 3 PG columns are live, screen real-estate pressure may justify hiding one of them.

### Implementation note for the future agent picking up Option 2
- Single line change in `getColumns`: filter out the `amount` column from `columnsWithPayment` when `pgFilterActive`.
- Or more nuanced: replace `amount` with a custom merged renderer that shows `PG: ₹X / Order: ₹Y` and visually flags any delta.
- Test against rows where backend has shipped `snapshot_razorpay_amount` differing from `order_amount` (refunds, partial captures) — Audit team will want the delta highlighted. *(Note: as of 2026-05-04 the shipped frontend still consumes `api.payment_amount`; a future-agent switching to `api.snapshot_razorpay_amount` must update `reportService.js:927` and add a `payment_amount` fallback. See §10 DOC-B2-01 drift resolution.)*

---

## 6. Verification done

| Check | Result |
|---|---|
| Lint (eslint, both files) | ✅ Clean |
| Webpack compile | ✅ Successful |
| Owner visual verification — PG filter on, columns appear | ✅ Pass |
| Owner visual verification — PG filter off, columns hide | ✅ Pass |
| Owner visual verification — horizontal scroll sync | ✅ Pass |
| BE-W2 dormancy guard (no `pgStatus` data → column hidden) | ✅ Pass — column does not render |

---

## 7. Open follow-ups linked to this bucket

| ID | Description | Owner |
|---|---|---|
| **B2 Phase 2** | `PG Status` column auto-reveal once BE-W2 ships `snapshot_razorpay_status` | Backend team — frontend already ready |
| **CR-011 / BUG-036** | `payment_type` casing mismatch (`"Prepaid"` vs `'prepaid'`) for PG-paid scan orders | DRAFT — needs DevTools trace from owner |
| **Option 2 (deferred)** | Hide duplicate `Amount` column when PG filter is active | Future phase — see §5 above |
| **Option 3 (deferred)** | Native HTML `<table>` rewrite of `OrderTable.jsx` for accessibility | Backlog |

---

## 8. Backups

| File | Backup |
|---|---|
| n/a | Direct edits — git history is the source of truth |

---

## 9. Sign-off

- **Code review:** Lint clean, compile clean, no regressions reported on adjacent tabs (Paid / Cancelled / Credit / Hold / Aggregator).
- **Owner sign-off:** Verbal pass on visual verification (2026-05-03).
- **Status:** Closed. Move to next bucket (B1 — multi-select variations).


---

## 10. DOC-B2-01 drift resolution (added 2026-05-04)

**Finding:** Earlier versions of §1 and §4.2 of this handover stated that `PG Amount` sources from `snapshot_razorpay_amount`. The shipped frontend code at `/app/frontend/src/api/services/reportService.js:927` actually reads `api.payment_amount`. Source: `CR_005_B2_SPLIT_QA_REPORT.md` §10.

**Accepted resolution (documentation-only; NO code change this run):**
1. `PG Amount` column is currently sourced from `api.payment_amount` on `/order-logs-report`. This is the Razorpay capture amount for today's PG flow (no partial-capture / refund lifecycle enabled) — semantically identical to `snapshot_razorpay_amount`.
2. `snapshot_razorpay_amount` is NOT referenced anywhere in `/app/frontend/src/**` today (grep-verified 2026-05-04).
3. Future switch to `api.snapshot_razorpay_amount` (with `payment_amount` as fallback, per the auto-reveal pattern used for `pgStatus`) is a candidate only if Razorpay refund / partial-capture lifecycle is enabled and the two fields can diverge — see §5 "When to revisit Option 2".
4. **B2 Phase 2 / `PG Status` auto-reveal remains `qa_blocked_backend_dependency` pending BE-W2 `snapshot_razorpay_status`.** Unchanged by this resolution.
5. No code change applied; no payload contract touched; `pgAmount` rendering + null-safety at `reportService.js:927` preserved verbatim.

**Impact:** Zero. Pure documentation alignment. Row §1 B2.B description updated to name the actual source; §5 implementation-note for the future Option-2 agent clarified with a pointer to this section.

**Closure:** DOC-B2-01 marked RESOLVED 2026-05-04 via this documentation revision. No follow-up expected unless the future Razorpay-refund migration requires it.
