# QA Handover — INV-001: 1-Year Range Expansion
**Date:** 2026-07-10
**Items:** INV-001 (1-year range lift)
**Risk:** LOW
**Registry sync:** YES — EXIT GATE 5/5 PASS

---

## 1. Verification Matrix

| Edit # | File | Change | Self-Test |
|--------|------|--------|-----------|
| 1 | `DashboardMockup.jsx:70` | `MAX_RANGE_DAYS 62→365` | ✅ grep confirmed |
| 2 | `DashboardMockup.jsx:75` | Comment updated "2 months→1 year" | ✅ |
| 3 | `DashboardMockup.jsx:243` | Label "Max 2 months→Max 1 year" | ✅ |
| 4 | `DashboardMockup.jsx:265` | FY preset enabled (`isDisabledPreset = false`) | ✅ |
| 5 | `DashboardMockup.jsx:279` | FY tooltip updated | ✅ |
| 6 | `CancellationsMockup.jsx:189` | `MAX_RANGE_DAYS 62→365` | ✅ grep confirmed |
| 7 | `CancellationsMockup.jsx:381` | Label "Max 2 months→Max 1 year" | ✅ |
| 8 | `CancellationsMockup.jsx:407` | FY preset enabled | ✅ |
| 9 | `CancellationsMockup.jsx:417` | FY tooltip updated | ✅ |
| 10 | `CancellationsMockup.jsx:203` | FY case added to `handlePreset` | ✅ |
| 11 | `ItemSalesHybridMockup.jsx:163-166` | `MAX_RANGE_DAYS 62→365` + audit-rule updated | ✅ |
| 12 | `ItemSalesHybridMockup.jsx:196` | `auditVolumeExceeded` state added | ✅ |
| 13 | `ItemSalesHybridMockup.jsx:206-211` | Volume guard in audit `.then()` (>5000 orders) | ✅ |
| 14 | `ItemSalesHybridMockup.jsx:223` | Volume guard reset in date-change useEffect | ✅ |
| 15 | `ItemSalesHybridMockup.jsx:380-382` | FY case added to `handlePreset` | ✅ |
| 16 | `ItemSalesHybridMockup.jsx:945` | Label "Max 2 months→Max 1 year" | ✅ |
| 17 | `ItemSalesHybridMockup.jsx:1416` | Volume exceeded banner in Audit tab JSX | ✅ |

**Compile:** webpack compiled — 0 NEW warnings (2 pre-existing lint warnings unrelated to this change)

---

## 2. Test Cases for QA

### TC-01: Dashboard date picker allows 1-year range
1. Log in → navigate to Insights (Dashboard)
2. Set From = `2025-07-10`, To = `2026-07-10`
3. **Expected:** No red "Max" label, Apply button is active
4. Click Apply
5. **Expected:** Dashboard loads without error (may take 2–4s)

### TC-02: Dashboard FY preset is now active
1. On Insights Dashboard date picker
2. Click **FY** preset button
3. **Expected:** FY is NOT greyed out, clicking sets From = `2025-04-01`, To = `2026-03-31`
4. **Expected:** Data loads successfully

### TC-03: 62-day range still works (regression)
1. Set From = today - 60 days, To = today
2. **Expected:** Apply active, data loads correctly (same as before)

### TC-04: Cancellations allows 1-year range
1. Navigate to Insights → Cancellations
2. Set From = `2025-07-10`, To = `2026-07-10`
3. **Expected:** No "Max 2 months" label, Apply active
4. Apply → **Expected:** Data loads (may take 3–4s)

### TC-05: Cancellations FY preset
1. Click FY on Cancellations date picker
2. **Expected:** Sets FY dates, data loads

### TC-06: Item Report main view allows 1-year
1. Navigate to Insights → Item Sales
2. Set 1-year range, click Apply
3. **Expected:** Summary/Sales/Cancelled tabs load correctly via backend

### TC-07: Item Report Audit tab — small range (regression)
1. Set range to 30 days
2. Click Audit tab
3. **Expected:** Audit tab loads with data (FE-aggregated, < 5000 orders)
4. **Expected:** NO "Date range too large" banner

### TC-08: Item Report Audit tab — volume guard (if restaurant has >5000 orders/year)
1. Set range to 1 year
2. Click Audit tab
3. **Expected:** Amber banner: "Date range too large for Audit — select a shorter range"
4. **Expected:** Audit KPI cards show 0 (not crash)
*(Note: 18March restaurant has only 574 orders/year — this test requires a high-volume account)*

### TC-09: Sub-reports inherit 1-year range from Dashboard
1. On Dashboard, set 1-year range and Apply
2. Navigate to: Sales, Daily Sales, Tax Detail, Staff Servers
3. **Expected:** Each sub-report loads with the same 1-year range

### TC-10: Order Ledger still capped at 60 days (must NOT change)
1. Navigate to Order Ledger
2. Set range > 60 days
3. **Expected:** Red "Max" label appears, Apply disabled
4. **Expected:** 60-day cap is unchanged

---

## 3. Regression Tests
- All existing report presets (Today, 7D, 30D, MTD) still work on all 3 screens
- Settlement Report (already at 365 days) unaffected
- Order Ledger and Room Orders still capped (unchanged)

---

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: INV-001 (1-year range lift)
- EXIT GATE: ALL 5 PASSED

## 5. Credentials + Environment
- Account: `owner@18march.com` / `Qplazm@10`
- URL: https://core-checkout-3.preview.emergentagent.com
- Backend: https://preprod.mygenie.online
