# BUG-759 — INTAKE DOC
## Accept Popup Flash — ScanOrderPopOut Reappears Then Vanishes After Accept

```
ID:          BUG-759
Type:        BUG
Severity:    P1 — HIGH
Risk:        MEDIUM (YTC/FCM UI state — no money path)
Sprint:      dec_sprint
Client:      ALL
Assignee:    Abhishek (FE — not backend-blocked)
Area:        Aggregator / Sockets
Status:      GATE_1_INTAKE
Source:      OWNER-REPORTED + AGENT-CODED
Confidence:  CONFIRMED (fix on ultimate-fix @ 784aedf0)
Code reality: FULL — retroactive registration
```

---

## 1. Description

After staff **Accept** a Yet-to-Confirm (YTC) web order, `ScanOrderPopOut` briefly **reopens then disappears** (flash). Caused by Accept ACK FCM / text matching bare `confirm` / `confirmed`, which re-queued YTC hydrate and re-injected `fOrderStatus=7` for an already-accepted order.

---

## 2. Steps to Reproduce

1. Dashboard with ringer unlocked; receive web YTC order → ScanOrderPopOut opens
2. Click **Accept**
3. **Expected:** popup stays closed; order proceeds normally
4. **Actual (pre-fix):** popup flashes open then vanishes

---

## 3. Evidence

- Source: OWNER-REPORTED during ringer/YTC session
- Fix commit: `784aedf0` on `ultimate-fix` (cherry-picked onto `430edce9`)
- Files: `YtcFcmHydrator.jsx` (Accept flash guard), `NotificationContext.jsx` (tighten yet-to-confirm detect)
- Screenshot: not provided

---

## 4. Blast Radius

- Files: `frontend/src/components/notifications/YtcFcmHydrator.jsx`, `frontend/src/contexts/NotificationContext.jsx`
- Scope: SMALL–MEDIUM (2 files, FCM/YTC path)
- Hotspot: NotificationContext / Dashboard-adjacent — full gate flow preferred

---

## 5. Risk Classification

- **Risk: MEDIUM** — notification / order-popup state
- Fast Lane: **NO** (multi-file + notification provider)

---

## 6. Duplicate Check

- **DISTINCT** — not the same as BUG-751 (popup missing after reload) or BUG-752 (buzzer not stopping on Accept)
- **RELATED:** BUG-751, BUG-752

---

## 7. Code Reality

**FULL** — already implemented on local `ultimate-fix` ahead of remote. Retroactive INTAKE.

---

## 8. Assignee Routing

Area = Aggregator / Sockets · FE · not backend-blocked → **Abhishek**
