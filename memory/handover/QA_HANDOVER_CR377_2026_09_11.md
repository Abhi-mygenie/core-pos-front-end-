# QA Handover — CR-377
## Sales Report Complete Redesign (OrderSummaryPage)

**Date:** 2026-09-11
**Item:** CR-377 — Sales Report redesign (9 edits across 2 files + BUG-393 absorbed)
**Sprint:** pos_7_0
**Risk:** MEDIUM (report display, no financial logic changed)
**Written by:** PLANNING agent from implementation plan V1-V15

---

## § 1 — What Was Changed (from session handover)

| Edit | File | Change |
|---|---|---|
| F1-E1 | `reportService.js` L396-520 | +`to:` fix (BUG-393), +`profitLoss`, +`paymentBreakdown` ×3 (zomatoGold/partial/roomCheckin), +`tabSettled` creditCash/Card/UPI, +`room` advance/checkout/checkin ×4, +`expense` ×10, +`purchase` ×10, +`galla` ×8 |
| P2-E1 | `OrderSummaryPage.jsx` | Imports: TrendingDown, Receipt, ShoppingCart, Wallet added |
| P2-E2 | `OrderSummaryPage.jsx` | `paymentPercentages` useMemo extended to include zomatoGold, partial, roomCheckin |
| P2-E4 | `OrderSummaryPage.jsx` | Title: "Daily Summary" → "Sales Report" |
| P2-E3 | `OrderSummaryPage.jsx` | KPI grid 5 → 6 columns + P&L card (amber theme, TrendingUp/Down) |
| P2-E5 | `OrderSummaryPage.jsx` | Payment breakdown: +Zomato Gold, +Partial, +Room Checkin rows (non-zero gated) + Total updated |
| P2-E6 | `OrderSummaryPage.jsx` | TAB section: +Credit Cash/Card/UPI breakdown (non-zero gated) |
| P2-E7 | `OrderSummaryPage.jsx` | Room section: +Room Advance, +Room Checkout rows; +Check-In Revenue sub-card |
| P2-E8 | `OrderSummaryPage.jsx` | NEW: Galla/Cash Drawer section; NEW: Expense section; NEW: Purchase section |

Self-test (from session handover): `webpack compiled with 1 warning` (pre-existing ESLint warning in OrderEntry.jsx:1311 — unrelated). 0 NEW warnings from CR-377. EXIT GATE: 5/5 PASS.

---

## § 2 — Test Cases (V1–V15)

### Page Load + Title (V1, V2)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V1 | BUG-393 `to:` fix | Login → Sidebar → Sales Report → open Network tab → observe POST request to daily-sales-revenue-report | POST payload contains both `from: "YYYY-MM-DD"` and `to: "YYYY-MM-DD"` | — |
| V2 | Title rename | Login → Sidebar → Sales Report | Page heading shows **"Sales Report"** (not "Daily Summary") | — |

### KPI Strip (V3)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V3 | 6th KPI card (P&L) | Sales Report page → KPI row | 6 cards visible. 6th card: "P&L" label, amber theme, shows profit (green) or loss (red), TrendingUp/TrendingDown icon | `profit-loss-card` |

### Payment Breakdown (V4, V5)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V4 | Zomato Gold / Partial rows | Navigate to a date/account with Zomato Gold or Partial payments | "Zomato Gold" row (red bar) visible in payment breakdown. "Partial" row (yellow bar) visible. Both show non-zero values only | — |
| V5 | Payment breakdown Total | Check Total row in payment breakdown | Total now sums Cash + Card + UPI + Room + ZomatoGold + Partial + RoomCheckin (not just Cash+Card+UPI) | — |

### TAB Section (V6)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V6 | Credit breakdown | Navigate to account/date with TAB credit settlements | "Credit Collections" sub-section appears inside TAB card when creditCash/creditCard/creditUpi > 0 | — |

### Room Section (V7, V8)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V7 | Room Advance + Checkout | Navigate to account with room features (features.room enabled) → check Room card | "Room Advance" and "Room Checkout" rows appear in Room card when > 0 | `room-section` |
| V8 | Check-In Revenue block | Same as V7, account with check-in payments | Separate "Check-In Revenue" card appears (Cash/Card/UPI/TAB breakdown) when any checkin > 0 | `room-checkin-section` |

### Galla Section (V9)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V9 | Galla section renders | Navigate to account/date with galla data (opening balance or today_galla > 0) | "Galla / Cash Drawer" section visible with amber theme: Cash Drawer count, Cash Position card, Settlement+P&L card | `galla-section` |

### Expense + Purchase (V10, V11, V12)

| # | Test | Steps | Expected | testid |
|---|---|---|---|---|
| V10 | Expense section | Account/date with expense entries | "Expense" section renders with rose theme, total badge, non-zero payment method rows only | `expense-section` |
| V11 | Purchase section | Account/date with purchase entries | "Purchase" section renders with cyan theme, total badge, non-zero rows only | `purchase-section` |
| V12 | Combined total | Expense section footer when purchase.combinedTotal > 0 | "Combined (Exp + Purchase)" total row appears at bottom of Expense card | — |

### Regression (V13, V14, V15)

| # | Test | Steps | Expected |
|---|---|---|---|
| V13 | Existing KPI cards intact | Sales Report → KPI strip | All 5 original cards still present: Sales, Paid Revenue, Running Orders, TAB, Cancelled. Values match Network response |
| V14 | Zero sections absent | Login as `owner@cafe103.com` (RID 644 — no expense/purchase/galla data today) | Galla section, Expense section, Purchase section all **hidden** (non-zero gate working) |
| V15 | Compile / no new warnings | Sidebar → Sales Report → observe no JS errors in console | No console errors from CR-377 code. Page loads without blank/crash |

---

## § 3 — Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | All existing payment methods (Cash/Card/UPI/Room) still show correctly | E5 total formula change — verify originals not lost |
| R2 | Page renders correctly when ALL new sections are zero (Normal restaurant with no expense/room/galla) | All new sections are non-zero gated — must be invisible |
| R3 | `_raw` field does NOT appear in production build output | `process.env.NODE_ENV !== 'development'` gate in reportService.js |

---

## § 4 — Registry Sync Confirmation

| Field | Value |
|---|---|
| Registry synced | YES |
| Items | CR-377 (+ BUG-393 absorbed) |
| Sprint | pos_7_0 |
| Gate | 5 (IMPLEMENTED) |
| EXIT GATE | 5/5 PASS |

- ☑ 1. registry.json: CR-377 → gate 5, IMPLEMENTED, pos_7_0
- ☑ 2. CR_REGISTRY.md: row updated
- ☑ 3. FILE_OWNERSHIP.md: reportService.js + OrderSummaryPage.jsx listed
- ☑ 4. Code markers: `// CR-377` on all added blocks
- ☑ 5. Compile: webpack compiled with 0 NEW warnings

---

## § 5 — Credentials + Environment

| Account | URL | Use for |
|---|---|---|
| `owner@cafe103.com` / `Qplazm@10` | `https://preprod.mygenie.online` | V2 (title), V3 (KPI), V14 (zero-state regression), V15 (no errors) |
| Account with room features | `https://preprod.mygenie.online` | V7, V8 (room sections) — use hogwarts (RID 618) if room-enabled |
| Account with expense/purchase data | `https://preprod.mygenie.online` | V10, V11, V12 — check if cafe103 has any expense data |

**Route:** Login → Sidebar → "Sales Report" (was "Daily Summary")

---

*QA handover written by QA agent — 2026-09-11*
*Source: CR-377_IMPLEMENTATION_PLAN.md V1-V15*
