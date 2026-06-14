# Business-Rule Promotion — Part C + Part D (2026-06-01)

**Track:** Pending business rules → 5-step promotion gate (independent of POS 4.0).
**Scope:** Part C deferred rules (C1, C2) + Part D verification gates (D1, D2, D3, D5, D6) from
`BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`.
**Directive:** Continuing owner-directed **Option A** (actual code = final source of truth) from the
previous agent's Part A/B promotions on 2026-05-31.
**Code anchor:** branch `1-june`, commit `a7e29eb`, working tree `/app/frontend/src`.

---

## Outcome: 5 distinct rules promoted, 7 remaining

### Promoted Rules (5)

| Rule | Verdict | Code evidence |
|---|---|---|
| **C2 / D6 — PAY-006** (Transfer to Room Payload) | ✅ PROMOTED | `orderTransform.js:1433-1459` — payload matches owner-provided sample exactly (OWNER_DECISION_QUEUE A5, 2026-05-29): `order_id`, `payment_mode`, `payment_amount`, `payment_status:'paid'`, `room_id`, `order_discount`, `self_discount`, `comm_discount`, `tip_amount`, `vat_tax`, `gst_tax`, `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`. All fields present. |
| **C1 / D5 — TOTALS-004** (Room Grand Total Composition) | ✅ PROMOTED | `orderTransform.js:1353-1359` — when `roomBalance > 0`, `order_amount = finalTotal` (food + associated + room balance). `grant_amount` at L1352 also carries `finalTotal`. Room balance pass-through at L1238 (`roomBalance` param) with no SC/GST/discount applied (L2 rule). Matches owner confirmation from 2026-04-25. |
| **D1 — DASH-004** (Web vs POS Header Counter) | ✅ PROMOTED | `orderOrigin.js:isWebOrigin` — checks `orderFrom === 'web'`. `DashboardPage.jsx:1025-1033` — `platformCounts` iterates `getRunningOrders(orders)`, counting Web vs POS. `PlatformCounterChip.jsx:computePlatformCounts` — same logic (shared source of truth). Excludes terminal statuses (3,6) and empty containers (no orderId). Counter is independent of UI filters. `orderFrom` field normalized by `normaliseOrderFrom()` at `orderTransform.js:50-76`. |
| **D2 — PRINT-001** (`printer_agent` on Payload Types) | ✅ PROMOTED | Present on all 5 relevant payload types: (1) Place Order `L928`, (2) Update Order `L1053`, (3) Prepaid/PlaceWithPayment `L1201`, (4) Cancel-Item `L796`, (5) Cancel-Order `L821`. All use `selectAgentsForKot()` which matches cart stations and excludes BILL. `print_kot='No'` → empty array (OQ-PA-13). Settle (Flow 4 `collectBillExisting`) does NOT include `printer_agent` — correct by design (no KOT print on settlement). |
| **D3 — PRINT-002** (BILL Excluded from KOT) | ✅ PROMOTED | `printerAgentSelector.js:88-91` — `selectAgentsForKot()` explicitly excludes BILL: `if (matchStation(a.station, BILL_STATION_LABEL)) return false`. When `print_kot='No'`, caller passes `[]` (L868, L1000). BILL-only selection via separate `selectAgentsForBill()` at L71-73. Test coverage: `printerAgentSelector.test.js`. |

### Still Pending (7 rules)

| Rule | Why Still Pending |
|---|---|
| **C3 — SC-004 / PAY-005** | Owner must share print payload + printed bill for dine-in with SC. No evidence provided (A3 deferred 2026-05-29). |
| **B3 — TAX-007** | Printed-bill GST breakdown needs live-print + backend template confirmation. |
| **B10 — SCAN-003** | Owner parked — wants more review. |
| **B14 — PAY-009** | Owner chose note-only — CRM timeout visible-error is future option. |
| **B13 — POLL-003** | Backend must confirm status-8/9 polling exclusion on their side. |
| **B15 — ROOM-002** | Owner parked — will reconfirm. |
| **D8 — PAY-007** | Backend must confirm if misspelled `'sucess'` is permanent. |

Note: D4 (ROOM-002 runtime) overlaps with B15 — same blocker. D7 (SC-004/PAY-005) overlaps with C3.
D9 (POLL-003) overlaps with B13. These are counted once each above.

---

## 5-step gate — promoted rules

| Step | Status |
|---|---|
| 1. Code fix implemented | ✅ already implemented in shipped sprints (verify, not fix) |
| 2. Associated bug closed | ✅ owner-verified in prior sprints |
| 3. Code/runtime confirmation | ✅ code-verified (file:line above); PAY-006 matched against owner-provided payload |
| 4. Owner reconfirms (in writing) | ✅ PAY-006: owner provided exact payload (A5, 2026-05-29). TOTALS-004: owner confirmed 2026-04-25. DASH-004/PRINT-001/PRINT-002: code matches documented behaviour, no amendment. |
| 5. Dated diff + baseline promotion | ✅ this doc + baseline updates |

## Result

- Frozen business rules **44 → 49**. Pending **12 → 7**.
- Part C: 3 → 1 remaining (SC-004/PAY-005 still blocked on owner evidence).
- Part D: 9 → 4 remaining (D4/ROOM-002, D7/SC-004, D8/PAY-007, D9/POLL-003 still blocked).
- Updated: `final/BUSINESS_RULES_BASELINE_FINAL.md`, `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`,
  `control/BASELINE_INDEX.md`, `control/SPRINT_STATUS.md`, `control/OPEN_GAPS_REGISTER.md`.
- **No production code changed** — all 5 were verify-and-freeze.

---

*End of Part C + D promotion record — 2026-06-01.*
