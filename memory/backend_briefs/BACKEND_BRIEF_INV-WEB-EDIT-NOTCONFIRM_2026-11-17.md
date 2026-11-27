# BACKEND_BRIEF_INV-WEB-EDIT-NOTCONFIRM_2026-11-17

> **STATUS: RESOLVED / ANSWERED (2026-11-17).** Owner captured the live push from the real logged-in POS console — see `evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/fcm_payload_captured.md`. Payload confirmed: `notification.title="Please confirm this order"`, `data={sound:"forty_five_sec_buzzer", orderid, channel_id:"forty_five_sec_buzzer"}`, `fcmOptions.link=".../dashboard"`, and crucially **NO `data.type`/`data.notification_type`**. No backend answer needed; retained as informational. Follow-on is FE-only (see below + addendum).

## Summary
- Issue: Need the exact **staff FCM push payload** emitted on a customer **web order edit** (`edit_order_confirm_web`, item-level Not-Confirm) to confirm the POS confirm-tone/handler path.
- Classification: CONFIG_ISSUE / CONTRACT_MISMATCH (documentation of push contract) — not a backend defect.
- Frontend impact: FE confirm-tone fires only if the push `data.type`/`notification_type` ∈ {confirm_order, yet_to_confirm, ytc} OR title/body contains "confirm". If the edit push uses none of these, no confirm tone plays.
- Priority/Risk: P2 · MEDIUM (verification/doc; the display-path FE_BUG is tracked separately and is HIGH).

## Endpoint / channel
- Delivery: Firebase Cloud Messaging (FCM) push to staff devices/topics on a customer web edit.
- Related socket event already captured: `new_order_672` → inner `update-order`, `args[3]=2` (order status unchanged), `args[5]="web"`, `args[4].newly_added_items=[{id:3969368, food_status:7}]`.
- Restaurant 672; specimen order 1578831 / bill 000774 / Table 7.

## What we need (exact push payload for a web EDIT, not a place)
1. `notification.title` / `notification.body`
2. `data.type` and/or `data.notification_type`
3. `data.sound` (sound key)
4. Any order/item identifiers in `data` (order_id, newly-added item ids) usable for a deep-link
5. Targeting model: device token vs topic (login response carries `zone_wise_topic` → suggests topic messaging)

## Why we cannot capture it here
- The push for the live edit was delivered before a browser could be armed; FCM pushes do not traverse the socket.
- Headless sandbox cannot reliably receive FCM (token/topic registration + permission). Per investigation handover: attempt once, else request payload from backend — hence this brief.

## Frontend workaround
- Available: PARTIAL. Confirm-tone will fire via content-inference if body contains "confirm". The real fix (visible in-POS marker + deep-link + confirm affordance for `food_status=7` lines) is FE work tracked under this investigation — independent of this brief.

## Evidence
- /app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/socket_events.jsonl (full update-order envelope)
- /app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/single_order_1578831_AFTER_edit5_session2.json
- /app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/03_SESSION2_FCM_LEG_ADDENDUM.md

(No credentials in this brief; test account referenced by alias only.)
