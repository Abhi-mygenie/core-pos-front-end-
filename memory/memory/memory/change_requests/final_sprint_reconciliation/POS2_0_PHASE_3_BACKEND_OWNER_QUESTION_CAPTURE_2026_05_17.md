# POS2.0 Phase 3 Backend / Owner Question Capture — 2026-05-17

## 1. Purpose

This document captures owner and backend/source-of-truth answers for Phase 3 bugs:

- **BUG-082** — Socket contract clarification
- **BUG-083** — Delivery GST key / CR-013 Phase 3
- **BUG-084** — Per-component CGST/SGST payload gap
- **BUG-085** — Frontend / backend print template GST display gap

### Scope Constraints

- **No implementation was done.**
- **No code was changed.**
- **No final baseline (`/app/memory/final/`) was updated.**
- **No pending freeze doc was updated.**
- **No bug tracker statuses were changed.**

---

## 2. Inputs Read

- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

---

## 3. Owner Questions Captured

| Question ID | Bug | Question | Owner Answer | Selected Option | Business Rule Impact | Master Plan Impact |
|---|---|---|---|---|---|---|
| Q-082-O1 | BUG-082 | Pending freeze SCAN-003 says index 4 is a primitive `'web'` string, but current code treats index 4 as a full payload object. Which is correct? | **Option A** — Pending freeze wording is correct. Backend has changed the socket structure so index 4 is a primitive `'web'` string for `scan-new-order`. Owner adds: "we can revalidate at runtime." | A | Pending freeze SCAN-003 wording is confirmed correct. Future baseline update should reflect that `scan-new-order` and `new-order` have **different** message structures at index 4. | Unblocks BUG-082 — implementation direction is confirmed (index 4 = primitive string for scan-new-order). |
| Q-085-O1 | BUG-085 | Per-component GST breakdown adds up to 8 additional lines to the printed receipt. Is this approved? | **Option B** — Approved with condensed layout for now (total CGST + total SGST only, not per-component). A complete configurable print module (client chooses which fields/format) will be a **separate CR in a future sprint**. | B | No baseline change needed now. Future CR will define configurable print layout rules. | BUG-085 scope is reduced — only condensed CGST/SGST on print. Full per-component print breakdown deferred to future print-config CR. |

---

## 4. Backend Questions Captured / Parked

| Question ID | Bug | Backend Question | Handling | Captured Answer If Any | Blocks Master Plan? | Required Next Step |
|---|---|---|---|---|---|---|
| Q-082-1 | BUG-082 | For `scan-new-order` socket event, is message index 4 a primitive string or a full payload object? | `answered_by_owner` | Confirmed: `scan-new-order` sends `['scan-new-order', orderId, restaurantId, status, 'web']` — index 4 is primitive string `'web'`. | No (answered) | None |
| Q-082-2 | BUG-082 | For `new-order` socket event, is the message structure the same as `scan-new-order`? | `answered_by_owner` | `new-order` is DIFFERENT — it still sends complete keys (full payload object) at index 4. Only `scan-new-order` has primitive string at index 4. | No (answered) | None |
| Q-082-3 | BUG-082 | Does `single-order-new` API now reliably include `order_from='web'`? | `custom_answer_captured` | For popup/scan-and-order logic: the `scan-new-order` socket with `'web'` at index 4 is the mechanism. `order_from` is available in all other sockets (`new-order`, `update-order`). For total web order count: both `scan-new-order` web orders AND other socket orders with `order_from='web'` should be counted. | No (answered) | None |
| Q-082-4 | BUG-082 | Should frontend retire the channel-based `order_from='web'` fallback? | `answered_by_owner` | **Retire** the fallback. `scan-new-order` channel confirms web origin (index 4 = `'web'`); `order_from` is reliable in other events. | No (answered) | None |
| Q-083-1 | BUG-083 | What is the exact backend key name for delivery charge GST amount? | `answered_by_owner` | `delivery_charge_gst_amount` | No (answered) | None |
| Q-083-2 | BUG-083 | Should composite `gst_tax` continue to include delivery GST or exclude it? | `answered_by_owner` | **Retain** — composite `gst_tax` continues to include delivery GST. `delivery_charge_gst_amount` is also sent separately. Per DEL-001 policy. | No (answered) | None |
| Q-083-3 | BUG-083 | Which payload endpoints accept the delivery GST key? | `answered_by_owner` | Include in: (1) Place order, (2) Update order, (3) Collect bill, (4) Print bill. NOT in (5) Transfer to room — delivery/takeaway orders cannot be transferred to a room. | No (answered) | None |
| Q-083-4 | BUG-083 | Does backend persist the delivery GST field to DB? Does it appear in reports? | `answered_by_owner` | Yes — backend persists `delivery_charge_gst_amount` to DB and it appears in reports. | No (answered) | None |
| Q-083-5 | BUG-083 | Does the print template render `delivery_charge_gst_amount` as a separate line? | `answered_by_owner` | Yes — print template already renders `delivery_charge_gst_amount` as a separate line on the receipt. | No (answered) | None |
| Q-083-6 | BUG-083 | For non-delivery orders: key sent as `0` or absent? | `answered_by_owner` | **Absent** — do not include `delivery_charge_gst_amount` in the payload for non-delivery orders. | No (answered) | None |
| Q-084-1 | BUG-084 | What are the exact per-component CGST/SGST key names? | `custom_answer_captured` | Backend does NOT need per-component CGST/SGST keys in the payload **right now**. Per-component breakups are frontend UI-side only. In a **next sprint**, backend should add these keys. | No (deferred) | Deferred to future sprint when backend adds per-component key support. |
| Q-084-2 | BUG-084 | Should composite keys be retained alongside per-component keys? | `defer_from_pos2_0` | Deferred — backend will answer when per-component key support is added in future sprint. | No (deferred) | Future sprint |
| Q-084-3 | BUG-084 | How does backend avoid double-counting if both composite and per-component keys are present? | `defer_from_pos2_0` | Deferred — backend will answer when per-component key support is added in future sprint. | No (deferred) | Future sprint |
| Q-084-4 | BUG-084 | Which payload flows must include per-component keys? | `defer_from_pos2_0` | Deferred — backend will answer when per-component key support is added in future sprint. | No (deferred) | Future sprint |
| Q-085-1 | BUG-085 | Is the print template purely payload-driven or does it re-derive GST? | `answered_by_owner` | **Purely payload-driven** — template renders exactly what frontend sends, no independent computation. | No (answered) | None |
| Q-085-2 | BUG-085 | Which per-component GST fields will the template render? | `parked_for_backend_team` | Parked — backend team to confirm whether print template already has a slot for `delivery_charge_gst_amount` or needs an update. | Yes — blocks BUG-085 print implementation | Backend team must confirm template slot availability for `delivery_charge_gst_amount`. |
| Q-085-3 | BUG-085 | How will the template avoid double-counting composite + per-component fields? | `answered_by_owner` | Template renders fields independently without summing them — no double-counting risk. | No (answered) | None |
| Q-085-4 | BUG-085 | Is a backend template update for per-component GST display planned/scheduled? | `answered_by_owner` | Template update planned for a **future sprint**, not this one. Current template sufficient with condensed layout. | No (answered — future sprint) | Future sprint for full per-component print template update. |
| Q-085-5 | BUG-085 | Does the current template perform independent GST computation from raw item data? | `answered_by_owner` | **No independent computation** — template always trusts and renders frontend-sent values exactly. | No (answered) | None |

---

## 5. Bug Readiness After Capture

| Bug | Owner Status | Backend Status | Can Enter Master Plan? | Conditions | Readiness Status |
|---|---|---|---|---|---|
| BUG-082 | All owner questions answered (Q-082-O1: Option A) | All backend questions answered (Q-082-1 through Q-082-4) | **Yes** | Runtime revalidation recommended per owner note. Implementation: `scan-new-order` index 4 = primitive `'web'`; `new-order` index 4 = full payload; retire fallback at socketHandlers.js:508-511; count web orders from both `scan-new-order` channel + `order_from='web'` in other events. | `ready_for_master_plan` |
| BUG-083 | No owner questions required | All backend questions answered (Q-083-1 through Q-083-6) | **Yes** | Key name = `delivery_charge_gst_amount`; composite retains delivery GST; included in place/update/collect-bill/print (not transfer-to-room); absent for non-delivery orders; backend persists + reports. | `ready_for_master_plan` |
| BUG-084 | No owner questions required | Q-084-1 answered (deferred); Q-084-2/3/4 deferred | **No — deferred** | Backend does not need per-component keys this sprint. Frontend UI display is already correct. Deferred to future sprint when backend adds per-component key support. | `defer` |
| BUG-085 | Owner question answered (Q-085-O1: Option B condensed) | Q-085-1/3/4/5 answered; **Q-085-2 parked for backend team** | **Partial** | Condensed layout approved (total CGST + SGST only). Template is payload-driven, no double-count risk. BUT: Q-085-2 (template slot for `delivery_charge_gst_amount`) parked for backend team. If template already has the slot, BUG-085 print portion can proceed with BUG-083. If not, backend template update needed first. Full per-component print breakdown deferred to future sprint. | `pending_backend_answer` |

---

## 6. Business Rule / Baseline Impact

### Later updates implied by captured answers

| Area | Document To Update | What Changes | When To Update |
|---|---|---|---|
| SCAN-003 socket contract | Pending freeze (Part B10) | Update wording to reflect confirmed structure: `scan-new-order` index 4 = primitive `'web'`; `new-order` index 4 = full payload. Retire "index 4 as primary source" ambiguity. | After BUG-082 implementation + QA pass |
| DEL-001/002/003 delivery GST | Pending freeze (Part B5-B7) | Confirm `delivery_charge_gst_amount` as the exact key name. Composite retention confirmed (DEL-001 policy upheld). Absent for non-delivery (not zero). | After BUG-083 implementation + QA pass |
| TAX-006 per-component split | Pending freeze (Part B2) | Add note: per-component CGST/SGST payload keys deferred to future sprint. UI display is correct; payload work blocked on backend key support. | After this capture document is accepted |
| TAX-007 print GST breakdown | Pending freeze (Part B3) | Add note: condensed layout (total CGST + SGST) approved for now. Full per-component print breakdown deferred to future sprint + configurable print CR. | After this capture document is accepted |
| Print template ownership | Business rules baseline | Add rule: print template is purely payload-driven; frontend controls receipt content via payload fields. No template-side re-computation. | After BUG-085 is resolved |
| Fallback retirement | Module 7 socket rules | Document that `scan-new-order` channel-based `order_from='web'` fallback is retired. `order_from` is authoritative from other socket events. | After BUG-082 implementation + QA pass |

**None of these updates are made in this agent. They are recorded for the implementation and post-QA agents.**

---

## 7. Backend Team Handoff

Only one question was parked for backend team:

| Question ID | Bug | Backend Team Question | Required Evidence | Why Needed | Blocks Which Bug |
|---|---|---|---|---|---|
| Q-085-2 | BUG-085 | Does the print template already have a rendering slot for `delivery_charge_gst_amount`, or does it need a backend template update to display this field on the receipt? | Template field list or template source extract showing whether `delivery_charge_gst_amount` is mapped to a receipt line. | Owner confirmed (Q-083-5) that the template renders this field, but when asked specifically about the print template slot (Q-085-2), owner parked for backend. This needs a definitive backend confirmation. | BUG-085 (print portion only). BUG-083 payload work is NOT blocked — only the print rendering confirmation. |

### Note on Q-085-2 vs Q-083-5 apparent conflict

Owner answered Q-083-5 as "Yes — print template already renders `delivery_charge_gst_amount`" but then parked Q-085-2 for backend team. Possible explanations:
- Owner is confident the field is rendered but wants backend to double-check the exact slot mapping.
- Q-083-5 was answered based on general knowledge; Q-085-2 was parked for precise template-level verification.

**Recommendation for backend team:** Provide a screenshot or template excerpt showing whether `delivery_charge_gst_amount` already maps to a receipt line. If yes, BUG-085 is unblocked. If no, a template update is needed before the field appears on receipts.

---

## 8. Handoff To Master Planning Agent

### BUG-082 — Socket Contract Clarification

- **Readiness:** `ready_for_master_plan`
- **All questions answered.** Implementation direction confirmed:
  - `scan-new-order`: index 4 = primitive `'web'` string (NOT full payload)
  - `new-order`: index 4 = full payload object (unchanged)
  - Retire the channel-based `order_from='web'` fallback at socketHandlers.js:508-511
  - Web order count: include both `scan-new-order` web orders AND `order_from='web'` from other events
  - Runtime revalidation recommended by owner
- **Implementation risk:** Low-to-medium. `handleScanNewOrder` already fetches the full order via API, so the index-4 primitive string is informational only for source identification. Main change is fallback retirement + ensuring `order_from` is read from the fetched order.

### BUG-083 — Delivery GST Key

- **Readiness:** `ready_for_master_plan`
- **All questions answered.** Implementation contract confirmed:
  - Key name: `delivery_charge_gst_amount`
  - Composite `gst_tax` retains delivery GST (both sent)
  - Included in: place order, update order, collect bill, print bill
  - NOT in: transfer to room
  - Non-delivery orders: key absent (not zero)
  - Backend persists to DB, appears in reports
  - Print template renders it as a separate line
- **Implementation risk:** Medium. Touches `calcOrderTotals` return, 4 payload builders. Regression risk on composite `gst_tax` value, but composite policy is "retain" so no subtraction needed.

### BUG-084 — Per-Component CGST/SGST Payload Gap

- **Readiness:** `defer`
- **Deferred to future sprint.** Backend does not need per-component keys this sprint. Frontend UI display (already correct) stays as-is. Backend will add per-component key support in a future sprint.
- **No master plan entry for this sprint.**
- **Carry forward:** When backend adds per-component key support, re-ask Q-084-1 through Q-084-4.

### BUG-085 — Print Template GST Display Gap

- **Readiness:** `pending_backend_answer` (Q-085-2 parked)
- **Mostly answered.** Key findings:
  - Template is purely payload-driven (no re-computation)
  - No double-count risk (template renders fields independently)
  - Condensed layout approved (total CGST + SGST only)
  - Full per-component print template update planned for future sprint
  - Q-085-2 parked: backend team to confirm template slot for `delivery_charge_gst_amount`
- **Partial master plan entry possible:** If Q-085-2 is confirmed (template already has the slot), BUG-085 reduces to "add `delivery_charge_gst_amount` to the print payload" — which is effectively part of BUG-083 implementation. If Q-085-2 is negative, a backend template update is needed first.
- **Recommendation:** Bundle BUG-085 delivery GST print with BUG-083 implementation. Defer per-component print breakdown to future sprint (aligns with BUG-084 deferral + print config CR).

---

## 9. Final Status

**`phase_3_questions_captured_backend_pending`**

### Summary

| Metric | Count |
|---|---|
| Owner questions asked | 2 |
| Owner questions answered | 2 |
| Backend questions asked | 19 |
| Backend questions answered by owner | 15 |
| Backend questions parked for backend team | 1 (Q-085-2) |
| Backend questions deferred | 3 (Q-084-2, Q-084-3, Q-084-4) |
| Bugs ready for master plan | 2 (BUG-082, BUG-083) |
| Bugs deferred | 1 (BUG-084) |
| Bugs pending backend answer | 1 (BUG-085 — Q-085-2 only) |

---

*— End of Phase 3 Question Capture —*
