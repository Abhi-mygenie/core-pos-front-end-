# Session Handover — 2026-10-14
## Next Agent: Present to Owner + Decide Next Steps on 63 INTAKE Items

**Handover written by:** POS agent (E1)
**Session date:** 2026-10-14
**Branch:** 13oct (live)
**Registry:** 839 items | Sheet: REGISTRY_EXPORT_2026_09_27 (PUSHED, in sync)
**Next agent role:** SMOKE FACILITATOR / PLANNING — present session output, then route batches

---

## MANDATORY FIRST: Registry sync (STEP -1)

Last session: 2026-10-14 (this document).

Session summary in one line: *"Tooling sprint complete (CR-416/419/420), Google Sheets live, 18 items retroactively closed from investigation, 63 INTAKE items area-enriched and pushed to sheet. Owner is ready to decide which module batch to tackle next."*

---

## 1. What was done this session

### 1A — Tooling sprint (3 CRs implemented, all in registry)

| CR | Title | Status | Key files |
|---|---|---|---|
| **CR-416** | AGENT_PROMPT_ALPHA: Add SHEET PUSH + SHEET DRIFT roles (ROLE 13 + ROLE 14 + R27) | GATE_5A_IMPLEMENTED | `memory/control/AGENT_PROMPT_ALPHA.md` (+64 lines) |
| **CR-419** | sheets_sync.py: Contract v1.5 compliance rewrite | GATE_5A_IMPLEMENTED | `memory/reports/sheets_sync.py` (full rewrite, 22-col contract) |
| **CR-420** | sheets_sync.py: Post-push QA gap fixes (9 gaps — col M skip, status map, type normalise, etc.) | GATE_5A_IMPLEMENTED | `memory/reports/sheets_sync.py` (12 targeted edits) |

**Google Sheets is now live.** OAuth2 credentials in `memory/reports/.env`. The two agent roles work:
- **SHEET PUSH**: `python3 memory/reports/sheets_sync.py --push` → pushes all 10 tabs
- **SHEET DRIFT**: `python3 memory/reports/sheets_sync.py --pull --dry-run` → shows CTO edits

---

### 1B — Retroactive closure investigation (18 items closed)

Ran code-as-truth investigation on 71 items showing INTAKE in dashboard.

**From BUG batch (29 items):**

| ID | Verdict | Closed as |
|---|---|---|
| BUG-058 | Implemented (Wave 7 fix in 4 files) | CLOSED — IMPLEMENTED |
| BUG-183 | FE side done (CRM linking in CPP + orderTransform) | GATE_5A_IMPLEMENTED |
| BUG-191 | FE export done (CustomerIntelligenceBeta.jsx 15 markers) | GATE_5A_IMPLEMENTED |
| BUG-094 | Fixed under BUG-097 Gap 1 (socketHandlers.js) | CLOSED — SUBSUMED |
| BUG-346 | Fixed under BUG-328 code markers (restaurant_phone) | CLOSED — SUBSUMED |
| BUG-412 | Fixed by BUG-496 / BUG-500 (advance_payment formula) | CLOSED — SUBSUMED |
| BUG-356 | Fixed under BUG-270 (cust_mobile in orderTransform) | CLOSED — SUBSUMED |
| BUG-471 | Fixed by BUG-459 + CR-387 (display-unit inventory) | CLOSED — SUBSUMED |
| BUG-328 | Code marker mismatch noted (markers fix BUG-346, not this) | Kept INTAKE + note |
| 7 BUGs | Backend-blocked (BUG-190, 243, 353, 408, 454, 463, 467) | Kept INTAKE |
| 13 BUGs | Genuinely open — no FE fix found | Kept INTAKE |

**From CR batch (42 items) — owner confirmed implementations:**

| ID | Verdict | Closed as |
|---|---|---|
| CR-068 | Implemented (`hasPermission('order_cancel')`) | CLOSED — IMPLEMENTED |
| CR-153 | Implemented (ConsumptionReportPage.jsx Wastage tab, 20 markers) | CLOSED — IMPLEMENTED |
| CR-156 | Implemented (table_name in reportTransform.js) | CLOSED — IMPLEMENTED |
| CR-149 | Subsumed by CR-415 (sidebar cleanup, comingSoon=0) | CLOSED — SUBSUMED |
| CR-347 | Subsumed by CR-376 (menu switcher in StatusConfigPage) | CLOSED — SUBSUMED |
| CR-371 | Subsumed by CR-406 + CR-389 (sheets_sync + registry_export) | CLOSED — SUBSUMED |
| CR-397 | Subsumed by BUG-459 + CR-387 (display-unit inventory) | CLOSED — SUBSUMED |
| CR-054 | Owner decision — no longer required | CLOSED — OWNER DECISION |
| CR-121 | QSR mode shipped under BUG-099 (StatusConfigPage.jsx) | CLOSED — SUBSUMED |
| CR-392 | Implemented via BUG-484/527/522 (fbOnlyTotal + discountAmount) | CLOSED — IMPLEMENTED |
| CR-400 | Implemented (showPopularCategory toggle in settings) | CLOSED — IMPLEMENTED |
| CR-401 | Implemented (Notes column in ExpenseReportPage.jsx) | CLOSED — IMPLEMENTED |
| CR-402 | Implemented (openingBalance in live SettlementPage.jsx) | CLOSED — IMPLEMENTED |
| POS2-001 | Implemented via CR-008/013/BUG-097 (delivery charge+GST+lock) | CLOSED — SUBSUMED |
| PROD-003 | FE done (PayLater table clear in socketHandlers.js) | GATE_5A_IMPLEMENTED |

**Option A applied:** All 19 retroactively closed items have no QA handover/report. Accepted as documentation debt. Flagged as `OG-RETRO-001` in OPEN_GAPS_REGISTER.md.

---

### 1C — Area enrichment for all 63 INTAKE items

All 63 items on the Intake tab now have a populated Area column in the sheet using the brief's exact POS area list. INTAKE_WORKFLOW.md updated — area is now **mandatory at Gate 1** for every future CR and BUG.

---

### 1D — Multiple sheet pushes

Sheet is live and in sync. Last push: 2026-10-14 ~17:30 UTC.

| Metric | Value |
|---|---|
| Total rows | 839 |
| UNCLASSIFIED | 0 ✅ |
| Intake tab | 63 rows |
| Area populated | 63/63 ✅ |
| Col M (Assignee) | Never written ✅ |
| Col W (Release week) | Never written ✅ |

---

## 2. Current sprint state

| Sprint | Status |
|---|---|
| `tooling_oct1` | CR-406 ✅ CR-416 ✅ CR-419 ✅ CR-420 ✅ — COMPLETE |
| `oct_cr_batch` | BUG-536→540, CR-411→415 all at GATE_5A or beyond — QA / Smoke pending |

---

## 3. All 63 INTAKE items — module-wise

**Legend:** `[B]` = Backend-blocked (no FE fix possible). `₹` = touches money/financial flow.

---

### MODULE 1 — Reports (11 items)

*Includes audit reports, daily reports, insights, order reports, data exports.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-467** | P0 | | Historical order data disappeared on 14 Aug — only ~10 unpaid orders visible | Data loss event. Backend/data recovery. |
| **BUG-472** | P1 | | Converted item consumption uses wrong unit (packets instead of grams) | Investigate: may be covered by BUG-459 series |
| BUG-486 | P2 | `[B]` ₹ | Sales Excel by Payment Method shows 'Other' instead of Dine-In/Delivery | Backend sends wrong category label |
| BUG-040 | — | | Audit Report Excel/CSV format must follow provided format | No code fix found |
| BUG-041 | — | | Audit Report PDF download — misaligned rows, logic review | No code fix found |
| BUG-192 | — | | Prep & Serve Time — handover time showing 0 + full logic investigation | MockupPage only (CR-011), not live |
| BUG-353 | — | `[B]` | OrderReportBeta: date range capped at 1 month | Backend enforced cap |
| BUG-354 | — | | OrderReportBeta: status column null for some order types | Page handles null; root cause backend |
| CR-050 | P3 | | Insights Dashboard: quarterly comparison view (Q1 vs Q2) | No code found |
| CR-138 | P2 | | Dual Excel download — add backend Excel endpoint to CR-136 screens | CR-136 pages are mockups |
| CR-164 | P1 | ₹ | Send payment link from Daily Reports (per-row action) | Service exists; UI button missing |

---

### MODULE 2 — Printing / Printer Agent (11 items)

*Includes KOT, bill printing, printer agent bugs, printer config.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-466** | P1 | | Old KOT printed when new Swiggy/aggregator order received | No fix found |
| **BUG-468** | P1 | | Bill not printing from iPhone | No iOS-specific fix found |
| **BUG-476** | P1 | | Printer Agent set to Direct Print — Bill and KOT both stopped | No fix found; newer bug (BUG-478 onwards) |
| BUG-469 | P2 | | Dual Printer Agent — Bill Content employee ID resets after refresh | No fix found |
| BUG-474 | P2 | | Printer Agent cannot be updated on Windows 7 | Compatibility issue |
| BUG-478 | P2 | | Printer Agent token expired twice unexpectedly | Auth token issue |
| BUG-479 | P2 | | Customer name missing after Printer Agent update — phone lookup returns nothing | Regression from update |
| CR-403 | P3 | | Desktop shortcut for Printer Agent | Electron/OS-level — outside React app scope |
| BUG-345 | — | | Printer Style Tab: row labels show Generic Row 1/2/3/4 | No fix found |
| CR-152 | P2 | | Test Connection for LAN Printer | Not implemented |
| CR-168 | P2 | | Printer Agent: test print job + live printer status | Not implemented |

---

### MODULE 3 — Payments / Coupons / Credit (8 items)

*Includes settlements, prepaid flows, coupons, billing date, loyalty.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-482** | P0 | ₹ | Duplicate payment entries on re-settlement — ₹160 shows ₹320 | Critical financial bug |
| **BUG-475** | P1 | ₹ | Prepaid orders not visible — Auto Settlement settles them automatically | No fix found |
| **BUG-481** | P1 | ₹ | Prepaid order → Unpaid → re-settled → payment status becomes Cash | Incorrect status flow |
| CR-410 | P1 | `[B]` ₹ | Scan Order Loyalty not pre-loaded in Collect Payment | Backend brief filed; backend needs socket loyalty_info |
| CR-091 | P2 | `[B]` ₹ | Purchase — Transaction ID for Bank Transfer | Backend-blocked (CR-100) |
| BUG-118 | P1 | ₹ | Nth-item coupon / BOGO coupon not working | Partial (display done); discount calc deferred |
| BUG-328 | P1 | ₹ | Discount Type Configuration Not Accessible / Missing | Genuine open; BUG-328 code markers fix BUG-346, not this |
| CR-126 | P1 | ₹ | Backdated Billing Date — user-selectable billing date on order punch | Not implemented |

---

### MODULE 4 — Order Entry (6 items)

*Includes order taking, KOT, GST on items, walk-in default.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-480** | P1 | | Cancel After Serve option not enabled / available | No fix found |
| CR-394 | P2 | ₹ | Backward GST calculation required for Open Items | Not implemented |
| CR-395 | P2 | | Order-wise KOT required | Not implemented |
| CR-398 | P3 | | Food inactive timing functionality required in Old POS | Not implemented |
| BUG-189 | P1 | | Delivery — Accept Order option missing for rider login | No fix found |
| BUG-333 | P1 | | New Order always opens as Walk-In (handleAddOrder hardcoded) | Confirmed in code; may be by-design |

---

### MODULE 5 — PMS Check-In (4 items)

*Tape chart, WhatsApp/SMS guest notifications, Channel Manager.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| BUG-193 | P1 | | Room Transfer Trail showing table transfers + FROM ROOM = 0 | RoomTransfersMockup only (CR-011) |
| CR-361 | P1 | `[B]` ₹ | PMS — Room Assignment on Tape Chart | All candidate backend endpoints 404 |
| CR-367 | P2 | `[B]` | PMS — WhatsApp/SMS Guest Notifications | No guest-messaging backend endpoint |
| CR-384 | P2 | `[B]` ₹ | Channel Manager — default rateplan selector per room | Backend feature needed |

---

### MODULE 6 — Inventory / Stock (4 items)

*Stock levels, sub-recipe upload, inventory settings.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-473** | P1 | | Stock Out / Stock In incorrect behaviour — needs investigation | No fix found; investigate |
| BUG-243 | P0 | `[B]` | Stock not credited after add-purchase | Backend SQL issue confirmed |
| CR-151 | P2 | | Sub Recipe Excel Upload | Not implemented |
| CR-154 | P1 | | Settings Flags for Inventory as Central Inventory | Not implemented |

---

### MODULE 7 — Auth / Permissions (4 items)

*Role gating, permission wiring, security routes.*

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-470** | P1 | | Waiter role can edit orders despite lacking edit_order permission | No `edit_order` gate found |
| **BUG-538** | P1 | ₹ | Role-Based Discount setting exists but never wired to Collect Payment | `canDiscount` prop never passed to CPP |
| CR-396 | P2 | | Waiter: Order Taking access with serve-only permission scope | Not implemented |
| CR-372-B | P1 | | Security: Add ProtectedRoute to 23 unguarded routes | ~90% done; preview sub-routes remain |

---

### MODULE 8 — Menu Management (3 items)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| CR-404 | P2 | | Menu restructuring — proper grouping of add-ons | Not implemented |
| BUG-463 | P3 | `[B]` | Two identical Promotional Menu pills in Local Settings | Duplicate from backend |
| CR-012 | P1 | | Menu Management — migrate to new API contract | Old; scope-limited; check if still relevant |

---

### MODULE 9 — PMS Folio (3 items)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| CR-391 | P2 | ₹ | Room settlement — payment details + veg/non-veg charge separation | Not implemented |
| BUG-408 | P1 | `[B]` ₹ | Daily Report — Room settlement Cash/Card/UPI always ₹0 | Field exists in FE; backend not sending |
| CR-043 | P2 | ₹ | Credit Per-Customer Totals in Reports + Portfolio Export Optimization | Service layer comment only; no report page |

---

### MODULE 10 — Settings / Configuration (3 items)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| **BUG-477** | P1 | | Incorrect system time causes outlet to appear closed | Investigate; scheduling/clock issue |
| CR-393 | P2 | ₹ | Configurable GST — food and room charges taxed separately | Not implemented |
| CR-134 | P2 | `[B]` | Settings Tiles — mirror all Restaurant Setup Wizard fields | Backend wizard tiles API pending |

---

### MODULE 11 — Sockets / Aggregator / Notifications (3 items)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| BUG-454 | P1 | `[B]` | Buzzer intermittently silent on first FCM after page load | Root cause = one FCM token per employee (backend fix needed) |
| CR-375 | P2 | | Aggregator Menu: Bulk Delete in BulkEditor | Non-aggregator done (CR-159); aggregator-specific open |
| CR-399 | P2 | | Zomato/Swiggy — food/item cancellation flow | Cancel button hidden for aggregator; flow not implemented |

---

### MODULE 12 — CRM (1 item)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| BUG-190 | P1 | `[B]` | Customer Notes not syncing with CRM / historical notes not showing | FE renders if backend sends; backend not sending historical notes |

---

### MODULE 13 — Dashboard (1 item)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| BUG-483 | P1 | | Dashboard graphs in New POS show Function Error | Investigate; may be a data/transform issue |

---

### MODULE 14 — Tooling (1 item)

| ID | P | Flag | Title | Notes |
|---|---|---|---|---|
| CR-369 | P1 | | Write AGENT_PROMPT_ALPHA_v0.8.md | v0.8 file does not exist. Blocked by CR-368. |

---

## 4. Summary counts

| Module | Total | Backend-blocked | Money-path | P0/P1 |
|---|---|---|---|---|
| Reports | 11 | 2 | 2 | 2 |
| Printing / Printer Agent | 11 | 0 | 0 | 3 |
| Payments / Coupons | 8 | 2 | 8 | 4 |
| Order Entry | 6 | 0 | 1 | 2 |
| PMS Check-In | 4 | 3 | 2 | 1 |
| Inventory | 4 | 1 | 0 | 2 |
| Auth / Permissions | 4 | 0 | 1 | 3 |
| Menu Management | 3 | 1 | 0 | 0 |
| PMS Folio | 3 | 1 | 3 | 1 |
| Settings | 3 | 1 | 1 | 1 |
| Sockets / Aggregator | 3 | 1 | 0 | 1 |
| CRM | 1 | 1 | 0 | 1 |
| Dashboard | 1 | 0 | 0 | 1 |
| Tooling | 1 | 0 | 0 | 1 |
| **TOTAL** | **63** | **13** | **18** | **23** |

**13 backend-blocked** — no FE work possible until backend ships.
**18 touch money flows** — P0 priority if any are broken in production.
**3 P0 items** — BUG-467 (data loss), BUG-482 (duplicate payment ₹), BUG-243 (stock not credited — backend).

---

## 5. Suggested agenda for next session with owner

Present module-wise list above and ask:

> **"Which module do you want to tackle first?"**

**Recommended priority order based on severity + effort:**

1. **Payments** — BUG-482 P0 duplicate payment is actively losing money. BUG-475 + BUG-481 affect prepaid order visibility.
2. **Auth / Permissions** — BUG-538 (discount wiring) and BUG-470 (waiter edit gate) are P1 security + financial.
3. **Printing** — 3 P1 printer bugs from live operations (BUG-466, 468, 476).
4. **Reports** — BUG-467 P0 data loss needs backend investigation; CR-164 payment link is partially done.
5. **Inventory** — BUG-473 stock behaviour incorrect.

**For backend-blocked items:** Present to owner → file backend briefs if not already filed → park until backend delivers.

---

## 6. Key files for next agent

| File | Purpose |
|---|---|
| `memory/control/AGENT_PROMPT_ALPHA.md` | Agent roles + rules (v0.7 + CR-416 additions) |
| `memory/reports/sheets_sync.py` | Google Sheets sync (CR-419 + CR-420) |
| `memory/reports/.env` | OAuth2 credentials (DO NOT PRINT) |
| `memory/control/registry.json` | 839 items — source of truth |
| `memory/control/INTAKE_WORKFLOW.md` | Updated with mandatory area assignment rule |
| `memory/control/OPEN_GAPS_REGISTER.md` | OG-RETRO-001 — 19 items closed without QA gate |
| `memory/control/CR_REGISTRY.md` | CR history |
| `memory/control/BUG_TRACKER.md` | BUG history |

---

## 7. Environment

| Item | Value |
|---|---|
| Branch | 13oct (live) |
| Frontend | http://localhost:3000 (RUNNING) |
| Backend | http://localhost:8001 (RUNNING) |
| Sheet | https://docs.google.com/spreadsheets/d/18s3u2iJPFRFzZFxxkHD7EiWvVtpKMvTpYDLsqcBzkdY |
| Auth | Refresh token in `memory/reports/.env` — long-lived, no re-auth needed |

---

*Handover written: 2026-10-14. Next session entry point: read this doc → present §3 module list to owner → get direction on first batch.*
