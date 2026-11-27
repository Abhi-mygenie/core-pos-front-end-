# INV-WEB-EDIT-NOTCONFIRM — Session 2 Addendum (FCM leg)

**Date:** 2026-11-17 (evening) · **Role:** INVESTIGATION (Role 6) · **Repo:** `main @ 085681a3`
**Scope:** Close the one outstanding leg from `02_SESSION_HANDOVER_RESUME_HERE.md` (the staff FCM payload) + re-verify the contract on a fresh owner-triggered live edit. **Zero `frontend/src` changes.**

---

## 1. Fresh live edit — re-verification (owner added 1 item to Table 7 live)

Captured passively on room `rest_672` at **02:06:47 IST** (`socket_capture.log`, `socket_events.jsonl`).

**Wire event `new_order_672` (6 positional args):**

| Pos | Value | Note |
|---|---|---|
| args[0] | `"update-order"` | inner event (not `update-food-status`/`update-item-status`) |
| args[1] | `1578831` | order id |
| args[2] | `672` | restaurant |
| args[3] | **`2`** | order-level `f_order_status` — **unchanged** ✓ contract holds |
| args[4] | `{ orders:[…], newly_added_items:[…] }` | `orders` read by FE; **`newly_added_items` ignored** (0 grep hits) |
| args[5] | `"web"` | undocumented 6th arg |

- `newly_added_items` = **1 object**: line `3969368` `food_status=7` `Hot Garlic Sauce` — the just-added line, explicitly flagged by the backend.
- Order now carries **5 × `food_status=7`** + 1 × `food_status=2` (Manchurian). `order_edit_count = 5`, `print_kot = Yes`, `f_order_status = 2` across all 5 edits.
- **REST confirms the same** (`get-single-order-new`, `single_order_1578831_AFTER_edit5_session2.json`): the pending lines persist on the read path with no `item_added`/`confirm` flag — `food_status` is the only discriminator, and it survives reload (unlike `newly_added_items`, which is socket-only). → confirms OD-C recommendation: **`food_status === 7` is the source of truth**.

## 2. FCM leg — deterministic code trace (push itself not sandbox-capturable)

The push for this edit was delivered by Firebase (~02:06) before any browser was armed, and FCM pushes do **not** traverse the socket, so the payload was traced in code instead:

| File | Behaviour |
|---|---|
| `public/firebase-messaging-sw.js:31-55` | Background push: reads `data.title/body/sound`; `data.type` used only as notification `tag`; forwards `data` to clients via `BACKGROUND_NOTIFICATION`. |
| `contexts/NotificationContext.jsx:43-49` | `isConfirmOrderNotification` → **TRUE** if `data.type`/`data.notification_type` ∈ `{confirm_order, confirmorder, yet_to_confirm, yettoconfirm, ytc}` **OR** `resolvedSound === 'confirm_order'`. |
| `contexts/NotificationContext.jsx:12-24` | `inferSoundFromContent` sets `confirm_order` whenever title/body contains **"confirm"**. |

**Conclusion:** a *"Please confirm this order"* edit push **will** trigger the confirm tone via content-inference even if `data.type` is unset. The confirm-tone detection is therefore **not** the gap. The gap is downstream (break point 7): `notificationclick` (`firebase-messaging-sw.js:63-77`) only focuses/opens `/dashboard` — there is **no deep-link to the order and no in-POS marker**, so staff who tap the push land on a dashboard where the order shows a normal Ready state with cooking-pot lines.

## 3. Outcome

- Socket + REST legs: **CLOSED** (re-verified on fresh live data).
- FCM leg: **CLOSED WITH REAL DATA.** Owner captured the live push from the genuine logged-in POS console (automated-sandbox attempt failed only because headless login didn't complete — Firebase initialised but no auth). Full payload + analysis: `fcm_payload_captured.md`. Payload: `notification.title="Please confirm this order"`, body `Order ID 000793 / dinein / Table 7`, `data={sound:forty_five_sec_buzzer, orderid, channel_id}`, `fcmOptions.link=/dashboard`. **No `data.type`/`notification_type`.**
  - **NEW FINDING:** because `data.sound` is explicitly `forty_five_sec_buzzer` and there is no `data.type`, the **POS2-007 confirm-order tone override never fires** (`isConfirmOrderNotification` = false; console shows no override line, `resolved: forty_five_sec_buzzer`). The override is dead vs the live contract — the `confirmOrderTone` setting has no effect. A buzzer still plays, so staff are audibly alerted.
  - **NEW/EDIT distinction proven:** a NEW web order (`scan-new-order`, order-level `fOrderStatus=7`) DOES raise the "New Web Order — Awaiting Confirmation" banner (works). The EDIT case (`update-order`, `f_order_status=2`) raises **no banner**; only item-level `food_status=7` is set, which the FE shows as a plain cooking-pot item. The push for both is the generic `/dashboard` one with no deep-link.
  - BACKEND_BRIEF question (exact payload) is now **ANSWERED** → downgraded to informational.
- Root cause, confidence (**HIGH**), classification (**FE_BUG**), and all 8 break points are **unchanged** and now double-confirmed.

**Next role:** INTAKE (register — still no CR/BUG id) → PLANNING (full gate; planning-skip NOT eligible). Owner decisions OD-A/OD-B/OD-C still to lock.
