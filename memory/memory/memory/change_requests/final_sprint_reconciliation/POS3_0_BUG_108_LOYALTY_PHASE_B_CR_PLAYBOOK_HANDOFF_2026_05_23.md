# POS 3.0 BUG-108 — Loyalty Phase B CR Playbook Implementation Handoff

**Date:** 2026-05-23
**Status:** `bug_108_loyalty_phase_b_playbook_ready_for_implementation`
**Scope:** Loyalty Phase B — read-only + calculated preview only

---

## 1. Docs Read

All mandatory baseline docs (1-7), overlay docs (8-12), sprint status (13), and BUG-108 docs (14-18) per the mandatory reading order. Key docs: Architecture Decisions Final, Implementation Agent Rules, BUG-108 Loyalty Contract Verification (2026-05-23), CRM Loyalty Handoff (GREEN-LIGHT).

## 2. Code Areas Inspected

| File | Finding |
|------|---------|
| `BUG108_FLAGS.js` | `loyaltyRatioLive=false`; controls both display AND math — need separate preview flag |
| `customerTransform.js` | `customerLookup` maps `pointsValue` but no loyalty blob extraction; `customerDetail` maps `loyalty: api.loyalty || null` raw |
| `CartPanel.jsx` | `selectCustomer()` passes only `{id, name, phone}` — drops all CRM data |
| `CollectPaymentPanel.jsx` | Reads `customer?.loyaltyPoints` (doesn't exist); loyalty section gated by `loyaltyRatioLive` |
| `orderTransform.js` | Force-zero guards intact; NO changes needed for Phase B |

## 3. File-Level Plan

### File 1: `src/utils/BUG108_FLAGS.js`
- **Change:** Add `loyaltyPreviewLive: true` — controls whether real CRM loyalty data is displayed
- **Why:** Separates "show data" (Phase B) from "enable redemption" (future). `loyaltyRatioLive` stays `false`.
- **Risk:** None — additive flag. Existing coupon/wallet behavior untouched.

### File 2: `src/api/transforms/customerTransform.js`
- **Change:** In `customerLookup`, already maps `pointsValue`. In `customerDetail`, extract loyalty blob fields into flat fields.
- **Why:** GAP-L4 — loyalty blob returned raw; need `loyaltyEnabled`, `ratioPerPoint`, `pointsValue`, `tierLabel`.
- **Risk:** Low — additive fields. Existing transforms untouched.

### File 3: `src/components/order-entry/CartPanel.jsx`
- **Change:** In `selectCustomer()`, pass CRM fields: `{ id, name, phone, tier, totalPoints, pointsValue, walletBalance, loyalty }`
- **Why:** GAP-L2 — CRM data is dropped before reaching CollectPaymentPanel.
- **Risk:** Low — adds fields; existing id/name/phone unchanged. No other CartPanel behavior affected.

### File 4: `src/components/order-entry/CollectPaymentPanel.jsx`
- **Change:** Update loyalty section (standard + room-service mirror) to display real data when `loyaltyPreviewLive=true` AND customer has loyalty data.
- **Specific changes:**
  - Replace `customer?.loyaltyPoints` with `customer?.loyalty?.total_points || customer?.totalPoints || 0`
  - Show tier badge from `customer?.loyalty?.tier` or `customer?.tier`
  - Show "₹X available" from `customer?.loyalty?.points_value || customer?.pointsValue || 0`
  - When `loyaltyPreviewLive=true` AND data exists: show preview, checkbox still disabled
  - When data missing or `loyalty_enabled=false`: show "Loyalty program unavailable"
  - Discount math unchanged (stays 0 because `loyaltyRatioLive=false`)
  - Payload unchanged (force-zero guards intact)
- **Risk:** Medium (hotspot file) — mitigated by only touching loyalty section UI, no math/payload changes.

### File 5: `src/api/transforms/orderTransform.js`
- **Change:** NONE. Force-zero guards remain. Payload stays `used_loyalty_point: 0`, `loyalty_dicount_amount: 0`.

## 4. Files NOT to Touch

- Coupon API/service files
- Wallet files
- Settlement/payment files
- Print files
- Tax/SC/delivery calculation
- Backend files
- `socketHandlers.js`
- `/app/memory/final/*`

## 5. Regression Guardrails

- `loyaltyRatioLive` stays `false` — discount math stays 0
- Payload force-zero guards unchanged in `orderTransform.js`
- Coupon/wallet sections unchanged
- Manual discount unaffected
- Tax/GST/VAT untouched
- Print payload untouched
- No new API calls

## 6. Implementation Readiness Verdict

**SAFE TO PROCEED.** All gaps are POS frontend code changes. No external blockers.
