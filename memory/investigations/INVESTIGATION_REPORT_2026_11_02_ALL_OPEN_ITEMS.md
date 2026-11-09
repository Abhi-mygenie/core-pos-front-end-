# Investigation Report — All Open Items (2026-11-02)

**Role:** INVESTIGATION
**Agent:** E1
**Scope:** CR-479 layout, BUG-623, BUG-625, BUG-626, BUG-628, BUG-629, BUG-630
**Account:** owner@palmhouse.com (RID 541)
**Steps Used:** 10/10

---

## 1. Summary

| # | Item | Classification | Confidence | Fix Location | Fixable? |
|---|------|---------------|------------|-------------|----------|
| 1 | BUG-626 | FE_BUG | HIGH | OrderReportBetaPage.jsx:48-58 | YES — 3 lines |
| 2 | BUG-623 | FE_BUG | HIGH | orderTransform.js:706,722 + CollectPaymentPanel.jsx:259,261 | YES — 4 lines |
| 3 | BUG-625 | FE_BUG | HIGH | Header.jsx:357-443 (tablet dropdown) | YES — ~15 lines |
| 4 | CR-479 Layout | FE_BUG | HIGH | CartPanel.jsx, CheckInPage form, CustomerModal, CollectPaymentPanel, RoomCheckInModal | YES — CSS/layout |
| 5 | BUG-628 | BACKEND_BUG | HIGH | Backend API — order_dispatch_status not persisted for fOS=5 | NO — BACKEND |
| 6 | BUG-630 | BACKEND_BUG | HIGH | Backend API — total_sales includes GST | NO — BACKEND |
| 7 | BUG-629 | NEEDS_DATA | MEDIUM | SettlementReportMockup.jsx — subtitle | NEEDS investigation with data |

---

## 2. Detailed Findings

### BUG-626 — getStatusBadge Missing Upi/Card/Room (~148 rows affected)

**Screenshot evidence:** Order Report Beta page (Oct 20-28) — STATUS column shows raw "upi" and "card" text instead of badges.

**Code location:** `/app/frontend/src/pages/reports-module/OrderReportBetaPage.jsx`
```
Line 48-58: getStatusBadge() map has 7 entries:
  Cash → "Paid", Unpaid, Cancel, Partial, TAB, prepaid, postpaid
  
MISSING:
  Upi → should map to "Paid" (blue badge)
  Card → should map to "Paid" (blue badge)  
  Room → should map to "Room" (purple badge)
```

**Fix:** Add 3 entries to the map object at line 55-57:
```js
Upi: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },
Card: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },
Room: { label: 'Room', cls: 'bg-purple-100 text-purple-800' },
```

**Risk:** LOW — additive change, no logic modification.

---

### BUG-623 — Null Variation Crashes orderTransform.reduce

**Code location:** `/app/frontend/src/api/transforms/orderTransform.js`
```
Line 706: item.variation.map(v => { ... })  — no null guard on v
Line 722: item.variation.reduce((sum, v) => { ... })  — no null guard on v
Line 1555: item.variation.reduce(...) — same pattern (second occurrence)
```

When aggregator/scan socket re-hydration includes null entries in variation array, `v.price` and `v.values` throw TypeError.

**Fix:** Add `.filter(Boolean)` before `.map()` at L706 and before `.reduce()` at L722 and L1555.

Also fix mismarked code in CollectPaymentPanel.jsx:
```
Line 259, 261: "// BUG-NEW" should be "// BUG-618"
```

**Risk:** LOW — defensive filter, no behavior change for valid data.

---

### BUG-625 — Active First Pill Missing from Tablet Dropdown

**Code location:** `/app/frontend/src/components/layout/Header.jsx`
```
Line 277: <nav className="hidden xl:flex ..."> — pills visible ONLY ≥1280px
Line 339-353: Active First toggle is INSIDE this xl-only nav
Line 357-443: Tablet dropdown (xl:hidden) has status/channel filters + Schedule
              BUT NO Active First toggle
```

On tablets (<1280px), the pills nav is hidden and replaced by a dropdown. The dropdown has:
- Channel view: channel filter buttons
- Status view: status filter buttons + Schedule button
- **NO Active First toggle in either branch**

**Fix:** Add Active First toggle button to the dropdown's status view branch (after Schedule, before closing `</>`), conditionally shown when `dashboardView === 'channel'` (same as the xl pill).

**Risk:** LOW — additive UI element in existing dropdown pattern.

---

### CR-479 — International Phone Layout Issues (5 screens)

**Screenshot evidence:** CartPanel and CheckInPage both show cramped flag picker layout — "🇮🇳 +91" picker + "Phone nu..." clipped.

**Screens affected:**
1. **CartPanel.jsx** (`/app/frontend/src/components/order-entry/CartPanel.jsx`) — NARROW panel, most critical
   - Line 850: `customerCountryCode` state
   - PhoneInputField component used at line ~10 (import)
   - Customer name + flag picker + phone all in a single row that's too narrow

2. **CheckInPage** (`/app/frontend/src/pages/CheckInPage.jsx`) — Walk-in form right panel
   - Same flag picker pattern, similarly cramped

3. **CustomerModal.jsx** — Full-width modal, less cramped but needs tablet check

4. **CollectPaymentPanel.jsx** — Credit/TAB phone input

5. **RoomCheckInModal.jsx** — PMS room check-in

**Fix approach (per handover recommendation):**
- Compact picker (flag + code only, no chevron, smaller width) for narrow panels (CartPanel, CollectPaymentPanel)
- Full picker for modals/pages (CustomerModal, CheckInPage, RoomCheckInModal)
- Responsive check at <1024px for all 5 screens

**Risk:** MEDIUM — UI layout across 5 files, but no logic changes.

---

### BUG-628 — Delivery Dispatch Button (BACKEND_BLOCKED)

FE fix already applied — button shows "On The Way" for manual dispatch (no rider). But backend doesn't persist `order_dispatch_status='Yes'` for fOS=5 orders.

**Status:** BACKEND_BLOCKED. Backend brief at `backend_briefs/BACKEND_BRIEF_BUG-628_DISPATCH_STATUS_2026_10_31.md`.

---

### BUG-630 — Net Sales Includes GST (BACKEND_BLOCKED)

Backend `total_sales` field includes GST. Should be Gross−Discount (net sales before tax).

**Status:** BACKEND_BLOCKED. Backend brief at `backend_briefs/BACKEND_BRIEF_BUG-630_NET_SALES_2026_10_31.md`.

---

### BUG-629 — Settlement Subtitle

Settlement Report page loaded but showed no data for today's date. Need historical date range to see the subtitle issue. 

**Status:** NEEDS further investigation with settlement data (change date range to see populated settlements).

---

## 3. Data Flow Traces

### BUG-626 Flow
```
API: /order-logs-report → Response: payment_type = "Upi"|"Card"|"Room"
  → Component: OrderReportBetaPage.jsx:572 → getStatusBadge(row.payment_type)
  → Map lookup: map["Upi"] → undefined → fallback { label: "Upi", cls: grey }
  → UI: Raw "upi" text shown instead of "Paid" badge
BREAK POINT: getStatusBadge map missing 3 payment types
```

### BUG-623 Flow
```
Socket: aggregator/scan order re-hydration → variation array includes null entries
  → Transform: orderTransform.js:706 → item.variation.map(v => { v.values... })
  → TypeError: Cannot read properties of null (reading 'values')
BREAK POINT: No .filter(Boolean) before .map()/.reduce() on variation array
```

### BUG-625 Flow  
```
Viewport: <1280px → CSS: "hidden xl:flex" hides pills nav
  → Tablet dropdown: xl:hidden shows status/channel filters
  → Active First toggle: ONLY in xl:flex pills nav (L339-353)
  → NOT mirrored in tablet dropdown (L357-443)
BREAK POINT: Active First not added to tablet dropdown
```

---

## 4. Evidence Artifacts

All screenshots saved to `/tmp/inv_*.png`:
- inv_03: Dashboard (1920px) — Active First pill visible
- inv_04/05: CartPanel — CR-479 cramped phone layout
- inv_08: Order Report Beta (Oct 20-28) — BUG-626 raw "upi"/"card" in STATUS
- inv_09: Settlement Report — BUG-629 area
- inv_10/11b: PMS Check-In Walk-in form — CR-479 phone layout  

---

## 5. Recommendations

### Immediate FE Fixes (no owner approval needed, all LOW risk):
1. **BUG-626** → DIRECT_BUG_FIX — 3 lines, 1 file
2. **BUG-623** → DIRECT_BUG_FIX — 4 lines, 2 files
3. **BUG-625** → DIRECT_BUG_FIX — ~15 lines, 1 file

### Layout Fix (owner feedback incorporated):
4. **CR-479 Layout** → IMPLEMENTATION — 5 files, CSS/layout only

### Backend Escalation:
5. BUG-628, BUG-630 — Follow up on backend briefs already sent

---

## 6. Retroactive Candidates
NONE — all items are registered and tracked.
