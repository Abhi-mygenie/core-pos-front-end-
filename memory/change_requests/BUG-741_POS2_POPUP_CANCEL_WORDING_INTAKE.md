# BUG-741 — Pop-up "cancel" reads as item-level, not order-level (POS-2) — INTAKE

**Gate:** 0→1 (INTAKE) · **Role:** INTAKE · **Date:** 2026-11-20
**Type:** BUG · **Class:** FE_UX / wording · **Area:** POS / Scan pop-up · **Priority:** P3 · **Risk:** MEDIUM
**Client:** ALL · **Assignee:** Abhishek (FE) · **Source:** Owner-reported; investigation `investigations/INV-POS-4ISSUES_INVESTIGATION_REPORT_2026-11-20.md` (Issue 2)
**Duplicate check:** none. No backend.

## Symptom
From the scan/Accept pop-up, the "cancel" the owner reaches acts on a **single item**, which reads like it is cancelling the whole order.

## Code reality (traced — behaviour is per-design, labelling is the issue)
The pop-up has **two** cancel affordances:
1. **Per-item ✕** on a row → `ScanOrderPopOut.jsx:571/653 onCancelItem` → **`CancelFoodModal`** (item-level): title "Cancel <item>" (`CancelFoodModal.jsx:72`), footer "Cancelling: 1 <item>" (`:237-239`), button "Cancel Item" (`:262`). Correct behaviour (CR-545) but visually indistinguishable from an order cancel.
2. **"Reject" button** (bottom) → `ScanOrderPopOut.jsx:746 handleRejectClick` → `onReject(order)` → `CancelOrderModal` (order-level), tooltip "Reject / Cancel order" (`:750`).

## Recommendation
UX/wording clarification only (no backend): make the per-item modal clearly read as a single-item action and make the order-level "Reject/Cancel order" affordance distinct.

## Owner decision — LOCKED 2026-11-20
**Keep per-item cancel + clearer wording.** The per-item ✕ stays item-level (CancelFoodModal, per CR-545); only the labels/affordances change so it reads clearly as a single-item action, distinct from the order-level "Reject/Cancel order" button. No behaviour change, no backend.

## Blast radius
LOW–MEDIUM — `ScanOrderPopOut.jsx`, `CancelFoodModal.jsx`, `CancelOrderModal.jsx` (labels/affordances only).

## Next
Owner decision → Planning/implement. No code changed.
