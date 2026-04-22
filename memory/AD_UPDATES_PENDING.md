# AD_UPDATES_PENDING

> **Purpose**: This file lists architecture-decision updates that are required because of implementation changes already landed in code. It is a **handoff to the documentation agent** — the implementation agent is intentionally NOT updating `ARCHITECTURE_DECISIONS_FINAL.md` directly.
>
> **Protocol**:
> 1. Implementation agent adds entries here when code changes materially shift the behavior documented in an existing AD.
> 2. Documentation agent validates each entry against the actual code, then applies the corresponding update to `ARCHITECTURE_DECISIONS_FINAL.md`.
> 3. Documentation agent deletes the entry (or moves to a `# Completed` section) once the AD is updated.

---

## Entry #1 — AD-101 (Service charge application point in billing)

**Source**: BUG-006 fix (Apr-2026)
**Status**: Pending doc-agent validation + AD update

**Current AD text (in `ARCHITECTURE_DECISIONS_FINAL.md`)**
- Validation tag: `[DECISION ONLY - NOT IMPLEMENTED]`
- Note: "Current code still computes service charge from pre-discount `itemTotal` in `CollectPaymentPanel.jsx`."

**Requested change**
- Flip validation tag to: `[CONFIRMED FROM CODE]`
- Update the note to: *"Implemented as BUG-006 fix (Apr-2026). Service charge is now computed on `subtotalAfterDiscount` in `CollectPaymentPanel.jsx`, and `calcOrderTotals` / `buildBillPrintPayload` in `orderTransform.js` apply the same rule across `order-bill-payment`, `place-order` (prepaid Place+Pay), and `order-temp-store` (bill print) payloads."*
- **Append a new addendum line** to the AD recording the Apr-2026 business decision:
  > *"Addendum (Apr-2026, business decision): GST applies to every taxable component of the bill — items (on post-discount base), service charge, tip, and delivery charge — using the weighted-average item GST rate as the markup rate for SC/tip/delivery. This is enforced uniformly in UI display, bill print payload, and collect-bill payload."*

**Code evidence doc-agent must verify before updating AD**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — lines ~216–239: SC base is `subtotalAfterDiscount`; tax block applies `(1 − discountRatio)` to item GST; `scGst`, `tipGst`, `deliveryGst` computed at `avgGstRate`.
- `frontend/src/api/transforms/orderTransform.js` — `calcOrderTotals` signature now accepts `{ discountAmount, tipAmount, deliveryCharge }` extras; `placeOrderWithPayment` threads paymentData.{discounts.total, tip, deliveryCharge}; `buildBillPrintPayload` default branch honors `overrides.discountAmount` in SC base.

---

## Entry #2 — AD-105 (Tax consistency between collect-bill UI and printed bill)

**Source**: BUG-006 fix (Apr-2026)
**Status**: Pending doc-agent validation + AD update

**Current AD text**
- Validation tag: `[DECISION ONLY - PARTIALLY IMPLEMENTED]`
- Note: "Code still contains separate UI tax and print-tax paths."

**Requested change**
- Flip validation tag to: `[CONFIRMED FROM CODE]`
- Replace the note with: *"(Apr-2026) Separate `printTaxTotals` memo removed as part of BUG-006 fix. UI `sgst`/`cgst` are now the single source of truth for both `paymentData` (→ `order-bill-payment`) and bill print overrides (→ `order-temp-store`)."*

**Code evidence doc-agent must verify**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — the old `printTaxTotals` `useMemo` block is gone; `handlePrintBill` builds `overrides.gstTax` from `Math.round((sgst + cgst) * 100) / 100`; `handlePayment` `paymentData.printGstTax` / `printVatTax` mirror the same UI values.

---

## Entry #3 — AD-302 (Bill print consistency with collect-bill edits) — Light touch-up

**Source**: BUG-006 fix (Apr-2026)
**Status**: Pending doc-agent validation + AD update

**Current AD text**
- Validation tag: `[DECISION ONLY - PARTIALLY IMPLEMENTED]`
- Note: "Current code passes collect-bill overrides into print flow, but separate calculation paths still exist."

**Requested change**
- Re-assess tag: doc-agent to decide between `[DECISION ONLY - PARTIALLY IMPLEMENTED]` (if more AD-302-scoped work remains elsewhere) OR `[CONFIRMED FROM CODE]` (if print-consistency is now sufficiently implemented for AD-302's scope).
- If flipped, append: *"(Apr-2026) Separate print-only calculation path removed in BUG-006. Print payload now reuses UI-computed tax values directly."*

**Code evidence**
- Same as Entry #2.

---

## Entry #4 — Related notes that do NOT need AD changes (documented here for doc-agent awareness)

- **AD-001** (rounding rule `diff >= 0.10` → ceil, else floor): unchanged. BUG-006 preserved this verbatim in both `CollectPaymentPanel.jsx` (`roundOff`/`finalTotal` block) and `orderTransform.js` `calcOrderTotals`.
- **AD-401 / AD-402** (phase-based financial ownership, settlement-time frontend values become persisted): unchanged. BUG-006 reinforces these by making the corrected frontend values the single source of truth at settlement.
- **AD-502** (service-charge toggle default): unchanged. BUG-006 preserved the existing `serviceChargeEnabled` toggle behavior.
- **Clarification Q-6** (referenced in pre-BUG-006 inline comments about "UI sgst/cgst and paymentData.sgst/cgst stay gross to avoid backend regression"): resolved in practice by the Apr-2026 business decision to treat frontend tax values as authoritative. Doc-agent may choose to record Q-6 resolution as a new AD or as a note on AD-105.

---

## Entry #6 — BUG-007 backend persistence gap for `delivery_address` (Apr-2026)

**Source**: BUG-007 frontend fix + preprod cURL validation on 2026-04-20.
**Status**: **HANDOFF TO BACKEND TEAM** — frontend side is shipped; backend side is unresolved.

**Problem**
The frontend now sends a structured `delivery_address` object in `place-order` payloads (postpaid + prepaid Place+Pay) for delivery orders, alongside the existing `address_id`. Preprod backend accepts the payload (HTTP 200) and creates the order, but the `delivery_address` column in the persisted record is `None` — the object we send is silently dropped at the storage layer.

**Payload (exact shape frontend sends)** — confirmed with user + frozen on 2026-04-20:
```json
"delivery_address": {
  "contact_person_name":   "<contact name>",
  "contact_person_number": "<phone>",
  "address_type":          "Home | Work | Other",
  "address":               "<formatted address string>",
  "pincode":               "<pincode>",
  "floor":                 null,
  "road":                  null,
  "house":                 null,
  "location": {
    "latitude":  <number or null>,
    "longitude": <number or null>
  }
}
```

**Evidence of silent drop**
- cURL POST to `https://preprod.mygenie.online/api/v2/vendoremployee/order/place-order` with the above payload → HTTP 200, `order_id: 731449`.
- Subsequent POST to `/api/v2/vendoremployee/get-single-order-new` with `{order_id: 731449}` → returns `orders[0].delivery_address = None`.
- Column exists in response schema. The field was not populated from our insert.

**Action required by backend team**
1. Wire up persistence for `delivery_address` JSON object on `place-order` endpoint — either to a single JSON column or flat into individual fields.
2. Accept the exact shape above (no key-casing, no nesting changes) unless a specific alternative is returned to the frontend team.
3. Confirm response via `get-single-order-new` returns the persisted `delivery_address` object so downstream use-cases (delivery ops, bill print, reports) can consume it.

**Action required by documentation agent**
- Once backend confirms persistence is live, consider adding a new AD capturing the delivery-address contract (outbound shape + inbound shape) — or extend an existing AD if one covers delivery flows.
- No existing AD currently covers this contract explicitly; this may warrant a net-new AD.

**Action required by implementation agent** (if backend key shape differs from above)
- Adjust `buildDeliveryAddress` in `frontend/src/api/transforms/orderTransform.js` to match whatever backend confirms.
- No other files need to change; helper is the single point of contact.

**Update — Apr-21-2026 (BUG-016 runtime finding, second backend gap)**
Non-delivery (walk-in / dine-in / takeaway / room) prepaid Place + Pay fails at runtime with:
```
HTTP 500 — { "error": "Undefined array key \"delivery_address\"" }
```
Root cause: the same preprod PHP handler for `POST /api/v2/vendoremployee/order/place-order` unconditionally reads `$payload['delivery_address']` without an `isset()` / `??` guard. When the frontend correctly omits the key for non-delivery orders (per the BUG-007 gated emission above), PHP throws.

**Frontend workaround shipped (BUG-016)**: `placeOrder` and `placeOrderWithPayment` in `orderTransform.js` now always emit `delivery_address` — full object for delivery orders, `null` otherwise. This preserves BUG-007's intent (no real delivery data leaked to non-delivery orders) while preventing the PHP crash.

**Additional action required by backend team**
1. Add `isset()` / `??` guard (or `?? null` coalescing) everywhere the `place-order`, `update-place-order`, and `order-bill-payment` controllers read `delivery_address`. This is independent of, and should be shipped alongside, the persistence fix above.
2. Once the guard is in place, the frontend can (optionally, future-dated) revert to strict gating per the original BUG-016 user intent — where `delivery_address` is completely omitted for non-delivery orders.
3. Confirm whether `PUT /api/v1/vendoremployee/order/update-place-order` (Flow 2) and `POST /api/v2/vendoremployee/order/order-bill-payment` (Flow 4) exhibit the same unguarded access pattern. The frontend fix currently covers only the two flows that reach `/place-order` endpoint.

---

## Entry #5 — BUG-006 UX v1 + v2 (Collect Bill layout reorganization, Apr-2026)

**Source**: BUG-006 UX follow-up passes (Apr-2026), both scoped strictly to `frontend/src/components/order-entry/CollectPaymentPanel.jsx` JSX render tree. No math, no prop, no API, no socket change.

**AD-gap review (implementation agent)**: **NO new AD gaps introduced.**

Rationale:
- **AD-101** (SC on post-discount + GST ordering): unchanged. The UX refactor preserves the exact same computed values; it only relocates where the inputs and the computed rows are rendered on the screen.
- **AD-105** (UI-vs-print tax consistency): unchanged. The single source of truth (`sgst`, `cgst` in UI → `paymentData` → bill print overrides) is preserved.
- **AD-302** (bill print consistency with collect-bill edits): unchanged.
- **AD-502** (SC toggle default behavior): unchanged. `serviceChargeEnabled` state behavior is identical; only the toggle's JSX location changed.
- **New AD not required**: The layout decision (Adjustments panel above a read-only Bill Summary) is a UX/product pattern, not an architectural invariant. If the team wishes to codify the "read-only Bill Summary + Adjustments panel" pattern as a design decision for future payment screens, a new AD could be added — but it is not required by the current change.

**Action for documentation agent**: No AD file edits required for this UX work. This entry is recorded here solely for audit-trail completeness. Documentation agent may remove this entry after review, or keep it in a `# Completed` section as a no-op.

---

## Entry #7 — AD-001 (Rounding rule) — BUG-009 fix changes rounding behavior

**Source**: BUG-009 fix (Apr-2026)
**Status**: Pending doc-agent validation + AD update

**Current AD text (in `ARCHITECTURE_DECISIONS_FINAL.md`)**
- AD-001: "Keep the current rounding rule: if the difference to the next integer is `>= 0.10`, round up; otherwise round down."
- Validation tag: `[CONFIRMED FROM CODE]` for current duplicated rounding behavior. `[NEEDS BUSINESS CONFIRMATION]` that this remains the approved canonical rule.

**What changed in code**
- BUG-009 fix replaced the rounding condition in BOTH `CollectPaymentPanel.jsx` and `orderTransform.js` `calcOrderTotals`.
- OLD rule: `ceilTotal - rawTotal >= 0.10` → round up (checks distance-to-ceiling)
- NEW rule: `rawTotal - Math.floor(rawTotal) > 0.10` → round up (checks fractional part)
- These produce OPPOSITE results. Example: ₹1.06 was rounding to ₹2, now correctly rounds to ₹1.
- User confirmed the new rule matches old POS behavior.

**Requested change**
- Update AD-001 decision text to: *"Rounding rule for final totals: if the fractional part of the raw total is greater than 0.10, round UP (ceil); if fractional part is 0.10 or less, round DOWN (floor). Example: ₹1.06 → ₹1; ₹1.11 → ₹2."*
- Flip validation tag to: `[CONFIRMED FROM CODE]` — remove `[NEEDS BUSINESS CONFIRMATION]` since user explicitly confirmed this is the correct behavior via BUG-009 report.
- Append: *"(Apr-2026) BUG-009: Previous code checked `ceilTotal - rawTotal >= 0.10` which was inverted. Fixed to check `rawTotal - floor(rawTotal) > 0.10` — matches old POS rounding behavior per business confirmation."*

**Code evidence doc-agent must verify**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — lines ~247-253: `fractional = rawFinalTotal - Math.floor(rawFinalTotal); finalTotal = fractional > 0.10 ? ceil : floor`
- `frontend/src/api/transforms/orderTransform.js` — `calcOrderTotals` lines ~397-405: identical fractional-part logic.

---

## Entry #8 — New AD needed: Service Charge order-type gating (BUG-013)

**Source**: BUG-013 fix (Apr-2026)
**Status**: Pending doc-agent to create new AD or append to existing SC-related AD

**What changed in code**
- BUG-013 fix added order-type gating for service charge.
- Service charge now applies ONLY to dine-in, walk-in, and room orders.
- Takeaway and delivery orders get `serviceCharge = 0` and the SC toggle is hidden.
- Gated in `CollectPaymentPanel.jsx` (calculation + UI) and `OrderEntry.jsx` (3 transform call-sites pass `serviceChargePercentage: 0` for non-applicable types).

**Suggested new AD (or addendum to AD-502)**
- *"Service charge is applicable only to dine-in (`orderType === 'dineIn'`), walk-in (`orderType === 'walkIn'`), and room (`isRoom === true`) orders. Takeaway and delivery orders do not incur service charge. The SC toggle in the Collect Bill screen is hidden for non-applicable order types. Transform call-sites in OrderEntry pass `serviceChargePercentage: 0` for takeaway/delivery to ensure API payloads also exclude SC."*

**Code evidence doc-agent must verify**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — line ~221: `const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;` used in SC calculation and toggle render guards.
- `frontend/src/components/order-entry/OrderEntry.jsx` — 3 call-sites (~lines 564, 614, 1145): `serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom) ? ... : 0`

---

## Entry #9 — New guidance: discount precision is 2-decimal (BUG-020)

**Source**: BUG-020 fix (Apr-2026)
**Status**: Pending doc-agent validation + possibly a new AD for discount precision (no existing AD governs this; AD-001 is only about final-total round-off and remains unchanged).

**Relation to AD-001**
- AD-001 (final-total rounding: fractional > 0.10 → ceil, else floor) is UNCHANGED. BUG-020 is a separate precision concern for the per-component discount amounts that feed `subtotalAfterDiscount`.

**What changed in code**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — three discount expressions that previously rounded to integer have been switched to 2-decimal precision.
  - Line ~205 (preset discount): `Math.round((itemTotal * pct) / 100)` → `Math.round((itemTotal * pct)) / 100`.
  - Line ~209 (manual percent discount): same pattern.
  - Line ~218 (coupon percent discount): same pattern, inside existing `Math.min(…, maxDiscount)`.
- Effect: 10% of ₹45 now yields ₹4.50 (was ₹5). `subtotalAfterDiscount` is now 2-dp precise, which correctly cascades into Service Charge base, GST base, and pre-tax Subtotal.
- User directive (Apr-2026): "no round off in discount". Grand-Total ceil/floor per AD-001 is explicitly still in force.

**Requested AD change**
- Consider adding a new AD (e.g. AD-001A or under billing-calculation section) stating: *"Discount amounts (preset, manual percent, coupon percent) must be computed at 2-decimal precision. Integer rounding must not be applied to any discount component. Final-total rounding per AD-001 applies only at the end of the calculation chain."*
- Validation tag: `[CONFIRMED FROM CODE]` post-fix.

**Code evidence doc-agent must verify**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — lines ~202-227 (discount computation block) + BUG-020 comment at top of that block.

---

## Entry #10 — New frontend-authoritative channel for runtime complimentary on print (BUG-021)

**Source**: BUG-021 fix (Apr-2026)
**Status**: Pending doc-agent review; does not change any existing AD but extends the BUG-018 complimentary contract.

**What changed in code**
- `frontend/src/api/transforms/orderTransform.js` — `buildBillPrintPayload` now accepts a new override key `runtimeComplimentaryFoodIds` (array of food IDs / item IDs). The `isDetailComplimentary(d)` predicate was extended to treat a raw detail as complimentary when its `food_id` or `item_id` is in this array — in addition to the existing catalog (`food_details.complementary === 'Yes'`) and raw runtime (`is_complementary === 'Yes'`) checks.
- `frontend/src/components/order-entry/OrderEntry.jsx` — `AutoPrintCollectBill` now forwards this list from `cartItems` (items with `isComplementaryRuntime === true` and `status !== 'cancelled'`).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `handlePrintBill` (manual Print Bill) forwards the same list for consistency.
- Rationale: the postpaid auto-print path fires before any socket re-engage after `order-bill-payment`, so `rawOrderDetails[].is_complementary` is stale even though `collectBillExisting` sent the updated flag. The override makes the carve-out frontend-authoritative on the print payload, mirroring the approach taken for subtotal / tax overrides under BUG-006 / BUG-018 Part 3.

**Backend notes**
- No API contract change. The override travels inside `overrides` to `buildBillPrintPayload` only; the outgoing `order-temp-store` payload shape is unchanged (prices/tax simply zeroed on the flagged lines, same as catalog-complimentary behaviour).
- Backend persistence of `is_complementary` through `order-bill-payment` remains a separate open item; this fix does not depend on it.

**Requested AD change**
- Optional: append to the BUG-018 "Complimentary Items" section (if one is created in AD) to document that print-time complimentary carve-out now has three equivalent sources (catalog flag, raw-detail flag, frontend override list).

---

## Entry #11 — Display parity for cancelled items on Collect Bill page (BUG-022)

**Source**: BUG-022 fix (Apr-2026)
**Status**: Display-only; no AD changes required.

**What changed in code**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — the main Bill Summary items loop (default table/room layout) and the Room Service items loop (room-with-associated-orders layout) now compute `isCancelled = item.status === 'cancelled'` and apply `textDecoration: line-through` + gray color (`#9CA3AF`) to the item name and price, matching the existing pattern in `CartPanel.jsx` on the Order page. A small "(Cancelled)" label is shown next to the item name for accessibility.
- Complimentary checkbox is disabled for cancelled lines.
- No math / payload / socket changes. `activeItems` / `billableItems` already excluded cancelled lines from totals; this fix is purely display-parity.

**Requested AD change**
- None. (Could optionally document "cancelled items must render with strikethrough on any page that lists items" as a UX invariant.)



# Completed
_(none yet — doc-agent to move entries here after AD file is updated)_

