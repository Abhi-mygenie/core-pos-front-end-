# QA HANDOVER — Cluster C (Order Report Beta FE batch) — 2026-11-20

**From:** IMPLEMENTATION · **Items:** BUG-724/725/726/727/737 (BUG-728 PARKED) · **Risk:** LOW/MEDIUM
**Build:** webpack compiles clean (0 new warnings). **Login (preprod):** `owner@cafe103.com` / `Qplazm@10`.
**Routes:** Order Beta → `/reports-module/order-report-beta` · Audit/AllOrders → `/reports/audit`.

## Self-test done
- Code edits verified in place; `permissions` fully removed from AllOrders; `useEffect` still used (import valid); webpack clean.
- ⚠ Authenticated browser verification NOT completed by implementer — the screenshot tool opens a fresh unauthenticated context per navigation, so the logged-in Order Beta view couldn't be captured. QA to run the cases below with the creds above.

## Browser cases for QA
1. **BUG-725** — Open Order Beta; Payment column shows **UPI / Card / Room / Merged** (not raw `upi/card/room/merge`); any other method is Title-Cased, never raw-lowercase.
2. **BUG-726** — On All/Cancelled tabs, cancelled rows: the **Actions column stays aligned** (no shifted cells); the cancel reason appears as small red text **under the Status pill**. Check @1920 and @390.
3. **BUG-724 (stale)** — Throttle network; change the date range twice quickly / spam Apply → the **newest** result is shown (older response never overwrites it).
4. **BUG-724 (flash)** — On first load, the KPI cards and the right-side summary show **"—"** (not `0 orders / ₹0`) until data arrives; a genuinely empty range still shows the empty-state.
5. **BUG-727** — Open browser console on Order Beta → **no** "whitespace text nodes cannot appear as a child of `<tr>`" warning.
6. **BUG-737** — Open `/reports/audit` → console shows **no** `[CR-003 DIAGNOSTIC] Logged-in user/permissions` log on mount.

## Regression
- Order Beta Apply still fetches the range; Excel/PDF export, other tabs, split-row action gating (BUG-735) unaffected.
- Other DatePicker reports (AllOrders/RoomOrders/OrderSummary) unaffected.

## Registry
Synced: YES · 724/725/726/727/737 → GATE_5A_IMPLEMENTED · BUG-728 PARKED · sprint nov_cr_batch.
