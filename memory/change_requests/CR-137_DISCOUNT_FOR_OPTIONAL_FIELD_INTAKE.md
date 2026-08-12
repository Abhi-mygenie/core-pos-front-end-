# CR-137 — Optional `discount_for` Field in Order Payload

**ID:** CR-137
**Type:** CR (Feature — optional field addition)
**Priority:** P2 — MEDIUM
**Risk:** HIGH (touches hotspot files: orderTransform.js + CollectPaymentPanel.jsx per R5; order payload per R6)
**Status:** INTAKE — Gate 0→1
**Sprint:** pos_5_1
**Registered:** 2026-08-12
**Source:** OWNER-REQUESTED

---

## Description

Add an optional `discount_for` string field to all order placement and collect-bill payloads.

When an operator applies a discount, they can optionally enter a short reason/label (e.g. "staff", "loyalty customer", "event promo"). This reason is passed to the backend as `discount_for`. The field is **optional** — if no reason is given, it sends `null` or `''`.

**Owner directive (2026-08-12):** "it will be optional field"

---

## Code Reality Check

```bash
grep -rn "discount_for" /app/frontend/src/ --include="*.js" --include="*.jsx"
# Result: 0 matches in order payload builders
# Only appears as a DISPLAY column in OrderLedgerMockup (hardcoded 'Customer')
```

**Code Reality: NONE** — `discount_for` is not in any payload builder today.

API response evidence: `"discount_for": null` in order-logs-report (always null because FE never sends it).  
Source: `/app/memory/evidence/CR-117/daily_combined_response_sample.json`

---

## Duplicate Check

| Item | Relationship | Verdict |
|---|---|---|
| **CR-058** | Order-level Complimentary + mandatory discount note | **RELATED** — CR-058 is mandatory comp reason for comp orders; this is optional reason for any discount. Different scope. |
| **CR-025** | Discount Payload Fix (CLOSED) | **DISTINCT** — CR-025 fixed discount_type/amount wiring. Not the same field. |
| **CR-028** | Item-Level Discount (CLOSED) | **DISTINCT** — CR-028 is discount amount distribution. |
| **BUG-114** | discount_member_category_id/name (CLOSED) | **DISTINCT** — category discount targeting, not a reason note. |

**Duplicate check: DISTINCT** (related: CR-058 concept-only)

---

## Scope

### Payload Builders — 4 locations in `orderTransform.js` (HOTSPOT R5)

| Flow | Function | Line | Current | Add |
|---|---|---|---|---|
| Flow 1 | `placeOrder` | ~1063 | `discount_type: null` block | `discount_for: options.discountFor \|\| null,` |
| Flow 2 | `updateOrder` | ~1186 | `discount_type: null` block | `discount_for: options.discountFor \|\| null,` |
| Flow 3 | `placeOrderWithPayment` | ~1355 | `self_discount:` block | `discount_for: discounts.discountFor \|\| null,` |
| Flow 4 | `collectBillExisting` | ~1641 | `self_discount:` block | `discount_for: discounts.discountFor \|\| null,` |

### UI — `CollectPaymentPanel.jsx` (HOTSPOT R5)

Optional text input in the discount section. Shows when discount > 0. Free text, max ~50 chars.

```
[ Discount Amount: ₹100 ] [ % / ₹ ]
[ Reason (optional): _________________ ]  ← new optional field, placeholder "e.g. Staff, Event"
```

### State chain

`CollectPaymentPanel.jsx` → `discounts.discountFor` → `orderTransform.js` options → payload `discount_for`

### OrderLedgerService update

`orderLedgerService.js:85` — change from hardcoded `'Customer'` to API field:
```javascript
// Current:  discountFor: o.discountAmount > 0 ? 'Customer' : '',
// After:    discountFor: o.discountFor || (o.discountAmount > 0 ? 'Customer' : ''),
```

---

## Risk Classification

| Field | Value |
|---|---|
| **Risk** | **HIGH** |
| **Trigger R5** | `orderTransform.js` + `CollectPaymentPanel.jsx` both in hotspot list |
| **Trigger R6** | Touches order payload, collect-bill (financial operation gate) |
| **Fast Lane** | NO — hotspot files + financial payload |
| **Process** | Full gate cycle required (Impact Analysis → Plan → Gate 4 → Impl → QA) |

---

## Evidence

- API field confirmed: `"discount_for": null` in every order response (`/app/memory/evidence/CR-117/daily_combined_response_sample.json`)
- API audit doc: `DOC10_ORDER_LOGS_REPORT_API_FIELD_AUDIT.md` row 24: `discount_for | Discount target — not used`
- Payload builders: `orderTransform.js` flows 1–4, all have a `// Discount` section

---

## Blast Radius

```bash
grep -c "discount_for" /app/frontend/src/api/transforms/orderTransform.js
# 0 — needs adding to 4 payload builders (~4 lines)
```

| File | Change | Hotspot? |
|---|---|---|
| `orderTransform.js` | +4 lines (one per flow builder) | YES (R5) |
| `CollectPaymentPanel.jsx` | +UI input + state wire (~10-15 lines) | YES (R5) |
| `CartPanel.jsx` | +1 state pass-through | NO |
| `orderLedgerService.js` | +1 line (API field mapping) | NO |

- Blast radius: **MEDIUM** (~4 files, 2 hotspot)
- Estimated scope: MEDIUM (4 files, small line count per file)

---

## Open Questions (none blocking intake)

| # | Question | OD needed? |
|---|---|---|
| OQ-1 | Should `discount_for` also apply to `updateOrder` (Flow 2) which doesn't typically have discount? | NO — add with `null` default for parity |
| OQ-2 | Max char length for UI input? | NO — 50 chars default, can tune |
| OQ-3 | Should "Discount For" Order Ledger column show the backend value when FE starts sending it? | YES but minor — `orderLedgerService` change is safe additive |

**Owner decisions: NONE blocking intake.** User confirmed "optional field" → all edge cases covered by `|| null` fallback.

---

## Next Step

Planning Gate 2 — Impact Analysis.

---

**Intake complete: CR-137**
**Classification: CR · P2 · Risk: HIGH**
**Duplicate check: DISTINCT (related: CR-058 concept-only)**
**Code Reality: NONE**
**Blast radius: MEDIUM (~4 files, 2 hotspot)**
**Evidence: DOC10 audit, CR-117 API sample**
**Next: Planning Gate 2**
