# BUG-676 — Scan/Confirm Order: Ringer + Confirmation Pop-Up Not Triggered for Edit Orders (New Items Added)

**Registered:** 2026-11-12
**Type:** BUG
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

When a **new** scan/confirm order arrives, the ringer plays and the confirmation pop-up appears correctly. However, when an **existing confirmed order is edited** (new items added by the customer via the scan & order portal), the update arrives silently — **no ringer plays and no confirmation pop-up appears**. The new items simply get added to the order without any notification to the POS operator.

**Current behaviour:**
- New scan order → ringer plays + ScanOrderPopOut pop-up appears ✅
- Edit to existing order (new items added) → silent, no ringer, no pop-up ❌

**Expected behaviour:** When new items are added to an existing confirmed scan/web order, the POS should:
1. Play the confirmation ringer
2. Show the confirmation pop-up (or a notification) so staff know the order has been updated

---

## 2. Classification

- **Type:** BUG
- **Severity:** P1 — High (new items added to confirmed orders can be missed entirely; no workaround for staff)
- **Risk:** HIGH — `NotificationContext.jsx` (notification/sound logic), `ScanOrderPopOut.jsx` (pop-up logic), socket event handling
- **Area:** Aggregator / Sockets
- **Fast Lane:** NOT eligible (socket + notification logic)

---

## 3. Duplicate Check

- BUG-453 (Mute does not stop ringer — GATE_5A_IMPLEMENTED): different — about muting, not about edit orders
- BUG-600 (Aggregator tone — GATE_5B_QA_PASS): different — about which sound plays, not about edits
- POS2-007 (Confirm-order tone FE override — CLOSED): different — about tone selection
- **Result: DISTINCT**

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Code note:** `NotificationContext.jsx:22` maps `item_added` sound type but FCM/socket for edit-order events likely uses a different payload type that is not currently triggering the full confirm-order ringer + pop-up flow
- **Confidence:** CONFIRMED

---

## 5. Root Cause (preliminary)

The `ScanOrderPopOut` component only queues orders with `fOrderStatus === 7` (YTC — Yet To Confirm). When an already-confirmed order is edited, its `fOrderStatus` is not 7, so it never enters the YTC queue and no pop-up is shown. The ringer logic in `NotificationContext` only plays `confirm_order` sound for new YTC events — edit events (`item_added` sound type) play a different/softer sound without a pop-up.

---

## 6. Blast Radius

- `src/contexts/NotificationContext.jsx` — extend confirm-order ringer logic for edit events
- `src/components/dashboard/ScanOrderPopOut.jsx` — handle edit-order notification display
- `src/hooks/useOrderPollingReconciliation.js` — may need to track order edits
- **Estimated scope:** MEDIUM (2–3 files, socket/notification logic)

---

## 7. Open Questions

- OD-676-01: Should the edit-order ringer use the same confirm_order sound, or a distinct "order updated" tone?
- OD-676-02: Should the pop-up show the full confirmation flow (accept/reject) or just an informational alert (dismiss only)?
- OD-676-03: Does the backend socket event for edit-order carry a distinguishable `type` or `event_name` field to detect it?

---

## 8. Related

- BUG-453 (Mute ringer — GATE_5A_IMPLEMENTED)
- BUG-600 (Aggregator tone — GATE_5B_QA_PASS)
- `src/components/dashboard/ScanOrderPopOut.jsx`
- `src/contexts/NotificationContext.jsx`
