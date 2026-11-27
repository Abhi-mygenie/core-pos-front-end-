# BUG-762 — INTAKE DOC
## Sidebar Double-Tap After Keep It Silent — Stuck on Tap to Enable

```
ID:          BUG-762
Type:        BUG
Severity:    P2 — MEDIUM
Risk:        MEDIUM (ringer unlock UX)
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

After **Keep it silent** on the unlock banner (`soundEnabled=false` while still `audioUnlocked=false`), leaving Silent via the sidebar required **two clicks**: first turned sound on but left UI on **Tap to enable**; second unlocked. One gesture should restore Ringer On.

---

## 2. Steps to Reproduce

1. Trigger unlock banner → click **Keep it silent**
2. Click sidebar Silent / Tap-to-enable control once
3. **Expected:** Ringer On in one click (enable + unlock)
4. **Actual (pre-fix):** first click leaves Tap to enable; second click unlocks

---

## 3. Evidence

- OWNER-REPORTED
- File: `Sidebar.jsx` — leaving Silent → `setSoundEnabled(true)` + `unlockAudioNow()` if still locked
- Commit: `784aedf0`
- Screenshot: not provided

---

## 4. Blast Radius

- File: `frontend/src/components/layout/Sidebar.jsx`
- Scope: SMALL
- Hotspot: Sidebar often listed — treat as MEDIUM pack with BUG-761

---

## 5. Risk Classification

- **Risk: MEDIUM**
- Fast Lane: **NO**

---

## 6. Duplicate Check

- **DISTINCT** from BUG-747 (introduced tri-state)
- **RELATED:** BUG-747, BUG-761

---

## 7. Code Reality

**FULL** — on `ultimate-fix` @ `784aedf0`. Retroactive INTAKE.

---

## 8. Assignee Routing

FE · Aggregator / Sockets → **Abhishek**
