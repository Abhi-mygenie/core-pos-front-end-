# POS2.0 Phase 3 Open Question Completion Addendum — 2026-05-17

## 1. Purpose

This document **completes or parks** the remaining Phase 3 open questions identified in `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md`. It does **not** rerun Phase 3, does not re-ask questions that were already answered, and does not overwrite the original Phase 3 capture document.

### Scope Constraints (explicit)

- **No implementation was done.**
- **No code was changed.**
- **No final baseline (`/app/memory/final/`) was updated.**
- **No pending freeze doc was updated.**
- **No bug tracker statuses were changed.**
- **The original Phase 3 capture document was not overwritten.**

### Owner-selected scope for this addendum

Per Step 2 of the agent instructions, the owner chose **Option A — ask only POS2.0-blocking open questions**. Future-sprint deferred questions (Q-084-2, Q-084-3, Q-084-4) were **not re-asked**.

---

## 2. Inputs Read

- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md` — primary input (open-question source)
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md` — Phase 3 planning context
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` — frozen baseline (read-only context)
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` — pending-freeze register (read-only context)
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` — reconciliation context

No code files were inspected for this addendum.

---

## 3. Open Questions Found

| Question ID | Bug | Prior Handling | Blocks POS2.0 Master Plan? | Action Taken |
|---|---|---|---|---|
| Q-085-2 | BUG-085 | `parked_for_backend_team` | Yes — blocks BUG-085 print implementation portion only | Re-asked owner (Option A scope). Owner re-confirmed: keep parked for backend team. |
| Q-084-2 | BUG-084 | `defer_from_pos2_0` | No — BUG-084 already deferred to future sprint | Not re-asked. Stays deferred (Option A scope). |
| Q-084-3 | BUG-084 | `defer_from_pos2_0` | No — BUG-084 already deferred to future sprint | Not re-asked. Stays deferred (Option A scope). |
| Q-084-4 | BUG-084 | `defer_from_pos2_0` | No — BUG-084 already deferred to future sprint | Not re-asked. Stays deferred (Option A scope). |

---

## 4. Answers / Handling Captured

| Question ID | Bug | Question | Owner / Backend Answer Or Handling | Result |
|---|---|---|---|---|
| Q-085-2 | BUG-085 | Does the print template already have a rendering slot for `delivery_charge_gst_amount`, or does it need a backend template update? | Owner selected **Option B — Park for backend team (unchanged)**. The question remains parked pending backend team confirmation. Owner did not provide a direct answer in this session. | `parked_for_backend_team` (unchanged). BUG-085 print portion remains backend-blocked for this sprint. |
| Q-084-2 | BUG-084 | Should composite keys be retained alongside per-component keys? | Not re-asked this session (owner chose Option A scope). | `defer_from_pos2_0` (unchanged). |
| Q-084-3 | BUG-084 | How does backend avoid double-counting if both composite and per-component keys are present? | Not re-asked this session (owner chose Option A scope). | `defer_from_pos2_0` (unchanged). |
| Q-084-4 | BUG-084 | Which payload flows must include per-component keys? | Not re-asked this session (owner chose Option A scope). | `defer_from_pos2_0` (unchanged). |

---

## 5. Updated Bug Readiness

| Bug | Previous Status | Updated Status | Can Enter Master Plan? | Conditions |
|---|---|---|---|---|
| BUG-082 | `ready_for_master_plan` | `ready_for_master_plan` (unchanged) | Yes | All questions answered in prior capture. Implementation direction: `scan-new-order` index 4 = primitive `'web'`; `new-order` index 4 = full payload; retire channel-based fallback at `socketHandlers.js:508-511`; runtime revalidation recommended by owner. |
| BUG-083 | `ready_for_master_plan` | `ready_for_master_plan` (unchanged) | Yes | All questions answered in prior capture. Implementation contract: key name `delivery_charge_gst_amount`; composite `gst_tax` retains delivery GST; included in place / update / collect-bill / print; absent for non-delivery; not in transfer-to-room. |
| BUG-084 | `defer` | `defer` (unchanged) | No — deferred to future sprint | Backend does not need per-component CGST/SGST keys this sprint. Frontend UI display already correct. Owner did not expand POS2.0 scope; deferred items remain parked. |
| BUG-085 | `pending_backend_answer` | `pending_backend_answer` (unchanged) | No — partial entry possible only if Q-085-2 is answered later | Owner re-confirmed Q-085-2 stays parked for backend team. Per Step 4 rule: "If Q-085-2 remains parked: BUG-085 remains pending_backend_answer." Condensed print layout (total CGST + SGST only) was already approved (Q-085-O1, Option B), but the delivery-GST template slot question is unresolved. **Conditional path:** if backend confirms the slot exists in a follow-up exchange, BUG-085 print portion can bundle with BUG-083 implementation. If backend confirms the slot is missing, BUG-085 becomes `backend_first_required`. |

---

## 6. Remaining Parked Questions

| Question ID | Bug | Parked For | Why Parked | Blocks POS2.0? |
|---|---|---|---|---|
| Q-085-2 | BUG-085 | Backend team | Owner confirmed (Q-083-5) that the print template renders `delivery_charge_gst_amount`, but specifically parked Q-085-2 for backend confirmation of the exact template-level slot mapping. Backend team must provide a template field list or template-source excerpt before BUG-085 print portion can proceed. | Yes — blocks BUG-085 print portion only. BUG-083 payload work is NOT blocked. |
| Q-084-2 | BUG-084 | Future-sprint backend work | Deferred to future sprint when backend adds per-component CGST/SGST key support. Owner did not request POS2.0 inclusion. | No — BUG-084 entirely deferred. |
| Q-084-3 | BUG-084 | Future-sprint backend work | Same as Q-084-2 — deferred. | No. |
| Q-084-4 | BUG-084 | Future-sprint backend work | Same as Q-084-2 — deferred. | No. |

---

## 7. Handoff To Master Planning Agent

### BUG-082 — Socket contract clarification
- **Status:** `ready_for_master_plan`
- **Master plan treatment:** Include in this sprint. Implementation direction confirmed in prior capture (Q-082-1 through Q-082-4 and Q-082-O1 Option A). Runtime revalidation recommended at QA time.

### BUG-083 — Delivery GST key
- **Status:** `ready_for_master_plan`
- **Master plan treatment:** Include in this sprint. Implementation contract fully defined (Q-083-1 through Q-083-6).

### BUG-084 — Per-component CGST/SGST payload gap
- **Status:** `defer`
- **Master plan treatment:** **Do not include in POS2.0 master plan.** Deferred to a future sprint when backend adds per-component key support. Frontend UI display already correct. Carry forward Q-084-1 through Q-084-4 to a future Phase 3 cycle.

### BUG-085 — Print template GST display gap
- **Status:** `pending_backend_answer`
- **Master plan treatment:** **Do not include in POS2.0 master plan yet.** Q-085-2 remains parked for backend team. Conditional re-entry:
  - **If backend confirms slot exists** → BUG-085 print portion bundles with BUG-083 implementation (add `delivery_charge_gst_amount` to the print payload only).
  - **If backend confirms slot does NOT exist** → BUG-085 becomes `backend_first_required` (template update needed before BUG-085 can land).
  - **Full per-component print breakdown** remains deferred to a future print-config CR (Q-085-O1, Option B was condensed-layout approval only).

### Summary for master planning agent

The master planning agent for POS2.0 should plan **BUG-082 and BUG-083 only** from Phase 3 in this sprint. BUG-084 stays out of scope. BUG-085 stays out of scope until backend confirms Q-085-2. The master planning agent should not re-ask the deferred or parked questions — they are tracked in this addendum and in the original capture document.

---

## 8. Final Status

`phase_3_open_questions_completed_with_backend_pending`

### Summary

| Metric | Count |
|---|---|
| Open questions found this session | 4 (Q-085-2, Q-084-2, Q-084-3, Q-084-4) |
| Questions re-asked this session (Option A scope) | 1 (Q-085-2) |
| Questions answered with new owner input | 0 (Q-085-2 re-confirmed parked) |
| Questions still parked for backend team | 1 (Q-085-2) |
| Questions kept deferred to future sprint | 3 (Q-084-2, Q-084-3, Q-084-4) |
| Bugs ready for POS2.0 master plan | 2 (BUG-082, BUG-083) |
| Bugs deferred from POS2.0 | 1 (BUG-084) |
| Bugs pending backend answer | 1 (BUG-085 — Q-085-2 only) |
| Code files changed | 0 |
| `/app/memory/final/` updates | 0 |
| Pending freeze doc updates | 0 |
| Original Phase 3 capture doc overwritten? | No |

---

*— End of Phase 3 Open Question Completion Addendum —*
