# Session Start — CR-015 Settlement Module (2026-06-08)

**Session ID:** CR-015-2026-06-08
**Agent:** E1
**Date:** 2026-06-08
**Topic:** CR-015 — Settlement Module (Day-Closing / Cash Settlement)

---

## Boot Sequence Checklist

- [x] Step 0: Session Start file created
- [x] Step 1: Control Layer read
- [x] Step 2: Frozen Baseline read (selective — CR-015 intake doc, settlement APIs)
- [x] Step 2.5: Stale context check (frontend compiling, services running)
- [x] Step 3: Task identified — CR-015 full module, owner brainstormed UI
- [x] Step 4: Mockup approved by owner
- [ ] Gate 1-3: Planning docs
- [ ] Owner GO for implementation

---

## Task Summary

**TASK:** Build full Settlement Module — day-closing cash settlement with opening balance, per-waiter settlement, self-settlement, pilferage tracking, and waiter-to-waiter transfer (backend-blocked placeholder).

**Owner Directives:**
- "Full module" — not phased
- "access gate we will do later for now all"
- "pilferage is auto-calculated"
- "there is [close day] action"
- "settlement is done only for cash collection of that day"
- "we need lhs bar" — use Audit Report layout pattern (Sidebar + main)
- Transfer: "flag this for backend and make provision in UI"

**Mockup:** Approved at `/settlement/preview`
