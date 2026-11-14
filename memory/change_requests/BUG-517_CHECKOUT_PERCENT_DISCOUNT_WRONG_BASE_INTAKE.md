# BUG-517 — INTAKE DOC

**ID:** BUG-517
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent (owner-reported via investigation session)
**Source:** OWNER-REPORTED — checkout phase, room discount % mode
**Confidence:** CONFIRMED (code-traced, numerical proof)

---

## Title

Checkout room discount Percent mode applies % to `baseBalance` (remaining balance) instead of `bc` (booking charge) — at maxPct=20% staff gets only ₹120 discount instead of expected ₹600

---

## Description

In FolioCheckoutPanel, when staff selects **Percent mode** for room discount, `maxPct` is correctly computed as `floor(min(baseBalance, bc) / bc × 100)` — this gives 20% for a ₹3,000 booking with ₹600 remaining. The intent is: "20% of booking charge = ₹600 = full remaining balance." But the actual discount formula applies that percentage to **`baseBalance` (₹600)** not `bc` (₹3,000), giving only `₹600 × 20% = ₹120` instead of `₹3,000 × 20% = ₹600`.

### Numerical Proof (bonk booking: bc=3000, baseBalance=600, maxPct=20)

| Input | Expected (% of bc) | Actual (% of baseBalance) | Error |
|---|---|---|---|
| 20% (maximum) | floor(3000×0.20) = **₹600** | floor(600×0.20) = **₹120** | −₹480 under-discounts |
| 10% | floor(3000×0.10) = **₹300** | floor(600×0.10) = **₹60** | −₹240 under-discounts |

**Staff enters 20% discount, expects full balance waived (₹600), but only ₹120 is applied.**

### Owner's Question Answered

> "we should not give discount more than balance due"

**YES** — the cap is `baseBalance` (₹600). Amount mode correctly caps at `baseBalance`. Percent mode formula is the issue. The max Percent that equals the full balance is `maxPct = floor(baseBalance/bc × 100) = 20%`. At 20%, the discount should be ₹600, not ₹120.

---

## Code Reality

**PARTIAL** — the `maxPct` limit is correct; the actual `roomDiscountRs` formula uses the wrong base. This pattern appears at 3 sites in `FolioCheckoutPanel.jsx`.

### Break points

```js
// RoomSection L52-57 (maxPct — CORRECT):
maxPct = floor(min(baseBalance, bc) / bc × 100) = floor(600/3000 × 100) = 20

// RoomSection L47 (roomDiscountRs — WRONG):
floor(baseBalance × roomDiscount / 100) = floor(600 × 20/100) = 120  ← should be floor(bc × 20/100) = 600

// Parent L261 (roomDiscountInfoRs — WRONG):
floor(baseBalance × roomDiscount / 100) = 120  ← same wrong base

// handlePaid L313 (roomHalfRs 'both' — WRONG):
floor(baseBalance × (roomDiscount/2) / 100)  ← same wrong base
```

`Amount mode` is unaffected — it uses `Math.min(Math.floor(Number(roomDiscount)), baseBalance)` which is correct.

---

## Duplicate Check

| ID | Relation | Status |
|---|---|---|
| BUG-498 | Changed `roomDiscountRs` base from stale LR → folio `baseBalance` | GATE_5A_IMPLEMENTED — this fix changed the base but did not fix the % formula consistency |
| BUG-495 | `maxPct` formula ignores GST on advance | GATE_5A_IMPLEMENTED — fixed maxPct formula, not roomDiscountRs application |
| BUG-492 | % input has no alert/disable for over-max | GATE_5A_IMPLEMENTED — fixed UI guard, not formula base |
| **BUG-517** | **RELATED to BUG-498** (gap: % formula base not updated when base was changed to baseBalance) | NEW |

---

## Severity & Risk

- **Severity: P1 — HIGH**
  - Financial value is wrong: staff applying 20% expects full ₹600 waived, only ₹120 applied
  - Guest is under-discounted silently — no error shown
  - Workaround exists: staff must use Amount mode (₹600) to achieve full discount; Percent mode gives wrong values
- **Risk: CRITICAL** (R6 — financial formula, directly affects how much discount is sent to backend)
- **Fast Lane: NO** — R6 financial, no planning skip regardless

---

## Evidence

- Screenshot: provided (owner-reported checkout Bill panel)
- Steps to reproduce:
  1. Bill panel open for a booking with check-in discount (e.g. bonk: bc=₹3,000, baseBalance=₹600)
  2. Select `%` mode for Room discount
  3. Enter 20% (the maximum allowed by maxPct)
  4. Observe Room balance: shows `600 - 120 = ₹480` instead of expected `₹0`
- Curl output: not applicable (FE formula issue)
- Source: OWNER-REPORTED + AGENT-CONFIRMED via code trace + numerical proof
- Confidence: CONFIRMED

---

## Blast Radius

```bash
grep -n "baseBalance \* roomDiscount\|baseBalance \* (roomDiscount" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# → 3 sites: L47, L261, L313
```

- **Files WILL change:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 3 formula sites: L47, L261, L313
  - `bc` is `Number(c.booking_charge || 0)` — already available in RoomSection (via `c = row.charge ?? {}`) and parent (via `row.charge?.booking_charge`)
- **Hotspot files touched:** NO
- **Blast radius: SMALL** (1 file, 3 edit sites, ~6 lines, Percent path only)

---

## Open Owner Decisions

**OD-517-01 — LOCKED (2026-10-08)**

**Formula confirmed by owner (bonk example):**

```
room_rent = ₹3,000
booking_advance = ₹1,000
check_in_discount = ₹1,000
effective_room = ₹2,000
gst_rate = 5% (slab)
gst_total = 2000 × 5% = ₹100
check_in_payment = ₹500 (total paid = ₹1,500)
balance_due = 2100 − 1500 = ₹600 = ₹500 room rent + ₹100 GST

max_checkout_discount = balance_due − floor(advance_paid × gst_rate)
                      = 600 − floor(1500 × 0.05)
                      = 600 − 75
                      = ₹525

As percentage: 525/3000 × 100 = 17.5% → maxPct = floor(17.5%) = 17%
```

**Business rule:** GST on the advance already paid (₹75 = ₹1,500 × 5%) must be protected and cannot be discounted away. This ₹75 minimum balance secures the GST obligation on the collected payments.

**Impact on scope — BOTH modes affected:**
- Amount mode: max input = ₹525 (was ₹600) — input clamp AND cap must use `maxCheckoutDiscount`
- Percent mode: `roomDiscountRs = min(floor(bc × pct/100), maxCheckoutDiscount)` + `maxPct = floor(maxCheckoutDiscount/bc × 100)` = 17%

**Implementation note (for PLANNING):**
`maxCheckoutDiscount` requires: `baseBalance`, `c.advance_payment` (from LR charge, always up-to-date), `gst_rate` (= `gstTotal / (discountedPrice × nights)` from existing useMemo). Compute in parent useMemo alongside `baseBalance`, pass as new prop to `RoomSection`.

---

## Next

Gate 2 closed (OD-517-01 locked). → Gate 3 GO → PLANNING (Implementation Plan)

**Sprint:** oct_bug_batch
