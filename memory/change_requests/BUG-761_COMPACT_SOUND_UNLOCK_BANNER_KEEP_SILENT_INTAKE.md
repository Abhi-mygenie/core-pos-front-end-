# BUG-761 — INTAKE DOC
## Compact Sound Unlock Banner — Turn On Ringer + Keep It Silent

```
ID:          BUG-761
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

Autoplay-locked **SoundUnlockBanner** was a large single pill (“Turn on ringer from the sidebar…”). Owner wanted a **compact** bar with two actions: **Turn on ringer** (unlock) and **Keep it silent** (enter Silent Mode / hide banner).

---

## 2. Steps to Reproduce

1. Reload POS so autoplay locks audio; wait for an order alert
2. Red unlock banner appears
3. **Expected:** compact bar with Turn on ringer + Keep it silent
4. **Actual (pre-fix):** large single-button banner only

---

## 3. Evidence

- OWNER-REPORTED UI request
- File: `SoundUnlockBanner.jsx` — compact two-button bar; hides when `!soundEnabled`
- Commit: `784aedf0`
- Screenshot: not provided

---

## 4. Blast Radius

- File: `frontend/src/components/notifications/SoundUnlockBanner.jsx`
- Scope: SMALL (1 file UI)
- Hotspot: NO for this file alone; pack with related ringer items

---

## 5. Risk Classification

- **Risk: MEDIUM** (notification UX; couples to Silent Mode)
- Fast Lane: **NO** (part of multi-item pack; Keep it silent interacts with Sidebar — BUG-762)

---

## 6. Duplicate Check

- **DISTINCT** — BUG-747 introduced the banner/tri-state; this is UX evolution
- **RELATED:** BUG-747, BUG-762

---

## 7. Code Reality

**FULL** — on `ultimate-fix` @ `784aedf0`. Retroactive INTAKE.

---

## 8. Assignee Routing

FE · Aggregator / Sockets → **Abhishek**
