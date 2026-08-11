# Session Handover — 2026-07-30 (Investigation Closure: BUG-280 + BUG-281)

## Mandatory Header
Registry synced: YES | Scope drift: NO | Code changed: NO

---

## Role This Session
INVESTIGATION (Role 6) — both bugs

---

## Owner Decisions Received and Applied

| Bug | Decision | Answer |
|-----|----------|--------|
| BUG-280 OD-2 | `email` vs `cust_email` key | Keep `email: ''` as legacy. Do NOT add `cust_email`. Not used. |
| BUG-281 OD-1 | Backend key names for B2B GST | `custGST` and `custGSTName` (camelCase) — confirmed from live `order-temp-store` payload screenshot |

---

## Investigations Completed

### BUG-280 — Customer Details Not Sent to Settle API

**Status:** INVESTIGATION CLOSED — READY FOR PLANNING  
**Root cause:** `collectBillExisting` in `orderTransform.js` receives `customer` as 3rd arg but never puts it in the payload. `cust_name`, `cust_mobile`, `cust_membership_id` missing from every `order-bill-payment` call.  
**Fix scope:** 1 file, 3 lines  
**Report:** `/app/memory/evidence/BUG-280/BUG-280_INVESTIGATION_REPORT.md`

### BUG-281 — custGST/custGSTName Missing from Auto-Bill Print

**Status:** INVESTIGATION CLOSED — READY FOR PLANNING  
**Root cause:** CR-116 only wired `handlePrintBill` (1 of 5 paths). 4 paths missed:
- OrderEntry.jsx L1386 (QSR PlaceAndPay immediate)
- OrderEntry.jsx L1424 (QSR PlaceAndPay background)
- OrderEntry.jsx L2172 (main collect-bill auto-print)
- orderTransform.js `collectBillExisting` payload (backend auto-bill)  
**Fix scope:** 2 files, 8 lines  
**Report:** `/app/memory/evidence/BUG-281/BUG-281_INVESTIGATION_REPORT.md`

---

## Combined Planning Session (Next Step)

BUG-280 and BUG-281 **MUST be planned and implemented together** — they share a single edit location (`collectBillExisting` payload). Separate sessions would cause a merge conflict.

### Combined Fix Map

| # | File | Location | Change | Bug |
|---|------|----------|--------|-----|
| E1a | `orderTransform.js` | `collectBillExisting` payload ~L1639 | +3 lines: `cust_name`, `cust_mobile`, `cust_membership_id` | BUG-280 |
| E1b | `orderTransform.js` | `collectBillExisting` payload ~L1641 | +2 lines: `custGST`, `custGSTName` | BUG-281 |
| E2 | `OrderEntry.jsx` | L1386 overrides block | +2 lines: `custGST`, `custGSTName` | BUG-281 |
| E3 | `OrderEntry.jsx` | L1424 overrides block | +2 lines: `custGST`, `custGSTName` | BUG-281 |
| E4 | `OrderEntry.jsx` | L2172 collectBillOverrides | +2 lines: `custGST`, `custGSTName` | BUG-281 |

**Total: 2 files, 11 lines**

### What NOT to change
- `email: ''` in `collectBillExisting` (L1564) — leave as legacy
- `name: tabContact?.name` and `mobile: tabContact?.phone` — TAB credit tracking, untouched
- `handlePrintBill` overrides in CPP (already correct)
- `buildBillPrintPayload` (already correct)

---

## Other Open Items (pos_5_0 sprint)

| ID | Status | Next Step |
|----|--------|-----------|
| BUG-271 | IMPLEMENTED — AWAITING QA | QA agent |
| BUG-270 | IMPLEMENTED — AWAITING QA | QA agent |
| CR-117 | INTAKE | Planning |
| CR-118 | INTAKE | Planning (can proceed independently or with CR-106) |
| CR-119 | INTAKE — BLOCKED | Owner must supply MD spec + backend API docs |
| BUG-280+281 | INVESTIGATION CLOSED | **PLANNING NOW — combine both** |

---

## Test Credentials
- `owner@18march.com` / `Qplazm@10` (preprod — `https://preprod.mygenie.online`)
- Full file: `/app/memory/test_credentials.md`
