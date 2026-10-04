# Session Handover — CR-363 + CR-366 (Gate 2 CLOSED)

```
Written:         2026-09-14
Status at close: GATE 2 CLOSED for CR-363 + CR-366.
                 All ODs resolved. Design approved. Sidebar SC ack confirmed.
                 Both CRs advanced to Gate 3.
Next agent role: PLANNING — Gate 3 (Implementation Plan)
                 Start by probing revenue-summary?group_by=month (BN-6), then re-verify
                 target lines in source, then write the Implementation Plan.
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. Gate 2 closure summary

| Item | Status |
|---|---|
| Impact Analysis written | ✅ 2026-09-14 |
| R11 preprod probes | ✅ night-audit 200 · revenue-summary day/week 200 |
| All ODs resolved | ✅ (all 8 — see §2) |
| Design approved | ✅ mockup reviewed at `public/pms-mockup.html` |
| design_guidelines.json locked | ✅ |
| Sidebar SC ack | ✅ CR-363 + CR-366 (+ CR-365 Housekeeping if needed) |
| Backend null-fields brief filed | ✅ `BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14.md` |
| registry.json gate | ✅ both CR-363 + CR-366 → gate: 3 |
| CR_REGISTRY.md | ✅ both rows → GATE 2 CLOSED |

No source code changed. Gate 2 is fully closed.

---

## 2. All owner decisions — final record

| OD | Decision | Source |
|---|---|---|
| OD-363-01 | Business-day boundary = follow backend `business_day{}` | 2026-09-16 |
| OD-363-02 | Show both Sales (booked) AND Revenue (collected) | 2026-09-16 |
| OD-363-03 | F&B posted to rooms shown **separately** | 2026-09-16 |
| OD-363-04 | Read-only v1, no Close-Day lock | 2026-09-16 |
| OD-363-05 | Sidebar child under Rooms & Reservations | 2026-09-16 |
| OD-363-06 | Replay depth = unlimited / whatever backend provides | 2026-09-16 |
| OD-363-07 | Show room_status_close with **"as of now" badge** for past dates | 2026-09-14 |
| OD-363-08 | Ship with **"—"** for null guest fields + BE brief filed | 2026-09-14 |
| OD-366-01/02/03 | Revenue basis + OTA prepaid semantics defined | 2026-09-15 |
| OD-366-04 | Revenue Dashboard = sidebar child under Rooms & Reservations | 2026-09-14 |
| OD-366-05 | **No FE cache** — always live | 2026-09-14 |
| OD-366-06 | **No compare-to-previous-period** in v1 (noted for v2) | 2026-09-14 |
| OD-366-07 | Default date range = **last 7 days** | 2026-09-14 |
| OD-366-08 | **Option A — Side-by-side** (orange=Booked/Sales, green=Collected/Revenue) | 2026-09-14 |

**Sidebar SC ack:** ✅ Approved covering CR-363 + CR-366 (+ CR-365).

---

## 3. Gate 3 — Implementation Plan entry checklist

The next PLANNING agent must complete these at Gate 3 start **before** writing the plan:

- [ ] **BN-6 probe:** `GET …/aiosell/revenue-summary?start_date=2025-01-01&end_date=2025-12-31&group_by=month` → verify 200 + monthly `series[]` buckets
- [ ] **Re-verify target lines** (code may have changed since 2026-09-14):
  - `src/api/constants.js` — end of `AIOSELL_ENDPOINTS` block (was ~L596–597)
  - `src/api/services/pmsService.js` — EOF (append zone)
  - `src/App.js` — PMS routes block (was ~L264)
  - `src/components/layout/Sidebar.jsx` — `pms.children` array (was ~L241)
- [ ] **Confirm `utils/reportExporter.js` param contract** — verify `exportReportAsPDF` / `exportReportAsExcel` accept the same params as other PMS mockup pages (R-9)

Once these 3 items are done → write the Implementation Plan (Gate 3 doc).

---

## 4. Scope lock (finalised — do not change without owner approval)

**WILL change (8 files — build as one combined change-set):**
| File | Change | Type |
|---|---|---|
| `src/pages/pms/NightAuditPage.jsx` | New page — 8 sections, date picker, export | NEW |
| `src/api/transforms/nightAuditTransform.js` | Pure transform + `__tests__` | NEW |
| `src/pages/pms/RevenueDashboardPage.jsx` | New page — KPI tiles (side-by-side), 3 charts, 4 tables | NEW |
| `src/api/transforms/revenueTransform.js` | Pure transform + `__tests__` | NEW |
| `src/api/services/pmsService.js` | +`getNightAudit(date)` +`getRevenueSummary({startDate,endDate,groupBy})` | MOD |
| `src/api/constants.js` | +`AIOSELL_ENDPOINTS.NIGHT_AUDIT` +`REVENUE_SUMMARY` | MOD |
| `src/App.js` | +2 imports +2 ProtectedRoutes | MOD |
| `src/components/layout/Sidebar.jsx` | +`pms-night-audit` +`pms-revenue` children (SC ack done) | MOD |

**WILL NOT touch:** CollectPaymentPanel, OrderEntry, orderTransform, DashboardPage, LoadingPage (all R5), SettlementPanel, DayClosurePage, aiosellTransform, aiosellService, insightsCache, PmsCheckoutDrawer, CartPanel, RecordPaymentModal, reportService, utils/reportExporter.js (called only), utils/businessDay.js, any `/app/memory/final/*`.

---

## 5. Design lock (do not re-open)

- **OD-366-08:** Option A (side-by-side) is FINAL. Do not implement toggle (Option B) unless owner explicitly re-opens.
- **Design tokens:** `design_guidelines.json` — orange #F26B33 (Sales/Booked), green #329937 (Collected/Revenue). Do not deviate.
- **Mockup reference:** `public/pms-mockup.html` — exact section structure, card layout, badge styles.

---

## 6. Blocked CRs (unchanged — next in queue after CR-363/366)

- **CR-364 — Guest Folio.** Gate 2 not started. `get-single-order-new` enriched.
- **CR-357 — Room Advance `+ Pay`.** Gate 2 not started. `CartPanel.jsx:1484`.
- **BUG-193 — Room Transfer Trail.** Gate 0-1 intake. Related to BN-3 (audit_trail detail nulls).

---

## 7. Do-Not-Retry (all inherited)

1. No 2nd `revenue-summary` call inside Night Audit (endpoint already returns ADR/RevPAR).
2. No `fromDashboardKpisRange` — dropped from scope.
3. No client-side money math in transforms (R6).
4. Do not touch Sidebar before SC ack — SC ack is now done, but still touch it only ONCE in the combined change-set.
5. Do not combine gates or skip role declaration.
6. `insightsCache` NOT used (OD-366-05 = no cache).
7. OD-366-08 Option A is FINAL — do not implement toggle.

*Handover written 2026-09-14 · Planning agent (ALPHA v0.7)*
