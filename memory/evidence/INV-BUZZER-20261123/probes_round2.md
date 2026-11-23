# INV-BUZZER-20261123 — Evidence round 2 (owner reload scenario)

Owner report: "log in → rings; **reload the page → never rings again until I relogin**; and in a few cases on relogin it still doesn't ring and the FCM payload isn't received."

## Screenshot 1 (10:33 PM, /dashboard) — FCM IS received after reload
Console shows a full foreground FCM message processed:
```
[Notification] Foreground message: { from:"969625631640", messageId:"c2c04ba1-…", notification:{…}, data:{…} }
[Notification] Full payload: { notification:{ title:"Please confirm this order", body:"Order ID: 000049 …" },
                               data:{ orderid:"1579106", channel_id:"forty_five_sec_buzzer", sound:"forty_five_sec_buzzer" },
                               __source:"foreground" }
[Notification] Sound - from payload: forty_five_sec_buzzer | resolved: forty_five_sec_buzzer   (NotificationContext.jsx:177)
[Notification] Playing sound: forty_five_sec_buzzer                                            (NotificationContext.jsx:190)
<red> Cookie "__cf_bm" has been rejected for invalid domain.
<red> forty_five_sec_buzzer.wav        ← play() attempt surfaced as an error, NOT a "played/ok"
```
→ The FCM payload DID arrive on the reloaded page and `soundManager.play('forty_five_sec_buzzer')`
  WAS called. The red `forty_five_sec_buzzer.wav` line = the browser blocking/erroring the
  `audio.play()` — i.e. sound attempted but not audible. So the reload failure is NOT a delivery
  problem and NOT the socket-has-no-sound gap.

## Screenshot 2 (10:31 PM, /dashboard) — socket path only (no ring)
`new_order_69` → update-order 1579106 → OrderContext/TableContext updates, order redraws.
No `[Notification] Playing sound` here — this is the socket state update, which (as established) never rings.

## Code facts confirmed this round
- `grep` for any global gesture→unlock listener (click/pointerdown/touchstart + unlock): NONE
  (all hits are unrelated click-outside dropdown handlers).
- `soundManager.unlock()` is called from exactly ONE place: NotificationTester "Enable Audio" button.
- Nothing calls `unlock()` on login or app boot (AuthContext/App.js/index.js/LoginPage: no match).
- `SoundManager` constructor sets `isUnlocked = false` → reset on every page load (in-memory only).
- ScanOrderPopOut (the green "Awaiting Confirmation" popup) imports soundManager for `stop()` ONLY,
  never `play()` — its ring also depends entirely on the FCM path.
```
