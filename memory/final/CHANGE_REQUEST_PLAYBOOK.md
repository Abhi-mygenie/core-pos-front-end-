# CHANGE_REQUEST_PLAYBOOK

## Purpose
Use this playbook for every bug report, change request, enhancement, or feature addition affecting this frontend.

## Documents to read first
Read in this order:
1. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
2. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
3. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
4. Relevant current-state docs in `/app/memory/current-state/`
5. Relevant analysis docs in `/app/memory/analysis/`
6. Relevant `/app/v3/*` document only if you need prior audited context and it does not conflict with code

---

## Step-by-step process for any new bug or feature request

### Step 1 — Restate the request in module terms
Document:
- user-visible problem/request
- affected workflow
- likely module(s)
- whether this is a bug, behavior change, policy change, or refactor

### Step 2 — Identify affected module
Use `/app/memory/final/MODULE_DECISIONS_FINAL.md` to classify the request into one or more modules.

Questions to answer:
- Is it a routed page, embedded workflow, context/runtime module, or external integration issue?
- Is the visible symptom only the entry point while the real issue lives elsewhere?

### Step 3 — Check if the request touches an unresolved owner decision
Open `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`.

If the request overlaps with a `NEEDS_OWNER_DECISION` item:
- do not proceed as if policy is settled
- document the owner dependency
- ask for clarification before coding

### Step 4 — Confirm code truth
Open the actual implementation files.
Do not trust old docs over code.

Minimum required inspection:
- route/page file
- related context file(s)
- related service file(s)
- related transform file(s)
- related layout/modal/panel files if the flow is embedded

### Step 5 — Check related APIs
Use `/app/memory/current-state/API_USAGE_MAP.md` plus code to identify:
- endpoint(s)
- payload builder(s)
- response consumer(s)
- whether the flow is socket-followed
- whether failures soft-return or throw

### Step 6 — Check state impact
Document:
- which context(s) read/write the affected data
- which local component states gate the flow
- whether localStorage is part of the behavior
- whether socket handlers mutate the same state

### Step 7 — Check UI impact
Document:
- screens/pages where the issue appears
- shared components impacted
- permission-gated UI branches
- room/station/report/print impacts if relevant

### Step 8 — Check regression risk
Ask:
- Does this touch a hotspot file?
- Does it change financial logic?
- Does it change socket behavior?
- Does it change localStorage contract?
- Does it change print payloads?
- Does it change room behavior?
- Does it change startup/bootstrap?

### Step 9 — Classify change type
Use one of:
- local UI fix
- API integration fix
- state flow fix
- socket/realtime fix
- financial rule change
- room rule change
- configuration/governance change
- documentation-only clarification

### Step 10 — Prepare handover note before implementation
Before any coding, prepare a handover note containing:
- request summary
- affected modules
- files to inspect/change
- unresolved decisions
- regression checklist
- tests to run

---

## How to identify affected module
Use this quick mapping:
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

If the issue spans more than one module, note a primary module and downstream impact modules.

---

## How to check related APIs
For every affected flow, capture:
- endpoint name and path
- caller file
- payload builder file
- response-shape assumptions
- whether state sync depends on socket after HTTP
- whether there is stale or alternate API surface in tree

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
- Are there engage locks involved?
- Are there localStorage keys involved?
- Does the flow start from bootstrap data or live socket state?

---

## How to check UI impact
For every request, answer:
- Which route/page surfaces this?
- Which embedded modals/panels/cards are involved?
- Which permission gates apply?
- Which hidden branch might still be affected (room, delivery, prepaid, station, report, manual print, auto-print)?

---

## How to check regression risk
Mark a request as **high regression risk** if any of the below are true:
- touches `DashboardPage.jsx`
- touches `OrderEntry.jsx`
- touches `CollectPaymentPanel.jsx`
- touches `orderTransform.js`
- touches `reportService.js`
- touches socket handlers or subscriptions
- touches localStorage key behavior
- touches payment, tax, discount, service charge, round-off, room billing, or print payloads

---

## How to handle code vs document conflict
When docs and code disagree:
1. prefer code for current implementation truth
2. record the conflicting doc path
3. note whether the conflict came from current-state, analysis, or V3 docs
4. update the implementation plan/handover with the conflict note
5. if the conflict is business/policy-related rather than implementation-related, escalate to owner instead of guessing

---

## How to document unresolved questions
If new ambiguity appears:
- add a short “Unresolved Decision” note to the handover packet
- include why it matters
- list likely owners: Product / Tech / API / Business
- state whether implementation can proceed safely without that decision

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
No future agent should start coding from the user request alone. Every request must be translated into module, API, state, UI, and regression terms first.
