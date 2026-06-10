# MyGenie POS Frontend — PRD & Session Log

## Original Problem Statement
Deploy React frontend from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `10-june`) into `/app`. Frontend-only deployment connecting to external APIs.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend**: FastAPI (minimal placeholder — app connects to external APIs)
- **External APIs**:
  - `https://preprod.mygenie.online/` — Main API
  - `https://presocket.mygenie.online` — Socket server
  - `https://crm.mygenie.online/api` — CRM API
- **Firebase**: Push notifications, analytics

## User Personas
- **Restaurant Owner (Abhi)**: Configures restaurant settings, reviews reports, manages operations
- **Cashier**: Takes orders, collects bills, manages split payments
- **Kitchen Staff**: Views KDS, updates food status

## Core Requirements
- POS frontend deployment with all env vars configured
- Restaurant Settings wizard (CR-019) must work correctly
- Collect Bill split payment flow must work correctly (CR-021)
- Order type dropdown must respect channel settings
- Menu management filters must work correctly
- Discount payload must send correct values to backend

---

## What's Been Implemented

### Session 1 (June 10, 2026) — Deployment + CR-020

#### Deployment ✅
- Cloned repo from branch `10-june` into `/app`
- Set up all 14 environment variables (Firebase, API URLs, socket)
- Frontend compiles and serves successfully

#### CR-020: Restaurant Settings Bug Sweep (15 bugs)
- **Phase 1 (B1, B9, B10):** ✅ SIGNED OFF
- **Phase 2 (B3, B5, B6):** ✅ SIGNED OFF
- **Phase 3 (B7, B8, B4):** ✅ SIGNED OFF
- **Phase 4 (B11):** Code done — PARKED (needs login creds to debug API response)
- **B12-B15:** Code done — awaiting owner smoke test

### Session 2 (June 10, 2026) — CR-021 through CR-025

#### CR-021: Collect Bill Split Payment ✅ IMPLEMENTED
| Bug | Fix | Status |
|-----|-----|--------|
| B1 | `partial_payments` attached when `splitPayments.length > 0` + `payment_mode: "partial"` | ✅ Done |
| B2 | useEffect clears all split amounts on bill change | ✅ Done |
| B3 | Card Txn ID neutral when card amount=0 | ✅ Done |
| B4 | Pay button disabled when split sum < total | ✅ Done |

#### CR-022: Menu Food Type Filters ✅ CLOSED
- Root cause: `item_type` from API was string, strict `===` against numbers failed
- Fix: `Number()` coercion in transform + enum-based filter in ProductList
- Owner QA passed

#### CR-023: Bulk Editor Typing Lag ✅ IMPLEMENTED
- Root cause: 422 rows re-rendered on every keystroke (4,220 component re-creates)
- Fix: `LocalTextInput` (type locally, flush on blur) + `React.memo` on CellRenderer + auto-blur on Save
- Awaiting owner smoke test

#### CR-024: Channel Visibility Override ✅ IMPLEMENTED
- Bug A: `take_away`/`delivery` save as boolean instead of `"Yes"`/`"No"` — fixed with `toYesNo()`
- Bug B: Override UI shows all 4 channels regardless of API — now filters by `features`
- Default override changed to OFF for new users
- Stale channels cleaned on save
- Awaiting owner smoke test

#### CR-025: Discount Payload Fix ✅ IMPLEMENTED
- `order_discount` now sends ₹ amount (`discounts.manual`) instead of percentage
- `self_discount` zeroed across all 3 paths (prepaid, postpaid, transferToRoom)
- Prepaid now sends `comm_discount`, `discount_value`, `discount_type` (was missing)
- All 3 paths (prepaid/postpaid/transferToRoom) are now symmetric
- Awaiting owner smoke test

#### CR-018: Schedule Order ✅ VERIFIED
- All 10 gaps (G1-G10) confirmed implemented in codebase
- Awaiting owner smoke test + login creds for live QA

---

## Prioritized Backlog

### P0 (Immediate — awaiting smoke tests)
1. **CR-025** — Discount payload: verify `order_discount` sends ₹ amount on preprod
2. **CR-021** — Split payment: verify `payment_mode: "partial"` + `partial_payments[]` in network tab
3. **CR-024** — Channel visibility: verify override only shows API-enabled channels

### P1 (Needs login credentials)
4. **CR-020 B11** — Channel dropdown: debug what profile API returns for disabled channels
5. **CR-018** — Schedule Order: live QA on all 10 gaps

### P2 (Parked — investigation only)
6. **Report bill summary** — sequence wrong + data mapping gaps in OrderDetailSheet (not yet registered as CR)
7. **Report discount fields** — `order_discount`, `discount_member_category_id/name` not read back

### P3 (Future)
8. ESLint warnings cleanup
9. Remove DEBUG-B11 console.log statements after channel dropdown resolved

---

## Test Reports
| Iteration | Scope | Result |
|-----------|-------|--------|
| 1 | Initial deployment | 100% pass |
| 2 | CR-020 Phase 1 (B1, B9, B10) | 100% pass |
| 3 | CR-020 Phase 2 (B3, B5, B6) | 100% pass |
| 4 | CR-020 Phase 3 (B7, B8, B4) | 100% pass |
| 5 | CR-020 Phase 4 (B11) | 100% pass |
| 6 | CR-020 B12-B15 | 100% pass |
| 7 | CR-021 B1-B4 (code-level) | 100% pass |

---

## Key Files Modified (All Sessions)
| File | CRs |
|------|-----|
| `src/api/transforms/restaurantSettingsTransform.js` | CR-020 B1/B15, CR-024 Bug A |
| `src/api/services/restaurantSettingsService.js` | CR-020 B9 |
| `src/pages/RestaurantSettingsPage.jsx` | CR-020 B3-B8/B12-B15 |
| `src/components/order-entry/OrderEntry.jsx` | CR-020 B11 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | CR-021 B2/B3/B4 |
| `src/api/transforms/orderTransform.js` | CR-021 B1, CR-025 |
| `src/components/panels/menu/ProductList.jsx` | CR-022 |
| `src/api/transforms/menuManagementTransform.js` | CR-022 |
| `src/components/panels/menu/BulkEditor.jsx` | CR-023 |
| `src/pages/StatusConfigPage.jsx` | CR-024 Bug B |
| `src/pages/DashboardPage.jsx` | CR-024 default |
| `src/api/transforms/profileTransform.js` | CR-020 B11 debug logs |

## Change Request Docs
- `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md`
- `/app/memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md`
- `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md`
- `/app/memory/change_requests/CR_022_MENU_FOOD_TYPE_FILTERS.md`
- `/app/memory/change_requests/CR_023_BULK_EDITOR_TYPING_LAG.md`
- `/app/memory/change_requests/CR_024_CHANNEL_VISIBILITY_OVERRIDE.md`
- `/app/memory/change_requests/CR_025_DISCOUNT_PAYLOAD_FIX.md`
