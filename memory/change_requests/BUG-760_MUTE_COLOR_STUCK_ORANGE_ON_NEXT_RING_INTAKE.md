# BUG-760 — INTAKE DOC
## Mute Button Stays Orange While Next Order Correctly Rings

```
ID:          BUG-760
Type:        BUG
Severity:    P2 — MEDIUM
Risk:        MEDIUM (Mute UI state only — instance mute kept)
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

After Mute on a ringing YTC order, a **later order rings correctly** (instance-only mute), but the Mute button **stays orange** as if still muted. UI color was tied to `snoozedOrders` and never cleared when the next alert played.

---

## 2. Steps to Reproduce

1. YTC popup rings → click **Mute** (button goes orange; sound stops)
2. New order alert arrives and **rings**
3. **Expected:** Mute button returns to default (not orange) for the new context
4. **Actual (pre-fix):** Mute stays orange while sound is already playing

---

## 3. Evidence

- OWNER-REPORTED
- Fix: `NotificationContext` dispatches `mygenie:order-alert-played`; `DashboardPage` clears `snoozedOrders` on that event; `toggleSnooze` remains instance-only (stop + Set)
- Commit: `784aedf0`
- Screenshot: not provided

---

## 4. Blast Radius

- Files: `NotificationContext.jsx`, `DashboardPage.jsx`
- Scope: SMALL–MEDIUM
- Hotspot: DashboardPage is R5 → full gate flow

---

## 5. Risk Classification

- **Risk: MEDIUM**
- Fast Lane: **NO** (DashboardPage hotspot + NotificationContext)

---

## 6. Duplicate Check

- **DISTINCT** from BUG-453 (mute does not stop ringer) — this is color/UI reset only
- **RELATED:** BUG-453

---

## 7. Code Reality

**FULL** — on `ultimate-fix` @ `784aedf0`. Retroactive INTAKE.

---

## 8. Assignee Routing

FE · Aggregator / Sockets · not backend-blocked → **Abhishek**
