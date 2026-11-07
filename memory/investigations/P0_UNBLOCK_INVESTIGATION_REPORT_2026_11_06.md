# Investigation Report — P0 Unblocking via Backend Handover Documents (6 Nov 2026)

**Role:** INVESTIGATION (per AGENT_PROMPT_ALPHA §Role 6)
**Date:** 2026-11-06
**Source Documents:**
1. `frontend-handover-printing.md` (6 Nov 2026) — Print APIs + `bill_print`/`kot_print` fields
2. `frontend-handover-settings-and-role-modules.md` (6 Nov 2026) — `reconcile_amount`, `received_amount`, `order_edit_access`, `show_daily_report`
3. `BUG-483-frontend-handover-received-amount.md` (6 Nov 2026) — Detailed received-amount API contract

**Steps Used:** 8/10

---

## 1. Summary

Three backend handover documents collectively deliver fields, settings, and permission keys that **fully unblock 5 P0 items** previously stuck at BACKEND_BLOCKED or GATE_1_INTAKE_FROZEN.

| # | Item | Was | Now | Unblocked By |
|---|------|-----|-----|-------------|
| 1 | **BUG-583** | BACKEND_BLOCKED | **READY FOR GATE 2** | Printing handover: `bill_print` in orders-list + socket |
| 2 | **CR-483** | BACKEND_BLOCKED | **READY FOR GATE 2** | Settings + Received-Amount handovers: `received_amount` + `reconcile_amount` |
| 3 | **CR-484** | BACKEND_BLOCKED | **READY FOR GATE 2** | Subsumed into CR-483 (owner round 5) — follows CR-483 |
| 4 | **CR-489** | BACKEND_BLOCKED (×2 deps) | **READY FOR GATE 2** | Printing: `bill_print` + Settings: `order_edit_access` setting & permission |
| 5 | **CR-490** | BACKEND_BLOCKED | **READY FOR GATE 2** | Settings handover: `show_daily_report` permission key |

Remaining P0 items (10) are **NOT affected** by these handovers.

---

## 2. Detailed Analysis Per Item

### 2A. BUG-583 — Bill printed → green border on cards

| Blocker | Resolution |
|---------|-----------|
| `print_bill_status` not confirmed in `employee-orders-list` | **RESOLVED.** Printing handover §"Displaying bill/KOT print status" confirms `bill_print` (Yes/No) in V1 + V2 `employee-orders-list` AND socket payload. |

**Key warning from handover:** `print_bill_status` is a SEPARATE legacy field, NOT synchronized by new APIs. FE must adapt `orderTransform.js:310` from `api.print_bill_status` to `api.bill_print`.

**FE change scope:** 1 transform line + 2 card files (OrderCard.jsx R5 + TableCard.jsx) for green border override.
**Planning skip eligible:** NO — OrderCard.jsx is R5 hotspot.
**Classification:** FE_FIX
**Confidence:** HIGH — UAT verified on restaurant 478, 15 live checks passed.

---

### 2B. CR-483 — Received Amount field on all payment methods

| Blocker (from intake round 5) | Resolution |
|-------------------------------|-----------|
| Backend `received_amount` in collect-payment payload | **RESOLVED.** Handover §4: `received_amount` accepted in both `place-order` and `order-bill-payment` payloads. |
| Reconciliation calc | **PARTIALLY RESOLVED.** Backend stores `received_amount` per order. `reconciliation_amount` (= received − bill) is NOT a separate stored field — FE computes the difference. |
| 2 Order Report columns | **RESOLVED.** All 3 report APIs return `received_amount` + `reconcile_amount` per order row. |
| `reconcile_amount` restaurant setting | **RESOLVED.** Read via `settings-list`, write via `update-settings`. Yes/No toggle. |

**Open question:** The intake specifies "± limit set in restaurant settings — default 3%". The handover provides only a Yes/No toggle (`reconcile_amount`), not a percentage-limit setting. The ± 3% cap may need to be enforced FE-side or requested as a separate backend setting. This does NOT block Gate 2 — it's a planning question.

**Save rules (from handover):**

| Setting | Key supplied | Saved `orders.received_amount` |
|---------|-------------|-------------------------------|
| Yes | Numeric | Supplied value (2 decimals) |
| Yes | Omitted | Final order amount |
| No | Any | Final order amount |

**FE change scope:** CollectPaymentPanel.jsx (R5 hotspot) + orderTransform.js (R5) + report pages + Settings page.
**Planning skip eligible:** NO — CRITICAL risk, R5 hotspots, financial.
**Classification:** FE_FIX (major feature, full gate cycle)
**Confidence:** HIGH — 6 UAT test cases verified (prepaid lower/omitted/zero/disabled, collection higher/omitted).

---

### 2C. CR-484 — Card payments bank charges (MDR)

**Status:** SUBSUMED into CR-483 (owner 2026-11-05, OD-483-09 LOCKED).
CR-483's single "Received Amount" field on ALL payment methods (including Card) covers CR-484's use case. No separate implementation needed.

**Verdict:** Follows CR-483. No additional backend dependency.

---

### 2D. CR-489 — Lock order editing after bill print

CR-489 had **two** backend blockers. Both are now resolved:

| Blocker | Resolution | Source |
|---------|-----------|--------|
| OD-489-05: BUG-583 `print_bill_status` in orders list | **RESOLVED.** Use `bill_print` (Yes/No) from `employee-orders-list` + socket. | Printing handover |
| OD-489-03: Permission key name (e.g. `edit_after_bill_print`) | **RESOLVED.** Backend delivered `order_edit_access` as: (1) restaurant setting `basic.order_edit_access` (Yes/No), (2) role permission `role_pass_value: "order_edit_access"` (UAT module ID 104). | Settings handover §1, §2, §6 |

**Critical note from handover:** "The changes expose/store these values; they do not introduce a backend authorization check in order-edit endpoints. Product rules for combining the restaurant flag and employee permission must be reflected explicitly in the frontend."

**CR-489 FE logic (all data now available):**
1. Read `restaurant.settings.order_edit_access` (Yes/No) — restaurant toggle
2. Read `order_edit_access` in employee's role `modules[]` — user has permission?
3. Read `order.bill_print === 'Yes'` — bill printed?
4. IF setting=Yes AND bill_printed AND user lacks permission → block all order operations except Collect Payment

**FE change scope:** OrderEntry.jsx (R5) + OrderCard/TableCard edit entry points + Settings toggle + profileTransform.js.
**Planning skip eligible:** NO — CRITICAL risk, permissions, R5 hotspot.
**Classification:** FE_FIX (full gate cycle)
**Confidence:** HIGH — both fields UAT-verified.

---

### 2E. CR-490 — Report permission split (Daily Report only)

| Blocker | Resolution |
|---------|-----------|
| OD-490-04: Backend must add permission key to role matrix | **RESOLVED.** Backend delivered `show_daily_report` (key: `show_daily_report`, UAT module ID 106, group: `frontend`). |

**From handover §6:** "show_daily_report is an employee-role permission for showing the Daily Report feature. It is not a new restaurant-settings column or an order payload key. The frontend should read the permission from the assigned role's modules array and apply the intended Daily Report visibility rule."

**CR-490 FE logic:**
1. Read `show_daily_report` in employee's role `modules[]`
2. IF present AND user does NOT have `report` permission → show only Daily Report in sidebar + guard routes
3. IF user has both `report` AND `show_daily_report` → full access (no change)

**FE change scope:** Sidebar.jsx (menu filter) + App.js route guards + profileTransform.js (map new permission).
**Planning skip eligible:** NO — HIGH risk, permissions.
**Classification:** FE_FIX (full gate cycle)
**Confidence:** HIGH — module visible in UAT module-list API.

---

## 3. Items NOT Affected (Still Blocked)

| ID | Title | Why still blocked |
|---|---|---|
| BUG-123 | 401 redirect | Owner decisions Q-123-1..4 pending |
| BUG-192 | KOT timestamps | `ready_at`/`serve_at` not in any handover |
| BUG-475 | Auto-settlement config | Backend config not in any handover |
| BUG-532 | (P2→P0) | Awaiting Gate 4 GO |
| BUG-646 | Inclusive tax double-count | Tax calc — not printing/settings related |
| BUG-647 | GST OFF payload sends tax | Tax payload — not printing/settings related |
| CR-470 | Payment config defaults | New-restaurant defaults — not in handovers |
| CR-486 | Multiple counter logins | Concurrent sessions — not in handovers |
| CR-487 | Discount % on printed bill | Printer Agent team — bill content formatting |
| CR-482 P11-P26 | Keyboard nav remaining | In progress — not backend-blocked |

---

## 4. Retroactive Candidates

- **BUG-583:** `orderTransform.js:310` already maps `billPrinted: api.print_bill_status === 'Yes'`. Code EXISTS but reads wrong field. Not a retroactive closure — it's a field-name fix + visual implementation still needed.
- No other retroactive closure candidates found.

---

## 5. Recommendations

### Immediate (Gate 2 GO candidates — all backend blockers resolved):

| Priority | Item | Next Gate | Risk |
|----------|------|-----------|------|
| 1 | **BUG-583** | Gate 2 Impact Analysis | LOW-MEDIUM |
| 2 | **CR-489** | Gate 2 Impact Analysis | CRITICAL |
| 3 | **CR-483** (+CR-484) | Gate 2 Impact Analysis | CRITICAL |
| 4 | **CR-490** | Gate 2 Impact Analysis | HIGH |

Recommended execution order: BUG-583 first (simplest, unblocks CR-489 visual dependency), then CR-489 (leverages BUG-583 + new permission), then CR-483 (largest scope), then CR-490.

### Registry updates needed:
- BUG-583: `BACKEND_BLOCKED` → `GATE_2_READY` + note: "bill_print field confirmed in orders-list + socket (printing handover 6 Nov 2026)"
- CR-483: add note: "received_amount backend fields delivered (settings + received-amount handovers 6 Nov 2026). ± 3% limit setting TBD at Gate 2."
- CR-484: no change (already SUBSUMED)
- CR-489: close OD-489-03 (`order_edit_access`), close OD-489-05 (use `bill_print`), update status
- CR-490: close OD-490-04 (`show_daily_report`), update status

### No code edits in this investigation. All items proceed through full gate cycle.

---

## 6. Evidence Artifacts

- Printing handover: `frontend-handover-printing.md`
- Settings + role modules handover: `frontend-handover-settings-and-role-modules.md`
- Received amount handover: `BUG-483-frontend-handover-received-amount.md`
- CR-483 intake: `change_requests/CR-483_SHORT_PAYMENT_SETTLEMENT_INTAKE.md`
- CR-489 intake: `change_requests/CR-489_EDIT_AFTER_BILL_PRINT_PERMISSION_INTAKE.md`
- CR-490 intake: `change_requests/CR-490_DAILY_REPORT_ONLY_PERMISSION_INTAKE.md`
- BUG-583 intake: `change_requests/BUG_583_BILL_CONFIG_CARD_COLOR_LOGIC_INTAKE.md`
- FE code trace: `orderTransform.js:310` (`billPrinted: api.print_bill_status === 'Yes'`)

---

**Handover:**
"Root cause of all 5 blocks: backend fields/permissions not yet shipped. Confidence: HIGH — all fields UAT-verified on restaurant 478 (6 Nov 2026). Steps: 8/10. FE fix: YES for all 5 items. Backend ask: NONE remaining. Planning skip eligible: NO (all items are R5 hotspots or CRITICAL risk). Retroactive candidates: none. Investigation report at `/app/memory/P0_UNBLOCK_INVESTIGATION_REPORT_2026_11_06.md`."
