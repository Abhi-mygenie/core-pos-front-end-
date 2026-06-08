# CR-008 Sub-CR #1 · Bucket D1-Gate — Delivery-Charge Override Gate Flip (Phase B)

**Bucket:** D1-Gate — "Relax override gate"
**Parent CR:** CR-008 Sub-CR #1 (Delivery charges at order placement)
**Session:** 2026-05-03
**Working branch:** `3-may` (handover ref) / live `main`
**Source session handover:** `/app/memory/SESSION_HANDOVER_2026_05_03.md`
**Predecessor bucket:** D1-Cap (Round 1 + 2) — shipped earlier in same session

---

## 1. Bucket scope (frozen)

Replace the `CollectPaymentPanel` delivery-charge field's read-only rule from BUG-019's `initialDeliveryCharge > 0` to the new Owner-confirmed business rule `isPrepaid`. Closes the cashier-correction gap that D1-Cap inadvertently created (in-POS delivery orders persisting `delivery_charge > 0` were locking themselves out of editing on Collect Bill).

No payload change. No socket change. No totals math change. No new state. No new endpoints.

---

## 2. Owner approvals received

| # | Gate / question | Answer |
|---|---|---|
| 1 | Bucket selection (post-D1-Cap) | "2" → Bucket D1-Gate |
| 2 | Lock signal | `isPrepaid` (replaces `initialDeliveryCharge > 0`) |
| 3 | Override toggle / audit / role-gating | None — pure gate flip |
| 4 | Hotspot approval (`OrderEntry.jsx` + `CollectPaymentPanel.jsx`) | YES (carried from D1-Cap; CollectPaymentPanel new) |
| 5 | Final Apply Gate | "Apply" |

---

## 3. Files changed (2 files, 2 hotspots)

| # | File | Hotspot | Edits | Lines added (approx) | Lines removed |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/order-entry/OrderEntry.jsx` | YES (minor) | 1 (pass `isPrepaid` prop into `<CollectPaymentPanel>`) | ~10 (incl. 7 comment) | 0 |
| 2 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | YES | 3 (add prop destructure, swap readOnly rule, swap tooltip + className conditional) | ~30 (incl. comments) | ~5 |

Total: **~40 net new lines, no functional logic deletions.**

---

## 4. Before / after behaviour

### 4.1 ReadOnly rule on Collect Bill delivery-charge input

| Order state | Before | After |
|---|---|---|
| Prepaid scan / customer-app order, `delivery > 0` | readOnly | readOnly ✓ (preserved — money already collected) |
| Prepaid scan / customer-app order, `delivery = 0` | editable | **readOnly** (NEW; harmless — bill already paid) |
| Non-prepaid in-POS delivery (D1-Cap-shipped), `delivery > 0` | readOnly (BUG-019 ripple from D1-Cap) | **editable** ← the correction gap is closed |
| Non-prepaid in-POS delivery, `delivery = 0` (forgot at OE) | editable | editable ✓ |
| Dine-in / walk-in / takeaway | Field hidden by `orderType === 'delivery'` gate (L334) | Unchanged — still hidden |

### 4.2 Tooltip text

| Mode | Tooltip |
|---|---|
| `isPrepaid && initialDeliveryCharge > 0` | "Delivery charge already collected from customer — not editable" |
| `isPrepaid && initialDeliveryCharge == 0` | "Order is prepaid — delivery charge cannot be modified" |
| `!isPrepaid` | "Enter or edit delivery charge" |

### 4.3 className conditional
- Background-tint + `cursor-not-allowed` now keyed on `isPrepaid` (was keyed on `initialDeliveryCharge > 0`).

### 4.4 BUG-019 anti-tamper
- **Spirit preserved** — the new rule is stronger because it ties the lock to the *actual reason* (money already paid) rather than an indirect signal (BE-seeded value > 0).
- **Letter changed** — only the lock condition; the BE-seed mechanism (initialDeliveryCharge prop populated from `orderFinancials.deliveryCharge`) is intact and continues to populate the field's initial value.

---

## 5. API / socket / state assumptions

- **No payload change.** `delivery_charge`, `order_amount`, `gst_tax`, `tax_amount`, `round_up` — all unchanged from D1-Cap Round-2.
- **No new endpoint.** No request shape change.
- **No socket handler edit.** `paymentType` already arrives via `fromAPI.order()` and `liveOrder` lookup at `OrderEntry.jsx:649-652`.
- **No new state, no new prop on transport, no new context, no new localStorage key.**
- **`isPrepaid` derivation** — re-uses the existing `liveOrder?.paymentType || orderData?.paymentType || ''` chain (`OrderEntry.jsx:651-652`). Already trusted by L1049 / L1061 (Merge / Table-Shift hide rules), L550 (prepaid cleanup), L1174 (Split Bill eligibility), L1783 (CartPanel prop). No new race-condition surface.

---

## 6. Validation performed

### 6.1 Static
- ✅ Lint clean: `OrderEntry.jsx`, `CollectPaymentPanel.jsx`
- ✅ Webpack compiled (only pre-existing unrelated `LoadingPage.jsx` `react-hooks/exhaustive-deps` warning)
- ✅ `curl http://localhost:3000/` → 200
- ✅ Supervisor: frontend RUNNING

### 6.2 Smoke
- App boots cleanly post-edit (verified after frontend hot-reload)
- No new console errors (verified via tail of `/var/log/supervisor/frontend.out.log`)

---

## 7. Validation NOT performed (Owner / QA preprod walkthrough required)

Login: `owner@palmhouse.com` / `Qplazm@10`

### Group A — Primary fix verification
| # | Scenario | Expected |
|---|---|---|
| A1 | Place new POS delivery order with charge ₹50 → place → Collect Bill | Field = ₹50, **editable**. Change to ₹40 → save → bill recomputes |
| A2 | Place new POS delivery, ₹0 entered (forgot) → Collect Bill | Field empty, editable. Type ₹30 → save |
| A3 | Place new POS delivery → IMMEDIATELY reopen (before socket round-trip) | `isPrepaid` defaults `false`; field editable |

### Group B — Prepaid anti-tamper (must remain locked)
| # | Scenario | Expected |
|---|---|---|
| B1 | Scan order arrives, paymentType=prepaid, `delivery > 0` | Field readOnly, lock-style className, tooltip "already collected" |
| B2 | Scan order arrives, paymentType=prepaid, `delivery = 0` | Field readOnly, tooltip "Order is prepaid — cannot be modified" |
| B3 | Re-engage prepaid order after socket refresh | Stays readOnly |

### Group C — Edge cases
| # | Scenario | Expected |
|---|---|---|
| C1 | Postpaid scan order (rare) | Editable per new rule |
| C2 | Non-prepaid order with `delivery_charge` already set from a prior place-order | Editable; cashier can correct |
| C3 | Cashier edits, then cancels back to Order Entry | No persisted state change |

### Group D — Regression: hidden field for non-delivery
| # | Scenario | Expected |
|---|---|---|
| D1 | Dine-in / walk-in / takeaway → Collect Bill | Field hidden (gate at L334 unchanged) |
| D2 | Room order with delivery sub-flow | Untouched (delivery field gated by `orderType === 'delivery'`) |

### Group E — Cross-bucket regression
| # | Item | Expected |
|---|---|---|
| E1 | D1-Cap Round 1 — CartPanel editable row | Still works, payload still carries `delivery_charge` |
| E2 | D1-Cap Round 2 — `order_amount` includes delivery | Dashboard / audit tiles still correct |
| E3 | A2 — Order ID chip | Visible |
| E4 | B2-split — Audit PG columns under PG filter | Working |
| E5 | B1 — Multi-select variations | Working |
| E6 | D1 — Stay-on-order toggle | Working |
| E7 | Merge / Table-Shift hidden on prepaid cards | Unaffected (independent rule) |
| E8 | BUG-019 backend-seed of delivery on scan orders | Preserved — value seeds the field; only the lock rule moved |

### Group F — DevTools sanity
| # | Step | Expected |
|---|---|---|
| F1 | Edit delivery on Collect Bill → Pay → inspect POST `/api/v2/.../order/place-order-payment` payload | `delivery_charge` reflects edit; `gst_tax` recomputed via existing CollectPaymentPanel formula; `payment_amount` updated |

---

## 8. Hotspot discipline check

| Behaviour that must remain unchanged | Status |
|---|---|
| All financial computation (avgGstRate, deliveryGst, rawFinalTotal, fractional rounding, effectiveTotal) | ✅ Untouched |
| Cash auto-prefill (BUG-CASH-PREFILL Apr-2026) | ✅ Untouched |
| Split-bill triggers (L1166-1180 in OrderEntry, CollectPaymentPanel L505/542) | ✅ Untouched |
| Room balance / associated orders math | ✅ Untouched |
| BUG-019 seed of `initialDeliveryCharge` from backend | ✅ Preserved |
| All `onClose` / `engagePromise` / `placePromise` / auto-print | ✅ Untouched |
| D1-Cap's CartPanel editable row + button total | ✅ Unaffected |
| `orderTransform.js` payload code | ✅ Untouched |
| Address modals | ✅ Untouched |
| Backend | ✅ No change |

---

## 9. Known limitations / deferrals

1. **Postpaid scan orders (rare)** — under the new rule their delivery charge becomes editable. Today this case is ambiguous (most scan orders are prepaid by definition). If a real workflow surfaces requiring scan-postpaid to also lock, we'll need a third signal (e.g. `orderSource === 'scan'` AND `delivery > 0`). Not in scope.
2. **No "Override" / audit trail** — Owner approved a pure gate flip. If audit ever required, opens as a follow-up CR.
3. **Tooltip is plain text** — no icon swap. Acceptable per Owner's "no UX additions" stance.

---

## 10. Backend pending items

**None for D1-Gate.** Backend has no involvement.

---

## 11. QA instructions

1. Login: `owner@palmhouse.com` / `Qplazm@10` (Palm House, restaurant_id 541).
2. Walk Groups A–F above on preprod.
3. Confirm no new console errors during the walks.
4. Confirm `data-testid="delivery-charge-input"` element's `readonly` HTML attribute toggles correctly between prepaid and non-prepaid orders (DevTools Elements pane).

---

## 12. Backups retained

- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.d1gate` (this bucket)
- `/app/frontend/src/components/order-entry/OrderEntry.jsx.bak.d1cap` (carried from D1-Cap; covers OrderEntry baseline)
- `/app/frontend/src/api/transforms/orderTransform.js.bak.d1cap` (carried from D1-Cap)

**Remove only after Owner verification on preprod.**

---

## 13. Next recommended bucket / action

CR-008 Sub-CR #1 (delivery charges) is now fully closed in scope:
- ✅ D1-Cap Round 1 — UI capture + threading
- ✅ D1-Cap Round 2 — totals fix
- ✅ D1-Gate — override gate flip

Open buckets / tickets for follow-up:
- **CR-013 (newly logged this session)** — GST config correction for SC / delivery / tip. Independent of CR-008. Has 5 open questions for Owner.
- **CR-008 #2** — Audit Report Action Time + Time Diff columns. Small, frontend-only, no hotspots.
- **CR-008 #3** — Dispatch / assign integration. Needs Owner scope clarification.
- **D2+ navigation tweaks** under CR-008 #4. Needs Owner scope-bucketing.

---

## 14. Sign-off

- Lint: ✅ clean on both files
- Webpack: ✅ compiled (only pre-existing unrelated warning)
- Smoke: ✅ app boots, HTTP 200
- No test agent invoked (per Owner rule)
- Backups retained pending Owner preprod verification

**Bucket D1-Gate ready for Owner verification.**
