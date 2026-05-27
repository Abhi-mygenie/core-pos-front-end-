# Reports — QA Handover (2026-05-01)

**Scope:** Validate the 12 changes shipped to the Reports module on 2026-05-01.
**Branch:** `CR-28-april`
**Backend env:** preprod (`https://preprod.mygenie.online`)
**No test agent. Manual QA only.**

---

## 1. Test credentials

| Tenant | Use for | Login | Status |
|---|---|---|---|
| **welcomeresort** | Primary — rich room-orders data, 14+ rooms with real settled/in-house mix | `owner@welcomeresort.com` / `Qplazm@10` | ✅ working |
| **18march** | Secondary — non-room data, cancelled-order coverage | `owner@18march.com` / `Qplazm@10` | ✅ working |
| **Mantri** | Optional — production-shape hotel | `owner@mantri.com` / `Qplazm#10` | ❌ **rejected by BE — get updated password from product before testing here** |

**Demo dates with rich data (welcomeresort):** 2026-04-26 / 2026-04-27 / 2026-04-29.

---

## 2. What's new (12 items to verify)

| # | Ticket | What changed | Files |
|---|---|---|---|
| 1 | BE-1 P1 | `waiter_name` → PUNCHED BY column. No more `Employee #<id>` fallback. | `reportService.js`, `reportTransform.js` |
| 2 | BE-1 P3 | `cancellation_reason` (canonical) → REASON column on Cancelled tab. | `reportService.js`, `reportTransform.js` |
| 3 | BE-1 P4 | `cancel_type` from item-level → new STATUS column on Cancelled tab. Verbatim render (`Pre-Serve` / `Post-Serve` / `Order` / `full`). | `reportService.js`, `OrderTable.jsx`, `ExportButtons.jsx` |
| 4 | BE-1 P5 | `table_name` → TABLE NO column. Dine-in rows show real labels (T1, 5, 109). | `reportService.js`, `reportTransform.js` |
| 5 | BE-1 P6 | RM rows show `R<room_no>` (e.g. `R109`) instead of generic "Room". | `reportService.js` |
| 6 | BE-1 P2 (paid) | `employee_name` → ACTIONED BY for paid rows ("counter2"). | `reportService.js` |
| 7 | BE-1 P2 (cancel item) | Item-level `cancel_by_name` → ACTIONED BY for item-cancelled rows. | `reportService.js` |
| 8 | UX | "Collected by" / "Cancelled by" / "Merged by" prefix removed from ACTIONED BY column. Show name only. | `OrderTable.jsx` |
| 9 | BE-2 derived | RoomRowCard math switched to `lodgingCollected = advance + receive_balance`. New Discount column (amber, only when > 0). | `orderTransform.js`, `RoomRowCard.jsx`, `RoomOrdersReportPage.jsx` |
| 10 | G3 cleanup | `optimisticRemovedIds` Set + 1.5s flicker removed from Room Orders Report. | `RoomOrdersReportPage.jsx`, `RoomRowCard.jsx` |
| 11 | Bill print | `/order-temp-store` payload now excludes cancelled items. Bill no longer prints cancelled lines. | `orderTransform.js` |
| 12 | Diagnostics | `[BE-1 INVARIANT]` + `[BE-1 PENDING]` + `[BE-2 INVARIANT]` + `[BILL-PRINT]` console loggers. Dev-mode only. | `reportService.js`, `orderTransform.js` |

---

## 3. Test scenarios

### 3.1 Audit Report (`/reports/audit`) — welcomeresort, 2026-04-29

#### Tab: All / Paid

| Column | Expected | Pass criteria |
|---|---|---|
| ORDER # | T-002274, R-... etc. | renders correctly |
| TABLE NO | T1 / 5 / R109 / R201 / "Walk-in" / "Takeaway" | NO `—` for rows with data; RM rows show `R<no>` |
| PUNCHED BY | `counter2`, `Owner`, real names | NO `Employee #1476` strings anywhere |
| ACTIONED BY | `counter2` etc. (just name, no prefix) | empty cell shows `—`, not orphan "Collected by " |
| AMOUNT, PAYMENT | unchanged | regression check |

#### Tab: Cancelled

Need: row from a tenant with order-level cancel + reason text. **18march has order 819018** ("Hdgshhshs" reason) — use 2026-04-28 there.

| Column | Expected |
|---|---|
| REASON | actual operator-entered text (e.g. `"Hdgshhshs"`, `"found something in good"`); blank when BE didn't capture |
| STATUS | `Pre-Serve`, `Post-Serve`, `Order`, `full` — verbatim from BE |
| ACTIONED BY | item-level `cancel_by_name` (e.g. `"counter2"`) or blank `—` |

#### CSV export
Click Export → open file → confirm columns include `Cancel Reason` AND `Cancel Status` for the Cancelled tab.

---

### 3.2 Room Orders Report (`/reports/rooms`) — welcomeresort

| Stat / Cell | Before | After |
|---|---|---|
| SummaryBar pills | Rooms · Total · Paid · Outstanding | Rooms · Total · Paid · **(Discount, only if > 0)** · Outstanding |
| Per-row strip | Total · Advance · Balance · Paid · Outstanding | Total · Advance · Balance · Paid · **Discount (only if > 0)** · Outstanding |
| Settled room paid | = billed amount | = `advance + receive_balance + food` (cash-in-till) |
| Settled room with cash gap | "Paid" overstated, gap absorbed | Discount stat shows the gap; `[BE-2 INVARIANT]` warns in console |

**Validation against welcomeresort 14 rooms (no actual discounts in this data):**
- Discount column hidden on every row ✓
- Discount summary stat hidden ✓
- Paid pill should equal sum of `advance + receive_balance` across visible rooms

#### Remove-from-Room flow
- Open a settled room on today/yesterday → tap "Remove from Room" on an SRM line.
- **Expected:** SRM disappears within ~200-400ms (single round-trip), NO 1.5s flicker, NO ghost SRM reappearance.
- Other rooms in the report remain visually unchanged during the action.

---

### 3.3 Bill print — `/order-temp-store`

Steps:
1. Open any in-progress order with at least 2 line items.
2. Cancel one of the items.
3. Tap "Print Bill" / collect-bill auto-print path.

**Expected:**
- Browser DevTools Network → `/order-temp-store` request body → `food_list` (or whatever the array key is) **does not include** the cancelled item.
- Browser console: `[BILL-PRINT] excluded N cancelled item(s) from /order-temp-store payload for order <id>`.
- Printed receipt → cancelled line item is absent.
- Computed total / GST / VAT on the print — drops the cancelled-item contribution.

**Edge cases to try:**
- All items cancelled → empty bill (acceptable; should not crash).
- Mix of cancelled + complimentary items → cancelled items hidden, complimentary still shown at ₹0.
- "Check In" marker — still excluded from print as before (regression check).

---

### 3.4 Console diagnostics (DevTools open during all the above)

Open browser DevTools → Console → reload report. Expect these signals:

| Tag | Fires when | Action if seen |
|---|---|---|
| `[BE-1 INVARIANT] /order-logs-report — N row(s) missing 'X'` | Backend regressed — a previously-shipped field stopped appearing | Capture screenshot, escalate to backend |
| `[BE-1 PENDING] /order-logs-report — N row(s) missing 'pending_X'` | Backend hasn't shipped X yet (expected — see Backend Note doc) | No action — these are tracked |
| `[BE-2 INVARIANT] settled room <id> (room <no>) has ₹<gap> cash gap` | Operator under-collected on a settled room | Verify with owner — this is a feature, not a bug |
| `[BILL-PRINT] excluded N cancelled item(s)` | Cancelled-item filter ran | Confirms fix is live |

**No `[BE-1 INVARIANT]` warnings should fire on welcomeresort 2026-04-29** if backend is healthy. Any output → bug to file.

---

## 4. Known issues — do NOT flag as bugs

| Symptom | Why |
|---|---|
| ACTIONED BY blank for whole-order cancels | Backend hasn't shipped order-level `cancel_by_name` yet (`canceled_by` is null). Item-level fallback only works when an item was actually cancelled within the order. |
| REASON blank on item-level cancels | Backend populates `cancellation_reason` only for order-level cancels. Inconsistent — backend ask filed. |
| ACTIONED BY blank for merged rows | No merged orders observed in any tenant audited yet. Backend ask filed. |
| Discount column always hidden in welcomeresort | No actual discount cases in this tenant's data. Will appear when a real cash gap occurs. |
| Mantri credentials rejected | `Qplazm#10` no longer valid for that tenant. Need updated password from product. |
| `balance_payment` shows non-zero on settled rooms in API | Backend doesn't zero it post-checkout. FE correctly ignores it via `f_order_status === 6` rule. Cosmetic backend issue only. |

---

## 5. Regression checks (high priority)

- [ ] Login still works (both tenants).
- [ ] Audit Report loads, all 4 tabs (All / Paid / Cancelled / Hold) populate.
- [ ] Filter by date / search by order id still works.
- [ ] CSV export downloads cleanly for all tabs.
- [ ] Detail sheet drill-down opens, shows full order info.
- [ ] Room Orders Report loads, expand-row works, Outstanding banner appears correctly.
- [ ] Auto-print on bill collection still triggers.
- [ ] No console errors (only the documented `[BE-1 *]` / `[BE-2 *]` / `[BILL-PRINT]` informational lines).
- [ ] Hot-reload picked up changes (no need for full server restart).

---

## 6. Files changed (for review reference)

```
frontend/src/api/services/reportService.js
frontend/src/api/transforms/reportTransform.js
frontend/src/api/transforms/orderTransform.js
frontend/src/components/reports/OrderTable.jsx
frontend/src/components/reports/ExportButtons.jsx
frontend/src/components/reports/RoomRowCard.jsx
frontend/src/pages/RoomOrdersReportPage.jsx
```

No backend files touched. No `.env` changes. No new dependencies.

---

## 7. Sign-off checklist

- [ ] All 12 items in §2 verified against welcomeresort
- [ ] Cancelled tab verified against 18march (or another tenant with cancelled orders)
- [ ] Bill print verified with cancelled item
- [ ] Remove-from-Room flow tested and feels snappier
- [ ] No regressions in §5
- [ ] Console output matches §3.4 expectations
- [ ] Known issues in §4 NOT raised as bugs

**Sign-off owner:** _____________
**Date completed:** _____________
**Tenants tested:** _____________

---

## 8. Escalation paths

- **Frontend bug found:** capture browser console output + network request payload + tenant + date → file under reports module.
- **Backend regression detected (`[BE-1 INVARIANT]` fires):** screenshot console + send to backend team — see `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md`.
- **Discount surfaces unexpectedly (`[BE-2 INVARIANT]` fires on a healthy room):** verify with owner — likely a real cash gap, not a bug.

**End of QA handover.**
