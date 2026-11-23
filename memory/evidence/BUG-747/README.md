# BUG-747 evidence

- Source: OWNER-REPORTED 2026-11-23 (two console screenshots supplied in Emergent chat).
- Confidence: CONFIRMED.
- Key proof (screenshot 1, /dashboard after reload): FCM foreground payload received;
  `[Notification] Playing sound: forty_five_sec_buzzer` (NotificationContext.jsx:190) then a red
  `forty_five_sec_buzzer.wav` error → `audio.play()` blocked by browser autoplay (no gesture after reload).
- Full trace + code confirmation: /app/memory/investigations/INV-BUZZER-20261123_INVESTIGATION_REPORT.md
  and /app/memory/evidence/INV-BUZZER-20261123/ (probes.md, probes_round2.md).
