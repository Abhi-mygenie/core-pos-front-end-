# BUG-484 — Room Bill-Pay: `payment_amount` / `order_amount` / `grant_amount` may include room rent — contract requires F&B-only

**ID:** BUG-484
**Type:** BUG
**Severity:** P1 / HIGH
**Risk:** CRITICAL (R6 — financial logic; wrong DB `order_amount` → revenue report errors)
**Status:** GATE_1_INTAKE
**Sprint:** oct_cr_batch
**Area:** Room / PMS Billing / Collect Bill
**Registered:** 2026-10-01
**Source:** AGENT-DISCOVERED — backend handover_5.md (2026-10-01)
**Confidence:** SUSPECTED (contract confirmed in handover; FE code audit not yet performed)

---

## Duplicate Check

- DISTINCT from **BUG-360** (room checkout live balance display — different concern)
- DISTINCT from **BUG-386** (GST not computed at check-in)
- DISTINCT from **BUG-425** (ROOM balance excluded GST in checkout breakdown)
- RELATED to **BUG-428** (room checkout missing GST line) — same file area, different gap
- RELATED to **CR-405** (room folio features batch — registered same session)

---

## Description

Backend handover_5.md (§2, proven on preprod 2026-10-01) defines an explicit F&B-only contract for the three bill-pay keys:

| Key | Must be | Must NOT include |
|-----|---------|-----------------|
| `payment_amount` | F&B tender total only | Room rent, room GST, room discount |
| `order_amount` | F&B echo total | Room rent |
| `grant_amount` | F&B grant | Room rent |

Room rent is collected via `paid_room=yes` + UID `balance_payment` — **not** via these three fields.

**Suspected gap:** The current FE (`CollectPaymentPanel.jsx` / `PmsCheckoutDrawer.jsx`) may be computing `payment_amount` from the full bill total (F&B + room rent) on room stays, causing:
- Backend writes incorrect `orders.order_amount` to DB (inflated by rent)
- Revenue reports overstate F&B revenue for room stays
- The `order_amount` in DB is used by Insights / Sales Report / Settlement Report

### Worked example from handover_5.md §2

| Item | ₹ |
|------|---|
| Room rent (UID balance) | 950 |
| Room checkout discount | 100 → UID becomes **850** |
| F&B (food + tax) | **228** |

Correct payload:
- `payment_amount: 228` (F&B only)
- `order_amount: 228`
- `grant_amount: 228`
- `paid_room: "yes"`

Wrong (if FE includes rent):
- `payment_amount: 1178` (228 + 950) ← INCORRECT per backend contract

---

## Code Reality Check

**Status: PARTIAL**

```
orderTransform.js:1712  →  paid_room: table?.isRoom ? 'yes' : ''  ✅ (paid_room is set)
orderTransform.js:1110  →  paid_room: null  (another call site — needs audit)
orderTransform.js:1433  →  paid_room: ''   (another call site — needs audit)
```

No enforcement of "F&B-only" logic found for `payment_amount` on room stays.
`room_discount_apply_to` → 0 hits in src/ → room discount not sent at all today.

---

## Evidence

- **Handover doc:** `handover_5.md` (owner-provided, 2026-10-01) §2 + §10 proof table
- **Proof orders on preprod (per handover):**
  - Order 1232889: sent `payment_amount: 89.25` (F&B) → DB `order_amount = 89.25` ✅
  - Order 1232913: no room discount → `receive_balance: 950` ✅
- **FE code:** `orderTransform.js:1712` — `paid_room` exists, no F&B-only split logic
- **Screenshot:** not provided
- **Curl output:** not applicable (investigation via handover contract + code read)

---

## Blast Radius

```bash
grep -rn "paid_room\|payment_amount.*room\|order_amount.*room" src/ --include="*.jsx" --include="*.js" | grep -v test
```

Estimated scope: **MEDIUM**
- `CollectPaymentPanel.jsx` (R5 hotspot) — primary bill-pay UI
- `PmsCheckoutDrawer.jsx` — room checkout drawer
- `orderTransform.js` (R5 hotspot) — `buildBillPaymentPayload` function

Hotspots touched: **YES** — CollectPaymentPanel + orderTransform both on R5 list.

---

## Risk Classification

- **Risk: CRITICAL**
- Trigger: Money / settlement / billing / DB `order_amount` written incorrectly
- Process required: Full gate flow + **owner approval at Gate 4** (R6)
- Fast Lane: **NOT eligible** (financial logic, hotspot files)

---

## Open Questions for Planning (Gate 2)

- **OD-484-01:** What is `payment_amount` currently set to in `CollectPaymentPanel` for a room+F&B settle? (probe required)
- **OD-484-02:** Is `buildBillPaymentPayload` in `orderTransform.js` the single source or do `PmsCheckoutDrawer` and `FolioCheckoutPanel` build their own payloads?
- **OD-484-03:** On a room-only settle (no F&B), does FE currently send `payment_amount: 0` or some room-rent value?

---

## Severity Rubric

P1 — HIGH:
- Feature potentially broken for room billing (F&B + room combined stay)
- Revenue reports may show inflated F&B for every room stay where F&B was consumed
- No user-visible crash but silent data corruption in reports

---

## Next Steps

Gate 2 GO → Planning agent:
1. Curl-probe `order-bill-payment` payload on a live room order with F&B
2. Read `CollectPaymentPanel.jsx` `buildPayload` / `handlePayment` for room path
3. Confirm or rule out the bug — if confirmed → classify P0/CRITICAL
