# POS2.0 Wave 4 — Closure Report — 2026-05-17

## 1. Status
**COMPLETE** — all 5 work items applied, validated, and owner-verified via payload smoke.

---

## 2. Wave 4 work items

| # | Item | Files Touched | Status |
|---|------|---------------|--------|
| 1 | **BUG-050** — Manual reprint parity | `orderTransform.js` (default-branch fallbacks for `discount`/`loyalty`/`wallet`/`coupon`) | ✅ APPLIED |
| 2 | **BUG-057** — Prepaid Print Bill gate | `OrderEntry.jsx` | ✅ APPLIED |
| 3 | **Print Payload Mini-CR Addendum** — `rtype`, `payment_status`, `payment_method` on print payloads | `orderTransform.js`, `OrderCard.jsx`, `RePrintButton.jsx`, `CollectPaymentPanel.jsx`, related tests | ✅ APPLIED |
| 4 | **Print Path Unification Corrective (PRINT-002)** — split `payment_amount` (food-only) vs `grant_amount` (food + assoc + roomBalance) across default + override branches | `orderTransform.js`, `CollectPaymentPanel.jsx`, `req3-room-bill-print.test.js` (+1 new regression test) | ✅ APPLIED |
| 5 | **BUG-059** — Audit Report Print Bill on Paid tab (3rd pill, no perm gate, audit-only payload via raw `SINGLE_ORDER_NEW`) | `OrderTable.jsx`, `AllOrdersReportPage.jsx` | ✅ APPLIED (with mid-impl corrective: switched from `getSingleOrderNew` service to raw endpoint + `orderFromAPI.order` transform to recover `rawOrderDetails`) |

---

## 3. Test suite

| Metric | Value |
|--------|------:|
| Test suites | **34 passed / 34 total** |
| Tests | **498 passed / 498 total** |
| New tests added in Wave 4 | +1 (non-room `grant_amount === payment_amount` regression) |
| Re-baselined tests | 2 (room default-branch, room override-branch in `req3-room-bill-print.test.js`) |
| ESLint | ✅ clean on all touched files |
| Webpack | ✅ hot-reload green |

---

## 4. Business rules enforced

### PRINT-002 (recorded 2026-05-17)
> `payment_amount` = the restaurant's own bill total ("Total" line) = food + SC + GST + VAT + tip + delivery − discount.
> `grant_amount` = the amount the cashier collects right now ("Grand Total" line) = `payment_amount + (isRoom ? associatedTotal + roomBalance : 0)`.
> For non-room orders, the two are equal.

### Mini-CR Addendum semantics (recorded 2026-05-17)
> All bill print payloads emit `rtype` (`"RM"` for room, `"TB"` otherwise), `payment_status` (from order context), `payment_method` (from order context). All 5 print paths consistent.

### PRINT-001 (Item Total / SC / Sub Total / CGST / SGST parity)
**NOT recorded** — drift between override vs default branches **DEFERRED** per owner directive 2026-05-17 pending separate proof + approval (P2 backlog).

---

## 5. Owner smoke completion log

| Surface | Outcome |
|---------|---------|
| Audit Report → Paid tab → Cash row → Print pill | ✅ Visible; click fires both `single-order-new` (200) and `order-temp-store` (200) |
| `order-temp-store` response sample (Order #000059) | ✅ All money/tax/room/addendum/customer fields validated bit-correct (see §4 of `POS2_0_WAVE_4_IMPLEMENTATION_REPORT_BUG_059_2026_05_17.md`) |
| `payment_amount` vs `grant_amount` on non-room | ✅ Equal (268 / 268) — PRINT-002 non-room parity confirmed |
| `rtype` / `payment_status` / `payment_method` | ✅ Correctly `TB` / `paid` / `cash` |

---

## 6. Documents produced

| Document | Path |
|----------|------|
| Owner Approval Plan | `POS2_0_WAVE_4_OWNER_APPROVAL_PLAN_2026_05_17.md` |
| Code Diff Preview (BUG-050) | `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_050_2026_05_17.md` |
| Code Diff Preview (BUG-057) | `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_057_2026_05_17.md` |
| Code Diff Preview (BUG-059, original) | `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_2026_05_17.md` |
| Code Diff Preview (BUG-059, revised) | `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_REVISED_2026_05_17.md` |
| Implementation Report (BUG-050) | `POS2_0_WAVE_4_IMPLEMENTATION_REPORT_BUG_050_2026_05_17.md` |
| Implementation Report (BUG-057) | `POS2_0_WAVE_4_IMPLEMENTATION_REPORT_BUG_057_2026_05_17.md` |
| Implementation Report (BUG-059) | `POS2_0_WAVE_4_IMPLEMENTATION_REPORT_BUG_059_2026_05_17.md` |
| QA Handoff (BUG-050) | `POS2_0_WAVE_4_QA_HANDOFF_BUG_050_2026_05_17.md` |
| Print Payload Mini-CR Owner Plan | `POS2_0_PRINT_PAYLOAD_MINI_CR_OWNER_APPROVAL_PLAN_2026_05_17.md` |
| Print Path Unification Corrective Plan | `POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_PLAN_2026_05_17.md` |
| Print Path Unification Corrective Diff Preview | `POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_CODE_DIFF_PREVIEW_2026_05_17.md` |
| Print Path Unification Corrective Implementation Report | `POS2_0_PRINT_PATH_UNIFICATION_CORRECTIVE_IMPLEMENTATION_REPORT_2026_05_17.md` |
| **Wave 4 Closure Report (this doc)** | `POS2_0_WAVE_4_CLOSURE_REPORT_2026_05_17.md` |

---

## 7. Deferred / Parked items leaving Wave 4

| Item | Reason | Owner |
|------|--------|-------|
| **PRINT-001** (Item Total / Service Charge / Sub Total / CGST / SGST drift between override vs default branches) | Owner directive 2026-05-17: park until proven + approved | P2 backlog |
| `emp_code` parity between audit print and dashboard print | Audit print emits `null` (consistent with "no current-user-context derivation" directive). Dashboard print backfills from current user — minor non-money parity gap. | Confirmed acceptable 2026-05-17 |
| Pre-existing typo `loyalty_dicount_amount` in backend contract | Not a new issue — emitted as-is to match backend | Backend ownership |
| New `print-payload-parity.test.js` (override vs default diff) | Out of scope — would be useful if/when PRINT-001 is revisited | P2 backlog |

---

## 8. Next wave

### Wave 5 — Dashboard Presentation
- **BUG-070** — TBD scope
- **BUG-071** — TBD scope

Awaiting owner kickoff for Wave 5 documentation cycle (Gate 1: docs read + scope capture).

---

*— End of Wave 4 Closure Report — 2026-05-17 —*
