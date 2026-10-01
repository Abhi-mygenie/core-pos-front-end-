# Intake — CR-376-FU-C
## Per-Restaurant Server-Side Active Menu Default

**Date:** 2026-09-25
**Registered by:** PLANNING agent (ALPHA v0.7) acting in INTAKE capacity — follow-up registered per owner P5 decision during CR-376 Gate 3 session.
**Source:** OWNER-REQUESTED (P5 decision, 2026-09-25)
**Parent CR:** CR-376 (Menu Switch — must be IMPLEMENTED and OWNER-VERIFIED before this CR starts planning)
**Sprint:** TBD — future sprint, backend coordination required

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | NONE — no server-side active menu field exists anywhere in FE codebase. `grep -rn "default_active_menu\|server.*active.*menu\|restaurant.*menu_type" src/` → 0 hits. |
| **Duplicate check** | DISTINCT — no prior CR/BUG covers server-side menu defaults. |
| **Blast radius** | LARGE — requires backend API change (new profile field) + FE boot flow changes (LoadingPage, authService, activeMenuPrefs). Multiple files + backend team involved. |
| **Risk** | HIGH — API contract change, new `profile` field, localStorage key interaction (R8), boot flow (LoadingPage is a hotspot R5). |
| **Fast Lane eligible** | NO — backend required, hotspot files, localStorage change. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR — Architecture enhancement |
| **Severity** | P3 — LOW. CR-376 local setting is fully functional per-device. Server-side default is a convenience enhancement for multi-device restaurants, not a blocker. |
| **Area** | Backend API + `src/api/services/authService.js` + `src/pages/LoadingPage.jsx` + `src/utils/activeMenuPrefs.js` |
| **Blocked by** | Backend team must add `default_active_menu_type` field to restaurant profile API. |

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword: `server.*menu`, `default.*active.*menu`, `restaurant.*menu_type` | 0 matches. |
| Codebase grep | 0 hits (confirmed above). NONE. |
| Symptom match | No prior discussion of server-side menu defaults. DISTINCT. |

**Duplicate check result: DISTINCT**

---

## Step 1b — Risk Classification

- **Risk:** HIGH
- **Triggers:** API contract change (new profile field), `LoadingPage.jsx` is R5 hotspot, `localStorage` key interaction (R8 — must not rename `mygenie_active_menu_type`), boot flow ordering.
- **Fast Lane:** NOT ELIGIBLE.

---

## Owner Requirement

CR-376 stores the active menu per-device in localStorage. For restaurants with many POS stations, each device requires manual Local Settings configuration after deployment.

Enhancement: backend serves a `default_active_menu_type` per restaurant (set by owner in backend admin). On first boot (no localStorage override), POS uses the server default automatically. Local device override still available.

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | OWNER-REQUESTED (P5 precondition, 2026-09-25) |
| **Confidence** | SUSPECTED — no API probe run yet. Backend team must confirm profile API field availability. |
| **Screenshot** | N/A |
| **Steps to reproduce (gap)** | 1. Deploy CR-376 to a restaurant with 10 stations. 2. Each station must manually visit Local Settings and pick the correct menu. 3. If missed, station shows OD-376-06 empty-state until fixed. |
| **Backend ask (needed at Gate 2)** | Does `GET /api/v1/vendoremployee/profile` support a `default_active_menu_type` field? If not, what contract change is needed? |

---

## Step 3 — Blast Radius

| Metric | Value |
|---|---|
| FE files to change | 3–4: `activeMenuPrefs.js` (read fallback), `LoadingPage.jsx` (hotspot — boot hydration), `authService.js` or new util, `activeMenuPrefs.js` (conditional logic) |
| Backend files | 1+ (profile API, admin settings) — BACKEND TEAM OWNED |
| Hotspot files | YES — `LoadingPage.jsx` is R5 |
| Scope | LARGE — backend involvement + hotspot + boot flow |
| Open owner questions | OQ-C1: Per-restaurant default (same all stations) OR per-station server-side? OQ-C2: Local override trumps server default, or vice versa? OQ-C3: Backend team available this sprint? |

---

## Gate 4 Preconditions

1. CR-376 must be OWNER-VERIFIED (Gate 6) before this CR starts planning.
2. Backend team must answer the profile API question (OQ-C3).
3. Full Gate 2–3 required.

---

```
Intake complete: CR-376-FU-C
Classification: CR, Severity: P3, Risk: HIGH
Duplicate check: DISTINCT
Evidence: SUSPECTED — backend probe needed at Gate 2
Blast radius: LARGE (3-4 FE files + backend change)
Docs updated: change_requests/CR-376-FU-C_SERVER_SIDE_ACTIVE_MENU_INTAKE.md · registry.json · CR_REGISTRY.md
Next: Planning Gate 2 — BLOCKED until CR-376 Gate 6 + backend team confirmation
```
