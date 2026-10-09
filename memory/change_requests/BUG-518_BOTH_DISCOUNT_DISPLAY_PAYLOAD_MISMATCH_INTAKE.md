# BUG-518 — INTAKE DOC

**ID:** BUG-518
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent (owner-reported via investigation session)
**Source:** OWNER-REPORTED — checkout, "Both" discount mode
**Confidence:** CONFIRMED (code-traced, display vs payload mismatch proven)

---

## Title

"Both" discount mode: display shows capped room amount (full balance) but payload sends uncapped 50/50 half — display/payload mismatch + per-side cap missing; equal split not valid when caps apply

---

## Description

When staff selects **"Both"** (room + F&B) discount mode and enters an amount, the panel displays the **capped room discount** (e.g. ₹600) but the backend payload receives the **uncapped 50/50 half** (e.g. ₹400). This is a gap in BUG-499's GATE_5A_IMPLEMENTED fix.

### Scenario: Amount ₹800, roomApplyTo='both', baseBalance=₹600, fnbTotal=₹400

| | Display | Payload | Discrepancy |
|---|---|---|---|
| Room discount | `min(₹800, baseBalance=600)` = **₹600** | `floor(800/2)` = **₹400** | **−₹200 mismatch** |
| F&B discount | `floor(800/2)` = **₹400** | `floor(800/2)` = **₹400** | ✓ (match) |
| Room balance shown | 600 − 600 = **₹0** (staff sees "paid") | Backend: 600 − 400 = **₹200 still owed** | **CRITICAL** |
| Total discount shown | **₹1,000** | **₹800 to backend** | **₹200 gap** |

Staff prints receipt showing ₹0 room balance but the backend records ₹200 still outstanding. Potential over-charge to guest or data inconsistency.

### Owner's Statement

> "equal divide will not applicable always when capping is there — which is missing currently"

**Confirmed.** When either side's cap (room ≤ baseBalance, food ≤ fnbTotal) is lower than the equal half, the split must not blindly divide by 2. The display and payload must use the **same** capped-half values.

### Root Cause — Three-way Formula Split

```js
// DISPLAY — RoomSection L44-50 (shows CAPPED FULL AMOUNT, not half):
roomDiscountRs = min(floor(roomDiscount), baseBalance) = min(800, 600) = 600  ← ₹600 shown

// DISPLAY — Statement L200 (foodDiscountRs = uncapped half):
foodDiscountRs = floor(roomDiscount / 2) = floor(800/2) = 400  ← ₹400 shown

// PAYLOAD — handlePaid L311-316 (roomHalfRs = uncapped half, NOT the display value):
roomHalfRs = floor(roomDiscount / 2) = 400  ← ₹400 sent (not ₹600!)
payload.room_discount = 400
```

The display (`RoomSection`) computes FULL capped discount while the payload (`handlePaid`) computes HALF uncapped discount. These are DIFFERENT values for the same "room discount" concept.

---

## Duplicate Check

| ID | Relation | Status |
|---|---|---|
| **BUG-499** | "Both discount sends wrong amounts" — 50/50 split implemented | GATE_5A_IMPLEMENTED — OD-499-01 locked 50/50 split, but display/payload inconsistency and per-side capping were not addressed in the fix |
| **BUG-518** | **RELATED to BUG-499** — gap: capping logic and display/payload consistency missing from BUG-499 fix | NEW |

---

## Severity & Risk

- **Severity: P0 — CRITICAL**
  - Financial display/backend mismatch: staff sees ₹0 balance but backend records ₹200 owed
  - Guest could be over-charged or under-discounted silently
  - No workaround — "Both" mode always has this mismatch when entered amount > (2 × lesser cap)
  - No error shown to staff
- **Risk: CRITICAL** (R6 — financial, direct money impact on billing)
- **Fast Lane: NO** — R6 financial, multi-site

---

## Evidence

- Screenshot: provided by owner (checkout Bill panel, Both mode visible)
- Steps to reproduce:
  1. Bill panel for booking with baseBalance=₹600, fnbTotal=₹400
  2. Select `Both` apply-to, Amount mode
  3. Enter ₹800 discount
  4. Observe Room balance display: ₹0 (600−600=0)
  5. Observe F&B preview: −₹400
  6. BUT actual payload: room_discount=400, food_discount=400 (total ₹800, not ₹1000)
  7. Room balance backend = 600−400 = ₹200 (not ₹0)
- Curl output: not applicable (FE formula)
- Source: OWNER-REPORTED + AGENT-CONFIRMED via code trace
- Confidence: CONFIRMED

---

## Blast Radius

```bash
grep -n "roomDiscountRs\|foodDiscountRs\|roomHalfRs\|roomApplyTo.*both" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx | wc -l
# → 32 sites
```

- **Files WILL change:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — multiple formula sites (RoomSection, roomDiscountInfoRs, foodDiscountRs, handlePaid roomHalfRs)
- **Hotspot files touched:** NO
- **Blast radius: MEDIUM** (1 file, ~8–12 edit sites, financial formula, 'both' and 'food' paths)

---

## Open Owner Decisions — ALL LOCKED (2026-10-08)

**OD-518-01 LOCKED = Option a — cap each half independently:**

```
For 'both' mode (Amount ₹D):
  effectiveRoomHalf = min(floor(D / 2), maxCheckoutDiscount)  // uses BUG-517 new cap
  effectiveFoodHalf = min(floor(D / 2), fnbTotal)

For 'both' mode (Percent P):
  effectiveRoomHalf = min(floor(bc × P/2 / 100), maxCheckoutDiscount)
  effectiveFoodHalf = min(floor(fnbTotal × P/2 / 100), fnbTotal)
```

Both display AND payload must use these same capped half values.

**OD-518-02 LOCKED = YES — display must always match payload:**
The room discount amount shown to staff = exact value sent to backend. No silent discrepancy.

**OD-518-03 LOCKED = YES — F&B base = order.amount:**
For 'food' and 'both' modes, the F&B discount base is `order.amount` (total F&B amount). Room discount is an **additive module** on top of CollectPaymentPanel's existing F&B discount. The CollectPaymentPanel Discount dropdown operates independently on the same F&B total — room discount food half deducts from `payment_amount` additionally.

Evidence: owner confirmed food discount works via CollectPaymentPanel `/dashboard` → Collect Payment. Room discount 'food'/'both' is additive on `payment_amount` separately.

---

## Next

All ODs locked. → Gate 2 GO → PLANNING (Impact Analysis)

**Sprint:** oct_bug_batch
