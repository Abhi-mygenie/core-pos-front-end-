# Investigation Report — Backend Brief Reply Analysis & Unblock Assessment
## INV-BACKEND-BRIEFS-UNBLOCK-2026-09-10

**Date:** 2026-09-10
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)
**Trigger:** Owner provided backend-briefs.html (updated 2026-09-10) containing replies to all filed backend briefs. Objective: determine which CRs and Bugs are now unblocked.
**Source documents:**
- `/app/frontend/public/backend-briefs.html` — Last updated 2026-09-10 (authoritative)
- `/app/memory/control/registry.json` — registry state
- `/app/memory/control/CR_REGISTRY.md` — CR statuses
- `/app/frontend/src/api/transforms/roomStatusTransform.js` — code reality check

**Steps used:** 9/10
**Confidence:** HIGH — document + code-verified

---

## 1. Summary

| Finding | Count |
|---|---|
| Briefs in HTML | 10 |
| Answered / Resolved | 3 |
| Still Open (backend action needed) | 4 |
| Backend-Blocked / Workaround Active | 3 |
| CRs/Bugs now UNBLOCKED (can implement FE now) | 3 |
| CRs still HARD-BLOCKED (need backend endpoints) | 4 |
| Retroactive candidates | 1 (BUG-383) |

---

## 2. Brief-by-Brief Findings

### PMS MODULE

| Brief | ID | Status in HTML (2026-09-10) | Change from registry? | Action |
|---|---|---|---|---|
| Room Check-In GST contract | **BUG-386** | ✅ **ANSWERED — Q-GST-01 CLOSED** | Registry: GATE_5B_QA_PASS ✅ | None — complete |
| PMS AIOSELL Integration (CR-358) | **CR-358 P1-P5** | ✅ **RESOLVED — CR-358 shipped** | Registry: all phases Gate 5b ✅ | None — complete |
| P3 list params (page/per_page) | **CR-358-P3** | 🟡 **Accepted as-is (client-side)** | P3 deferred, workaround in place | P3 backlog — no action |
| P5 rates / restrictions / no-show | **CR-358-P5** | ✅ **Questions Resolved** | Registry: GATE_5B_QA_PASS ✅ | Gate 6 Owner Smoke only |
| room-payment 403 | **BUG-384** | 🔴 **OPEN — still 403** | Registry: INTAKE BACKEND-BLOCKED | Backend must grant permission — no FE action |
| no_show field absent | **BUG-385** | 🟠 **BACKEND-BLOCKED — awaiting Option A/B/C** | Registry: INTAKE BACKEND-BLOCKED | Owner/backend must choose option |

### PRINTING & STATIONS

| Brief | ID | Status in HTML | Action |
|---|---|---|---|
| Station Printer Map data link | **CR-359** | 🔴 **OPEN — GAP-6 unconfirmed** | Backend must confirm whether `POST /station-printer-map` updates `profile.print_agent` |
| Test Suite font sizes + _raw gating | **CR-368** | 🔴 **OPEN — 2 yes/no questions** | Blocks 54 FE test failures. P3 — dev team to answer Q1/Q2 |

### REPORTS & INVENTORY

| Brief | ID | Status in HTML | Action |
|---|---|---|---|
| Room Orders aggregation endpoint | **Room Orders** | 🔴 **Future Ask — not blocking** | Future roadmap item, no sprint action |

---

## 3. Unblock Status — All Post-CR-358 Pipeline CRs

| CR | Feature | Was Blocked By | Brief Status (2026-09-10) | Now Unblocked? |
|---|---|---|---|---|
| **CR-361** | Room Assignment on Tape Chart | `PATCH local-reservations/{id}/rooms/{line}` → 404 | ❌ Not in briefs — endpoint still missing | 🔴 **STILL HARD-BLOCKED** |
| **CR-362** | Booking Modification / Cancellation | 3 new write endpoints needed | ❌ Not in briefs — endpoints still missing | 🔴 **STILL HARD-BLOCKED** |
| **CR-363** | Night Audit Report | `no_show` field absent (BUG-385) + balance needs client join | BUG-385 still awaiting option selection | 🟡 **PARTIAL** — can build ~90% of report; no_show line = FE-derive proxy if Option C chosen |
| **CR-364** | Guest Folio Detail Page | `pos/room-payment` 403 (BUG-384) | BUG-384 still OPEN | 🟡 **PARTIAL** — read-only Folio display fully unblocked; payment recording still blocked |
| **CR-365** | Housekeeping Workflow | hk-tasks model + employee list + push/socket | ❌ Not in briefs — model still missing | 🔴 **STILL HARD-BLOCKED** |
| **CR-366** | Revenue Dashboard / Analytics | None (mostly unblocked per INV 2026-09-06) | ✅ No blocking brief | ✅ **FULLY UNBLOCKED — ready to implement** |
| **CR-367** | WhatsApp / SMS Guest Notifications | 7 guest-messaging routes all 404 | ❌ Not in briefs — routes still missing | 🔴 **STILL HARD-BLOCKED** |

---

## 4. Bug Status — Updated Assessment

### BUG-383 — HK Filter Count (RETROACTIVE CANDIDATE)
**Registry says:** GATE_5B_QA_PARTIAL_PASS (5/6 PASS)
**Code reality check (Step 8):** Fix IS in `roomStatusTransform.js` L28-33 — `manualStatus === 'hk'` correctly used.
**Remaining:** 1 MINOR finding — TC-383-04: warning toast missing for occupied HK rooms (cosmetic).
**Classification:** FE_BUG — fix shipped, 1 MINOR outstanding.
**Recommendation:** Owner decision — ship as-is (MINOR only) or add the toast warning (1-file Fast Lane if approved).

### BUG-384 — room-payment 403
**Classification:** BACKEND_BUG — sandbox role permission gap.
**FE status:** Code complete. Zero FE work needed.
**Blocks:** CR-364 Record Payment feature only. Does NOT block CR-364 Guest Folio display.
**Recommendation:** Backend to grant permission for restaurant_id 69 on `POST /pos/room-payment`.

### BUG-385 — no_show field absent
**Classification:** BACKEND_BUG — field absent from local-reservations and dashboard-kpis.
**Options (pending owner + backend decision):**
- **Option A** (recommended): Backend adds `no_show_count` to dashboard-kpis → FE reads integer.
- **Option B**: Backend adds `no_show: true/false` per LR record → FE counts client-side.
- **Option C** (FE-derive): No backend change → FE proxies `operational_status='pending' + checkin < today`. Approximate but workable.
**Blocks:** CR-363 no_show line only. Rest of Night Audit can be built.

### BUG-386 — room_gst_tax
✅ **CLOSED.** Q-GST-01 answered. Field confirmed. FE implemented. Gate 5b QA PASS 2026-09-09. No action.

### CR-359 — Station Printer Map GAP-6
**Registry says:** Gate 5b QA PASS — but this is the FE implementation gate.
**Brief says:** OPEN — the underlying question (does saving station-printer-map update `profile.print_agent`?) is unanswered.
**Classification:** BACKEND_BUG (potential) — if the answer is NO, users will configure the UI but KOT/bill routing won't change at runtime. This is a P0 data-link integrity issue.
**Recommendation:** Backend must answer yes/no. If NO → FE needs to warn user or show sync status.

---

## 5. Data Flow Traces

### BUG-384 (room-payment 403) — trace
```
RecordPaymentModal.jsx → pmsService.recordRoomPayment() 
  → POST /api/v2/.../pos/room-payment
  → HTTP 403 (permission check fires, not validation)
FE code: COMPLETE — constant ROOM_RECORD_PAYMENT wired
Break: Backend permission table — restaurant_id 69 lacks billing permission
```

### BUG-385 (no_show absent) — trace
```
NightAuditReport (planned) → pmsService.getDashboardKpis()
  → GET /api/v2/.../aiosell/dashboard-kpis
  → Response: today.arrivals_count, departures_count, in_house_count, occupancy_percent_physical
  → no_show_count: ABSENT (0 hits in recursive search across full response)
Break: Backend model doesn't aggregate no_show status
```

### BUG-383 (HK filter) — trace
```
RoomStatusPage → roomStatusTransform.fromRoomStatusBoard()
  → counts reducer L28-33
  → 'hk': rooms.filter(r => r.manualStatus === 'hk').length  ← FIX APPLIED ✅
Auto-HK sets manual_status:'hk' but display_status stays 'occupied'
Fix confirmed in code. 1 MINOR (toast) still open.
```

---

## 6. Evidence Artifacts

All cross-referenced from:
- `/app/frontend/public/backend-briefs.html` (updated 2026-09-10)
- `/app/memory/control/registry.json` (queried steps 6-7)
- `/app/frontend/src/api/transforms/roomStatusTransform.js` (code reality, step 8)

---

## 7. Recommendations

### CAN START IMMEDIATELY (Gate 4 GO not yet given — owner to confirm)

| Item | Action | Risk | Notes |
|---|---|---|---|
| **CR-366** | Revenue Dashboard / Analytics — full scope unblocked | MEDIUM | Uses daily-sales N-day loop. No backend blockers. |
| **CR-364** | Guest Folio read-only display — partially unblocked | HIGH | Build display only; skip payment recording until BUG-384 resolved. Owner to decide scope gate. |
| **CR-363** | Night Audit — build all except no_show line | HIGH | Option C (FE-derive proxy) needed for no_show. Owner to approve Option C or wait for backend. |

### OWNER DECISIONS NEEDED

| Decision | Item | Options |
|---|---|---|
| **OD-BUG385-01** | no_show approach for CR-363 | A (backend adds field) / B (per-record flag) / **C (FE-derive proxy — unblocks CR-363 now)** |
| **OD-BUG383-01** | BUG-383 MINOR toast — ship as-is or add toast | Ship (MINOR only) / Add warning toast (Fast Lane eligible) |
| **OD-BUG384-01** | Escalate BUG-384 to backend | Grant permission for restaurant_id 69 on `POST /pos/room-payment` |
| **OD-CR359-01** | Get backend answer on GAP-6 | Does `POST /station-printer-map` update `profile.print_agent` runtime? YES/NO |
| **OD-CR368-01** | Get dev team answers on 2 yes/no questions | Unblocks 54 failing FE tests. P3 — low urgency. |
| **OD-CR366-01** | Gate 4 GO on CR-366 | Revenue Dashboard is fully unblocked — approve to start? |

### HARD-BLOCKED (no FE action possible)

| CR | Blocker | What backend must build |
|---|---|---|
| CR-361 | `PATCH local-reservations/{id}/rooms/{line}` → 404 | Room assignment endpoint |
| CR-362 | 3 new write endpoints | Modify/cancel/extend stay |
| CR-365 | hk-tasks model | Housekeeping task model + employee + socket |
| CR-367 | 7 guest-messaging routes 404 | WhatsApp/SMS send endpoint |

---

## 8. Retroactive Candidates

| ID | Code | Registry | Recommendation |
|---|---|---|---|
| **BUG-383** | Fix SHIPPED (roomStatusTransform.js L28-33 correct) | GATE_5B_PARTIAL_PASS | 1 MINOR outstanding (toast). Owner to decide — ship or Fast Lane fix. Not a blocker. |

---

**Investigation complete. Steps used: 9/10.**

*Report authored: 2026-09-10*
