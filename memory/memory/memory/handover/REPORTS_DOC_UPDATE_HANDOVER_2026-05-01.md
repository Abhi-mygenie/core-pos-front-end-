# Reports — Documentation Update Handover (2026-05-01)

**For:** Documentation Agent
**From:** QA Validation Agent
**Reason:** Code changes shipped 2026-05-01 in the Reports + Printing modules trigger localised updates to `/app/memory/final/*`. **Do not edit the final docs directly during validation** — this handover is the authorised request to update them.

---

## 1. Source documents
| Doc | Path |
|---|---|
| QA handover | `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md` |
| Implementation handover | `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` |
| Live audit (evidence) | `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md` |
| Backend ask register | `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md` |
| Source tracker | `/app/memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` |
| QA validation report | `/app/memory/handover/REPORTS_QA_REPORT_2026-05-01.md` |

---

## 2. Final docs reviewed
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/FINAL_DOCS_SUMMARY.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`

---

## 3. Updates required

### Update U-01 — Add `/reports/rooms` to Reports module routes
- **Doc:** `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- **Section:** §10 Reports / Audit / Summary Module → "Related routes/screens"
- **Current text:**
  ```
  ### Related routes/screens
  - `/reports/audit`
  - `/reports/summary`
  ```
- **Gap:** `/reports/rooms` (`RoomOrdersReportPage.jsx`) is an active routed page in this module. The 2026-05-01 implementation extends it materially (Discount column, derived lodging math, optimistic-Set cleanup). Doc undersells the module surface area.
- **Suggested update text:**
  ```
  ### Related routes/screens
  - `/reports/audit`
  - `/reports/summary`
  - `/reports/rooms`
  ```
- **Reason:** Future agents map requests to this module via this list. Missing route = missed module mapping.
- **Mandatory:** Yes
- **Evidence:** `frontend/src/pages/RoomOrdersReportPage.jsx` is registered in router; touched in this change.

---

### Update U-02 — Reports module "Related APIs" expansion
- **Doc:** `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- **Section:** §10 Reports / Audit / Summary Module → "Related APIs"
- **Current text:**
  ```
  - order logs
  - paid/cancelled/credit/hold reports
  - aggregator reports
  - order detail reports
  - daily sales report
  - running order reconciliation
  ```
- **Gap:** `/get-single-order-new` (room folio detail) and `/get-room-list` (room snapshot) are now consumed by the Reports module via `RoomOrdersReportPage` and `RoomRowCard`. Not listed.
- **Suggested update text:** add at end of list:
  ```
  - room folio detail (`/get-single-order-new` for Room Orders Report)
  - room snapshot (`/get-room-list` for Room Orders Report)
  ```
- **Reason:** Backend ask routing depends on this list. Backend team needs to know which endpoints fund which module.
- **Mandatory:** Yes
- **Evidence:** `reportService.js::getOrderLogsReport` consumes `room_info` + `associated_orders` from `/order-logs-report`; `getSingleOrderRoom` is called by `RoomRowCard` → `/get-single-order-new`.

---

### Update U-03 — Reports module future change rule clarification
- **Doc:** `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- **Section:** §10 Reports / Audit / Summary Module → "Future change rules" + "Open decisions"
- **Current text:**
  ```
  ### Future change rules
  - Changes must identify whether they alter fetching, normalization, business-day policy, or presentation only.
  - Backend APIs own report aggregation in the current baseline; frontend reporting work should remain representation/presentation unless explicit new requirements say otherwise.
  ### Open decisions, if any
  - next report-related agent should highlight and verify any wording that implies frontend aggregation ownership.
  ```
- **Gap:** The 2026-05-01 change *does* introduce frontend derivation (`lodgingCollected = advance + receive_balance` and `discount = max(0, room_price - lodgingCollected)` in `RoomRowCard.numbers`). This is **not** "aggregation across rows" — it is per-row derivation gated by an explicit fallback (`explicitDiscount > 0 ? explicit : derived`). Doc should record this distinction so future agents don't drift further.
- **Suggested update text:**
  ```
  ### Future change rules
  - Changes must identify whether they alter fetching, normalization, business-day policy, or presentation only.
  - Backend APIs own report aggregation in the current baseline; frontend reporting work should remain representation/presentation unless explicit new requirements say otherwise.
  - Per-row derivation from BE-shipped fields is permitted as a TEMPORARY presentation aid (e.g. derived discount = `room_price - advance - receive_balance` on settled rooms) when the explicit BE field is pending, provided the derivation gracefully yields to the explicit field when shipped (`explicitDiscount > 0 ? explicit : derived`). This is NOT a transfer of aggregation ownership.

  ### Open decisions, if any
  - OQ-07 verified during 2026-05-01 reports update — frontend derivation pattern is per-row only; gracefully yields to BE-shipped explicit fields. No promotion to frontend aggregation ownership.
  ```
- **Reason:** Closes OQ-07 status without ambiguity. Without this, the next report-related agent may either over-correct (rip out the derivation) or over-extend (add row-spanning aggregation under the same precedent).
- **Mandatory:** Yes
- **Evidence:**
  - `frontend/src/components/reports/RoomRowCard.jsx` — `numbers` memo, `explicitDiscount > 0 ? explicit : derived`
  - `frontend/src/api/services/reportService.js` — `[BE-2 INVARIANT]` log only fires when explicit field absent

---

### Update U-04 — OQ-07 status update
- **Doc:** `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- **Section:** OQ-07 (line 119+)
- **Current status (relevant excerpt, L129):**
  ```
  Conflict note, if any: Owner clarified that aggregation ownership belongs to backend APIs; frontend responsibility is representation/presentation. Any doc wording implying frontend aggregation ownership should be highlighted and verified during the next report-related change.
  ```
- **Gap:** The 2026-05-01 reports update IS the "next report-related change". OQ-07 should record verification + outcome.
- **Suggested update text (add to OQ-07 entry):**
  ```
  - **Verification status:** Verified during 2026-05-01 reports update.
  - **Verification outcome:** No frontend aggregation across rows. Per-row derivation introduced for BE-2 pending fields (`discount = max(0, room_price - advance - receive_balance)` on settled rooms) — gracefully yields to BE-shipped explicit `discount_amount` when present. Documented in `MODULE_DECISIONS_FINAL.md §10 Future change rules`.
  - **Closed:** Yes (with the per-row-derivation note above).
  ```
- **Reason:** Removes OQ-07 from the "still pending" register cleanly while documenting the precedent.
- **Mandatory:** Yes
- **Evidence:** Same as U-03.

---

### Update U-05 — OQ-12 partial closure
- **Doc:** `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- **Section:** OQ-12 (line 199+)
- **Current status (relevant excerpt):**
  ```
  Conflict note, if any: Owner chose to defer this until the next room billing / room print related change.
  What future agents should do: Preserve current room billing/print behavior for now. Revisit and verify this area during the next room billing / room print related change.
  ```
- **Gap:** The 2026-05-01 update IS that "next room billing / room print related change". Two specific behaviours codified:
  1. Room print payload (`/order-temp-store`) now excludes cancelled items (item-level `food_status === 3 || cancel_at != null || cancel_type != null`).
  2. Room math switched to derived `lodgingCollected = advance + receive_balance`; `balance_payment` ignored when `f_order_status === 6` (CR-004 Rule 2).
- **Suggested update text (add to OQ-12 entry):**
  ```
  - **Verification status:** Partially closed during 2026-05-01 reports update.
  - **Verification outcome:**
    - Room print: `/order-temp-store` payload now excludes cancelled items (any of `food_status === 3`, `cancel_at != null`, `cancel_type != null`). Aggregation/totals also exclude cancelled items in the default branch; CollectPaymentPanel override path unchanged.
    - Room billing math: derived `lodgingCollected = advance_payment + receive_balance` on settled rooms (`f_order_status === 6` AND `room_info.payment_status === 'paid'`). `balance_payment` ignored when settled (CR-004 Rule 2 — locked with owner 2026-04-29).
  - **Remaining deferred items:** explicit `discount_amount` / `discount_reason` on `room_info` (backend ask filed). Until shipped, frontend uses derived discount per U-03/U-04. Once shipped, derivation auto-yields.
  - **Closed:** Partial (room print + lodging math); explicit-discount path remains pending backend.
  ```
- **Reason:** Owner deferred OQ-12 specifically until the next change in this surface — that change has happened. Status MUST be updated for accurate future-agent guidance.
- **Mandatory:** Yes
- **Evidence:**
  - `frontend/src/api/transforms/orderTransform.js` `buildBillPrintPayload` — `isDetailCancelled` predicate L1110-1118
  - `frontend/src/components/reports/RoomRowCard.jsx::numbers` — derived math
  - Code comments at `RoomRowCard.jsx:340-399` cite CR-004 Rule 2

---

### Update U-06 — Printing module impact-areas list
- **Doc:** `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- **Section:** §14 Printing / Bill / KOT Module → "Common bug/change impact areas"
- **Current text:**
  ```
  ### Common bug/change impact areas
  - bill values drifting from payment screen
  - room print semantics
  - delivery address print data
  - prepaid/postpaid auto-print differences
  ```
- **Gap:** Cancelled-item exclusion from bill print payload is now a codified rule. Future bug reports about "printed receipt shows cancelled item" should map directly here.
- **Suggested update text:** add as new bullet:
  ```
  - cancelled-item exclusion from `/order-temp-store` payload (item-level `food_status === 3` / `cancel_at != null` / `cancel_type != null`)
  ```
- **Reason:** Pattern recognition for future bug reports.
- **Mandatory:** No (recommended, not strictly required)
- **Evidence:** `orderTransform.js:1110-1118`.

---

### Update U-07 — FINAL_DOCS_SUMMARY deferred-items list
- **Doc:** `/app/memory/final/FINAL_DOCS_SUMMARY.md`
- **Section:** "Deferred or verification-sensitive items" (L57)
- **Current text:**
  ```
  ## Deferred or verification-sensitive items
  - report wording implying frontend aggregation ownership should be highlighted and verified during the next report-related work
  - room billing/print lifecycle ownership is deferred until the next room billing / room print related change
  ```
- **Gap:** Both items addressed during 2026-05-01 reports update. Summary should reflect closure status.
- **Suggested update text:**
  ```
  ## Deferred or verification-sensitive items
  - report wording implying frontend aggregation ownership — VERIFIED 2026-05-01 (OQ-07): no frontend aggregation across rows; per-row derivation only, gracefully yields to BE-shipped explicit fields.
  - room billing/print lifecycle ownership — PARTIALLY CLOSED 2026-05-01 (OQ-12): cancelled-item exclusion from bill print + derived lodging math both codified. Explicit `discount_amount` / `discount_reason` remain backend-pending.
  ```
- **Reason:** Keeps summary in sync with detailed status updates in U-04 and U-05.
- **Mandatory:** Yes (consistency with OQ register)
- **Evidence:** Same as U-03 / U-04 / U-05.

---

### Update U-08 — FINAL_DOCS_APPROVAL_STATUS open decisions register
- **Doc:** `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- **Section:** §5 Open decisions register (OD-01, OD-02)
- **Current text (relevant lines L78-93):** OD-01 still says "may still need to be highlighted and verified during future report-related work"; OD-02 still says "intentionally deferred until the next room billing / room print related change".
- **Gap:** Both decisions touched / closed during 2026-05-01.
- **Suggested update text:** add at end of OD-01 / OD-02 entries:
  ```
  - **Status as of 2026-05-01:** Verified / partially closed during reports update — see OQ-07 / OQ-12 entries in `OPEN_QUESTIONS_FINAL_RESOLUTION.md` for outcome.
  ```
  Optionally update §5 "Closed vs partially closed summary":
  ```
  - **Fully closed in current final docs:** OQ-01, OQ-02, OQ-03, OQ-04, OQ-05, OQ-06, OQ-07, OQ-08, OQ-09, OQ-10, OQ-11
  - **Partially closed (verification done):** OQ-12 (room print + lodging math closed; explicit discount field remains BE-pending)
  - **Still deferred:** none new
  ```
- **Reason:** Approval-status doc is the entry point for future agents; must reflect closure cycle.
- **Mandatory:** Yes
- **Evidence:** Same as U-04 / U-05.

---

## 4. Updates NOT required
The following final docs were inspected and require no change:
- `IMPLEMENTATION_AGENT_RULES.md` — high-risk file list already includes `reportService.js`, `orderTransform.js`. No new high-risk surface introduced.
- `CHANGE_REQUEST_PLAYBOOK.md` — workflow correctly mappable to this change; no policy gap.
- `ARCHITECTURE_DECISIONS_FINAL.md` Rule MC-06 — implementation respects the rule (per-row derivation with BE precedence). Rule wording adequate.
- `BUG_TEMPLATE.md` — explicitly out-of-scope per `FINAL_DOCS_APPROVAL_STATUS.md §3.7`.

---

## 5. Suggested execution order
1. Apply U-01 + U-02 + U-03 + U-06 to `MODULE_DECISIONS_FINAL.md` (single PR — same file).
2. Apply U-04 + U-05 to `OPEN_QUESTIONS_FINAL_RESOLUTION.md` (single PR — same file).
3. Apply U-07 to `FINAL_DOCS_SUMMARY.md`.
4. Apply U-08 to `FINAL_DOCS_APPROVAL_STATUS.md`.

Each update is purely textual / additive. No content removal. No conflicting-information risk.

---

## 6. Verification after doc updates
- [ ] Future-agent reading order in `FINAL_DOCS_APPROVAL_STATUS.md §4` still works — no doc renamed or moved.
- [ ] OQ-07 / OQ-12 entries readable in isolation (each carries its own outcome line).
- [ ] `MODULE_DECISIONS_FINAL.md §10` route list now includes `/reports/rooms`.
- [ ] `MODULE_DECISIONS_FINAL.md §14` impact-areas list now includes cancelled-item exclusion.
- [ ] `FINAL_DOCS_SUMMARY.md` deferred-items list reflects 2026-05-01 outcomes.

---

## 7. QA evidence / code references

| Update | Code reference |
|---|---|
| U-01 | `frontend/src/pages/RoomOrdersReportPage.jsx` (entire file — extensively touched) |
| U-02 | `reportService.js::getOrderLogsReport` (consumes `room_info` + `associated_orders` from `/order-logs-report` wrapper); `RoomRowCard.jsx` (consumes `getSingleOrderRoom`) |
| U-03 | `RoomRowCard.jsx::numbers` memo — `lodgingCollected = advance + receiveBalance`, `discount = explicitDiscount > 0 ? explicit : derived` |
| U-04 | Same as U-03 |
| U-05 | `orderTransform.js:1110-1118` `isDetailCancelled` predicate; `RoomRowCard.jsx:340-399` derived math |
| U-06 | `orderTransform.js:1110-1145` (predicate + `[BILL-PRINT]` log) |
| U-07 | Composite of U-03 / U-04 / U-05 evidence |
| U-08 | Composite of U-04 / U-05 evidence |

---

**End of doc-update handover.**
