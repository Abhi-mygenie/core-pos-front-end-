# POS2.0 Phase 4 Owner Decision Capture — 2026-05-17

## 1. Purpose

This document captures the owner's answers for the 7 owner-blocked Phase 4 bugs plus the 3 edge-case classification questions answered earlier in the Phase 4 session.

No implementation was done. No code was changed. No baseline or pending-freeze docs were updated. No QA was run.

---

## 2. Inputs Read

| Input | Path |
|---|---|
| Phase 4 planning document | `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` |
| Business rules baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Pending freeze file | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` |
| Reconciliation report | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` |

---

## 3. Edge-Case Classification Answers (from Phase 4 planning session)

| Question ID | Bug | Question | Owner Answer | Classification Impact |
|---|---|---|---|---|
| P4-01 | BUG-066 | Is BUG-066 a duplicate of BUG-062? | "For food item transfer not order, its still allowing — from order screen" | Confirmed real bug; classified as `candidate_for_master_plan_with_constraints` |
| P4-02 | BUG-069 | Should BUG-069 be deferred? | "To be handled at backend — pass to backend" | Classified as `ready_for_master_plan_after_backend_answer` |
| P4-03 | BUG-074 | Should BUG-074 be deferred? | "B — browser-native autofill only, just verify behavior" | Classified as `qa_repro_required` |

---

## 4. Print Cluster Owner Decisions

| Question ID | Bug | Question | Owner Answer | Selected Option |
|---|---|---|---|---|
| Q-P4-PRINT-01 | BUG-050 | Which source-of-truth should manual reprint follow? | **A — Always match Collect Bill live-total values** | A |
| Q-P4-PRINT-02 | BUG-057 | Should prepaid orders have Print Bill? Where? | **B — Print Bill inside Collect Bill panel and order screen for prepaid** | B |
| Q-P4-PRINT-03a | BUG-059 | Which Audit Report tabs get Print Bill? | **A — Paid orders only** | A |
| Q-P4-PRINT-03b | BUG-059 | Who can print from Audit Report? | **C — Same as current order permissions** | C |
| Q-P4-PRINT-03c | BUG-059 | For cancelled orders, what does the bill show? | **C — Not applicable — don't allow printing cancelled orders** | C |

### Print Cluster Implementation Impact

**BUG-050 — Manual Reprint Parity (Option A confirmed):**
- Dashboard card reprint (`OrderCard.handlePrintBill`, `TableCard.handlePrintBill`) must use the same override path as Collect Bill, passing live totals through `buildBillPrintPayload`.
- Implementation approach: inject stored order totals (from `order.orderItemTotal`, `order.discount`, `order.tip`, etc.) into the default branch of `buildBillPrintPayload`, OR redirect dashboard print to always use the override branch.
- Risk: Medium — touches hotspot files `orderTransform.js` and `OrderCard.jsx`.

**BUG-057 — Prepaid Print Bill (Option B confirmed):**
- Add Print Bill button inside Collect Bill panel for prepaid orders.
- Add Print Bill button on the order screen for prepaid orders.
- Dashboard OrderCard does NOT get a Print Bill button for prepaid.
- This partially reverses the BUG-005 historical closure ("Print Bill on prepaid not business requirement") — but only for the Collect Bill and order screen surfaces.
- Risk: Low-medium — additive button; must use override path to avoid BUG-050-style drift.

**BUG-059 — Audit Report Print Bill (Options A, C, C confirmed):**
- Print Bill action available on **Paid orders only** in Audit Report.
- Permission gate: **same as current order permissions** (no additional role restriction).
- Cancelled orders: **no print** (not applicable).
- New feature surface — Print Bill row action on Paid tab rows in `OrderTable.jsx` / `OrderDetailSheet.jsx`.
- Must use the override (stored totals) path for financial accuracy.
- Risk: Low-medium — new UI surface; financial data comes from stored order.

---

## 5. Room Cluster Owner Decisions

| Question ID | Bug | Question | Owner Answer | Selected Option |
|---|---|---|---|---|
| Q-P4-ROOM-01 | BUG-061 | Where should room check-in time appear? | **Column is already there, data not showing. It already shows when room is checked out — same format needs to be used.** | Existing column — data binding fix |
| Q-P4-ROOM-02a | BUG-063 + BUG-065 | Which room fields on the printed room bill? | **H — All of the above** (room_no, check_in_date, guest_name, advance_amount, room_price, firm_name, firm_gst) | H |
| Q-P4-ROOM-02b | BUG-065 | Corporate fields display mode? | **A — Only when provided (conditional display)** | A |
| Q-P4-ROOM-03 | BUG-064 | Should room transfers have distinct notification? | **A — Different sound + different banner message** (need to call different sound file) | A |

### Room Cluster Implementation Impact

**BUG-061 — Room Check-In Time (data binding fix):**
- Owner clarification changes the classification: this is NOT a missing-rule issue — the column already exists in the report but the data is not being bound/displayed for check-in. When the room is checked out, the time shows correctly.
- **Revised classification:** `candidate_for_master_plan_with_constraints` (constraint: identify the exact column and data binding gap; use the same format as checkout time display).
- Risk: Low — likely a missing data field mapping in the report component.
- Backend question still applies: confirm the check-in time field name in the API response if not already known.

**BUG-063 + BUG-065 — Room Bill Fields + Corporate GST (Option H + A confirmed):**
- All room fields required on the printed room bill: room_no, check_in_date, guest_name, advance_amount, room_price, firm_name, firm_gst.
- Corporate fields (firm_name, firm_gst) shown ONLY when provided during check-in (conditional).
- Still blocked on backend: must confirm which field names the print template accepts (BQ-P4-04 for BUG-063, BQ-P4-06 for BUG-065).
- Risk: Medium — touches `buildBillPrintPayload` room branch; must preserve ROOM-001 totals.

**BUG-064 — Room Transfer Notification (Option A confirmed):**
- Must play a DIFFERENT sound file for room transfer notifications.
- Must show a different banner message (e.g., "Order transferred to Room 101").
- Still blocked on backend: must confirm whether FCM/socket payload carries a transfer marker (BQ-P4-05).
- Risk: Low-medium — additive notification handling; requires new sound asset.

---

## 6. Standalone Owner Decisions

| Question ID | Bug | Question | Owner Answer | Selected Option |
|---|---|---|---|---|
| Q-P4-STANDALONE-01a | BUG-056 | Preset discount picker UX? | **A — Dropdown selector** | A |
| Q-P4-STANDALONE-01b | BUG-056 | Preset + manual discount stacking? | **A — Mutually exclusive — selecting a preset replaces any manual discount** | A |
| Q-P4-STANDALONE-02 | BUG-067 | Station toggle when no stations configured? | **A — Disable the toggle entirely (greyed out with tooltip)** | A |
| Q-P4-STANDALONE-03a | BUG-078 | CRM timeout error display? | **A — Toast notification** | A |
| Q-P4-STANDALONE-03b | BUG-078 | Retry option? | **C — No retry, just show error and let cashier proceed** | C |
| Q-P4-STANDALONE-03c | BUG-078 | Can cashier proceed after timeout? | **A — Yes, allow manual customer entry / new-customer path** | A |

### Standalone Implementation Impact

**BUG-056 — Preset Discount Picker (Options A + A confirmed):**
- Dropdown selector on Collect Bill panel for discount categories.
- Mutually exclusive with manual discount — selecting a preset replaces manual, and entering manual clears preset.
- Backend already provides categories; FE needs to render a dropdown and wire selection into the discount state.
- Risk: Low — additive UI component; uses existing `orderDiscountType` / `orderDiscountValue` pathway.

**BUG-067 — Station Toggle Readiness (Option A confirmed):**
- Disable the Station View toggle on StatusConfigPage when no stations are configured.
- Show a tooltip explaining why (e.g., "No stations configured").
- Readiness condition: at least one station exists in the bootstrap station data.
- Risk: Low — single conditional gate on the toggle.

**BUG-078 — CRM Timeout Error UX (Options A + C + A confirmed):**
- Toast notification on CRM timeout (auto-dismiss).
- No retry — just show the error.
- Cashier can proceed with manual entry / new-customer path after timeout.
- Risk: Low — add a toast call in the CRM service error handler; distinguish timeout from "not found."

---

## 7. Updated Bug Readiness After Decisions

| Bug | Previous Status | Updated Status | Can Enter Master Plan? | Conditions |
|---|---|---|---|---|
| BUG-050 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed Option A (Collect Bill parity). Implementation: redirect dashboard print to use override/stored-totals path. |
| BUG-056 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed: dropdown, mutually exclusive with manual. No backend dependency. |
| BUG-057 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed: Collect Bill panel + order screen for prepaid. No backend dependency. |
| BUG-059 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed: Paid only, current permissions, no cancelled print. No backend dependency. |
| BUG-061 | `ready_for_master_plan_after_owner_answer` | **`candidate_for_master_plan_with_constraints`** | **Yes, with constraints** | Owner clarified: column exists, data not bound. Constraint: identify field mapping gap + confirm field name if needed. |
| BUG-063 | `ready_for_master_plan_after_owner_and_backend_answer` | **`ready_for_master_plan_after_backend_answer`** | **Yes, after backend answer** | Owner answered (all fields + conditional corporate). Only backend template key confirmation remaining (BQ-P4-04). |
| BUG-064 | `ready_for_master_plan_after_owner_and_backend_answer` | **`ready_for_master_plan_after_backend_answer`** | **Yes, after backend answer** | Owner answered (different sound + banner). Only backend transfer marker confirmation remaining (BQ-P4-05). |
| BUG-065 | `ready_for_master_plan_after_owner_and_backend_answer` | **`ready_for_master_plan_after_backend_answer`** | **Yes, after backend answer** | Owner answered (conditional corporate display). Only backend echo/template mapping remaining (BQ-P4-06). |
| BUG-067 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed: disable toggle when no stations. No backend dependency. |
| BUG-072 | `ready_for_master_plan_after_owner_and_backend_answer` | unchanged | **No — still needs owner + backend** | Owner question about note taxonomy and display surface was NOT asked in this session (not in the 7 owner-blocked list — BUG-072 was in the owner+backend bucket). Backend question BQ-P4-08 still outstanding. |
| BUG-078 | `ready_for_master_plan_after_owner_answer` | **`ready_for_master_plan`** | **Yes** | Owner confirmed: toast, no retry, allow manual proceed. No backend dependency. |

### Summary of readiness changes

| Readiness | Count Before | Count After |
|---|---|---|
| `ready_for_master_plan` (no blockers) | 0 | **6** (BUG-050, 056, 057, 059, 067, 078) |
| `candidate_for_master_plan_with_constraints` | 1 | **2** (BUG-066, BUG-061) |
| `ready_for_master_plan_after_backend_answer` | 4 | **7** (BUG-052, 058, 060, 069, 063, 064, 065) |
| `ready_for_master_plan_after_owner_and_backend_answer` | 4 | **1** (BUG-072) |
| `qa_repro_required` | 2 | 2 (BUG-053, 074) |
| `duplicate_or_already_resolved` | 4 | 4 (BUG-076, 077, 081, 086) |

---

## 8. Handoff To Master Planning Agent

### Bugs NOW ready for master plan (6)
- **BUG-050** — Manual reprint parity (use Collect Bill override path)
- **BUG-056** — Preset discount dropdown (mutually exclusive with manual)
- **BUG-057** — Prepaid Print Bill on Collect Bill + order screen
- **BUG-059** — Audit Report Print Bill for Paid orders (current permissions, no cancelled)
- **BUG-067** — Station toggle disabled when no stations configured
- **BUG-078** — CRM timeout toast, no retry, allow manual proceed

### Bugs ready with constraints (2)
- **BUG-061** — Room check-in time: column exists, data not bound. Identify field mapping gap.
- **BUG-066** — Food transfer from order screen: identify exact component allowing rooms.

### Bugs ready after backend answer only (7)
- **BUG-052, 058, 060, 069** (original backend-blocked)
- **BUG-063, 064, 065** (owner answered; only backend confirmation remaining)

### Bug still needing owner + backend (1)
- **BUG-072** — Notes taxonomy owner question was not asked yet (belongs to owner+backend bucket). Backend question BQ-P4-08 also outstanding.

---

## 9. BUG-072 Note

BUG-072 (Notes taxonomy) was listed in the "owner + backend" bucket in the Phase 4 planning document. The owner questions for BUG-072 were not asked in this session because BUG-072 was not part of the 7 "owner-only-blocked" bugs — it requires both owner and backend answers. The owner question for BUG-072 should be asked when the backend answer (BQ-P4-08) is available, so both can be addressed together.

---

## 10. Final Status

`phase_4_owner_decisions_captured`

- **10 owner decisions** captured across 3 batches (print, room, standalone)
- **3 edge-case classification answers** captured earlier in Phase 4
- **6 bugs** now ready for master plan (no remaining blockers)
- **2 bugs** ready with constraints (code inspection needed)
- **7 bugs** still blocked on backend answers only
- **1 bug** still blocked on owner + backend (BUG-072)
- No code was changed
- `/app/memory/final/` was not updated
- Pending freeze doc was not updated

---

*— End of POS2.0 Phase 4 Owner Decision Capture —*
