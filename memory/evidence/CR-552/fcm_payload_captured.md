# FCM push payload — CAPTURED (owner's live browser, 2026-11-17 ~23:32 IST)

Captured by owner from the real logged-in POS console (foreground FCM path, `[Notification] Full payload:`), restaurant 672. Two pushes seen; identical shape. `data.orderid` = `1578865` (the web order just placed/edited). Bill `000793`, Table 7, dinein.

## Raw payload (both pushes, same structure)
```json
{
  "from": "969625631640",
  "messageId": "62354254-fc3b-4158-b597-d931567a6df7",
  "notification": {
    "title": "Please confirm this order",
    "body": "Order ID: 000793 \nOrder Type: dinein \nTable No: 7"
  },
  "data": {
    "sound": "forty_five_sec_buzzer",
    "orderid": "1578865",
    "channel_id": "forty_five_sec_buzzer"
  },
  "fcmOptions": { "link": "https://preprod.mygenie.online/dashboard" }
}
```
(2nd push messageId `a360db30-c026-4aa3-a16d-8177395f8096`; it was suppressed by `BUG-453 muted order 1578865`.)

## Decisive facts vs FE handling
1. **No `data.type` and no `data.notification_type`.** → first two branches of `isConfirmOrderNotification` (NotificationContext.jsx:46) are FALSE.
2. **`data.sound` is explicitly `forty_five_sec_buzzer`.** At `:119-120`, `soundKey` is truthy so `inferSoundFromContent(title,body)` is **skipped** — the "confirm" in the title never maps to `'confirm_order'`. `resolvedSound = 'forty_five_sec_buzzer'`.
3. Therefore `isConfirmOrderNotification(data,'forty_five_sec_buzzer')` → **FALSE** → the **POS2-007 confirm-order tone override (`:155-166`) NEVER runs.** Console confirms: no `POS2-007 ... override` line; `resolved: forty_five_sec_buzzer`; `Playing sound: forty_five_sec_buzzer`.
   → **NEW FINDING: POS2-007 confirm-order override is effectively dead for real pushes.** It was built to key on `data.type==='confirm_order'` or an inferred `confirm_order` sound; the backend sends neither. Functionally a buzzer still plays, so staff are audibly alerted — but the per-restaurant `confirmOrderTone` setting has no effect.
4. **`fcmOptions.link = .../dashboard`** (generic) and SW `notificationclick` also opens `/dashboard` (firebase-messaging-sw.js:63-77). `data.orderid` IS present but **unused for navigation** → confirms break point 7: tap → dashboard, no order/table context, no marker.

## NEW-order vs EDIT — the real distinction (now proven end-to-end)
- **NEW web order** (socket `scan-new-order`, `fOrderStatus=7`, `hasFullPayload=true`, orderId 1578865): FE **does** show the full **"New Web Order — Awaiting Confirmation"** banner (ScanOrderPopOut) with Accept/Reject/Edit/KOT/Mute. Order-level Not-Confirm flow WORKS. (Screenshot 1.)
- **EDIT of an existing order** (socket `update-order`, `f_order_status=2` → "preparing/ready", order 1578831): **NO banner.** Order stays confirmed; only the appended line carries item-level `food_status=7`, which the FE renders as a normal orange cooking-pot item with no YTC marker/label/affordance. (Screenshot 2 + earlier socket/REST evidence.) **This is the investigation's gap.**

## Net effect on investigation
- Root cause UNCHANGED and now fully proven: the "Not-Confirm" state on a **web edit** is invisible in POS because (a) order-level `f_order_status` stays `2` (no banner), (b) item-level `food_status=7` has no render/label/discovery branch, and (c) the FCM push is generic (`/dashboard`, no `type`, no deep-link, override dead).
- Confidence: HIGH. Classification: FE_BUG (+ a secondary FE defect: POS2-007 override non-functional vs the live push contract).
- FCM leg: **CLOSED WITH REAL DATA.** BACKEND_BRIEF question (exact payload) is now ANSWERED — downgraded to informational.
