# CR-054 — Training Sandbox Mode (via Service Worker Interception)

**Status:** PLACEHOLDER — INTAKE NOT YET COMPLETE
**Created:** 2026-06-18
**Created by:** Planning Agent (during CR-053-UX-01 brainstorm)
**Owner:** TBD
**Parent CR:** CR-053 (Training Academy)
**Predecessor:** CR-053-UX-01 (Observation Tour — Phase 1; must ship first)

---

## Why this CR exists

CR-053 (Training Academy) shipped the overlay engine and a "click here, click here" mission format. During CR-053-UX-01 review on 2026-06-18, the owner correctly flagged that **interactive missions cannot run on live restaurant data** — staff could accidentally create/edit/delete real menu items during training, damaging a working restaurant.

Phase 1 (CR-053-UX-01) resolved this by removing all click actions: missions are now read-and-watch tours that touch nothing.

But pure observation has a real cost: staff get **familiarity** but not **muscle memory**. Owner asked: *"Can we have something like a game tutorial mode — same UI, real-looking data, but actions don't persist?"*

This CR captures that "game tutorial" vision so it isn't forgotten and isn't rushed.

---

## One-line summary

A "Training Mode" that lets staff perform real actions (Add Item, Edit, Delete, etc.) on what looks like their real restaurant, but where every change is intercepted by a Service Worker and never reaches the production database.

---

## Why a separate CR (not part of CR-053)

| Reason | Detail |
|---|---|
| Effort delta | CR-053 + UX-01 ≈ ~2 weeks total. CR-054 is another ~2 weeks just for Menu Mgmt; more for other modules. |
| Scope of change | Adds a Service Worker to the production POS — a structurally significant change beyond CR-053's "overlay SDK" boundary. |
| Risk class | CR-053 = LOW (read-only overlay). CR-054 = MEDIUM-HIGH (any miss in interceptor → real data change). Different review criteria. |
| Owner decisions outstanding | API contract source-of-truth, sandbox lifecycle, activation UX, persistent banner design, multi-restaurant scenarios. All un-answered. |
| Maintenance ownership | Whoever owns this must keep the API mock catalog in sync with the Laravel backend. New ownership question. |

---

## Open intake questions (must be answered before Impact Analysis)

1. **Timing:** is Q2 2026 acceptable, or does this need to ship sooner?
2. **Coverage scope:** which courses get Sandbox first? Menu Management only, or include Order Entry, Reports, Discounts?
3. **API contract source:** Postman collection? OpenAPI spec? Or extract from POS source manually?
4. **Sandbox state lifecycle:** how long do "fake" changes persist? Per-session? 24h? Until explicit reset?
5. **Multi-tab behaviour:** if a staff member opens POS in 2 tabs, does Training Mode apply globally or per-tab?
6. **Real-time events (sockets):** during training, do real orders / live updates still come through, or are sockets paused?
7. **Banner design:** owner needs to approve the persistent "🎓 TRAINING MODE" banner mock-up (intrusive enough that no one ever forgets they're in training).
8. **Failure mode:** if the Service Worker fails to register (rare browsers, HTTPS issues), do we (a) block Training Mode entirely or (b) fall back to Observation Tour?
9. **Owner-restaurant context:** does Training Mode preserve the staff member's currently-logged-in restaurant, or always use a fixed sample dataset? Affects "feels real" vs "less risky" trade-off.
10. **Maintenance budget:** ongoing cost = whenever Laravel backend gains a new POST/PUT/DELETE endpoint, the Service Worker's interceptor needs an update. Acceptable workflow?

---

## Preliminary architecture (subject to Impact Analysis revision)

```
POS frontend (unchanged) 
    │
    ▼ axios / fetch
[Service Worker — registered by Training SDK]
    │
    ├── Training Mode OFF? → pass through transparently
    │
    └── Training Mode ON?
          │
          ├── GET request → forward to Laravel,
          │   merge in any sandbox-state edits, return
          │
          ├── POST/PUT/DELETE → don't forward.
          │   • Generate believable fake response (id, timestamps, success flag)
          │   • Store the change in IndexedDB sandbox state
          │   • Return fake response to POS frontend
          │
          └── Whitelist-by-default: any unknown endpoint = blocked (safe-fail)
```

**Key invariant:** Service Worker enters training mode via explicit handshake from Training SDK (postMessage). On any error, default = pass-through. Worst case = training doesn't work, real data is fine.

---

## Preliminary scope lock

WILL change:
- `/app/training-sdk/src/` — new Service Worker registration, training-mode toggle, banner UI, API mock catalog
- `/app/frontend/public/training-sw.js` — new file, the Service Worker itself (served from POS origin so it can intercept POS requests)
- `/app/training-sdk/src/sandbox/` — new directory: mock handlers, IndexedDB state layer, response generators
- Build pipeline — Service Worker must be served with correct headers; possible nginx config update
- `/app/frontend/public/index.html` — maybe 1-2 lines to register the SW; equivalent to CR-053's 2-line touch

WILL NOT change:
- `/app/frontend/src/**` — POS source code stays untouched
- `/app/backend/server.py` proxy — stays as-is
- Laravel backend / mygenie.online API — stays as-is
- `/app/training-backend/` — minimal or zero changes (Training Mode is a frontend concern)

---

## Preliminary effort estimate

| Component | Days |
|---|--:|
| Service Worker scaffold + registration handshake | 1 |
| API contract extraction (Menu Management module) | 0.5 |
| Mock response generators (~20 endpoints) | 2 |
| IndexedDB sandbox state layer | 1 |
| GET-merge logic | 1 |
| Activation UX + persistent banner | 0.5 |
| Integration with mission engine | 1 |
| Testing & edge cases | 2 |
| Documentation + maintenance runbook | 1 |
| **Total (Menu Management only)** | **~10 working days** |
| Each additional course (Order Entry, Reports, etc.) | +3-4 days each |

---

## Dependencies / blockers

- **CR-053-UX-01 (Observation Tour) MUST ship first** — its mission text becomes the API contract spec for CR-054's mock handlers.
- **Service Worker support in browsers** — modern browsers fine; need owner confirm no legacy browser support is required.
- **HTTPS only** — pre-prod and prod already on HTTPS; not an issue.
- **MyGenie Laravel team coordination** — for endpoint contract changes going forward. Nominate a point person.

---

## Risks (preliminary — full risk register comes in Impact Analysis)

| Risk | Severity | Mitigation |
|---|---|---|
| API contract drift — new mutation endpoint added to Laravel, SW doesn't know about it | 🟠 HIGH | Whitelist-by-default. Unknown POST/PUT/DELETE returns 503 in training mode. Quarterly sync with Laravel team. |
| Service Worker registration fails | 🟢 LOW | Fall back to Observation Tour automatically. Detect and log. |
| Sandbox state pollution | 🟡 MEDIUM | Auto-clear on session end, logout, training-mode-off. Explicit "Reset" button. |
| User forgets they're in training, complains about "lost data" | 🟠 HIGH | Persistent unmissable banner + entry confirmation modal + visible exit button. |
| WebSocket events during training | 🟡 MEDIUM | Owner decision needed in intake (Q6). |

---

## Success criteria (to be confirmed at intake)

- A new staff member can do a full M4-style "Add a New Menu Item" mission and feel like they actually added it (toast, list update, item appears)
- After exit-training, the menu shows zero trace of the item — verified by both UI and DB query
- No mutation request reaches Laravel during training mode — verified by network logs
- "I'm in training mode" is unmistakably clear at all times
- If Service Worker fails to install, user gets Observation Tour instead — no broken experience

---

## What does NOT belong in this CR

- Sandbox restaurant accounts (server-side approach) — separate CR if pursued
- Multi-lingual mission text — separate CR
- Owner Admin Panel for managing courses — separate CR (likely CR-055)
- Analytics on training completion rates — separate CR

---

## Next steps

1. Owner sign-off on Phase 1 (CR-053-UX-01 Observation Tour) — IN PROGRESS
2. Ship Phase 1, validate end-to-end with real staff feedback
3. Re-open this CR — schedule INTAKE workshop with owner to answer the 10 open questions
4. Then Impact Analysis (Gate 2) → Implementation Plan (Gate 3) → GO (Gate 4) → IMPLEMENTATION

**Until intake completes, no design work, no code, no commitment.**
