# BUG-304 Intake — Item-Level Discount: GST/VAT Incorrectly Reduced for Non-Discountable Items
**ID:** BUG-304
**Type:** Bug
**Registered:** 2026-08-11
**Registered by:** INTAKE Agent (Role 1)
**Sprint:** POS 5.1 backlog
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (Investigation session 2026-08-11)

---

## Duplicate Check
- **CR-028** (Item-Level Discount, CLOSED 2026-06-15) — **RELATED** (CR-028 claimed "Per-item GST recomputation on post-discount base" but the `discountRatio` denominator gap was not addressed — confirmed by code comment at CollectPaymentPanel.jsx:246: *"Item GST proration via `discountRatio` still uses billableItems-derived totals"*)
- No other items cover this specific scenario
- **Result: DISTINCT — gap in CR-028 implementation**

---

## Description

When a restaurant configures **item-level discount exclusions** (`give_discount = 'No'` on specific menu items), the **GST and VAT are still incorrectly computed** using a discount ratio derived from the full cart total — including non-discountable items — rather than just the discountable items.

This causes:
1. **Non-discountable items' GST is incorrectly reduced** (it should be unchanged)
2. **Discountable items' GST is under-reduced** (because the denominator is too large)
3. **Cart total displayed to user and sent to backend is wrong** when a mixed cart (some items discountable, some not) has a discount applied

---

## Root Cause (CONFIRMED — code traced)

**Files:**
- `src/components/order-entry/CollectPaymentPanel.jsx` line 605
- `src/components/order-entry/CartPanel.jsx` line 425

### Step 1 — `taxTotals` includes ALL items' GST (correct)

```javascript
// CollectPaymentPanel.jsx:247-270
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0, vat = 0;
  billableItems.forEach(item => {        // ← ALL billable items (incl. giveDiscount=false)
    ...
    sgst += taxAmt / 2; cgst += taxAmt / 2;   // ALL items contribute
  });
```

### Step 2 — `discountRatio` uses wrong denominator (BUG)

```javascript
// CollectPaymentPanel.jsx:605 — WRONG
const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
//                                                    ^^^^^^^^^^ ALL items total
//                                                    should be: discountableTotal

// The code even computes discountableTotal (line 535) but doesn't use it for discountRatio:
const discountableTotal = useMemo(() =>
  billableItems.filter(i => i.giveDiscount !== false).reduce(...)  // only discountable items
);
```

### Step 3 — GST reduction applied to ALL items' GST (BUG)

```javascript
// CollectPaymentPanel.jsx:609
const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
//                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ALL items' GST reduced
//                           CORRECT would be:
//                           discountableGst * (1 - discount/discountableTotal) + nonDiscountableGst
const vat = taxTotals.vat * (1 - discountRatio);   // same issue for VAT
```

**Acknowledged in code comment (line 246):**
> *"Item GST proration via `discountRatio` still uses billableItems-derived totals"*

This comment confirms the implementer was aware this was not fully correct.

---

## Numerical Example

| | Cart | GST |
|---|---|---|
| Item A (`giveDiscount=true`) | ₹100 @ 18% | ₹18 |
| Item B (`giveDiscount=false`) | ₹50 @ 12% | ₹6 |
| Discount (20% of discountable only) | ₹20 | — |

| | `discountRatio` | Post-discount GST | Correct? |
|---|---|---|---|
| **Current (BUG)** | 20/150 = 13.3% | (18+6)×0.867 = **₹20.80** | ❌ |
| **Correct** | 20/100 = 20% | 18×0.8 + 6×1.0 = **₹20.40** | ✅ |
| **Difference** | — | **₹0.40 overcharge** | — |

The error grows as the proportion of non-discountable items in the cart increases.

---

## Affected User Flow

1. Restaurant sets `give_discount = 'No'` on some menu items (e.g., alcohol, specials)
2. Customer orders a mix of discountable + non-discountable items
3. Cashier applies a discount (manual % or preset)
4. **GST/VAT total shown on the bill is wrong** — non-discountable items' GST is reduced when it shouldn't be

---

## Severity & Risk

| Field | Value |
|---|---|
| **Severity** | **P1** — incorrect GST amount on bills, affects restaurants using `give_discount=No` config |
| **Risk** | **HIGH** — financial computation (GST/VAT on order), hotspot files (R5+R6) |
| **Area** | Order Entry → Collect Bill / Cart (QSR) |
| **Files** | `CollectPaymentPanel.jsx` (hotspot), `CartPanel.jsx` (hotspot) |
| **Fast Lane eligible** | **NO** — HIGH risk, financial logic, 2 hotspot files |

---

## Evidence

- **Investigation report:** `/app/memory/investigation/INVESTIGATION_REPORT_THREE_BUGS_2026_08_11.md`
- **Code evidence:** `/app/memory/evidence/taxTotals_code.txt`
- **Code comment at line 246:** "Item GST proration via `discountRatio` still uses billableItems-derived totals"
- **Confidence:** HIGH — code confirmed, numerical example computed

---

## Code Reality Check

**Status: FULL** — bug present in two files:

```bash
grep -n "discountRatio" src/components/order-entry/CollectPaymentPanel.jsx
# 605: const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;  ← WRONG

grep -n "discountRatio" src/components/order-entry/CartPanel.jsx
# 425: const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;  ← SAME BUG
```

---

## Blast Radius

- **Files affected:** 2 (`CollectPaymentPanel.jsx`, `CartPanel.jsx`)
- **Both are HIGH-RISK hotspot files (R5)**
- **Financial logic (R6)**
- **Scope:** MEDIUM
- **Full Gate 2-3 required before any code change**

---

## Proposed Fix Direction (for Planning Agent to validate)

### Option A — Fix discountRatio denominator (simple, may still under-reduce non-discountable GST)
```javascript
// Change in both CollectPaymentPanel.jsx:605 and CartPanel.jsx:425
const discountRatio = discountableTotal > 0 ? totalDiscount / discountableTotal : 0;
```

### Option B — Split taxTotals by discountability (correct, more changes)
Compute separate GST buckets in `taxTotals`:
```javascript
// In taxTotals useMemo: split into discountable vs non-discountable buckets
const discountableGst = [sum of gst from items where giveDiscount !== false]
const nonDiscountableGst = [sum of gst from items where giveDiscount === false]

// In post-discount calculation:
const itemGstPostDiscount = discountableGst * (1 - discountRatio) + nonDiscountableGst;
```

**Planning Agent to determine which option is correct per business rules.**

---

## Owner Decisions Needed

- OD-1: Which non-discountable GST behaviour is correct? (Option A vs Option B)
- OD-2: Does this apply to VAT as well (same fix in both files)?
- OD-3: Should CartPanel (QSR display) match CollectPaymentPanel, or is QSR a different rule?

---

## Next Step

Full Gate 2 (Impact Analysis) required — owner Gate 4 GO before any code change.
Area: Order Entry → Collect Bill | Priority: P1 | Risk: HIGH | Sprint: POS 5.1
Related: CR-028 (CLOSED — this is a gap in that implementation)
