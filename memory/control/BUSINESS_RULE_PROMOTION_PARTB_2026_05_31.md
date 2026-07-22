# Business-Rule Promotion — Part B (2026-05-31)

**Track:** Pending business rules → 5-step promotion gate (independent of POS 4.0).
**Scope:** Part B of `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` — "approved-with-amendment, code-alignment required" (15 rules).
**Directive:** Owner-directed **Option A** (actual code = final source of truth) + plain-English owner reconfirmation this session.
**Code anchor:** branch `31may-for-baseline`, commit `8f92e8c`.

---

## Outcome: 10 promoted, 5 parked

| Rule | Verdict | Code evidence (commit 8f92e8c) |
|---|---|---|
| **TAX-004** | ✅ PROMOTED | `orderTransform.js:643-655` (subtotal loop adds every item; only runtime-complimentary skipped); `CollectPaymentPanel.jsx:513,550,620` |
| **TAX-006** | ✅ PROMOTED | `CollectPaymentPanel.jsx:588-590` (`totalGst = itemGst + scGst + tipGst + deliveryGst`, then `/2` split) |
| **SC-005** | ✅ PROMOTED | `CollectPaymentPanel.jsx:297-300` (local `serviceChargeEnabled` state from profile), `:563` (used per-order); no profile write-back |
| **DEL-001** | ✅ PROMOTED | `orderTransform.js:698` (folded into composite), `:733` (dedicated key when >0) |
| **DEL-002** | ✅ PROMOTED | `orderTransform.js:680,691` (single source `deliveryChargeGstPct`; null→0) |
| **DEL-003** | ✅ PROMOTED | `orderTransform.js:733`, `:1372` (emitted in Place/Settle payloads) |
| **TOTALS-003** | ✅ PROMOTED | `orderTransform.js:721` (`order_amount`), `:1352-1359` (room: `order_amount` full payable + `grant_amount`; no `grand_total` key) |
| **POLL-002** | ✅ PROMOTED | `useOrderPollingReconciliation.js:34` (`REMOVAL_MISS_THRESHOLD = 1`), `:206` |
| **SCAN-002** | ✅ PROMOTED (current-state) | `ScanOrderPopOut.jsx` + test `:176-178` — snooze stops sound, popup stays, **no 2-min hide** (Jan-2026 CR superseded the old 2-min rule) |
| **PAY-003** | ✅ PROMOTED (current-state) | `orderTransform.js:1098-1122` — always sends all 3 modes (0 for unused). Owner chose **Option 1** (keep current; filtering deferred pending backend confirmation) |

### Parked (5) — remain pending
| Rule | Why parked |
|---|---|
| **TAX-007** | FE payload carries all GST keys (`service_gst_tax_amount`, `tip_tax_amount`, `delivery_charge_gst_amount`, sgst/cgst) and Collect Bill shows the breakdown; the **printed-bill** display needs a live-print/backend confirmation. |
| **SCAN-003** | Owner **parked** — wants more review. (Code handles both the old 5-value and new 6-value scan-order socket formats; `socketHandlers.js:543-595`.) |
| **PAY-009** | Owner chose **note-only**: on a CRM lookup timeout the app currently fails silently and lets the cashier type manually (`customerService.searchCustomers` graceful-by-design). "Show a visible error" is recorded as a **future option**, not implemented. |
| **POLL-003** | FE excludes status-8/9 from polling (`useOrderPollingReconciliation.js:140,156`); rule needs **backend confirmation** it enforces the same exclusion. |
| **ROOM-002** | Owner **parked — will reconfirm**. (Code shows `order_amount` = food + associated + room balance, user-confirmed 2026-04-25; `orderTransform.js:1353-1359`.) |

---

## 5-step gate — promoted rules

| Step | Status |
|---|---|
| 1. Code fix implemented | ✅ already implemented in shipped sprints (this was a verify, not a fix) |
| 2. Associated bug closed | ✅ owner-verified in prior sprints |
| 3. Code/runtime confirmation | ✅ code-verified (file:line above); SCAN-002/PAY-003 frozen as current-state |
| 4. Owner reconfirms (in writing) | ✅ this session (plain-English confirmation) |
| 5. Dated diff + baseline promotion | ✅ this doc + baseline §1/§2/§3/§6/§7/§8/§10 |

## Result

- Frozen business rules **34 → 44**. Pending **22 → 12** (Part B 15 → 5).
- Updated: `final/BUSINESS_RULES_BASELINE_FINAL.md`, `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`,
  `control/BASELINE_INDEX.md`, `control/SPRINT_STATUS.md` (+ Owner Decision Log).
- **No production code changed** — all 10 were verify-and-freeze (PAY-003/SCAN-002 frozen as current-state).

---

*End of Part B promotion record — 2026-05-31.*
