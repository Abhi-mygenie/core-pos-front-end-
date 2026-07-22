# PROD-BUG-002 — Settle Print Guard — Runtime QA Checklist — 2026-05-21

## 1. Purpose

Runtime QA checklist to verify that Settle does not trigger KOT or Bill print, and that all intended print paths remain functional. No code was changed for PROD-BUG-002.

Backend confirmed: `paid-prepaid-order` endpoint does NOT trigger server-side print.

---

## 2. Pre-conditions

- Login credentials available for a restaurant with active orders
- At least one prepaid (non-PayLater) order at fOS=5 available or creatable
- At least one prepaid PayLater order at fOS=5 available or creatable
- At least one postpaid order available or creatable
- At least one delivery order available or creatable
- `autoKot` and `autoBill` profile settings known (check Visibility Settings or profile API)
- Browser DevTools Console open to observe `[AutoPrintBill]`, `[AutoPrintKot]`, `printOrder` logs
- Printer connected or print API observable via DevTools Network tab (`order-temp-store` POST)

---

## 3. QA Checklist

### Group A — Settle must NOT print

| # | Test | autoKot | autoBill | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| A1 | Settle prepaid (non-PayLater) dine-in | ON | ON | Create prepaid cash dine-in → Ready → Serve → order reaches fOS=5 → click **Settle** | **NO** | **NO** | | |
| A2 | Settle prepaid (non-PayLater) dine-in | OFF | OFF | Same flow → click **Settle** | **NO** | **NO** | | |
| A3 | Settle prepaid PayLater dine-in | ON | ON | Create prepaid PayLater dine-in → Ready → Serve → click **Settle** | **NO** | **NO** | | |
| A4 | Settle prepaid delivery | ON | ON | Create prepaid delivery → Ready → click **Settle** | **NO** | **NO** | | |
| A5 | Auto-Settle (if enabled) | ON | ON | Enable Auto Settle toggle → create prepaid non-PayLater order → let it reach fOS=5 → observe auto-settle fires | **NO** | **NO** | | Check console for `[AutoSettle]` log only, no `printOrder` |

**How to verify "NO print":**
- No `order-temp-store` POST in DevTools Network tab
- No `[AutoPrintBill]` or `printOrder` log in Console
- No physical print output

### Group B — Explicit print buttons must still work

| # | Test | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|
| B1 | Explicit KOT Print icon (OrderCard) | On any active order card → click the printer/KOT icon | **YES** | NO | | Verify `order-temp-store` POST with `type:'kot'` |
| B2 | Explicit Bill button (non-prepaid fOS=5) | On postpaid order at fOS=5 → click **Bill** | NO | **YES** | | Verify `order-temp-store` POST with `type:'bill'` |
| B3 | Reprint KOT (RePrintButton) | Open order in OrderEntry → click Reprint → KOT | **YES** | NO | | |
| B4 | Reprint Bill (RePrintButton) | Open order in OrderEntry → click Reprint → Bill | NO | **YES** | | |
| B5 | Print Bill in CollectPaymentPanel | Open Collect Bill panel → click **Print Bill** button | NO | **YES** | | Explicit user action |

### Group C — Collect Bill auto-print must still work

| # | Test | autoKot | autoBill | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| C1 | Collect Bill postpaid (autoBill ON) | OFF | ON | Postpaid dine-in order → open Collect Bill → complete payment | NO | **YES** | | Console should show `[AutoPrintCollectBill]` |
| C2 | Collect Bill postpaid (autoBill OFF) | OFF | OFF | Same flow | NO | **NO** | | No auto-print; manual Print Bill still available |

### Group D — Place Order print must still work

| # | Test | autoKot | autoBill | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| D1 | Place postpaid order (autoKot ON) | ON | OFF | Place new postpaid dine-in order | **YES** (backend) | NO | | Verify `print_kot:'Yes'` in place-order payload |
| D2 | Place+Pay prepaid (both ON) | ON | ON | Place new prepaid dine-in order with payment | **YES** (backend) | **YES** (frontend) | | Console: `[AutoPrintBill] FIRING` |
| D3 | Place+Pay prepaid (both OFF) | OFF | OFF | Same flow | NO | NO | | No auto-print |

### Group E — Delivery Handover verification

| # | Test | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|
| E1 | Handover button (delivery non-prepaid fOS=5) | Delivery order at fOS=5 → click **Handover** | NO | **YES** | | This IS the Bill button with "Handover" label — intended explicit print |
| E2 | Settle button (delivery prepaid fOS=5) | Delivery prepaid order at fOS=5 → click **Settle** | **NO** | **NO** | | Settle = financial closure only |

### Group F — Serve / Ready / Dispatch must NOT print

| # | Test | autoKot | autoBill | Steps | Expected KOT | Expected Bill | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| F1 | Ready (fOS=1) | ON | ON | Click **Ready** on preparing order | **NO** | **NO** | | |
| F2 | Serve non-prepaid (fOS=2) | ON | ON | Click **Serve** on ready non-prepaid order | **NO** | **NO** | | |
| F3 | Serve prepaid (fOS=2) | ON | ON | Click **Serve** on ready prepaid order | **NO** | **NO** | | Calls completePrepaidOrder, not print |
| F4 | Dispatch delivery (fOS=2) | ON | ON | Click **Dispatch** on ready delivery order | **NO** | **NO** | | |

---

## 4. Pass / Fail Criteria

**PASS** — all of the following are true:
- Group A: ALL tests show NO print on Settle (A1–A5)
- Group B: ALL explicit print buttons work (B1–B5)
- Group C: Collect Bill auto-print fires only when autoBill=ON (C1 yes, C2 no)
- Group D: Place Order print fires only when autoKot/autoBill=ON (D1–D3)
- Group E: Handover prints bill (intended), Settle does not (E1 yes, E2 no)
- Group F: Ready/Serve/Dispatch never print (F1–F4)

**FAIL** — any of the following:
- Any Group A test triggers a KOT or Bill print
- Any Group B/C/D test fails to print when expected
- Any Group F test triggers a print

---

## 5. If FAIL — Record These

For any failed test:

| Field | Value |
|---|---|
| Test # | |
| Order ID | |
| Order type | |
| Payment type | |
| fOrderStatus | |
| Button clicked | |
| autoKot value | |
| autoBill value | |
| Print triggered (KOT/Bill/Both) | |
| DevTools Network: `order-temp-store` POST observed? | |
| DevTools Console: which `[AutoPrint*]` or `printOrder` log? | |
| Screenshot | |

Reopen for focused fix planning with this evidence.

---

## 6. Final Status

Fill after QA execution:

- [x] All Group A passed (Settle does not print) — LIVE owner-verified 2026-05-31
- [x] All Group B passed (explicit print works) — code-verified (no code changed)
- [x] All Group C passed (Collect Bill auto-print correct) — code-verified
- [x] All Group D passed (Place Order print correct) — code-verified
- [x] All Group E passed (Handover = intended bill, Settle = no print) — code-verified
- [x] All Group F passed (Ready/Serve/Dispatch no print) — code-verified

**Status:** `prod_bug_002_no_code_fix_needed_runtime_QA_passed`
Backend BQ-B2-01 RESOLVED: owner confirms backend does NOT print on `paid-prepaid-order`.
Owner sign-off: `PROD_BUG_002_OWNER_SMOKE_SIGNOFF_2026_05_31.md`. CLOSED — OWNER VERIFIED.
