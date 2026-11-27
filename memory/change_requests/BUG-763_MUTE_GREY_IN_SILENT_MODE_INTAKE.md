# BUG-763 — INTAKE DOC
## Mute Button Should Look Grey When Silent Mode Is On

```
ID:          BUG-763
Type:        BUG
Severity:    P3 — LOW
Risk:        LOW–MEDIUM (visual-only Mute affordance in Silent Mode)
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

With sidebar **Silent Mode** on, YTC pop **Mute** still looked like an active mute control (and could show orange). Owner wanted Mute **greyed** when Silent is already on (sound already off) — visual only via `soundEnabled` prop; no NotificationContext import in ScanOrderPopOut.

---

## 2. Steps to Reproduce

1. Turn **Silent Mode** on in sidebar
2. Open / show ScanOrderPopOut for a YTC order
3. **Expected:** Mute button grey / BellOff; title indicates Silent Mode
4. **Actual (pre-fix):** Mute looked like normal / snoozed styling

---

## 3. Evidence

- OWNER-REPORTED
- Files: `ScanOrderPopOut.jsx` (`soundEnabled` prop), `DashboardPage.jsx` (pass-through), tests fixture/`isWebOrder` updates
- Commit: `784aedf0`
- Screenshot: not provided

---

## 4. Blast Radius

- Files: `ScanOrderPopOut.jsx`, `DashboardPage.jsx`, test
- Scope: SMALL
- Hotspot: DashboardPage pass-through — pack with BUG-760

---

## 5. Risk Classification

- **Risk: MEDIUM** (touches Dashboard/ScanOrderPopOut; visual-only behavior)
- Fast Lane: **NO** (multi-file pack)

---

## 6. Duplicate Check

- **DISTINCT** from BUG-453 / BUG-760
- **RELATED:** BUG-453, BUG-760

---

## 7. Code Reality

**FULL** — on `ultimate-fix` @ `784aedf0`. Retroactive INTAKE.

---

## 8. Assignee Routing

FE · Aggregator / Sockets → **Abhishek**
