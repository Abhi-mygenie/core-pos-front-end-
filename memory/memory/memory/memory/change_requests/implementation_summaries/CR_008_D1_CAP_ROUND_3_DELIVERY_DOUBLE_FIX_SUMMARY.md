# CR-008 Sub-CR #1 — D1-Cap Round-3 Delivery Double-Count Hotfix · Closure Summary

**Type:** Implementation closure summary (doc only — no source change in this run)
**Agent:** CR-013 / CR-008 Round-3 Continuation + Approval-Gate Agent
**Date:** 2026-05-05
**Branch:** `5may`
**Status:** **`shipped_round_3_hotfix_verified_on_disk`**

> Strict scope. This run did not change source. It verified that the previous agent's Round-3 hotfix is on disk, recorded the closure check, and authored this summary to fill a missing handover artifact. No `/app/memory/final/` edits. No backend touch. CR-013 D-GST-1 / D-GST-2 / G3 untouched. D-GST-3 / D-GST-4 NOT implemented (held for owner approval; see `CR_013_DISPLAY_BREAKDOWN_PLAN.md`).

---

## 1. Bug summary

After CR-008 Sub-CR #1 D1-Cap Round-2 (delivery-into-totals fold) shipped, a second-order interaction was observed:

- **Pre-place branch:** OrderEntry's `total` excluded delivery; CartPanel's "Collect Bill" button label added `+ deliveryCharge` to compensate. Correct.
- **Placed branch:** Round-2 made `orderTransform.calcOrderTotals` fold delivery into the backend-echoed `orderFinancials.amount`. So `total` already had delivery baked in; CartPanel's `+ deliveryCharge` then **double-counted** delivery on the button label.

This was display-only on the button's *label*; the *outbound payload* was correct (delivery folded once via backend echo on placed orders, and once via local fold on pre-place). But the cashier saw an inflated grand-total preview, which is the same surface CR-008 Sub-CR #1 D1-Cap-R1 was originally meant to fix.

**Severity:** Medium (cosmetic on placed branch; pre-place branch was correct).
**Surface:** OrderEntry → CartPanel "Collect Bill" button label.

---

## 2. Files changed (verified on disk · this run)

| File | Lines | Change | Backup |
|---|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | L687-698 | `total` is now symmetric across the placed/unplaced split. New `deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0`. Pre-place branch: `applyRoundOff(rawLocalTotal) + deliveryAddOn`. Placed branch: `(orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)` — already includes delivery via Round-2 backend echo. | `OrderEntry.jsx.bak.cr008r3` ✅ |
| `frontend/src/components/order-entry/CartPanel.jsx` | L863-868 | Removed `+ (orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0)` from the button label total. Inline comment block (L863-867) records why. | `CartPanel.jsx.bak.cr008r3` ✅ |

Both backups exist on disk and were verified in this run.

---

## 3. Exact before / after behaviour

### Pre-place branch (no items placed yet)
| Aspect | Before Round-3 | After Round-3 |
|---|---|---|
| `OrderEntry.total` | `applyRoundOff(rawLocalTotal)` (no delivery) | `applyRoundOff(rawLocalTotal) + deliveryAddOn` |
| `CartPanel` button label | `total + deliveryCharge + roomBits` | `total + roomBits` |
| Net delivery in button label | added once via CartPanel | added once via OrderEntry symmetric fold |
| **Net effect** | **CORRECT** | **CORRECT (semantics preserved)** |

### Placed branch (some/all items placed; `hasPlacedItems = true`)
| Aspect | Before Round-3 | After Round-3 |
|---|---|---|
| `OrderEntry.total` | `(orderFinancials.amount \|\| 0) + applyRoundOff(rawUnplacedTotal)` — delivery folded once via Round-2 backend echo | Same |
| `CartPanel` button label | `total + deliveryCharge + roomBits` — delivery added a SECOND time | `total + roomBits` |
| Net delivery in button label | **added twice → ₹X inflated** | added once |
| **Net effect** | **WRONG (double-count)** | **CORRECT** |

The placed-branch double-count was the bug. Round-3 cures it by rebalancing where the addition lives (always inside `total` via OrderEntry, never again inside CartPanel's label).

---

## 4. Why delivery is no longer double-counted

1. **Single source of truth for delivery in `total`** — OrderEntry now adds delivery exactly once:
   - placed → via `orderFinancials.amount` (delivery folded inside `calcOrderTotals` per Round-2)
   - pre-place → via `+ deliveryAddOn`
2. **CartPanel button label no longer compensates** — it was compensating for the pre-place gap; now there is no gap to compensate for.
3. **Outbound payload unchanged** — `delivery_charge` is still computed and sent identically (Round-1 + Round-2 plumbing intact). This was a label-only divergence; correctness of the wire was never broken.

---

## 5. CR-008 D1-Gate preservation check

| Surface | Status |
|---|---|
| `CollectPaymentPanel.jsx` `readOnly={isPrepaid}` (D1-Gate) | **UNTOUCHED** — Round-3 edits did not enter `CollectPaymentPanel.jsx` |
| `isPrepaid` derivation at `OrderEntry.jsx:651-652` | **UNTOUCHED** |
| Tri-state tooltip (G-03 / G-04 / G-05 in CR-008 Sub-CR #1 QA report) | **UNTOUCHED** |
| Anti-tamper lock for prepaid scan / customer-app delivery orders | **PRESERVED** |

---

## 6. CR-013 D-GST-1 / D-GST-2 / G3 preservation check

| Bucket | Surface | Round-3 impact |
|---|---|---|
| **D-GST-1 (parse)** | `profileTransform.js` exposes `serviceChargeTaxPct` + `deliveryChargeGstPct` (L135-136) | **UNTOUCHED** |
| **D-GST-2 (apply)** | `CollectPaymentPanel.jsx` L372-378 (`scTaxRate`, `delTaxRate`, `scGst`, `tipGst`, `deliveryGst`) | **UNTOUCHED** |
| **D-GST-2 (apply)** | `orderTransform.calcOrderTotals` L559-595 (rate-driven multipliers in extras) | **UNTOUCHED** |
| **G3 (re-print fallback)** | `orderTransform.buildBillPrintPayload` L1351-1359 (rate-driven recompute via overrides) | **UNTOUCHED** |
| **G3 (re-print invocation)** | `RePrintButton.jsx` (`*.bak.cr013` backup) | **UNTOUCHED** |

Round-3 lives entirely in OrderEntry's `total` composition + CartPanel's button label string. It does not touch any GST / tax / payload site.

---

## 7. Validation status

| Check | Status this run | Source |
|---|---|---|
| On-disk verification of OrderEntry.jsx L687-698 | ✅ Confirmed exact text match | view_file output |
| On-disk verification of CartPanel.jsx L863-868 | ✅ Confirmed `+ deliveryCharge` removed | view_file output |
| Backups present | ✅ `OrderEntry.jsx.bak.cr008r3` (105 KB) + `CartPanel.jsx.bak.cr008r3` (42 KB) | ls -la |
| Lint (frontend) | ⏸ Previous agent reported "lint passed for both files"; not re-run in this run (doc-only run) | — |
| Boot smoke | ⏸ Previous agent reported "boot smoke passed"; not re-run in this run (doc-only run) | — |
| Webpack compile | ⏸ Last verified in deployment session (frontend service "Compiled successfully") | supervisor frontend log |
| 17-scenario CR-008 Sub-CR #1 runtime walkthrough | ⏸ Still runtime-blocked on Palm House preprod creds, per `CR_008_SUB_1_QA_REPORT.md` §5 | — |

**Validation still needed (next session, when preprod wakes):**
- 1 owner-anchored runtime spot-check that the Collect Bill button label on a placed delivery order matches the CollectPaymentPanel grand total to the rupee (i.e. proves the double-count is gone).
- Re-run lint on `OrderEntry.jsx` + `CartPanel.jsx` and capture the result here for audit completeness.

---

## 8. Print-scope clarification (recorded for downstream agents)

The frontend does **not** render the printed bill. Verified this run:

- `orderService.printOrder` (`/app/frontend/src/api/services/orderService.js:120-138`) builds a payload via `toAPI.buildBillPrintPayload(...)` and POSTs it to `API_ENDPOINTS.PRINT_ORDER`.
- `API_ENDPOINTS.PRINT_ORDER = '/api/v1/vendoremployee/order-temp-store'` (`/app/frontend/src/api/constants.js:60`).
- The backend renders the physical / PDF receipt template from this payload.

**Implication for any future component-wise display work (D-GST-4):**
- FE-only D-GST-4 can render the per-component breakdown on the **Collect Bill UI** unconditionally.
- Sending additional payload fields on the print POST is harmless if backend ignores unknown fields.
- **Printed-bill parity requires backend confirmation/update.** If the backend print template is hardcoded, a backend ticket is required (BE-G10 / BE-G11 / BE-G9).

This clarification is also recorded in `CR_013_DISPLAY_BREAKDOWN_PLAN.md` §1 + the new BE-G10/G11 register.

---

## 9. Recommendation

1. **Accept Round-3 hotfix as `shipped_round_3_hotfix_verified_on_disk`.** No source change pending; doc artifact (this file) now exists.
2. **Retain backups** (`*.bak.cr008r3`) until owner verification completes the next runtime sweep — same convention as Sub-CR #1 rollback playbook §5.
3. **Re-run lint + boot-smoke** as part of the next implementation session for audit completeness (5-minute task).
4. **No CR-008 D1-Gate or CR-013 D-GST-1/2/G3 follow-up** is required from Round-3.

---

## 10. Trail of artifacts

- `/app/memory/change_requests/qa_reports/CR_008_SUB_1_QA_REPORT.md` (P1, 2026-05-03 — original Sub-CR #1 closure)
- `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md` (Round-2 totals fold)
- `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` (rollback recipe — Round-3 follows the same convention)
- `/app/memory/change_requests/implementation_plans/CR_013_DISPLAY_BREAKDOWN_PLAN.md` (records Round-3 as shipped + opens D-GST-3 / D-GST-4 approval gate)
- This file (closure summary)

---

**Stop. No source changed in this run. CR-008 D1-Gate untouched. CR-013 D-GST-1 / D-GST-2 / G3 untouched. D-GST-3 / D-GST-4 NOT implemented (held for owner approval). `/app/memory/final/` UNTOUCHED.**

— End of CR-008 Sub-CR #1 Round-3 Closure Summary —
