# BUG-519 — INTAKE DOC

**ID:** BUG-519
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent (owner-reported via investigation session)
**Source:** OWNER-REPORTED — FolioCheckoutPanel layout
**Confidence:** CONFIRMED (code-traced layout structure)

---

## Title

FolioCheckoutPanel: room discount controls (interactive) placed on LEFT panel — owner requires left panel = dynamic read-only summary only; all operations (room discount + payment) on RIGHT panel

---

## Description

The checkout Bill panel (`FolioCheckoutPanel`) has a two-column layout:
- **LEFT (`.bill-left`)**: `Statement` → `RoomSection` — currently contains BOTH the read-only bill summary AND interactive discount controls
- **RIGHT (`.bill-right`)**: `CollectPaymentPanel` — F&B discount, coupon, service charge, tip, payment methods

Owner requires:
- **LEFT**: dynamic summary ONLY — booking amount, check-in discount, SGST, CGST, already paid, room balance, room orders, transferred — all **read-only**
- **RIGHT**: ALL operations — room discount controls (Room/Both/F&B selector, Amount/% input, reason, split payment toggle) + `CollectPaymentPanel`

### Current LEFT panel contains (interactive, should move to RIGHT):
- Room/Both/F&B only selector buttons
- Amount/Percent toggle + discount input + reason input
- discountOverMax alert
- Split room payment toggle + split legs inputs

### Current state (from code comment L4):
```
// LEFT = server statement passed through (no FE subtotals, Q2 a)
```
Design intent was LEFT = server statement (read-only). The interactive discount controls were placed in `Statement`/`RoomSection` (left) as an implementation choice that doesn't match this intent.

---

## Duplicate Check

| ID | Relation | Status |
|---|---|---|
| No prior ID covers this layout concern. All prior BUG-492/498/499 addressed formulas, not placement. | — | — |
| **BUG-519** | **DISTINCT** | NEW |

---

## Severity & Risk

- **Severity: P2 — MEDIUM**
  - Operations work functionally — discount can be applied
  - Confusing UX: discount controls on summary side, not operations side
  - Staff need to look at two different sides for operations vs confirmation
  - Workaround: staff can still use the controls where they are
- **Risk: HIGH** (touches room billing UI structure; moving controls changes how props flow through `FolioCheckoutPanel`; adjacent to R6 financial fields)
- **Fast Lane: NO** — HIGH risk, structural ~50-line JSX change, full gate cycle

---

## Evidence

- Screenshot: provided (owner screenshot shows Room discount controls visible on left panel)
- Steps to reproduce:
  1. `/pms/front-desk-v2?tab=departures` (or `inhouse`)
  2. Click Bill button on any room row
  3. Observe: Room/Both/F&B selector, discount input, split toggle are all on the LEFT panel
- Source: OWNER-REPORTED + AGENT-CONFIRMED via code trace
- Confidence: CONFIRMED

---

## Blast Radius

```bash
grep -n "bill-left\|bill-right\|Statement\|RoomSection" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx | wc -l
# → 7 sites in FolioCheckoutPanel.jsx
```

- **Files WILL change:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — restructure `fd-bill-grid`, move `RoomSection` interactive controls from `Statement`/left to right; make left read-only
- **Files might change (if props restructured):**
  - `Statement` component (within same file) — discount props removed
  - `RoomSection` component (within same file) — becomes read-only display or moves entirely
- **Hotspot files touched:** NO (FolioCheckoutPanel not in R5 list)
- **Blast radius: MEDIUM** (1 file, ~50 lines JSX restructure, prop changes within same file)

---

## Open Owner Decisions — ALL LOCKED (2026-10-08)

**OD-519-01 LOCKED = YES — left panel shows dynamic read-only discount line:**
When a room discount is applied on the right, the left panel summary shows a live read-only "Room discount: −₹X" line that updates dynamically. All interactive operations remain on the right.

**OD-519-02 LOCKED = Option a — room discount controls above CollectPaymentPanel:**
On the RIGHT panel, the room discount controls (Room/Both/F&B selector, Amount/% input, reason, discount over-max alert) appear ABOVE the existing `CollectPaymentPanel`. Natural top-down flow: set discount → then pay.

**OD-519-03 LOCKED = Option a — split room payment also moves to right:**
The "Split room payment" toggle and legs also move to the RIGHT panel alongside the other room discount controls. Left panel = summary only.

### Confirmed Right panel layout (top to bottom):
```
RIGHT (bill-right):
  [Room discount section] ← MOVED FROM LEFT
    Room/Both/F&B selector
    Amount/% toggle + input + reason
    discountOverMax alert
  [Split room payment] ← MOVED FROM LEFT
    toggle + legs
  [CollectPaymentPanel] ← unchanged position
    F&B discount, coupon, service charge, tip
    Payment methods
```

### Confirmed Left panel layout (read-only):
```
LEFT (bill-left):
  Guest header
  Room section (read-only summary):
    Booking amount, Check-in discount, SGST, CGST, Already paid
    Room discount: −₹X ← NEW dynamic read-only line (OD-519-01)
    Room balance (updated dynamically)
  Room orders (read-only)
  Transferred (read-only)
```

---

## Next

All ODs locked. → Gate 2 GO → PLANNING (Impact Analysis)

**Sprint:** oct_bug_batch
