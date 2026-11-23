# BUG-747 evidence

- Source: OWNER-REPORTED 2026-11-23 (two console screenshots supplied in Emergent chat).
- Confidence: CONFIRMED.
- Key proof (screenshot 1, /dashboard after reload): FCM foreground payload received;
  `[Notification] Playing sound: forty_five_sec_buzzer` (NotificationContext.jsx:190) then a red
  `forty_five_sec_buzzer.wav` error → `audio.play()` blocked by browser autoplay (no gesture after reload).
- Full trace + code confirmation: /app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md
  and /app/memory/evidence/INV-BUZZER-20261123/ (probes.md, probes_round2.md).
- 2026-11-23 ADDENDUM — `BUG-747_reload_no_fcm_socket_only_2026-11-23.png`: SECOND failure mode. After a manual
  `unlock` (12:04:59), a fresh test order (12:06:55) arrived on the **socket only** (`new_order_69`/`update-order
  1579106`); Event Log shows **no `received` (FCM) event** and **no ring**. Proves M2 = FCM-not-delivered after
  reload (distinct from M1 autoplay-blocked). Ring is FCM-only; socket path never calls `soundManager.play`.
  See IA §2b. M2 is CR-562 territory → OD-747-04.
