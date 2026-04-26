# CHANGE_REQUEST_PLAYBOOK

## Purpose
Use this playbook for every bug report, enhancement, feature request, or behavior change affecting this frontend.

## Allowed documentation sources for analysis
Read in this order:
1. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
2. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
3. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
4. relevant files in `/app/memory/current-state/*`
5. relevant files in `/app/memory/analysis/*`
6. actual code files in `/app`

Do **not** rely on `/app/v3/*` for this playbook.

---

## Step-by-step process for any new bug or feature request

### Step 1 — Restate the request in module terms
Document:
- user-visible problem/request
- affected workflow
- likely module(s)
- whether it is a bug, behavior change, policy change, or refactor

### Step 2 — Identify affected module
Use `/app/memory/final/MODULE_DECISIONS_FINAL.md`.
Answer:
- Is it a routed page, embedded workflow, context/runtime issue, integration issue, or configuration issue?
- Is the visible symptom only an entry point while the root cause lives elsewhere?

### Step 3 — Check unresolved questions first
Open `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`.
If the request overlaps a `NEEDS_OWNER_DECISION` or `NOT_ANSWERED` item:
- do not invent policy
- document the dependency
- ask for clarification before coding if policy affects implementation

### Step 4 — Confirm code truth
Inspect the actual implementation files.
Minimum required inspection:
- route/page file
- related context file(s)
- related service file(s)
- related transform file(s)
- related embedded modal/panel/card files if applicable

### Step 5 — Check related APIs
Use `/app/memory/current-state/API_USAGE_MAP.md` plus code to identify:
- endpoint(s)
- payload builder(s)
- response consumer(s)
- whether state sync depends on socket after HTTP
- whether failures soft-return or throw

### Step 6 — Check state impact
Document:
- which context(s) own the shared state
- which local component/page states gate the flow
- whether localStorage is part of behavior
- whether socket handlers mutate the same state

### Step 7 — Check UI impact
Document:
- routes/pages involved
- shared components involved
- permission-gated branches
- room/station/report/print implications if relevant

### Step 8 — Check regression risk
Ask:
- Does this touch a hotspot file?
- Does it change financial logic?
- Does it change socket behavior?
- Does it change localStorage contract?
- Does it change room behavior?
- Does it change print payloads?
- Does it change startup/bootstrap?

### Step 9 — Classify the change type
Use one of:
- local UI fix
- API integration fix
- state-flow fix
- socket/realtime fix
- financial-rule change
- room-rule change
- configuration/governance change
- documentation-only clarification

### Step 10 — Prepare handover note before implementation
Before any coding, write a handover note with:
- request summary
- affected modules
- affected files
- related APIs
- state impact
- UI impact
- unresolved decisions
- regression checklist
- tests to run

---

## How to identify affected module
Quick mapping:
- login/permission/logout → Authentication & Session
- loading/progress/bootstrap → Loading & Initial Data Bootstrap
- main POS screen/cards/filters/views → Dashboard / POS Workspace
- cart/payment/update/cancel/transfer/split → Order Entry / Cart / Payment Workflow
- room card/check-in/room transfer/balance → Rooms module
- customer/address/CRM → Customer / CRM Integration
- live update/engage lock/table sync → Realtime Socket
- push/ringer/banner → Notifications & Firebase
- kitchen/station panel → Station module
- reports/audit/summary → Reports module
- status config/channel/view/order-taking settings → Visibility Settings / Device Configuration

If more than one module is involved, identify:
- primary module
- downstream impacted modules

---

## How to check related APIs
Capture for every affected flow:
- endpoint name/path
- caller file
- payload builder file
- response-shape assumptions
- whether socket follow-up is part of state sync
- whether there is stale/alternate API surface still present in code

Special caution areas:
- payment/billing
- print/KOT
- room transfer/check-in
- station fetch
- reports aggregation

---

## How to check state impact
For every request, answer:
- Which context owns the shared state?
- Which page/component owns local orchestration state?
- Are engage locks involved?
- Are localStorage keys involved?
- Does the flow start from bootstrap data or live socket state?

---

## How to check UI impact
For every request, answer:
- Which route/page surfaces this?
- Which embedded modals/panels/cards are involved?
- Which permission gates apply?
- Which hidden branch may still be affected (room, delivery, prepaid, station, report, manual print, auto-print)?

---

## How to check regression risk
Mark as **high regression risk** if any are true:
- touches `DashboardPage.jsx`
- touches `OrderEntry.jsx`
- touches `CollectPaymentPanel.jsx`
- touches `RoomCheckInModal.jsx`
- touches `StatusConfigPage.jsx`
- touches `orderTransform.js`
- touches `reportService.js`
- touches socket handlers/subscriptions
- touches localStorage key behavior
- touches payment/tax/discount/service charge/round-off/room billing/print logic

---

## How to handle code vs document conflict
When docs and code disagree:
1. prefer code for current implementation truth
2. note the conflicting doc path
3. identify whether conflict came from current-state or analysis docs
4. update planning/handover with the conflict note
5. if the conflict is business/policy-related, escalate instead of guessing

---

## How to document unresolved questions
If ambiguity appears:
- add an “Unresolved Decision” note to the handover packet
- include why it matters
- list likely owners: Product / Tech / API / Business
- state whether implementation can proceed safely without the decision

Suggested format:
- Question:
- Why it matters:
- Impacted module(s):
- Blocking or non-blocking:
- Recommended owner:

---

## Required handover note before implementation
Every implementation handover must include:
- request summary
- affected module(s)
- affected files
- related APIs
- state impact
- UI impact
- regression risks
- unresolved decisions
- proposed tests
- doc updates required after implementation

---

## Final rule
No future agent should start coding from the user request alone. Every request must first be translated into module, API, state, UI, and regression terms.
