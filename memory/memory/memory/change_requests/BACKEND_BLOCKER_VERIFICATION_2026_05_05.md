# Backend Blocker Verification — 2026-05-05

**Type:** Read-only backend-evidence audit. NO code, NO QA, NO tracker write, NO `/app/memory/final/` edit, NO unparking.
**Agent:** Backend Blocker Verification Agent
**Date:** 2026-05-05
**Branch:** `6-may` (cloned to `/app` this session; functionally equivalent to `5may` HEAD `5b85c2c` for FE source-of-truth purposes)
**Scope:** Verify whether backend has shipped the fields / endpoints / template support required for currently parked backend-blocked CRs and CR-013 print-template asks.

---

## 1. Executive summary

> **Verdict: `no_unpark_today`** — Zero backend items can be safely unparked.

- **Backend source is NOT readable in this workspace.** `/app/backend/server.py` (89 lines) is a default FastAPI `StatusCheck` scaffold; the real Mygenie POS backend lives at `https://preprod.mygenie.online/` and is not accessible for code inspection here. **All "backend present?" assertions are inferred from FE response transforms + preprod wire echoes captured in existing QA reports — never from backend source.**
- **Wire-observable evidence shows:**
  - Backend ECHOES `total_service_tax_amount` (CR-013 D-GST-3 dependency) — observed live across 5 Bean Me Up orders in QA report §5.1.
  - Backend ECHOES `tip_tax_amount` — observed live (always `0` in cited cohort because no order had tip > 0).
  - Backend does **NOT** echo `delivery_charge_gst_amount` anywhere — confirms BE-G9 unshipped.
  - No backend evidence on `cgst_amount` / `sgst_amount` rendering on print template — receipt observation in print double-count handover §3 strongly indicates backend IGNORES them today (BE-G10/G11 unshipped).
  - Bean Me Up backend print double-count is REPRODUCED on disk at order #2 (`order_amount=748` matches `subtotal + (gst_tax − service_gst_tax_amount)`); **NOT fixed**.
- **All 14 backend asks remain `parked_backend_dependency`** (9 original BE items + 5 CR-013-Phase-3 BE-G items). Three (BE-G7, BE-G8, BE-G10/G11 set, Bean Me Up) are owner-decision-pending (Options A/B/C/D) on top of being backend-blocked.
- **One pre-existing exception:** the FE invariant block at `reportService.js:541-633` proves several BE-1 sub-fields ALREADY ship on the live wire (`waiter_name`, `cancellation_reason`, `cancel_type`, `table_name`, `room_info`, `associated_orders`, `receive_balance`). These are in the regression-detector half of the gap-list. The pending half (`pending_collect_by_name`, `pending_cancel_by_name`, `pending_merge_by_name`, `pending_room_info_discount`) remains MISSING. **BE-1 is therefore PARTIAL — not fully shipped, but more advanced than the parked register suggests.**

---

## 2. Files / docs inspected (read-only)

### 2.1 Required-read source-of-truth

| File | Read |
|---|---|
| `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | ✅ |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | ✅ (already read in prior thread context) |
| `/app/memory/change_requests/CR_013_STATUS_AUDIT_2026_05_05.md` | ✅ |
| `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` | ✅ |
| `/app/memory/change_requests/phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` | ✅ |
| `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` | ✅ |
| `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` | ✅ |
| `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` | ✅ |
| `/app/memory/final/*` | NOT opened — out of strict scope; baseline-anchored claims rely on cross-references |

### 2.2 Backend evidence sources actually available

| Source | What it can prove | Limitation |
|---|---|---|
| `/app/backend/server.py` | Backend is NOT this scaffold (only `StatusCheck` endpoints). | Real backend not in workspace. |
| Preprod profile/order-list responses captured in QA report §5.1 + §2.1 | Field presence on live wire (Bean Me Up 742, Palm House 541, 18march 478) — for `service_charge_tax`, `deliver_charge_gst`, `total_service_tax_amount`, `tip_tax_amount`, `tip_amount`, `delivery_charge`, `order_amount`. | Snapshot only; no SQL schema visibility. |
| `/app/frontend/src/api/transforms/orderTransform.js` (parser side) | Which keys FE EXPECTS to receive (proves backend echoes them when the FE field reads non-zero — e.g. `total_service_tax_amount` at L187, `tip_tax_amount` at L189). | Does not prove negative — a key being parsed says nothing about whether backend always populates it. |
| `/app/frontend/src/api/services/reportService.js` `[BE-1 INVARIANT]` block (L541-633) | Live-wire gap detector built into FE — distinguishes "shipped" (regression detectors) from "still missing" (`pending_*`). Most rigorous evidence we have. | Only fires in `NODE_ENV === 'development'` — production hides the warnings. |
| `/app/frontend/src/components/reports/OrderTable.jsx` L100-119, L535-545 | `pgStatus` column auto-reveal (`anyPgStatusReady = orders.some(o => o.pgStatus != null)`) — proves backend has NOT started populating `snapshot_razorpay_status` on the live wire (column would self-reveal otherwise). | Indirect. |
| Print double-count handover §3.2-3.5 (Bean Me Up Order #2) | Exact reverse-engineered backend formulas observable on a printed receipt: display `CGST = SGST = (gst_tax − service_gst_tax_amount)/2 + service_gst_tax_amount`, total `payment = subtotal + (gst_tax − service_gst_tax_amount)`. | Inferred from one observed receipt; backend source unconfirmed. |

### 2.3 Files explicitly NOT inspected
- Backend source (not in workspace)
- Backend route/controller/model/template files (not in workspace)
- `/app/memory/final/*` (strict-rule)

---

## 3. Backend verification table — all 14 backend asks + 6 parked-CR dependencies

> Legend: `present` = on-wire evidence proves it · `missing` = on-wire evidence proves absence · `partial` = partly shipped · `unknown` = no evidence reachable from this workspace

| Backend ID | Required field / endpoint / template support | Evidence location | Present? | Notes |
|---|---|---|---|---|
| **BE-G7** (CR-013) | Backend `payment_amount` formula on `BILL_PAYMENT` paid orders — does it subtract `service_gst_tax_amount` from `gst_tax`? | Print double-count handover §3.4 receipt decode: `748 = 715 + (44.20 − 11.70)` | **Bug present (formula is asymmetric)** | Inferred from one receipt — `backend_unknown_needs_backend_confirmation` for direct source proof. Behaviour proves the bug exists but does not prove the FORMULA is exactly that one. |
| **BE-G8** (CR-013) | Same formula check for `tip_tax_amount` | Untested — no tipped order printed in cited cohort | **`unknown`** | Symmetric exposure to BE-G7 by template logic shape. `backend_unknown_needs_backend_confirmation`. |
| **BE-G9** (CR-013) | Persist `delivery_charge_gst_amount` column + socket echo | Grep across `/app/memory/change_requests/` + `/app/frontend/src` — **zero hits** for `delivery_charge_gst_amount` outside Phase 3 CR planning notes; `orderTransform.fromAPI.order` (L184-189) has NO parser for the key | **Missing** | Owner promise on disk: "delivery_charge_gst_amount will get added by backend in socket" (`CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md` L207). Not yet shipped. |
| **BE-G10** (CR-013) | `order-temp-store` print template auto-renders FE-supplied `cgst_amount` / `sgst_amount` | Print double-count handover §3.3: receipt CGST = SGST = ₹27.95, FE-supplied `cgst_amount` = `sgst_amount` = ₹22.10 — **values do not match** | **Missing** (template ignores FE-supplied halves) | Inferred from one receipt. `backend_unknown_needs_backend_confirmation` for confirmation. |
| **BE-G11** (CR-013) | Per-component template slots (CGST/SGST on SC / Tip / Delivery) | No evidence of new template slots; print payload still emits only composite halves; `CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` is still in `phase_3/` (not implementation summaries) | **Missing** | `backend_unknown_needs_backend_confirmation`. |
| **Bean Me Up double-count** (CR-013) | Does backend still over-display CGST/SGST and under-total `payment_amount` on dineIn orders with non-zero `service_gst_tax_amount`? | Handover §1.5 captures live receipt observation 2026-05-05; QA report §5.1 wire echo confirms `total_service_tax_amount=65.00` on Order #2 — i.e., D-GST-3 still in effect on that order, so the asymmetry would still trigger | **Still present** (no fix doc on disk) | Owner Options A/B/C/D not yet chosen → no FE rollback shipped → bug observable on every dineIn-with-SC bill until either FE rolls back D-GST-3 or backend fixes BE-G7/G8/G10/G11. |
| **BE-1** (P1–P6 + G1) | `waiter_name`, `*_by_id/name`, `cancel_reason`, `cancel_type`, `table_no/name`, `room_info`, `transferToRoom` settlement signal | `reportService.js:548-575` invariant block — `waiter_name` / `cancellation_reason` / `cancel_type` / `table_name` / `room_info` / `associated_orders` / `receive_balance` are in the **regression-detector** half (FE warns ONLY if these stop showing up — i.e., they ARE shipping). `pending_collect_by_name` / `pending_cancel_by_name` / `pending_merge_by_name` / `pending_room_info_discount` remain in the **still-missing** half. G3 (`order_status` on `associated_orders[i]`) explicitly marked RESOLVED 2026-05-01 in code comment L620-624. | **Partial** | Pending register classifies BE-1 as fully parked; live FE invariants prove ~70% of BE-1 sub-fields are ALREADY shipping. The remaining `pending_*` keys gate full unparking. |
| **BE-2** | Lodging payment breakdown — `room_info.discount_amount` / `discount_reason` etc. | `reportService.js:596-598` flags `pending_room_info_discount` when `room_info.discount_amount == null` on settled paid rooms. Derived-math invariant at L605-619 (price − advance − receive_balance − explicit) would not exist if explicit `discount_amount` were already populated. | **Missing** for `discount_amount` / `discount_reason`; **Present** for `room_info.advance_payment` / `balance_payment` / `receive_balance` / `payment_status` / `room_no` (parsed at `orderTransform.js:300-323`). | Partial — the math-derivable subset works; the explicit discount column not yet populated. |
| **BE-T** | CR-004 P2 dependencies (G2/G3/OPT) | No evidence in workspace of G2/G3/OPT-specific endpoints or fields. CR-004 doc cross-references list them as parked. | **`unknown`** → tracker says `missing`. | `backend_unknown_needs_backend_confirmation`. |
| **BE-U** | CR-005 Phase A web-order attribution | No evidence of attribution fields in FE transforms beyond what already exists. | **`unknown`** → tracker says `missing`. | `backend_unknown_needs_backend_confirmation`. |
| **BE-V** | Item-level authoritative `cancel_by_name` (gates B3) | `reportTransform.js:625-626` fallback `Employee #<cancel_by>` still in code → backend has not delivered the canonical name. Order-level fallback at `:235` reads `api.cancel_by_name`, item-level path still uses ID fallback. | **Missing** at item-level. | Order-level field exists; item-level does not. BE-V is the item-level ask only. |
| **BE-W** | Per-item paid-stage fields | No evidence in FE consumers; tracker says missing. | **`unknown`** → tracker says `missing`. | `backend_unknown_needs_backend_confirmation`. |
| **BE-W2** | `snapshot_razorpay_status` (gates B2 Phase 2) | `OrderTable.jsx:110` — `anyPgStatusReady = orders.some(o => o.pgStatus != null)`. Comment block L535-541: "Dormant until backend ships BE-W2". Today the comment says the column self-hides — implying no row currently carries `pgStatus`. | **Missing** (not on wire today) | The FE auto-reveal will activate the column instantly the moment BE ships — confirming there is no fix-up FE work needed beyond unparking B2 Phase 2 once observed live. |
| **BE-A** | PG scan / Serve / paymentType case mismatch (gates CR-011) | No evidence of canonicalised case handling in backend wire data. | **`unknown`** → tracker says `missing`. | `backend_unknown_needs_backend_confirmation`. |
| **BE-F** | Server-side `default_landing_screen` setting (gates CR-008 #4 Phase B) | `/app/frontend/src/utils/orderEntryPrefs.js` is purely localStorage-only (key `mygenie_stay_on_order_after_bill`). No backend setting wire-up exists. Phase A explicitly flagged as device-local only. | **Missing** (no server-side persistence) | Tracker confirms parked. |
| **CR-008 Sub-CR #3** dependency | New delivery dispatch / assign endpoints | No FE consumer wired for new endpoints; CR doc is still a stub. | **Missing** | Backend roadmap item; needs both backend AND owner prioritisation. |
| **CR-008 #4 Phase B** dependency | Same as BE-F | See BE-F | **Missing** | Strictly tied to BE-F. |
| **B2 Phase 2** dependency | Same as BE-W2 | See BE-W2 | **Missing** | Strictly tied to BE-W2. |
| **B3** dependency | Same as BE-V | See BE-V | **Missing** | Strictly tied to BE-V. |
| **CR-009** dependency | New "Operations Audit Timeline" backend (heavy) | No CR planning doc beyond stub; no backend evidence. | **Missing** | Backend-heavy + owner prioritisation needed. |
| **CR-011** dependency | Same as BE-A | See BE-A | **Missing** | Strictly tied to BE-A. |

---

## 4. CR-013 print / backend verification (focused)

### 4.1 Direct answers to the required CR-013 questions

| Question | Answer | Evidence |
|---|---|---|
| Does backend now expose / persist `delivery_charge_gst_amount`? | **NO.** No FE parser exists; no doc on disk shows backend has shipped it. Owner has stated backend will add it in socket — no shipment doc found. | `orderTransform.fromAPI.order` (L184-189) has no parser; grep across `/app/memory/change_requests/` shows the key only in PLANNING / PARKED docs. |
| Does backend template read `cgst_amount` / `sgst_amount`? | **NO** (with one receipt's worth of evidence). Receipt CGST/SGST = ₹27.95 each; FE-supplied `cgst_amount` = `sgst_amount` = ₹22.10. If template were reading FE values, receipt would print ₹22.10. | Print double-count handover §3.3-3.4 (Bean Me Up Order #2 receipt). |
| Does backend template read STORED `service_gst_tax_amount` / `tip_tax_amount`? | **YES (inferred for SC GST).** Display CGST/SGST formula `(gst_tax − service_gst_tax_amount)/2 + service_gst_tax_amount` exactly matches receipt. Total formula `subtotal + (gst_tax − service_gst_tax_amount)` exactly matches `payment_amount = 748`. **Tip GST: untested** — no tipped order in cohort. | Same handover §3.4. |
| Is Bean Me Up double-count still present, fixed, or unknown? | **Still present.** No fix shipped on FE side (Options A/B/C/D not chosen) and no fix shipped on BE side (BE-G7/G8/G10/G11 still parked). Reproducible the moment any dineIn order with `service_charge_tax > 0` is printed on Bean Me Up post-Phase-1.5. | Cross-reference of QA report §9 ("FE math + FE payload are CORRECT on the wire"; backend asymmetry in template) + handover §1.5/§3 + zero "Option B/C shipped" / "BE fix shipped" doc on disk + `orderTransform.js:1128-1130` still emits real values. |
| What exact backend confirmation is still needed? | See §4.2. | — |

### 4.2 Specific backend confirmations still needed

| ID | Confirmation needed |
|---|---|
| BE-G7 | Confirm exact formula used for printed Total / `payment_amount` on `order-temp-store` for `BILL_PAYMENT`-paid orders. Is it `(a)` `payment_amount` from print payload, `(b)` `subtotal + (gst_tax − service_gst_tax_amount)` from stored order, or `(c)` something else? |
| BE-G8 | Same question, for `tip_tax_amount`. Does Total formula also subtract it? Does display CGST/SGST also add the FULL `tip_tax_amount` to each side? |
| BE-G9 | Confirm whether `delivery_charge_gst_amount` column has been added (schema) + whether socket echoes it. Confirm FE can start sending the key forward-compatibly. |
| BE-G10 | Confirm whether `order-temp-store` template auto-renders ANY tax field present in the payload (e.g., `cgst_amount`, `sgst_amount`) or is hardcoded to read only specific keys. |
| BE-G11 | If hardcoded, confirm timeline + slot names for per-component tax line rendering (`cgst_on_sc_amount`, `sgst_on_sc_amount`, `cgst_on_tip_amount`, `sgst_on_tip_amount`, `cgst_on_delivery_amount`, `sgst_on_delivery_amount`). |
| Bean Me Up | Confirm whether the asymmetric formula has been patched on backend after Phase 1.5 (post-2026-05-05). If not, owner Options A/B/C/D selection on FE side is the only mitigation path. |
| BE-1 (`pending_*`) | Confirm timeline for `collect_by_name` (paid), `cancel_by_name` (order-level), `merge_by_name`, `room_info.discount_amount` / `discount_reason`. The other 7 P-fields are confirmed shipping per FE invariants. |

---

## 5. Original BE-* verification summary

| ID | Status | Backend ship evidence | FE auto-consume on ship? |
|---|---|---|---|
| **BE-1** | **Partial — most P-fields shipping; some `pending_*` still missing** | FE `[BE-1 INVARIANT]` block proves shipped subset; BE-1 G3 explicitly marked RESOLVED 2026-05-01 | Yes — invariant block flips from `[BE-1 PENDING]` to silent the moment BE ships missing keys |
| **BE-2** | **Partial — `room_info` core fields shipping; `discount_amount` / `discount_reason` missing** | `[BE-2 INVARIANT]` block at `reportService.js:600-619` (mathematical reconciliation derives implicit discount until explicit ships) | Yes — same auto-reveal pattern |
| **BE-T** | `backend_unknown_needs_backend_confirmation` | None on disk | n/a |
| **BE-U** | `backend_unknown_needs_backend_confirmation` | None on disk | n/a |
| **BE-V** | **Missing at item-level** | `reportTransform.js:625-626` still uses `Employee #<cancel_by>` fallback | Yes — replace fallback with authoritative name |
| **BE-W** | `backend_unknown_needs_backend_confirmation` | None on disk | n/a |
| **BE-W2** | **Missing** | `OrderTable.jsx:110` `pgStatus`-presence detector currently always false | Yes — column auto-reveals when ANY row has non-null `pgStatus` |
| **BE-A** | `backend_unknown_needs_backend_confirmation` | None on disk | n/a |
| **BE-F** | **Missing** | `orderEntryPrefs.js` is localStorage-only; no server setting wire | No — Phase B requires explicit FE migration code (dual-read/write) |

---

## 6. Parked CR unblock map

| Parked item | Backend ask gating it | Backend present? | Frontend unblock status |
|---|---|---|---|
| **CR-008 Sub-CR #3** (delivery dispatch/assign) | Backend roadmap (no specific BE-id) | Missing | `backend_missing_keep_parked` |
| **CR-008 #4 Phase B** (default landing persistence) | BE-F | Missing | `backend_missing_keep_parked` |
| **B2 Phase 2** (PG Status auto-reveal) | BE-W2 | Missing | `backend_missing_keep_parked` (FE already wired for auto-reveal — see §5 column) |
| **B3** (item-level cancel_by_name) | BE-V | Missing | `backend_missing_keep_parked` |
| **CR-009** (Operations Audit Timeline) | Backend-heavy (implicit) | Missing | `backend_missing_keep_parked` |
| **CR-011** (PG scan / Serve / paymentType case) | BE-A | Missing | `backend_missing_keep_parked` |
| **CR-013 Phase 3** (per-component print + delivery GST persistence) | BE-G9 + BE-G10 + BE-G11 (+ BE-G7 + BE-G8 owner-decision-gated) | Missing | `backend_missing_keep_parked` |

---

## 7. Items safe to unpark (TODAY)

| Item | Reason |
|---|---|
| **None** | Zero parked items can be unparked. Either backend is missing, owner-decision is pending, or both. The closest "almost-ready" candidate is BE-1 because the FE invariant block proves most sub-fields ship — but the `pending_*` half still gates full BE-1 closure, and CR-001 cell-level UX still requires `pending_collect_by_name` / `pending_cancel_by_name` to populate ACTIONED BY. Therefore `keep_parked`. |

---

## 8. Items still parked (with reasons)

| Item | Reason for keeping parked |
|---|---|
| BE-1 | `pending_collect_by_name` / `pending_cancel_by_name` / `pending_merge_by_name` / `pending_room_info_discount` still missing on wire. Retained `[CR-001 DIAG]` console logs cannot be removed until these populate. |
| BE-2 | `room_info.discount_amount` / `discount_reason` still missing. |
| BE-T / BE-U / BE-W / BE-A | No backend evidence reachable — `backend_unknown_needs_backend_confirmation`. |
| BE-V | Item-level `cancel_by_name` not present; item-level fallback still in code. Gates B3. |
| BE-W2 | No row in any captured wire dump carries `snapshot_razorpay_status`. Gates B2 Phase 2. |
| BE-F | No server-side `default_landing_screen` setting wired. Gates CR-008 #4 Phase B. |
| BE-G7 / BE-G8 / BE-G10 / BE-G11 (CR-013) | All evidence confirms backend template + Total formula are NOT yet fixed. Gates CR-013 print parity. |
| BE-G9 (CR-013) | `delivery_charge_gst_amount` column not on wire. Gates CR-013 delivery-GST forensics. |
| Bean Me Up double-count | Bug still reproducible; owner Options A/B/C/D not yet chosen. |
| CR-008 Sub-CR #3 | Backend roadmap + owner prioritisation — neither ready. |
| CR-009 | Backend-heavy + owner prioritisation — neither ready. |

---

## 9. Items needing backend confirmation (`backend_unknown_needs_backend_confirmation`)

These items have no on-disk evidence one way or the other and require direct backend-team confirmation before status can be refined:

1. **BE-G7** — exact backend formula for printed Total / `payment_amount` on `BILL_PAYMENT`-paid orders.
2. **BE-G8** — same formula, but for `tip_tax_amount`. Tip-side symmetric exposure not yet observed live.
3. **BE-G9** — Has the `delivery_charge_gst_amount` column been added to schema? Is socket echoing it now?
4. **BE-G10** — Does `order-temp-store` template auto-render any payload tax key, or is it hardcoded?
5. **BE-G11** — Are the per-component template slot names confirmed?
6. **BE-T** — CR-004 P2 G2/G3/OPT shipment status.
7. **BE-U** — CR-005 Phase A web-order attribution shipment status.
8. **BE-W** — per-item paid-stage fields shipment status.
9. **BE-A** — CR-011 PG scan lifecycle case canonicalisation status.
10. **Bean Me Up double-count** — has backend patched the asymmetric template formula since 2026-05-05?

---

## 10. Recommended next backend / frontend action

> **Top-priority block:** the CR-013 Bean Me Up print double-count is the only item that produces a CUSTOMER-VISIBLE incorrect printed bill TODAY. Every other parked item is forensic / cosmetic / dormant.

### 10.1 Immediate (backend coordination — no FE work)
1. **Owner / backend triage call on BE-G10 + BE-G11 + BE-G7 + BE-G8.** Confirm template auto-render behaviour (≤5 minutes of backend triage) and decide between fixing template asymmetry vs adopting per-component slots. The decision unblocks CR-013 print parity for ALL tenants, not only Bean Me Up.
2. **In parallel, owner picks Options A/B/C/D** on the print double-count handover. If Option B (targeted FE rollback on `BILL_PAYMENT` `service_gst_tax_amount` + `tip_tax_amount`) is chosen, the customer-visible bill is fixed within minutes; the persistence regression is fully reversible the moment BE-G10/G11 ship.

### 10.2 Short-term backend asks (priority order — by FE-dependent surface area)
1. **BE-G10 + BE-G11 + BE-G7 + BE-G8 + BE-G9** (print template + delivery GST persistence — gates CR-013 Phase 3 + closes BUG-013 print finding).
2. **BE-F** — `default_landing_screen` server setting (gates CR-008 #4 Phase B).
3. **BE-W2** — `snapshot_razorpay_status` (gates B2 Phase 2; FE auto-reveals on ship).
4. **BE-1 `pending_*`** — `collect_by_name`, `cancel_by_name` (order-level), `merge_by_name`, `room_info.discount_amount/reason` (gates CR-001 ACTIONED BY closure + retained `[CR-001 DIAG]` log removal).
5. **BE-V** — item-level `cancel_by_name` (gates B3).
6. **BE-T / BE-U / BE-W / BE-A** — bundled clarification request to backend on shipment status.

### 10.3 What NOT to do (per strict rules and current evidence)
- Do NOT mark any item complete without explicit backend confirmation OR positive FE invariant proof.
- Do NOT touch `/app/memory/final/`.
- Do NOT pull / switch branch.
- Do NOT implement Bean Me Up Options A/B/C/D until owner picks one.
- Do NOT add `delivery_charge_gst_amount` payload key to FE until BE-G9 confirms backend has shipped the column (per print double-count handover §7 strict-rail #6).
- Do NOT remove `[CR-001 DIAG]` / `[BE-1 INVARIANT]` / `[BE-2 INVARIANT]` console-warn blocks until backend confirms `pending_*` keys ship.

---

## 11. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no code change | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewritten / unparked | ✅ |
| No `/app/memory/final/*` touched | ✅ |
| No item marked complete without evidence | ✅ — only items with positive FE invariant evidence are flagged "Partial"; nothing is "Complete" |
| No code pulled / branch switched | ✅ |
| Stop after document creation | ✅ |

---

— End of Backend Blocker Verification 2026-05-05 —
