# SESSION HANDOVER — 2026-10-05 — PLANNING GATE 2+3 COMPLETE

**Date:** 2026-10-05
**Role:** PLANNING (Gate 2+3)
**Items:** BUG-487 · BUG-485 · CR-407

---

## Status

All three items: **GATE_3_PLAN_COMPLETE** — awaiting Gate 4 GO.

| Item | IA doc | Plan doc | Edits | Files |
|------|--------|----------|-------|-------|
| BUG-487 | `impact/BUG-487_IMPACT_ANALYSIS.md` | `plans/BUG-487_IMPLEMENTATION_PLAN.md` | 1 edit · E-1 | `orderTransform.js` (R5) |
| BUG-485 | `impact/BUG-485_IMPACT_ANALYSIS.md` | `plans/BUG-485_IMPLEMENTATION_PLAN.md` | 4 edits · E-1..E-4 | `DashboardMockup.jsx` |
| CR-407 | `impact/CR-407_IMPACT_ANALYSIS.md` | `plans/CR-407_IMPLEMENTATION_PLAN.md` | 11 edits · A-E1..A-E5 · B-E1..B-E6 · C-E1..C-E3 | `CheckInPage.jsx` · `pmsService.js` · `FolioCheckoutPanel.jsx` |

---

## Plans summary

### BUG-487 (1 edit, R5, ~6 lines)
- `orderTransform.js:414–415`: rename `discount_amount` → `room_discount_amount`, `discount_reason` → `room_discount_reason`; add `roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType` mappings; replace stale comment.

### BUG-485 (4 edits, ~60 lines)
- Add import `exportReportAsExcel / exportReportAsPDF / openReportWindow`
- Add `buildExportPayload()` → 5 sheets: By Channel, By Payment, Top Items, Discounts, Customers
- Add `handleDownloadAction(action)` dispatching pdf/excel
- Wire `onClick` + `disabled={!tiles}` on both PDF/Excel buttons

### CR-407 (11 edits, ~135 lines, CRITICAL)
- **Sub-scope A** (check-in): 2 state vars + useMemo (₹ compute) + pmsCheckIn call params + Amount/Percent UI row + pmsService fd.append (conditional, 4 fields)
- **Sub-scope B** (checkout expand): 2 state vars + apply_to selector (room/both/food) + Amount/Percent toggle in RoomSection + updated handlePaid inject (Percent compute + apply_to routing) + deps update
- **Sub-scope C** (partial_payments_room): 2 state vars + room-split toggle + leg rows UI (mode+amount) + handlePaid inject filter + deps update

---

## Gate 4 preconditions

| Item | Precondition | Clear? |
|------|-------------|--------|
| BUG-487 | None | ✅ |
| BUG-485 | None | ✅ |
| CR-407 | CheckInPage.jsx: verify BUG-419/420 line status at Step 0 | ⚠ declare in plan |

---

## Next

Owner gives **"Gate 4 GO"** for one or all items → IMPLEMENTATION role.
Recommended order: BUG-487 first (1 file, simplest), BUG-485 second (1 file), CR-407 last (3 files, CRITICAL).
