# BUG-746 — Intake

**Title:** Custom-price ("Enter Price") modal — amount input overflows / bleeds past the modal card edge
**Type:** BUG · **Severity:** P3 (cosmetic, non-blocking) · **Risk:** LOW (CSS/layout only)
**Area:** Order Entry / UI layout
**Registered:** 2026-11-21 · **Source:** Owner screenshot (restaurant "The Goan Kitchen", open-price item "melo fish")
**Reported by:** Owner

## Symptom
When a cashier taps an open-price / dynamic-price menu item, the **Enter Price** modal opens. The ₹ amount `<input>` extends beyond the right edge of the white modal card ("bleeds out") instead of fitting inside it.

## Repro (owner)
1. Open an order (any table) with a menu item configured for dynamic/open price.
2. Tap the item → "Enter Price" modal appears.
3. Observe the amount input right border sitting outside the modal card.

## Caveat noted at intake
Owner's screenshot shows the **"New version available — Update now"** banner → owner may be viewing a stale client build. The overflow-prone markup IS present in current source (see Impact Analysis), but live reproduction and fix verification must be done by `testing_agent` against the current build.

## Expected
The amount input stays fully inside the modal card at all supported widths (desktop + mobile).

→ Impact Analysis: `impact/BUG-746_DYNAMIC_PRICE_MODAL_INPUT_OVERFLOW_IMPACT_ANALYSIS.md`
