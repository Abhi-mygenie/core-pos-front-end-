# IMPLEMENTATION_AGENT_RULES

## Purpose
These are mandatory rules for any developer or agent implementing changes in this codebase after this documentation pass.

---

## Mandatory rules before coding
1. Read these files first:
   - `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
   - `/app/memory/final/MODULE_DECISIONS_FINAL.md`
   - `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
   - `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
2. Map the request to affected module(s) before touching code.
3. Check unresolved owner decisions before assuming behavior.
4. Use code as current implementation truth when docs and code differ.
5. Do not implement without impact analysis.
6. Do not casually change financial, room, socket, bootstrap, or localStorage behavior.
7. Strict rule: no implementation without clear affected-module mapping.

---

## Required documents to read
Minimum required reading per task:
- final docs in `/app/memory/final/`
- relevant current-state docs in `/app/memory/current-state/`
- relevant analysis docs in `/app/memory/analysis/`
- relevant code files in `/app`

---

## Required impact analysis
Before coding, document:
- affected module(s)
- affected route(s)/screen(s)
- affected context(s)
- affected service(s)
- affected transform(s)
- affected localStorage keys
- affected socket/print/payment/room behavior if applicable
- regression risk level: low / medium / high
- unresolved owner decisions, if any

---

## Approval gate format
Use this format before implementation:

### Approval Gate
- Request Summary:
- Change Type:
- Affected Module(s):
- Primary Files to Change:
- Related APIs:
- State Impact:
- UI Impact:
- Regression Risks:
- Open Decision Dependencies:
- Safe to Implement Without Owner Clarification? Yes/No

If “No”, stop and ask for clarification.

---

## File-level change plan format
Before editing files, provide:

### File-Level Change Plan
- File:
- Why this file is affected:
- Intended change:
- Risk level for this file:
- Downstream files to verify after change:

Repeat for each file.

---

## Testing checklist format
Use this checklist after implementation:

### Testing Checklist
- Happy path tested:
- Error path tested:
- Permission-gated path tested:
- Socket/reload/re-entry behavior tested:
- Related print/payment/room path tested (if applicable):
- Regression surfaces checked:
- Docs updated:

---

## Bug documentation rule
For bug fixes, capture:
- user-visible symptom
- root cause file(s)
- root cause type:
  - UI-only
  - state sync
  - API payload/response
  - socket/realtime
  - localStorage/config
  - financial logic
  - room logic
  - print logic
- impacted modules
- regression risks

---

## Handover summary format
After implementation, hand over with:

### Handover Summary
- Request completed:
- Modules touched:
- Files changed:
- What changed functionally:
- What was intentionally not changed:
- Known limitations remaining:
- Tests executed:
- Docs updated:

---

## Documentation update rule after implementation
After any implemented change:
1. update final docs only if architecture/module/rule truth changed
2. if not architecture-changing, add concise implementation notes where appropriate
3. if a change resolves an open decision, update the open-question file with cited source/owner
4. if a change reveals a new conflict, document it explicitly

---

## Strict rule: no implementation without clear affected-module mapping
Implementation must not begin until the request is mapped to one or more modules from `/app/memory/final/MODULE_DECISIONS_FINAL.md`.

If a request cannot be mapped cleanly:
- stop
- inspect code deeper
- or escalate as unresolved architecture question

---

## Additional guardrails for high-risk areas
Extra caution is mandatory for changes affecting:
- `DashboardPage.jsx`
- `OrderEntry.jsx`
- `CollectPaymentPanel.jsx`
- `RoomCheckInModal.jsx`
- `StatusConfigPage.jsx`
- `orderTransform.js`
- `reportService.js`
- `socketHandlers.js`
- `useSocketEvents.js`
- room billing / room print logic
- localStorage configuration keys
- bootstrap flow in `LoadingPage.jsx`

High-risk changes require:
- explicit file-level plan
- explicit regression checklist
- explicit note of behavior that must remain unchanged
