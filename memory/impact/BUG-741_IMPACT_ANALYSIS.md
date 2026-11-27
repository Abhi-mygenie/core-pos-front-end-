# BUG-741 — Impact Analysis (Gate 2) — Pop-up cancel wording (POS-2)

**Role:** PLANNING (Gate 2) · **Date:** 2026-11-20 · **Type:** BUG / FE_UX · **Priority:** P3
**Risk:** **LOW–MEDIUM** (copy/label/affordance only, no logic, no backend).
**Owner decision:** LOCKED — **keep per-item cancel behaviour; clarify wording only** so it reads as a single-item action, distinct from the order-level Reject.

## Code Reality: FULL (behaviour correct; labelling is the issue)
Two cancel affordances in the pop-up:
1. **Per-item** → `PopoutItemRow.jsx:124-130` cancel button → `onCancel(item)` → `ScanOrderPopOut` `onCancelItem` (`:196`) → **`CancelFoodModal`** (item-level, correct per CR-545).
2. **Order-level "Reject"** → `ScanOrderPopOut.jsx:297-304` `handleRejectClick` → `onReject(order)` → `CancelOrderModal`.

The per-item modal simply *reads* like an order cancel.

## Conflict Pre-Check
| File | Overlap | Note |
|---|---|---|
| `CancelFoodModal.jsx` | none open | title/footer/button copy only |
| `PopoutItemRow.jsx` | **CR-557** owner, **CR-561** (this batch) | tiny label/affordance tweak; coordinate |
| `ScanOrderPopOut.jsx` | CR-547/552/558 open | only if the "Reject" affordance needs a distinctness tweak; prefer label-only |

## Affected files (WILL change — Gate 3 pins lines)
1. `CancelFoodModal.jsx:72 / :237-239 / :262` — make title/footer/button unambiguously single-item (e.g. "Cancel this item" / show item name + qty).
2. `PopoutItemRow.jsx` — per-item cancel button `title`/aria to clearly say "cancel this item".
3. `ScanOrderPopOut.jsx:750` (optional) — ensure the order-level "Reject/Cancel order" affordance is visually/label distinct.

## WILL NOT touch
Any cancel **logic**, payloads, backend, the CancelOrderModal flow, item-cancel behaviour (CR-545 preserved).

## Risk register
LOW: wording only. One caution — do not alter the data-testids or the handler wiring (QA + CR-545 depend on them); copy/title/aria only.

## Next
Owner-decision is locked → could go straight to Gate 3 / implement (LOW risk). No backend. No code changed this gate.
