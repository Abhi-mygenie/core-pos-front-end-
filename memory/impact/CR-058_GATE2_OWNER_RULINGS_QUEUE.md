# CR-058 — Order-Level Mark Complimentary
## Gate 2: Pre-Analysis + Owner Ruling Queue

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 2 — BLOCKED on owner rulings (8 required per R3/R6)
**Priority:** P1
**Risk:** HIGH (R6 — full order financial value set to ₹0)
**Sprint:** POS 6.0

---

## Screenshot Context (received 2026-08-22)

Owner shared Bill Summary section screenshot showing:
- Existing per-item comp checkbox + "(Complimentary)" green label
- Item: "2 CRISPY BURGER + LOADED FRIES x1 ₹305" → struck through at ₹0
- This confirms: the "Mark Order Complimentary" button belongs in this BILL SUMMARY section of CollectPaymentPanel

---

## Code Reality: NONE

No order-level bulk comp action exists anywhere in the codebase.

Per-item mechanism exists and works (isComplementaryRuntime, checkbox, green label) — confirmed in screenshot.
CR-058 adds a NEW action on top of this existing mechanism.

---

## What CR-058 would add

Single "Mark Order Complimentary" button in the Bill Summary section (same area as screenshot).

Tapping it:
1. Flips all active (non-cancelled) items to `isComplementaryRuntime = true`
2. Shows a reason input (how mandatory, where stored — see OQ-6 below)
3. Total becomes ₹0
4. Settles normally through existing comp path

---

## OWNER RULINGS REQUIRED (all 8 must be answered before Gate 3)

| # | Question | Options | Why blocking |
|---|---|---|---|
| **OQ-1** | **Cancelled items** — skip or also flip to comp? | A) Skip cancelled (only active items comp'd) · B) Flip all including cancelled | Affects which items get `isComplementaryRuntime=true` |
| **OQ-2** | **Already-served items** — allowed to comp? | A) Yes, all items · B) Only active/placed items | Risk of dispute |
| **OQ-3** | **Reversibility** — can cashier un-comp the whole order? | A) One-way (no undo) · B) Button becomes "Remove Comp" (toggles back) | UX + audit trail design |
| **OQ-4** | **Permission gate** — who can use this? | A) Reuse `order_cancel` role · B) New `order_comp` permission (already has a slot in permissionCatalog.js) | Role management scope |
| **OQ-5** | **Where does the button live?** | A) Bill Summary only (Collect Payment screen) · B) Also on Order Card as an action | Component scope |
| **OQ-6** | **Where is the note/reason stored?** | A) On the order (`discount_note` or `order_note`) · B) Per-item (`comp_reason` — same as CR-104) · C) Both | Transform + payload scope |
| **OQ-7** | **Bill print for a fully-comp order** | A) Show each item at ₹0 with "(Complimentary)" (same as today per-item) · B) Show one "Complimentary — {reason}" line at ₹0 total | Print template scope |
| **OQ-8** | **Aggregator orders (Swiggy/Zomato)** | A) Button available on all orders · B) Own-orders only | R6 financial reconciliation with aggregator |

---

## What the screenshot tells us (pre-answers OQ-5 partially)

The screenshot is the **Collect Payment / Bill Summary screen** — this is where the button should live. That aligns with option A for OQ-5 (Bill Summary only). To confirm: should it also appear on Order Card, or Bill Summary only is sufficient?

---

## Estimated scope once rulings received

| Component | Change |
|---|---|
| `CollectPaymentPanel.jsx` | "Mark All Comp" button in Bill Summary header + confirmation modal with reason |
| `OrderEntry.jsx` | New `markOrderComplimentary(reason)` handler — iterates cartItems, sets all to isComplementaryRuntime=true |
| `orderTransform.js` | If reason on order: add note field to payload. If per-item: reuse CR-104's compReason |

---

Status: AWAITING OWNER RULINGS (OQ-1 through OQ-8)
Next: Owner answers → Gate 3 Implementation Plan → Gate 4 GO
