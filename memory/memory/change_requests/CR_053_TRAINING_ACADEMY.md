# CR-053 — MyGenie Training Academy (In-App Training & Mission System)

**Status:** GATE 2 COMPLETE (Impact Analysis + Design Review)
**Created:** 2026-06-18
**Type:** CR (Major Feature — New Module)
**Area:** Full-stack new module (overlay engine + dashboards + admin + API)
**Priority:** P1 (high business impact — reduces onboarding cost, training time, support tickets)
**Sprint:** TBD (multi-phase)
**Risk:** HIGH (touches all POS pages via overlay, new backend module, new DB collections)
**Reporter:** Owner
**Source:** OWNER-INITIATED brainstorming session

---

## ⚠️ DESIGN PRINCIPLE #1: UX IS EVERYTHING

> "User experience is given priority. UX and easiness will decide the module's fate." — Owner

This is non-negotiable. Every decision — from overlay animations to tooltip placement to step validation — must prioritize:

1. **Frictionless:** Training should feel like a helpful guide, not a chore
2. **Non-intrusive:** Overlay must not fight the POS UI — it enhances it
3. **Forgiving:** Wrong clicks get gentle nudges, not error states
4. **Fast:** Transitions under 1 second, no loading spinners during missions
5. **Skippable:** Always an exit. Never trapped. Resume anytime.
6. **Beautiful:** The overlay must look premium — spotlight glow, smooth animations, clean typography

If the training feels like a software tutorial from 2005, it fails. If it feels like Duolingo meets Notion onboarding, it wins.

---

## 1. Problem Statement

Restaurant staff onboarding consumes excessive time and cost:
- New cashiers take days to learn order flows
- Managers need hand-holding on reports and settlement
- Owners call support for settings and configuration
- High staff turnover in restaurants means constant re-training
- No in-app guidance exists — all training is verbal or manual

**Goal:** Build an in-app training layer that makes any restaurant employee self-sufficient within their first shift.

---

## 2. Core Concept

```
RESTAURANT (configured by admin / owner)
  └── EMPLOYEES (identity from POS API)
        └── COURSES (per POS module, stored in MongoDB)
              └── MISSIONS (specific tasks, extensible via DB)
                    └── STEPS (individual actions with DOM validation)
                          └── STATUS: NOT_STARTED → IN_PROGRESS → COMPLETED → SKIPPED
```

**Manager sees:** Per-employee progress across all courses
**Employee sees:** Their training dashboard with course cards and progress bars
**MyGenie admin sees:** Course catalog, content editor, restaurant configs, global analytics

---

## 3. Architecture Decisions (FROZEN)

| # | Decision | Final Answer | Rationale |
|---|----------|-------------|-----------|
| 1 | Backend | FastAPI + MongoDB (training-only). Migrate to Laravel later. | Fast to build, no Laravel team dependency |
| 2 | Course storage | Everything in MongoDB (courses, missions, steps, progress) | Extensible — add content without code deploy. Per-restaurant customization. Future admin UI writes directly to DB. |
| 3 | Employee identity | From POS API (preprod.mygenie.online). Denormalize name+role into progress docs. | POS is source of truth for employees |
| 4 | Overlay engine | Build custom (no library) | Specific needs: step validation, practice mode interception, smart positioning. Libraries don't support this. |
| 5 | Restaurant type | Tags/labels only — no business logic. Course enablement is explicit per-restaurant. | Restaurants are multi-faceted (hotel with QSR counter). Tags for admin filtering, not auto-assignment. |
| 6 | Admin panel | Full CRUD for courses/missions/steps. Restaurant config manager. Content pipeline. | Owner requirement: "all this can be managed from admin" |
| 7 | Content extensibility | Add missions = DB insert. Add courses = DB insert + registry entry. Zero code changes. | Owner requirement: "I should be able to add more missions" |

---

## 4. Course Catalog (Initial — 7 courses, ~68 missions, expandable)

| # | Course | Missions | Target Roles | Phase |
|---|--------|:---:|---|:---:|
| 1 | Restaurant Setup | 8 | Owner | 1 |
| 2 | Menu Management | 12 | Owner, Manager | 2 |
| 3 | Order Taking | 14 | Cashier, Waiter | 1 |
| 4 | Billing & Payments | 10 | Cashier | 1 |
| 5 | Settlement & Day Closure | 5 | Manager, Owner | 2 |
| 6 | Reports & Insights | 12 | Manager, Owner | 2 |
| 7 | Settings & Configuration | 6 | Owner | 2 |
| 8 | Customer & Credit Management | 5 | Manager, Owner | 2 |
| 9 | Employee Management | TBD | Owner | Future |
| 10 | Operator Management | TBD | Owner, Operator | Future |
| 11 | Room Management | TBD | Front Desk | Future |
| 12 | Delivery Operations | TBD | Delivery Mgr | Future |

---

## 5. Technical Architecture Summary

### Frontend Components
- **TrainingProvider** — React context (state machine for training flow)
- **MissionExecutor** — The overlay (spotlight + tooltip + validator)
- **TrainingDashboard** — Employee's "My Training" page
- **StaffTrainingDashboard** — Manager's view of all staff
- **PracticeModeInterceptor** — Axios interceptor for safe training

### Overlay UX
- Spotlight: CSS box-shadow trick (hole in dark overlay)
- Smart tooltip positioning: bottom → top → right → left algorithm
- Step types: click, input, select, observe, scroll, navigate
- Pulse ring animation on target elements
- Smooth morph transitions between steps (~900ms)
- Mobile: bottom sheet pattern instead of floating tooltip

### Backend (FastAPI + MongoDB)
- 6 collections: courses, missions, progress, assignments, activity_log, restaurant_config
- Catalog APIs (cacheable), Progress APIs (per-employee), Manager APIs, Admin APIs
- Auth: POS token validation via preprod API
- Offline-first: localStorage write-ahead buffer, async sync

### Admin Panel
- MyGenie super admin: Course CRUD, mission/step builder, restaurant config, analytics
- Restaurant owner: Enable/disable courses, assign staff, set deadlines
- Content pipeline (Phase 3): draft → review → published

### Access Control
- Super Admin: full course/content CRUD + restaurant config
- Owner: restaurant-scoped config + staff management + own training
- Manager: staff progress view + assignments + reminders
- Employee: own progress + mission execution only

---

## 6. Phasing (REVISED — Owner directive 2026-06-18)

### Phase 1 — Menu Management Course + Core Engine
- Training SDK overlay engine (spotlight, validator, practice mode)
- Employee training dashboard ("My Training")
- Manager staff training dashboard
- FastAPI training backend + MongoDB
- Content: **Menu Management course** (~12 missions)
- Scope: 1 course end-to-end to validate the entire system

### Phase 2 — Admin Panel + More Courses
- MyGenie Admin: Course manager, mission/step builder, restaurant config
- Owner Settings: Training config page inside POS
- Additional courses: Restaurant Setup, Order Taking, Billing

### Phase 3 — Polish + Intelligence
- Selector tester in admin (live POS preview)
- Content versioning pipeline (draft → review → publish)
- Global analytics dashboard
- Gamification (badges, streaks, leaderboard)
- Push notifications (Firebase)

---

## 7. UX Design Requirements (CRITICAL — Owner Mandate)

The following MUST be validated via design review before implementation:

- [ ] Overlay spotlight feel (glass effect, blur, opacity level)
- [ ] Tooltip design (typography, padding, button styles, arrow indicator)
- [ ] Transition animations (step-to-step morph, success confetti, progress bar)
- [ ] Training top bar (minimal, doesn't crowd POS header)
- [ ] Course card design (progress visualization, difficulty badges, time estimates)
- [ ] Manager dashboard (information density, readability, mobile responsiveness)
- [ ] Mission completion celebration (subtle but rewarding)
- [ ] Practice mode visual indicator (clear but not alarming)
- [ ] Error/wrong-action feedback (gentle, helpful, not punitive)

---

## 7a. BRAND GUIDELINES — CORRECTED (2026-06-18 Design Review)

Design agent output was corrected against actual MyGenie POS codebase (`/app/frontend/src/constants/colors.js` + `App.css`).

### Color Palette (ACTUAL MyGenie Brand — NOT Tailwind defaults)

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Green | `#329937` | CTA buttons, progress bars, active states, pulse ring, completed badges |
| Primary Orange | `#F26B33` | Warnings, practice mode banner, accent highlights |
| Amber | `#F4A11A` | Badges (streaks, intermediate), secondary highlights |
| Dark Text | `#1A1A1A` | All primary text |
| Light Background | `#FFFFFF` | Card surfaces |
| Section Background | `#F7F7F7` | Page background |
| Gray Text | `#666666` | Secondary text, descriptions |
| Border Gray | `#E5E5E5` | Card borders, table lines |

### Typography (ACTUAL MyGenie Brand)

| Usage | Font | Weight |
|-------|------|--------|
| Headings (h1-h4) | **Poppins** | 600-700 (semibold/bold) |
| Body text | **Poppins** | 400 (regular) |
| Fallback | Inter, system | — |
| Monospace (selectors, code) | JetBrains Mono | 400 |

### Logo Assets

| Asset | URL |
|-------|-----|
| Full Logo | `https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/g6fet1ss_Screenshot%202026-03-19%20at%2012.18.41%E2%80%AFAM.png` |
| Genie Icon SVG | `https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg` |

### Design Approach (KEPT from design agent)

- Swiss + Soft Utility archetype (clean, minimal, generous spacing)
- 95% monochrome — color = function only
- Overlay: `bg-zinc-950/60 backdrop-blur-[2px]`, box-shadow cutout, spring-physics tooltip
- Cards: `rounded-2xl`, subtle shadow, p-6 padding
- Admin panel: split-view (config left gray bg, preview right white bg)
- Motion: spring entrance (stiffness: 300, damping: 24), hover: -translate-y-[2px]
- Status badges: zinc=draft, orange=review, green=published

### Mockups Approved (2026-06-18)
1. Employee Training Dashboard (course cards + progress)
2. Training Overlay (spotlight + tooltip on POS)
3. Manager Staff Dashboard (KPI strip + employee table)
- [ ] Mobile/tablet adaptation (bottom sheet, swipe gestures)

---

## 8. Blast Radius

- **Files affected (engine):** ~15 new files in `/training/` module
- **Files affected (integration):** App.js (route), AppProviders (context), Header (launcher button), Sidebar (training nav item)
- **Existing files modified:** 4-5 (additive only — no existing logic changes)
- **New backend endpoints:** ~15 API routes
- **New DB collections:** 6
- **Hotspot files touched:** None directly (overlay is separate z-layer)
- **Regression risk:** LOW for Phase 1 (new module, doesn't modify existing flows)

---

## 9. Open Questions (for Planning phase)

| # | Question | Impact |
|---|----------|--------|
| 1 | Does preprod API have an employee list endpoint? | Needed for manager dashboard |
| 2 | Does POS JWT contain restaurant_id + role? | Needed for auth middleware |
| 3 | Which data-testid selectors already exist on key POS elements? | Needed for mission step targets — may need to add more |
| 4 | Should admin panel be a separate React app or a section within POS? | Architecture decision |
| 5 | Firebase notification integration — already set up for POS? | Can reuse for training reminders |

---

## 10. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE |
| 2 — Impact Analysis | ✅ COMPLETE |
| 3 — Implementation Plan | ✅ COMPLETE |
| 4 — Code Gate / Owner GO | ✅ COMPLETE (Owner GO received 2026-06-18) |
| 5 — Implementation | 🟡 IN PROGRESS (Phase 1 — Checkpoints 1-2 done, 3-4 remaining) |
| 6 — Owner Smoke | ⏳ PENDING |

## 11. Implementation Progress (Phase 1)

| Checkpoint | Status | Key Results |
|:----------:|:------:|-------------|
| 1. Backend APIs | ✅ DONE | 15 endpoints, auth working, seed complete |
| 2. SDK Overlay Engine | 🟡 MOSTLY DONE | Missions 1-3 complete E2E, Mission 4 partial, engine proven |
| 3. Dashboards | ⬜ NOT STARTED | Code exists, needs browser testing |
| 4. Full Integration | ⬜ IN PROGRESS | Missions 5-12 need step definition tuning |

### Missions Verified End-to-End
- ✅ Mission 1: Navigate to Menu Management (3 steps)
- ✅ Mission 2: Browse Categories (4 steps)
- ✅ Mission 3: View Menu Items (3 steps)
- 🟡 Mission 4: Add a New Menu Item (5/6 steps work, step 6 needs flow adjustment)
- ⬜ Missions 5-12: Data seeded, selectors verified, untested live

### Bugs Fixed During Implementation
1. URL mismatch: `/menu-management` → `/menu` (POS route is `/menu`)
2. Selector: `section-food-type` → `section-classification` (section title is "Classification")
3. Auth token polling: SDK mounts before login — added 2s interval poll
4. Click-through: Replaced box-shadow blocking divs with clip-path for spotlight hole
5. Next-mission logic: Continue button now skips completed missions via backend check

---

*CR-053 Intake — 2026-06-18. Major new module. 3 phases, ~55-70 days total. 12 courses planned. UX is the #1 priority. Extensible architecture: content in DB, engine in code, add missions without deploys.*
