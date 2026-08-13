# POS2.0 Phase 4 Backend Question Capture — 2026-05-17

## 1. Purpose

This document captures the owner-provided answers to the 8 backend questions (BQ-P4-01 through BQ-P4-08) created during Phase 4 planning. Some questions were answered directly by the owner from their knowledge of the backend; others remain parked for the backend team.

No implementation was done. No code was changed. No baseline or pending-freeze docs were updated.

---

## 2. Backend Questions — Answers Captured

| Question ID | Bug | Backend Question | Owner/Backend Answer | Handling | Blocks Master Plan? | Updated Classification |
|---|---|---|---|---|---|---|
| BQ-P4-01 | BUG-052 | What is the exact profile field for round-off config? | **Boolean field (yes/no). If yes → ceiling round-off. If no → no round-off. "We are already using the key."** | `answered_by_owner` | **No** — answered | `candidate_for_master_plan_with_constraints` (constraint: identify exact field name in profileTransform) |
| BQ-P4-02 | BUG-058 | Which endpoint settles prepaid-hold orders? | **`order-bill-payment` is correct for all. Need runtime check to understand payload difference between hold-paid-hold and prepaid-hold.** | `answered_by_owner_with_runtime_needed` | **No** — endpoint confirmed; runtime investigation needed for payload differences | `qa_repro_required` (runtime payload investigation) |
| BQ-P4-03 | BUG-060 | Which socket events fire after `order-shifted-room`? | **Events ARE already firing. The issue is that the frontend context is not clearing the source table. Business logic to clear table exists for paid/cancel (cleared). Need to check room-transfer clearing logic.** | `answered_by_owner` | **No** — answered; this is a frontend context bug, not a backend contract gap | `candidate_for_master_plan_with_constraints` (constraint: identify FE context clearing logic gap for room transfer) |
| BQ-P4-04 | BUG-063 | Which room-print field names does the template accept? | **"Will provide runtime"** — owner will check template fields at runtime and provide mapping. | `parked_for_owner_runtime_check` | **Yes** — still blocked until owner provides template field mapping | `ready_for_master_plan_after_backend_answer` (parked) |
| BQ-P4-05 | BUG-064 | Does FCM/socket payload carry a transfer marker? | **"Not currently. Backend need to add this and then frontend can handle."** | `backend_implementation_required` | **Yes** — blocked on backend adding a transfer marker to the notification payload | `ready_for_master_plan_after_backend_answer` (backend must add marker first) |
| BQ-P4-06 | BUG-065 | Which response keys echo `firm_name`/`firm_gst`? | **"Will check with backend"** | `parked_for_backend_team` | **Yes** — still blocked | `ready_for_master_plan_after_backend_answer` (parked) |
| BQ-P4-07 | BUG-069 | Backend notification sequencing approach? | **"Will get back after asking backend"** | `parked_for_backend_team` | **Yes** — still blocked | `ready_for_master_plan_after_backend_answer` (parked) |
| BQ-P4-08 | BUG-072 | Do separate note fields exist in backend API? | **"Yes, already showing on order screen, not showing on order card."** Note fields exist and render on order screen. Just need to add to order card. | `answered_by_owner` | **No** — answered; frontend-only display task | `ready_for_master_plan` |

---

## 3. Classification Changes After Backend Capture

| Bug | Previous Classification | New Classification | Reason |
|---|---|---|---|
| BUG-052 | `ready_for_master_plan_after_backend_answer` | **`candidate_for_master_plan_with_constraints`** | Owner confirmed: boolean field, already used. Constraint: identify exact field name in profileTransform. No backend team answer needed. |
| BUG-058 | `ready_for_master_plan_after_backend_answer` | **`qa_repro_required`** | Endpoint confirmed (`order-bill-payment`). Runtime payload investigation needed to understand hold vs prepaid-hold differences. |
| BUG-060 | `ready_for_master_plan_after_backend_answer` | **`candidate_for_master_plan_with_constraints`** | Events already fire. Issue is FE context not clearing source table on room transfer. Constraint: identify the context clearing logic gap. |
| BUG-063 | `ready_for_master_plan_after_backend_answer` | unchanged (`ready_for_master_plan_after_backend_answer`) | Owner will provide template field mapping at runtime. Still parked. |
| BUG-064 | `ready_for_master_plan_after_backend_answer` | unchanged (`ready_for_master_plan_after_backend_answer`) | Backend must add transfer marker. Still blocked on backend implementation. |
| BUG-065 | `ready_for_master_plan_after_backend_answer` | unchanged (`ready_for_master_plan_after_backend_answer`) | Parked for backend team. |
| BUG-069 | `ready_for_master_plan_after_backend_answer` | unchanged (`ready_for_master_plan_after_backend_answer`) | Parked for backend team. |
| BUG-072 | `ready_for_master_plan_after_owner_and_backend_answer` | **`ready_for_master_plan`** | Note fields exist. Just add to order card. Frontend-only. |

---

## 4. Updated Full Readiness Summary (Post All Phase 4 Captures)

### Ready for master plan NOW (7 bugs — no blockers)
| Bug | Summary | Risk |
|---|---|---|
| BUG-050 | Manual reprint parity — use Collect Bill override path | Medium |
| BUG-056 | Preset discount dropdown, mutually exclusive with manual | Low |
| BUG-057 | Prepaid Print Bill on Collect Bill + order screen | Low-medium |
| BUG-059 | Audit Report Print Bill for Paid orders, current permissions | Low-medium |
| BUG-067 | Station toggle disabled when no stations configured | Low |
| BUG-072 | Add existing note fields to order card display | Low |
| BUG-078 | CRM timeout toast, no retry, allow manual proceed | Low |

### Candidates for master plan with constraints (4 bugs)
| Bug | Summary | Constraint |
|---|---|---|
| BUG-052 | Profile-driven round-off boolean gate | Identify exact field name in profileTransform; sequence after BUG-051 |
| BUG-060 | Room transfer: FE context not clearing source table | Identify context clearing logic gap for room transfer vs paid/cancel |
| BUG-061 | Room check-in time: column exists, data not bound | Identify field mapping gap; use checkout time format |
| BUG-066 | Food transfer from order screen allows rooms | Identify exact component in order screen |

### QA repro required (3 bugs)
| Bug | Summary | What To Verify |
|---|---|---|
| BUG-053 | GST rate label | Owner screenshot needed; may already be resolved |
| BUG-058 | Prepaid-hold settlement payload | Runtime investigation: payload diff between hold types |
| BUG-074 | Browser autofill | Verify login form supports native autofill |

### Still blocked on backend (4 bugs)
| Bug | Summary | Blocker |
|---|---|---|
| BUG-063 | Room bill print fields | Owner will provide template mapping at runtime |
| BUG-064 | Room transfer notification | Backend must add transfer marker |
| BUG-065 | Corporate room GST echo | Parked for backend team |
| BUG-069 | Notification sequencing | Parked for backend team |

### Duplicates to close (4 bugs)
| Bug | Close With |
|---|---|
| BUG-076 | BUG-051 QA |
| BUG-077 | QA verify trim |
| BUG-081 | QA verify snooze duration |
| BUG-086 | QA verify room key |

---

## 5. Final Status

`phase_4_backend_questions_captured_with_parked_items`

- 8 backend questions asked
- 4 answered by owner (BQ-P4-01, 02, 03, 08)
- 4 parked (BQ-P4-04, 05, 06, 07)
- 7 bugs now ready for master plan (up from 6)
- 4 bugs candidates with constraints (new category additions)
- 3 bugs need QA repro (up from 2)
- 4 bugs still blocked on backend
- 4 duplicates unchanged

---

*— End of Phase 4 Backend Question Capture —*
