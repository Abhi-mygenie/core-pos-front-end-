# Layer 0 — Baseline Index

**Status:** POPULATED
**Last Updated:** 2026-06-01 (Part C + Part D promotion: PAY-006, TOTALS-004, DASH-004, PRINT-001, PRINT-002 frozen; 44→49 rules)

---

## Frozen Sprints (code-verified — 2026-05-31)

Promoted under owner directive **Option A (code-verified)**: the actual frontend code on
`31may-for-baseline`@`8f92e8c` is the recorded source of truth for every promoted item.

| Sprint | Status | Basis |
|---|---|---|
| **POS 2.0** | FROZEN | 6 FE-footprint items confirmed in code (POS2-003 family, POS2-005, POS2-007) |
| **POS 3.0** | FROZEN | incl. BUG-097 dispatch flow verified (`profileTransform.js:127`, `TableCard.jsx:70`) |
| **POS 3.1** | FROZEN | BUG-111 P1+P2 verified (`CartPanel.jsx:365,499`) |
| **CRM 2.0** | FROZEN | CR-002 commit-payload verified (`orderTransform.js:602,882`); OG-06 legacy GETs removed |

**Evidence:** `control/BASELINE_CODE_VERIFICATION_REPORT_2026_05_31.md`.
**NOT frozen (still in play):** subsumed/backend-blocked/deferred items (POS 4.0 backlog) + the
12 unfrozen business rules (separate 5-step gate). Changing any FROZEN item now requires owner approval.

> **Path note:** the frozen baseline documents below physically live at `/app/memory/memory/final/`
> (the repo nests `memory/memory/`). Historical references to `/app/memory/final/` map to that location.

---

## Frozen Baseline Documents (`/app/memory/memory/final/`)

| # | Document | Purpose | Lines |
|---|---|---|---|
| 1 | `ARCHITECTURE_DECISIONS_FINAL.md` | Architecture rules & guardrails (FA 1-5, API 1-7, EP 1-5, SM 1-7, AUTH 1-4, RT 1-3, MC 1-6, EH 1-5, ENV 1-3, LOG 1-3) | 374 |
| 2 | `BUSINESS_RULES_BASELINE_FINAL.md` | 44 frozen business rules | 195 |
| 3 | `MODULE_DECISIONS_FINAL.md` | Module boundaries, responsibilities, dependencies for 11 modules | ~500 |
| 4 | `CHANGE_REQUEST_PLAYBOOK.md` | 10-step CR analysis process | 222 |
| 5 | `IMPLEMENTATION_AGENT_RULES.md` | Mandatory pre-coding rules, 6-artifact closure rule | 183 |
| 6 | `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Resolved & unresolved decisions | ~400 |
| 7 | `FINAL_DOCS_SUMMARY.md` | Summary & reading order | 98 |
| 8 | `FINAL_DOCS_APPROVAL_STATUS.md` | Approval status per doc | — |

---

## Frozen Business Rules Summary

- **Frozen:** 49 rules across TAX (7), SC (5), DEL (5), TIP (3), ROUND (2), TOTALS (4), PAY (7), SCAN (2), DASH (4), PRINT (2), POLL (3), BOOT (2), ROOM (1), MISC (2)
- **Pending (unfrozen):** 7 rules — tracked in `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`

### Pending Rule IDs (12 total)

**Part A — Rejected (code fix required): 0 — ✅ CLEARED 2026-05-31**
| Rule | Status |
|---|---|
| TIP-003 | ✅ PROMOTED 2026-05-31 — code-verified (`CollectPaymentPanel.jsx:310,556,1551`) + owner-reconfirmed → baseline §4 |
| ROUND-001 | ✅ PROMOTED 2026-05-31 — code-verified (`orderTransform.js:709-711`) + owner-reconfirmed → baseline §5 |

**Part B — Approved-with-amendment: 5 remaining (10 PROMOTED 2026-05-31)**
| Rule | Status |
|---|---|
| TAX-004, TAX-006, SC-005, DEL-001, DEL-002, DEL-003, TOTALS-003, POLL-002 | ✅ PROMOTED 2026-05-31 — code-verified → baseline |
| SCAN-002, PAY-003 | ✅ PROMOTED 2026-05-31 — **current-state** freeze (snooze: no 2-min hide; partial-payments: all 3 modes) |
| TAX-007 | ⏳ PENDING — printed-bill GST breakdown needs live-print/backend verification |
| SCAN-003 | ⏳ PARKED by owner — code supports both 5-value & 6-value scan-order socket formats |
| PAY-009 | ⏳ NOTE-ONLY — CRM timeout currently silent-graceful; "visible error" recorded as future option |
| POLL-003 | ⏳ PENDING — status-8/9 polling exclusion needs backend confirmation |
| ROOM-002 | ⏳ PARKED by owner — will reconfirm (code: `order_amount` = food + associated + room balance) |

**Part C — Deferred (insufficient info): 4** *(SC-004 and PAY-005 are two separate rules)*
| Rule | Blocker |
|---|---|
| TOTALS-004 | Room grand total composition — needs backend + runtime verification |
| PAY-006 | Transfer to Room payload — needs runtime capture |
| SC-004 / PAY-005 | SC GST double-count on print — needs print payload comparison |

**Part D — Pending verification gates: 9**
DASH-004, PRINT-001, PRINT-002, ROOM-002, TOTALS-004, PAY-006, SC-004/PAY-005, PAY-007 (future coordination), POLL-003 (backend confirmation)

---

## API Contract Baseline (BE-1 through BE-F)

### BE-1: Backend Asks Consolidated (CR-001 + CR-004)
**Status:** `pending_backend_review_and_scheduling`
**Endpoints:** 3 (`/order-logs-report`, `/get-room-list`, `/get-single-order-new`)

| Ask | Endpoint | Status |
|---|---|---|
| P1: `waiter_name` | `/order-logs-report` | NOT delivered |
| P2: `*_by_id` + `*_by_name` (actioned-by) | `/order-logs-report` | NOT delivered |
| P3: `cancel_reason` | `/order-logs-report` | NOT delivered |
| P4: `cancel_type` | `/order-logs-report` | NOT delivered |
| P5: `table_no` consistently | `/order-logs-report` | Partial |
| P6: `room_info` on RM rows | `/order-logs-report` | NOT delivered |
| G2: Filter checked-out rooms | `/get-room-list` | SHIPPED |
| G3: Refresh payment fields post-mutation | `/get-single-order-new` | Partial |
| `latest_order_id` | `/get-room-list` | SHIPPED (named `order_id`) |

### BE-2: Lodging Payment Breakdown
**Status:** Filed, not delivered
**Fields:** `lodging_collected`, `discount_amount`, `discount_reason`, optionally `payment_breakdown[]`

---

## UI/UX Baseline

**GAP:** No existing document covers accepted screen flows or component hierarchy. This is a genuine gap needing owner input to define:
- Accepted screen flows per module (login → loading → dashboard → order entry → payment → reports)
- Component hierarchy and reuse patterns
- Approved interaction patterns (modals, drawers, toasts)

---

## Promotion Rules

A pending rule may only enter this baseline after:
1. Code is fixed (where required)
2. Runtime / payload / print verification complete (where required)
3. Owner reconfirms the amended rule
4. Corresponding bug from implementation handoff is closed
5. Baseline-creation report updated with dated diff entry
