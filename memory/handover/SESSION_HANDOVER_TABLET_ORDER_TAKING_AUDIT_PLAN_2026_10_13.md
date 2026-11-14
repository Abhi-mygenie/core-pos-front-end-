# SESSION HANDOVER — Tablet Order-Taking Responsiveness Audit (PLANNING workstream)
**Date:** 2026-10-13 · **From:** INVESTIGATION agent (post CR-414 Gate 5a) · **To:** PLANNING / IMPACT-ANALYSIS specialist · **Mode:** Audit → gap report. **No code edits in this workstream yet.**

---

## 1. Owner's brief (verbatim intent, condensed)
> *"Check for complete functionality for the tab, for the responsiveness, at least for the order-taking process, not like reports and these things we can see in phase two. But for order-taking process, all these screens which are involved should be checked if they are compatible or not. And if they are not compatible, what are the gaps? A specific or specialist agent should be called for that from planning."*

**Translation:**
- Phase 1 scope = **order-taking flow only**, on tablet viewports.
- Phase 2 (deferred) = Reports, Settings, Inventory, Vendor, Audit, Admin, Analytics.
- Deliverable from the next agent = **a single gap report**, not a fix. Owner then triages gaps into separate implementation CRs/BUGs.
- Role = **PLANNING / IMPACT-ANALYSIS specialist**, not IMPLEMENTATION.

---

## 2. Scope (locked by owner decisions this session)

### 2.1 IN scope — order-taking flow screens
Audit MUST cover each of these screens at the tablet viewports listed in §4:

| # | Screen | Entry file(s) |
|---|---|---|
| S1 | **Login** | `src/pages/Login/*` |
| S2 | **Dashboard — Channel view** (post-CR-414) | `src/pages/dashboard/Dashboard.jsx`, `components/dashboard/ChannelColumnsLayout.jsx`, `components/dashboard/ChannelColumn.jsx` |
| S3 | **Dashboard — Status view** (post-CR-414) | same files, `dashboardView==='status'` |
| S4 | **Dashboard — Header: pills nav / tablet filter dropdown / search / Add order** (post-CR-414) | `components/layout/Header.jsx` |
| S5 | **Sidebar** (collapse/expand behaviour visible in the two dashboard screenshots) | `components/layout/Sidebar*.jsx` |
| S6 | **Order Entry — menu categories + item grid + cart** | `components/order-entry/OrderEntry.jsx` |
| S7 | **Order Entry — Customize item modal** (variants, addons, notes) | `components/order-entry/CustomizeModal*.jsx` or inline in OrderEntry |
| S8 | **Order Entry — Customer attach / create** | `components/order-entry/CustomerSelector*.jsx` |
| S9 | **Collect Payment panel — base layout** (right-side panel) | `components/order-entry/CollectPaymentPanel.jsx` |
| S10 | **Collect Payment — Discount modal** | opened from CPP |
| S11 | **Collect Payment — Service Charge / Tip controls** | inline in CPP |
| S12 | **Collect Payment — Split payment flow** | inline in CPP + modal |
| S13 | **Collect Payment — Hold mode** | inline in CPP |
| S14 | **KOT (Kitchen Order Ticket) preview / Save+Print** | `components/order-entry/KOT*.jsx` or print preview route |
| S15 | **Receipt / Bill print preview** | print preview route |

**Note on dashboard sub-flows:** S4 includes the two sub-states — `dashboardView==='channel'` (status filter dropdown) and `dashboardView==='status'` (channel filter dropdown) — because CR-414 explicitly swaps the dropdown content.

### 2.2 OUT of scope — explicit (owner decisions this session)

| Area | Decision | Rationale |
|---|---|---|
| **PMS `c/Out` flow (Room checkout)** | **OUT — Phase 1b** (owner decision 2026-10-13, option **b**) | Front-desk workflow, not order-taking |
| **Delivery `Assign` flow** | **OUT — Phase 1b** (same option **b**) | Fleet / rider assignment, not order-taking |
| **Reports / Analytics / P&L / Settlement** | **OUT — Phase 2** | Owner verbatim: *"not like reports and these things we can see in phase two"* |
| **Settings, Inventory, Vendor, Audit, Admin, Channel Manager** | **OUT — Phase 2** | Non-order-taking modules |
| **Any code edit this workstream** | **FORBIDDEN until gap report reviewed + owner Gate 4 GO on individual IAs** | Owner verbatim: *"dont edit code - dont skip gate"* |

---

## 3. Pre-audit blocker — F4 Firebase crash (MUST resolve before Day 1)

**Finding F4 (reported by owner 2026-10-13):** On some browsers the login page crashes with:
```
Uncaught runtime errors:
Messaging: This browser doesn't support the API's required to use the Firebase SDK.
(messaging/unsupported-browser).
```

**Code evidence (grep-verified, HEAD):**
```
src/config/firebase.js
L3   import { getMessaging, getToken, onMessage } from 'firebase/messaging';
L23  messaging = getMessaging(app);          ← unguarded, throws on unsupported browsers
L110 return onMessage(messaging, callback);
```
Firebase docs require `const supported = await isSupported(); if (supported) messaging = getMessaging(app);` to avoid this throw.

**Tension:** Owner's original deployment directive on this pod was *"run it as-is, with no code edits"*. F4 is a pre-existing bug in that frozen code. If the audit itself can't log in on the browsers the owner wants to validate, the audit is dead on arrival.

### 3.1 MANDATORY first step for the next agent — BEFORE Day 1 of audit

1. **Check** `src/config/firebase.js` HEAD state — confirm `isSupported()` guard is still missing on L23 (don't trust this document; re-verify).
2. **Check** which browsers the owner wants in the audit matrix (see §4). If all browsers in that matrix are known Firebase-FCM-supported (desktop Chrome, Android Chrome on standard installs), the login page MAY NOT crash — F4 could be scoped to WebView / Firefox mobile / Chrome Incognito only.
3. **Ask the owner explicitly, verbatim prompt suggested:**
   > *"F4 blocks login on browsers without ServiceWorker + Push API (WebView apps, some Firefox mobile builds, Chrome Incognito). The audit will skip those browsers unless I'm authorized to add one `isSupported()` guard to `src/config/firebase.js`. Three options:*
   > *  (a) Add the one-line guard now (small, isolated, scoped to firebase.js only). Audit then covers all browsers.*
   > *  (b) Skip affected browsers. Audit limited to desktop Chrome + Android Chrome (standard, non-Incognito).*
   > *  (c) Defer F4 to Phase 2 but tag it as a Known Audit Blocker. Audit proceeds as (b) today.*
   > *Which one?"*
4. **DO NOT touch `firebase.js` until the owner picks (a).** Record the chosen option in the gap report §Preamble.

---

## 4. Audit matrix — viewports, orientations, browsers

### 4.1 Viewports (CSS px)
| Code | Width × Height | Representative device |
|---|---|---|
| V-390 | 390 × 844 | iPhone 14 (phone — lower bound to confirm phone fallback) |
| V-600 | 600 × 960 | Small Android tablet portrait (owner's reported device for F1) |
| V-768 | 768 × 1024 | iPad mini portrait |
| V-800 | 800 × 1280 | Owner's screenshot F1 + F4 device, portrait |
| V-960 | 960 × 600 | 10" Android tablet landscape (owner's screenshot F3) |
| V-1024 | 1024 × 768 | iPad landscape, right at `lg` Tailwind threshold |
| V-1280 | 1280 × 800 | Owner's screenshot F2 (landscape 10" / small laptop) — desktop safety baseline |

### 4.2 Orientations
Each viewport must be audited in BOTH portrait and landscape where it makes physical sense (V-390, V-600, V-768, V-800 → portrait; V-960, V-1024, V-1280 → landscape).

### 4.3 Browsers
Two tiers:
- **Tier A (required):** Chrome Desktop (device-emulation), Chrome Android (real tablet or emulator). These are known FCM-supported — F4 should NOT fire.
- **Tier B (conditional on §3 option a):** Firefox Mobile, Chrome Incognito, Samsung Internet, Android WebView.

### 4.4 Sidebar state
Every S2/S3/S4/S6/S9 audit case MUST be captured TWICE — once with sidebar **collapsed**, once with sidebar **expanded** — because the owner's screenshot 2 showed a 280-px-expanded-sidebar overflow that is already a pre-existing F12 note on the CR-414 plan.

---

## 5. The 4 already-known findings — DO NOT re-investigate, roll into the gap report

The next agent should treat these as **pre-populated audit entries** and continue from them (verify, add viewports, score severity, propose fix path). Code is NOT edited; this is purely cataloguing.

| ID | Screen | Viewport observed | Symptom | Code evidence (HEAD) | Likely cause |
|---|---|---|---|---|---|
| **F1** | S4 Header | V-800 portrait | Add button completely missing (clipped off right edge) | `Header.jsx` L441 inner search has `flex-1 w-full` on tablet; sibling Right Section with Add button (L765-789) gets squeezed off | Flex interaction post-CR-414 Gate 5a — `w-full` on a `flex-1` child inside a `flex-1` center section leaves no reserved space for the Right section |
| **F2** | S9 Collect Payment panel | V-1280 landscape | "Pay ₹1,040" button touches viewport's right edge, no right-side gutter | `CollectPaymentPanel.jsx` + `OrderEntry.jsx` wrapper — NOT touched by CR-414 | Pre-existing layout bug (no `pr-*` or `max-w` on CPP outer wrapper) |
| **F3** | S2 Dashboard Channel view (grid inside each ChannelColumn) | V-960 landscape | Single Delivery card at col-1 with 3 empty tracks on its right; Room row 3-of-4-track pattern | `ChannelColumn.jsx` L284-287 — my CR-414 edit uses `repeat(auto-fill, minmax(280px, 1fr))` | By-design per OD-537-03=A; owner can override to `auto-fit` (empty tracks collapse, remaining cards stretch) |
| **F4** | S1 Login | V-800 portrait, browser-dependent | `Uncaught runtime errors: Messaging: This browser doesn't support the API's required to use the Firebase SDK. (messaging/unsupported-browser)` | `src/config/firebase.js` L23 — `getMessaging(app)` without `isSupported()` guard | Pre-existing, not CR-414; see §3 for pre-audit decision gate |

**Severity hint (not binding — owner re-triages):** F1 = P1/HIGH (blocks new orders) · F2 = P2/MED · F3 = P2/MED (visual) · F4 = P1/HIGH (blocks login on affected browsers).

---

## 6. Deliverable spec — what the gap report must contain

**One markdown file**, path: `/app/memory/investigations/TABLET_ORDER_TAKING_AUDIT_REPORT_2026_10_14.md` (or dated day of completion).

Required sections:
1. **Preamble** — F4 decision (a/b/c from §3.1), audit date, agent name, browsers used.
2. **Executive summary table** — one row per screen (S1-S15), columns: screen, worst viewport, severity, # gaps found.
3. **Per-screen findings** — one subsection per screen with:
   - Screenshot path (`evidence/TABLET_AUDIT/<screen>/<viewport>-<orientation>.png`)
   - Observed symptoms at each failing viewport
   - Which CSS/JSX anchor is responsible (file + line + current class list) — read-only grep, not an edit
   - Severity: P0 (blocks flow) · P1 (critical UX) · P2 (visible but workaroundable) · P3 (cosmetic)
   - Proposed fix path summary (what WOULD change — kept at IA-level, no actual edits)
   - Suggested CR or BUG ID (next agent may propose, owner assigns)
4. **Already-known findings (F1-F4)** — fill in viewport coverage + code anchors (already given in §5 above as a starting point).
5. **Regression check** — confirm CR-414 Gate 5a desktop safety still holds at V-1280 collapsed-sidebar (pixel compare against `evidence/BUG-537/l1280.png`).
6. **Recommended Phase-1 fix batch** — a prioritized list that fits inside one owner smoke session; everything else → Phase 1b/2.
7. **Phase-1b carry-over** — PMS `c/Out` + Delivery `Assign` responsiveness, briefly stubbed (one line each) for the owner to approve into a later audit.

---

## 7. Role boundaries for the next agent

### 7.1 MUST do
- Confirm F4 state (§3) and get owner's a/b/c decision BEFORE any audit page is loaded.
- Produce the gap report (§6) and nothing else.
- Register gaps in `/app/memory/control/OPEN_GAPS_REGISTER.md` under a new section header `## 2026-10-13 — Tablet Order-Taking Audit (Phase 1)`.
- Add each confirmed gap to `/app/memory/control/BUG_TRACKER.md` as new BUG-xxx rows (status: `GATE_1_INTAKE`) if the gap warrants a code fix.
- Update `/app/memory/control/CR_REGISTRY.md` only if a gap is big enough to need a CR (not a BUG).

### 7.2 MUST NOT do
- No code edits. Zero. (`Header.jsx`, `ChannelColumn.jsx`, `ChannelColumnsLayout.jsx`, `CollectPaymentPanel.jsx`, `firebase.js`, anything.)
- No `testing_agent` call this workstream (there is nothing to retest — audit is read-only observation).
- No gate flip on CR-414 or BUG-537 — they stay at `GATE_5A_IMPLEMENTED` until Phase 1 fixes close them.
- No investigation of out-of-scope screens (reports, settings, PMS c/Out, Delivery assign).

---

## 8. State of the registry at handover

| Item | Status | Sprint |
|---|---|---|
| CR-414 | `GATE_5A_IMPLEMENTED` (2026-10-13) | oct_cr_batch |
| BUG-537 | `GATE_5A_IMPLEMENTED` (2026-10-13) | oct_cr_batch |
| BUG-539 / BUG-539-ML64 / CR-413 / CR-412 | `GATE_5A_IMPLEMENTED` with testing debt (owner declined `testing_agent` on this pod) | oct_cr_batch |
| BUG-538 | blocked on OD-538-01 | — |
| CR-410 | backend-blocked (`loyalty_info`) | — |
| **Tablet Order-Taking Audit (Phase 1)** | **NEW — PLANNING entry point** (this file) | oct_cr_batch (continuation) |

Open owner decisions (new this session, locked):
- **OD-AUDIT-01 (2026-10-13):** Phase 1 audit scope = order-taking only; PMS `c/Out` + Delivery `Assign` → Phase 1b. Owner picked **(b)**.
- **OD-AUDIT-02 (2026-10-13):** F4 pre-audit gate — next agent MUST confirm `firebase.js` state and ask owner (a/b/c) before touching the file.

---

## 9. Environment reminder for the next agent
- Frontend-only pod. Local FastAPI backend intentionally stopped.
- App calls `preprod.mygenie.online` (Laravel) + `presocket.mygenie.online` (Socket.io).
- Preview URL = `REACT_APP_BACKEND_URL` → `https://genie-pos-web.preview.emergentagent.com`.
- Credentials: no `/app/memory/test_credentials.md` present → next agent must request from owner before loading authenticated screens.

---

## 10. Entry sequence for the next agent (copy-paste runbook)

```
1. Read /app/memory/control/AGENT_PROMPT_ALPHA.md v0.7 → pick PLANNING / IMPACT-ANALYSIS role.
2. Read THIS file end-to-end.
3. grep -n "getMessaging\|isSupported" /app/frontend/src/config/firebase.js
     → confirm guard still absent on L23.
4. Ask owner the F4 verbatim prompt in §3.1 (a / b / c).
5. If owner picks (a): file BUG-542 Gate 0/1 intake, go to Gate 2 IA on firebase.js first,
   then proceed with audit after guard lands.
   If owner picks (b) or (c): proceed to audit on Tier-A browsers only (§4.3).
6. Request credentials.
7. Execute audit per §2.1 × §4 matrix. Save screenshots to evidence/TABLET_AUDIT/.
8. Produce the gap report per §6.
9. Append each confirmed gap to OPEN_GAPS_REGISTER + BUG_TRACKER as needed.
10. Session handover to IMPLEMENTATION role once owner picks a fix batch.
```

---

**Handover owner (this session):** INVESTIGATION role, 2026-10-13.
**Next role:** PLANNING / IMPACT-ANALYSIS specialist.
**Blocker to clear first:** F4 pre-audit decision (§3.1).
