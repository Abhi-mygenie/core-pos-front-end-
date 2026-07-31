# PROD-BUG-002 — Auto KOT / Auto Bill Trigger Investigation — 2026-05-21

## 1. Purpose

Investigation and planning only for KOT/Bill print triggers across all frontend buttons/actions. Determines whether Settle, Delivered, Handover, or any other non-print action can trigger KOT or Bill print when `autoKot` and/or `autoBill` are ON.

No code was changed. No implementation performed. No QA executed. No `/app/memory/final/` updated. No baseline docs modified.

---

## 2. Scope

**In scope:**
- autoKot / autoBill trigger map across all buttons/actions
- Settle print guard investigation
- Delivered / Handover print trigger investigation
- Place Order, Collect Bill, QSR, Reprint print paths
- `print_kot` and `billing_auto_bill_print` payload fields

**Out of scope:**
- Code changes
- Auto Settle (PROD-BUG-001 — closed)
- PayLater table clear (PROD-BUG-003 — closed)
- QA execution
- Baseline updates
- `/app/memory/final/` updates

---

## 3. Inputs Read

### Baseline Docs Read (all under `/app/memory/final/`)
- `ARCHITECTURE_DECISIONS_FINAL.md` — READ (key: API-03 OrderEntry composition / CollectPaymentPanel settlement)
- `BUSINESS_RULES_BASELINE_FINAL.md` — READ (key: PAY-001, PAY-004)
- `CHANGE_REQUEST_PLAYBOOK.md` — READ
- `FINAL_DOCS_APPROVAL_STATUS.md` — READ
- `FINAL_DOCS_SUMMARY.md` — READ
- `IMPLEMENTATION_AGENT_RULES.md` — READ
- `MODULE_DECISIONS_FINAL.md` — READ (key: Module 4 Order Entry, Module 14 Printing)
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — READ

### Baseline Docs NOT_FOUND
- None. All 8 present and read.

### Overlay Docs Read
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — READ
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — READ
- `PENDING_TASK_REGISTER_2026_05_04.md` — READ
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — READ
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — READ

### Overlay Docs NOT_FOUND
- None.

### Hotfix Docs Read
- `PROD_HOTFIX_001_PREPAID_AUTO_SETTLE_PRINT_GUARD_IMPACT_ANALYSIS_2026_05_20.md` — READ (§7 PROD-BUG-002 analysis, §7b PROD-BUG-003 analysis)
- `PROD_BUG_002_SETTLE_PRINT_GUARD_IMPACT_AND_PLAN_2026_05_20.md` — **NOT_FOUND** (no standalone BUG-002 doc exists; analysis is embedded in the PROD-HOTFIX-001 doc §7)
- `PROD_HOTFIX_001_CONSOLIDATED_PLANNING_AND_QUESTION_CLEARANCE_2026_05_20.md` — READ

### Related Sprint Docs
- None needed. Print behavior was not changed by POS3.0 BUG-097/099 or POS2.0 final sprint.

### Code Files Inspected
1. `api/transforms/profileTransform.js` — autoKot/autoBill source mapping (L321-340)
2. `api/transforms/orderTransform.js` — `print_kot` and `billing_auto_bill_print` in placeOrder/placeOrderWithPayment/collectBillExisting payloads (L877, L995, L1121, L1122, L1296)
3. `api/services/orderService.js` — `completePrepaidOrder` payload (L84-94): NO print fields
4. `components/order-entry/OrderEntry.jsx` — printAllKOT/printAllBill state (L86-87), auto-print paths (L1093-1094 QSR, L1155-1183 QSR fresh, L1192-1241 QSR collect, L1560-1642 Scenario 2 Place+Pay, L1780-1880 Scenario 1 Collect Bill)
5. `components/order-entry/CartPanel.jsx` — printAllBill prop pass-through (L648)
6. `components/order-entry/CollectPaymentPanel.jsx` — handlePrintBill explicit button (L761-803)
7. `components/order-entry/RePrintButton.jsx` — KOT/Bill reprint (L52, L111), defaults from settings (L188-190)
8. `components/cards/OrderCard.jsx` — handlePrintKot (L155-192), handlePrintBill (L195-220), handleSettlePrepaid (L227-241: NO printOrder call)
9. `components/cards/TableCard.jsx` — handlePrintKot (L139-193), handlePrintBill (L204-230), handleSettlePrepaid (L234-250: NO printOrder call)
10. `components/reports/CollectBillPanelDrawer.jsx` — passes autoBill to payload (L177)
11. `pages/DashboardPage.jsx` — handleMarkReady (L1460-1470: updateOrderStatus only), handleMarkServed (L1473-1496: completePrepaidOrder for prepaid, updateOrderStatus for non-prepaid, NO printOrder), auto-settle useEffect (L1409-1444: completePrepaidOrder only)
12. `api/services/deliveryService.js` — dispatchOrder: NO printOrder call

---

## 4. Print Configuration Map

| Config | Source Field | Transform Field | Used In File | Current Meaning |
|---|---|---|---|---|
| `autoKot` | `restaurants[0].print_kot` | `settings.autoKot` | `profileTransform.js` L333 | Auto-KOT checkbox default in cart; controls `print_kot:'Yes'/'No'` in place/update payloads |
| `autoBill` | `restaurants[0].billing_auto_bill_print` | `settings.autoBill` | `profileTransform.js` L340 | Auto-Bill checkbox default in cart; controls `billing_auto_bill_print:'Yes'/'No'` in place/collect payloads + gates frontend auto-print |
| `aggregatorAutoKot` | `apiSettings.aggregator_auto_kot` | `settings.aggregatorAutoKot` | `profileTransform.js` L321 | Aggregator-specific auto-KOT flag (separate from in-house) |
| `printAllKOT` (state) | Initialized from `settings.autoKot` | — | `OrderEntry.jsx` L86 | Local toggle state in OrderEntry; user can override per-order via cart checkbox |
| `printAllBill` (state) | Initialized from `settings.autoBill` | — | `OrderEntry.jsx` L87 | Local toggle state in OrderEntry; user can override per-order via cart checkbox |
| `print_kot` (payload) | — | — | `orderTransform.js` L877, L995, L1121 | Sent in placeOrder / updateOrder / placeOrderWithPayment payloads. Value: `printAllKOT ? 'Yes' : 'No'`. Backend uses this to trigger KOT print server-side. |
| `billing_auto_bill_print` (payload) | — | — | `orderTransform.js` L1122, L1296 | Sent in placeOrderWithPayment / collectBillExisting payloads. Value: `autoBill ? 'Yes' : 'No'`. Backend uses this to decide server-side auto-bill. |

---

## 5. Button / Action Trigger Map

| Button / Action | File | Handler | KOT Print Triggered? | Bill Print Triggered? | Direct / Indirect | Conditions | Intended? |
|---|---|---|---|---|---|---|---|
| **Place Order (postpaid)** | `OrderEntry.jsx` ~L1490 | `onPaymentComplete` Scenario flow | **YES (backend)** — `print_kot:'Yes'` in payload | **NO** (no bill on unpaid place) | Direct (payload field) | `printAllKOT` checkbox ON | YES |
| **Place+Pay (prepaid, Scenario 2)** | `OrderEntry.jsx` L1707-1712 | `placeOrderWithPayment` | **YES (backend)** — `print_kot:'Yes'` in payload | **YES (frontend)** — `autoPrintNewOrderIfEnabled()` at L1560 | Direct (payload + frontend printOrder) | `printAllKOT` for KOT; `printAllBill` for Bill | YES |
| **Collect Bill (postpaid, Scenario 1)** | `OrderEntry.jsx` L1780-1880 | `collectBillExisting` | **NO** | **YES (frontend)** — auto-print at L1826 | Direct (frontend printOrder) | `printAllBill` ON + not room + API succeeded | YES |
| **QSR Place+Pay (fresh)** | `OrderEntry.jsx` L1093-1183 | `onQsrCollectBill` | **YES (backend)** — `print_kot:'Yes'` | **YES (frontend)** — auto-print at L1156 | Direct | `qsrAutoKot` for KOT; `qsrAutoBill` for Bill | YES |
| **QSR Collect Bill (existing)** | `OrderEntry.jsx` L1192-1241 | `onQsrCollectBill` | **NO** | **YES (frontend)** — auto-print at L1226 | Direct | `qsrAutoBill` ON | YES |
| **Settle (prepaid, OrderCard)** | `OrderCard.jsx` L227-241 | `handleSettlePrepaid` | **NO** | **NO** | — | — | YES — correct |
| **Settle (prepaid, TableCard)** | `TableCard.jsx` L234-250 | `handleSettlePrepaid` | **NO** | **NO** | — | — | YES — correct |
| **Settle (prepaid, handleMarkServed)** | `DashboardPage.jsx` L1482-1484 | `completePrepaidOrder` | **NO** | **NO** | — | — | YES — correct |
| **Auto-Settle (PROD-BUG-001)** | `DashboardPage.jsx` L1409-1444 | `completePrepaidOrder` via useEffect | **NO** | **NO** | — | — | YES — correct |
| **Serve (non-prepaid)** | `DashboardPage.jsx` L1490 | `updateOrderStatus('serve')` | **NO** | **NO** | — | — | YES |
| **Ready** | `DashboardPage.jsx` L1460-1470 | `updateOrderStatus('ready')` | **NO** | **NO** | — | — | YES |
| **Dispatch** | `OrderCard.jsx` L250-258 | `dispatchOrder()` | **NO** | **NO** | — | — | YES |
| **Bill button (non-prepaid fOS=5)** | `OrderCard.jsx` L195-220 | `handlePrintBill` | **NO** | **YES** | Direct (explicit user click) | Always prints — explicit button | YES |
| **KOT Print icon** | `OrderCard.jsx` L155-192 | `handlePrintKot` | **YES** | **NO** | Direct (explicit user click) | Always prints — explicit button | YES |
| **Reprint KOT** | `RePrintButton.jsx` L52 | `printOrder('kot')` | **YES** | **NO** | Direct (explicit user click) | Always | YES |
| **Reprint Bill** | `RePrintButton.jsx` L111 | `printOrder('bill')` | **NO** | **YES** | Direct (explicit user click) | Always | YES |
| **Print Bill (CollectPaymentPanel)** | `CollectPaymentPanel.jsx` L761-803 | `handlePrintBill` | **NO** | **YES** | Direct (explicit user click) | Always | YES |
| **CollectBillPanelDrawer (Reports)** | `CollectBillPanelDrawer.jsx` L177 | Passes `autoBill` in payload | **NO** | **YES (backend)** — `billing_auto_bill_print:'Yes'` in payload | Indirect (payload field to backend) | `settings.autoBill` | YES |

---

## 6. AutoKot Trigger Findings

**Where autoKot is read:**
- `profileTransform.js` L333: mapped from backend `print_kot` field
- `OrderEntry.jsx` L86: initializes `printAllKOT` state from `settings.autoKot`
- `OrderEntry.jsx` L1093: read for QSR path as `qsrAutoKot`
- `RePrintButton.jsx` L188: used to set default KOT checkbox state

**When autoKot triggers KOT print:**
1. **Place Order (postpaid)** — `print_kot: 'Yes'` sent in payload → backend prints KOT
2. **Place+Pay (prepaid)** — same as above
3. **QSR Place+Pay** — same, using `qsrAutoKot`
4. **Update Order** — `print_kot: 'Yes'` sent for new items only

**autoKot does NOT trigger KOT on:**
- Settle (any path)
- Serve / Ready
- Collect Bill
- Dispatch
- Any status-update action

**Can Settle trigger autoKot?** **NO.** `completePrepaidOrder` payload contains only `{order_id, payment_status, service_tax, tip_amount}`. No `print_kot` field. No `printOrder('kot')` call in any settle handler.

---

## 7. AutoBill Trigger Findings

**Where autoBill is read:**
- `profileTransform.js` L340: mapped from backend `billing_auto_bill_print` field
- `OrderEntry.jsx` L87: initializes `printAllBill` state from `settings.autoBill`
- `OrderEntry.jsx` L1094: read for QSR path as `qsrAutoBill`
- `OrderEntry.jsx` L1712: passed as `autoBill: printAllBill` to placeOrderWithPayment payload
- `OrderEntry.jsx` L1799: passed as `autoBill: printAllBill` to collectBillExisting payload
- `RePrintButton.jsx` L189: used to set default Bill checkbox state
- `CollectBillPanelDrawer.jsx` L177: passed as `autoBill: settings.autoBill` to payload

**When autoBill triggers Bill print:**

Frontend auto-print (calls `printOrder('bill')` directly):
1. **Place+Pay (prepaid, Scenario 2)** — `autoPrintNewOrderIfEnabled()` at L1560, gated on `printAllBill`
2. **Collect Bill (postpaid, Scenario 1)** — auto-print at L1826, gated on `printAllBill`
3. **QSR Place+Pay (fresh)** — auto-print at L1156, gated on `qsrAutoBill`
4. **QSR Collect Bill (existing)** — auto-print at L1226, gated on `qsrAutoBill`

Backend auto-print (via `billing_auto_bill_print: 'Yes'` in payload):
5. **Place+Pay payload** — `orderTransform.placeOrderWithPayment` L1122
6. **Collect Bill payload** — `orderTransform.collectBillExisting` L1296
7. **CollectBillPanelDrawer** — L177

**autoBill does NOT trigger Bill on:**
- Settle (any path)
- Serve / Ready
- Dispatch
- Status-update actions

**Can Settle trigger autoBill?** **NO.** `completePrepaidOrder` payload has no `billing_auto_bill_print` field. No `printOrder('bill')` call in any settle handler. The only paths that read `printAllBill` / `autoBill` for auto-print are inside `onPaymentComplete` (Place+Pay and Collect Bill scenarios) and the QSR billing section — none of which are reachable from Settle.

---

## 8. Settle / Delivered / Handover Risk Analysis

### Settle — triggers print today?
**NO.** All three Settle code paths are clean:

| Settle Path | File:Line | Calls | Print? |
|---|---|---|---|
| `handleSettlePrepaid` | `OrderCard.jsx` L227-241 | `completePrepaidOrder()` only | **NO** — comment explicitly says "NO printOrder() call here" |
| `handleSettlePrepaid` | `TableCard.jsx` L234-250 | `completePrepaidOrder()` only | **NO** — same comment |
| `handleMarkServed` (prepaid) | `DashboardPage.jsx` L1482-1484 | `completePrepaidOrder()` only | **NO** — comment says "financial closure ONLY" |
| Auto-Settle useEffect | `DashboardPage.jsx` L1409-1444 | `completePrepaidOrder()` only | **NO** |

The `completePrepaidOrder` payload `{order_id, payment_status, service_tax, tip_amount}` contains **zero print-related fields** — no `print_kot`, no `billing_auto_bill_print`, no `printOrder` call.

### Delivered / Handover — triggers print today?
The "Delivered" label appears on delivery orders. The "Handover" button at fOS=5 for delivery is actually the **Bill button** (`handlePrintBill`) — it DOES print a bill. This is **by design** — it's an explicit user-clicked print action, not an auto-print.

| Button | Appears When | Handler | Prints? | Intended? |
|---|---|---|---|---|
| **Handover** (delivery fOS=5, non-prepaid) | `OrderCard.jsx` L953-964 | `handlePrintBill` | **YES — Bill** | **YES** — this IS the Bill button with a "Handover" label for delivery UX. Explicit user click. |
| **Settle** (delivery fOS=5, prepaid) | `OrderCard.jsx` L941-951 | `handleSettlePrepaid` | **NO** | YES — financial closure only |

**Key insight:** "Handover" is NOT a settlement action. It's the **Bill Print** action for delivery orders at fOS=5. The label changes to "Handover" for delivery UX but the handler is `handlePrintBill` — same as the "Bill" button for dine-in. This is intended behavior.

### Indirect / shared handler risk?
**NONE.** The print paths (`printOrder`, `autoPrintNewOrderIfEnabled`, auto-print in Collect Bill) are completely isolated from the settlement paths (`completePrepaidOrder`, `updateOrderStatus`). They share no handlers, no common callsites, and no callback chains. The only shared element is the `printOrder` import, which is a service function — it's only called when explicitly invoked.

### Print guard needed?
**NO frontend guard needed.** The frontend settle paths are already clean. If the reported "print on Settle" is real, it must be a **backend-side trigger** — the `paid-prepaid-order` endpoint may fire a print as a server-side side-effect. This requires backend investigation (BQ-03 from the consolidated planning doc).

---

## 9. Recommended Fix / No-Fix Decision

**A. No code fix needed; runtime QA only**

**Why:**
- All frontend Settle paths are verified clean — no `printOrder()` call, no print-related payload fields.
- autoKot only applies to Place Order / Update Order payloads (`print_kot` field).
- autoBill only applies to Place+Pay and Collect Bill paths (frontend `printOrder('bill')` + payload `billing_auto_bill_print` field).
- Settle, Ready, Serve, Dispatch — none call print functions or include print payload fields.
- The "Handover" button IS the Bill button (intended print action, explicit user click).
- If the owner's reported "print on settle" is reproducible, the cause is **backend-side** (the `paid-prepaid-order` endpoint may trigger a print as a server-side side-effect).

**Files that would be touched if fix needed:** None on frontend.

**Risk:** None from frontend. Backend print side-effect is the only unknown.

**Owner/backend questions:** BQ-03 (does `paid-prepaid-order` trigger backend-side print?) remains the single blocking question. If answer is YES → backend fix needed. If NO → PROD-BUG-002 is closed as "frontend already clean; reporter misidentification or aggregator-side print."

---

## 10. Runtime QA Matrix

| # | Test Case | autoKot | autoBill | Action | Expected KOT | Expected Bill | Notes |
|---|---|---|---|---|---|---|---|
| T1 | Place postpaid dine-in order | ON | OFF | Place Order | YES (backend via `print_kot:'Yes'`) | NO | KOT expected |
| T2 | Place postpaid dine-in order | OFF | OFF | Place Order | NO | NO | No print |
| T3 | Place+Pay prepaid dine-in | ON | ON | Place+Pay | YES (backend) | YES (frontend auto-print) | Both expected |
| T4 | Place+Pay prepaid dine-in | ON | OFF | Place+Pay | YES (backend) | NO | KOT only |
| T5 | Place+Pay prepaid dine-in | OFF | ON | Place+Pay | NO | YES (frontend auto-print) | Bill only |
| T6 | Collect Bill postpaid existing | OFF | ON | Collect Bill | NO | YES (frontend auto-print) | Bill on collect |
| T7 | Collect Bill postpaid existing | OFF | OFF | Collect Bill | NO | NO | No auto-print; manual Print Bill available |
| T8 | Settle prepaid non-PayLater | ON | ON | Click Settle | **NO** | **NO** | Settle = financial closure only |
| T9 | Settle prepaid PayLater | ON | ON | Click Settle | **NO** | **NO** | Same — completePrepaidOrder has no print |
| T10 | Auto-Settle prepaid | ON | ON | Auto-settle fires | **NO** | **NO** | Same API call as manual Settle |
| T11 | Serve prepaid (handleMarkServed) | ON | ON | Click Serve on prepaid | **NO** | **NO** | Calls completePrepaidOrder, not print |
| T12 | Serve non-prepaid | ON | ON | Click Serve | **NO** | **NO** | Calls updateOrderStatus('serve') only |
| T13 | Ready | ON | ON | Click Ready | **NO** | **NO** | Calls updateOrderStatus('ready') only |
| T14 | Dispatch delivery | ON | ON | Click Dispatch | **NO** | **NO** | Calls dispatchOrder() only |
| T15 | Handover (delivery fOS=5, non-prepaid) | — | — | Click Handover | **NO** | **YES** | This IS the Bill button — intended explicit print |
| T16 | Explicit KOT Print icon | — | — | Click KOT icon | **YES** | **NO** | Explicit user action — always prints |
| T17 | Explicit Bill Print button | — | — | Click Bill button | **NO** | **YES** | Explicit user action — always prints |
| T18 | Reprint KOT (RePrintButton) | — | — | Click Reprint KOT | **YES** | **NO** | Explicit |
| T19 | Reprint Bill (RePrintButton) | — | — | Click Reprint Bill | **NO** | **YES** | Explicit |
| T20 | QSR Place+Pay fresh | ON | ON | QSR Pay | YES (backend) | YES (frontend auto-print) | Both expected |
| T21 | Room order Place+Pay | ON | ON | Place+Pay | YES (backend) | **NO** (REQ3 AD-302A room suppression) | Room auto-bill suppressed |

---

## 11. Owner Questions

| Question ID | Question | Recommendation | Blocks? |
|---|---|---|---|
| OQ-B2-01 | Can you reproduce the "print on Settle" issue? Steps: (1) prepaid order at fOS=5, (2) click Settle specifically (NOT the Bill/Handover button), (3) observe if KOT or Bill prints. | N/A — determines whether this is a real bug or reporter misidentification | No — frontend is clean; answer determines if we escalate to backend |
| OQ-B2-02 | The "Handover" button for delivery at fOS=5 IS the Bill Print button (same handler as Bill). It prints a bill by design. Is this the action that was mistakenly reported as "Settle prints"? | Likely — "Handover" label may have caused confusion with "Settle" | No |
| OQ-B2-03 | Should the "Handover" button (delivery Bill) continue to print a bill? | YES — it's an explicit user-initiated print action | No |

---

## 12. Backend/API Questions

| Question ID | Question | Required Evidence | Blocks? |
|---|---|---|---|
| BQ-B2-01 | Does `POST /api/v2/vendoremployee/order/paid-prepaid-order` trigger any server-side print call (`order-temp-store` / KOT / Bill) as a side-effect? | Backend endpoint handler code inspection or test with print logging | **YES** — this is the single remaining unknown. If backend triggers print on settle, it's a backend bug. |
| BQ-B2-02 | Does the socket event emitted after `paid-prepaid-order` cause any downstream print on other connected clients (e.g., KDS print)? | Check socket event handlers on all clients | No — informational |

---

## 13. Final Status

**`prod_bug_002_trigger_investigation_complete_no_fix_needed_runtime_QA`**

Frontend is verified clean. All Settle paths call only `completePrepaidOrder()` with zero print fields and zero `printOrder()` calls. autoKot applies only to Place Order / Update Order. autoBill applies only to Place+Pay and Collect Bill. No indirect or shared handler risk exists. The only remaining unknown is whether the backend `paid-prepaid-order` endpoint fires a server-side print as a side-effect (BQ-B2-01).
