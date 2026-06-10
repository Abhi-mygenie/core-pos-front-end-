# Handover Note — Next Agent

## Session Summary (June 10, 2026)
Deployed MyGenie POS frontend from GitHub (branch `10-june`). Across 2 sessions, worked on 8 CRs: CR-018 (verified), CR-020 (13 bugs fixed + B11 parked), CR-021 (4 split payment bugs), CR-022 (food type filters — closed), CR-023 (bulk editor perf), CR-024 (channel visibility override), CR-025 (discount payload fix). Report investigation parked.

## What's Done — Ready for Owner Smoke Test

| CR | What to test |
|----|-------------|
| **CR-021** | Split payment: Cash ₹50 + UPI ₹100 on ₹150 bill → check network has `payment_mode: "partial"` + `partial_payments[]` |
| **CR-023** | Bulk Editor: type in Name/Description with 400+ items → should be instant, yellow on blur |
| **CR-024** | StatusConfigPage → Channel Visibility: only API-enabled channels should appear. Toggle Takeaway OFF in Restaurant Settings → save → Channel Visibility should show only 3 cards |
| **CR-025** | Apply 20% discount on ₹1000 order → check payload: `order_discount: 200` (₹ amount, not 20), `self_discount: 0` |
| **CR-020 B12-B15** | GST Mode labels "Item Level"/"Restaurant Level", dynamic hint, Short Code is toggle |

## What's Parked (Needs Login Credentials)

| Item | Why |
|------|-----|
| **CR-020 B11** | Channel dropdown filter — code done + debug logs added, needs to see actual profile API response |
| **CR-018** | Schedule Order — all 10 gaps verified in code, needs live QA |
| **Report sequence** | Bill summary in OrderDetailSheet has wrong sequence + data mapping gaps — investigation only, no CR registered |

## Key Decisions Made This Session

| Decision | Owner pick |
|----------|-----------|
| CR-022: Filter style | Enum-based (`itemType === 0/1/2/3`) |
| CR-023: Yellow on blur | Yes — standard spreadsheet behavior |
| CR-023: Auto-blur on Save | Yes |
| CR-024: Default override OFF | Yes — API drives visibility |
| CR-025: `self_discount` | Send as 0 (keep field) |
| CR-025: `order_discount` | Send flat ₹ amount, not percentage |

## Environment
- **Preview URL:** `https://restaurant-pos-test-1.preview.emergentagent.com`
- **Frontend:** Port 3000, craco + React 19
- **Backend:** Port 8001, FastAPI (placeholder — app uses external APIs)
- **External APIs:** `preprod.mygenie.online`, `presocket.mygenie.online`, `crm.mygenie.online`
- **No login credentials available** — all testing was code-level + structural verification

## Key Docs
| Doc | Purpose |
|-----|---------|
| `/app/memory/PRD.md` | Full PRD with implementation history |
| `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md` | Schedule order — all 10 gaps |
| `/app/memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md` | 15 settings bugs |
| `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md` | Split payment P0 bugs |
| `/app/memory/change_requests/CR_022_MENU_FOOD_TYPE_FILTERS.md` | Food type filters — CLOSED |
| `/app/memory/change_requests/CR_023_BULK_EDITOR_TYPING_LAG.md` | Bulk editor perf fix |
| `/app/memory/change_requests/CR_024_CHANNEL_VISIBILITY_OVERRIDE.md` | Channel override + save type |
| `/app/memory/change_requests/CR_025_DISCOUNT_PAYLOAD_FIX.md` | Discount payload alignment |
| `/app/test_reports/iteration_*.json` | 7 test iterations |
