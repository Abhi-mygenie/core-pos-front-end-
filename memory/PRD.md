# PRD — MyGenie POS Frontend

**Last Updated:** 2026-06-07 (Session 2 — Bug Triage + Discovery)

---

## Original Problem Statement

Deploy Core POS Front-End from GitHub repo (`5-june` branch) into `/app`. Configure environment variables. Get React frontend running against external preprod APIs.

---

## Architecture

- **Frontend:** React 19 + CRACO + Tailwind CSS
- **Backend APIs:** External (preprod.mygenie.online, presocket.mygenie.online, crm.mygenie.online)
- **Auth:** Firebase (mygenie-restaurant project)
- **Socket:** socket.io-client → presocket.mygenie.online
- **Local Backend:** Minimal FastAPI (not used by app — placeholder)

---

## What's Been Implemented

### 2026-06-07 — Deployment
- Cloned `5-june` branch into `/app`
- Configured all env variables (14 keys: API base, socket, Firebase, CRM, VAPID)
- Frontend running on port 3000, backend on 8001
- Login page verified functional

### 2026-06-07 — Bug Triage + Discovery Session
- **7 bugs registered** (BUG-112..118) with intake docs
- **2 CRs registered** (CR-014 Menu API Migration, CR-015 Settlement Module)
- **4 bugs discovery complete** (BUG-112, 113, 114, 116) with root causes
- **2 bugs implementation plans ready** (BUG-113, BUG-114) — awaiting owner GO
- **2 bugs need runtime validation** (BUG-115, BUG-117) — code-read hypotheses, not confirmed
- **1 bug needs test data** (BUG-118) — coupon codes

---

## Core Requirements

| Module | Status |
|---|---|
| Login / Auth | Shipped (Firebase) |
| Dashboard (order cards) | Shipped |
| Order Entry (cart, place, update) | Shipped |
| Payment (collect bill, split, credit) | Shipped — BUG-113 (split stuck), BUG-114 (discount category null) |
| Print (auto KOT, auto bill) | Shipped — BUG-112 (auto-print latency) |
| Audit Report | Shipped — BUG-115 (cancel edge case), BUG-117 (discount text) |
| Reports Module (Insights) | S0–S9 + S-ROOM FROZEN, S10 mockup, CR-013 Food Court in progress |
| Menu Management | Shipped — CR-014 (API migration needed) |
| Settlement Module | NOT STARTED — CR-015 registered, APIs documented |
| CRM Integration | Shipped (CR-002 closed) |
| Coupon/Loyalty | Shipped — BUG-118 (nth-item/BOGO issues) |

---

## Prioritized Backlog

### P0 — Ready for Implementation (Owner GO needed)
1. **BUG-113** — Partial payment split UI stuck (plan ready)
2. **BUG-114** — Discount category fields null (plan ready)

### P0 — Blocked on Owner Decision
3. **BUG-112** — Auto-print latency (Q-112-CRITICAL)

### P1 — Needs Runtime Validation
4. **BUG-115** — Audit Report cancel edge case
5. **BUG-117** — Side-sheet discount as text

### P1 — Blocked on Backend
6. **BUG-116** — Custom item socket (backend must define event)

### P1 — Needs Test Data
7. **BUG-118** — Nth-item/BOGO coupon (needs coupon codes)

### P1 — CRs Registered
8. **CR-015** — Settlement Module (APIs ready, can start)
9. **CR-014** — Menu Management API Migration (needs API docs)

### Existing Backlog (from POS 4.0)
- 6 backend-blocked bugs (BUG-090..094, 101)
- BUG-096 partial (menu socket events — related to BUG-116)
- BUG-104 Credit/Tab module (owner scope needed)
- BUG-105 Settlement (now scoped via CR-015)
- CR-011 S10 Prep & Serve Time (mockup ready, awaiting sign-off)
- CR-013/CR-013-AUDIT Food Court (Gate ④ wired, awaiting validation)
- 28 Phase 3 mechanical screens (S11–S38) queued
- 3 Phase 4 hardening screens (S39–S41) queued

---

## Test Credentials

| Field | Value |
|---|---|
| Email | owner@palmhouse.com |
| Password | Qplazm@10 |
| Restaurant | The Palm House (rid=541) |
| Preprod API | https://preprod.mygenie.online/ |
