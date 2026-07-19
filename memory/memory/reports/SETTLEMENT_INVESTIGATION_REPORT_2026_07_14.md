# Settlement Module — Full Investigation Report

**Date:** 2026-07-14
**Role:** INVESTIGATION
**Restaurant:** cafe103 (rid=644)
**Credentials:** owner@cafe103.com / ***
**Status:** COMPLETE — 3 bugs confirmed with live evidence

---

## 1. ARCHITECTURE

### Files
| File | Purpose |
|---|---|
| `settlementService.js` | 5 API endpoints |
| `settlementTransform.js` | API ↔ UI field mapping (passthrough, no formulas) |
| `SettlementPanel.jsx` (499 lines) | Main UI — KPIs, waiter table, settle/opening/transfer modals |
| `DayClosurePage.jsx` | Page wrapper (Sidebar + SettlementPanel) |
| `settlementReportService.js` | Multi-day report wrapper (CR-016) |
| `settlementReportTransform.js` | Multi-day transform — **has its own formula logic** |
| `SettlementReportMockup.jsx` | Settlement History report (Insights) |

### 5 Backend APIs
| # | Endpoint | Method | Purpose |
|---|---|---|---|
| 1 | `/waiter/get-settlement-report` | POST | Per-waiter settlement data for date range |
| 2 | `/waiter/get-waiter-list` | GET | All waiters |
| 3 | `/waiter/opening-balance` | POST | Set cash float |
| 4 | `/waiter/settlement` | POST | Settle waiter (partial/full) |
| 5 | `/waiter/self-settlement` | POST | Self-settle |

---

## 2. BACKEND FORMULA (Confirmed by Live Data)

```
balance_to_settle = total_funds − today_settlement − cash_draw + pilferage
```
*(pilferage stored as negative when there IS pilferage, so `+ (-38)` = subtract 38)*

**Proof (cafe103, Owner waiter, July 14 2026 — LIVE):**
```
total_funds=2738, today_settlement=2500, cash_draw=0, pilferage=-38
balance_to_settle = 2738 - 2500 - 0 + (-38) = 200 ✅
```

**FE formula (WRONG):** `totalFunds - settled = 2738 - 2500 = 238` ❌

---

## 3. BUGS — CONFIRMED WITH LIVE EVIDENCE

### BUG-185: Expected Column Wrong (P0 CRITICAL)

**Root cause:** FE recomputes `expected = totalFunds - settled` in 9 places. Ignores both `cash_draw` AND `pilferage`. Backend already sends correct `balance_to_settle`.

**Live proof (July 14, post-settlement):**

| Field | Backend (API) | Frontend (Screen) | Correct? |
|---|---|---|---|
| REMAINING KPI | ₹200 | ₹200 | ✅ (reads backend) |
| Expected column | 200 | **238** | ❌ (FE formula) |
| Actual Bal placeholder | should be 200 | **238** | ❌ (derives from FE expected) |

**Smoking gun:** REMAINING KPI (₹200) ≠ Expected column (₹238) on the SAME screen. Both claim to answer "how much does this waiter owe?" Delta = ₹38 = exactly |pilferage|.

**Historical evidence (cafe103 Counter waiter, 38 days checked):**
- June 15–30: 16/16 days affected (delta = cash_draw, ranging ₹131–₹5,300)
- July 1–13: 9/13 days affected
- May 1–13: 13/13 days affected

**FE lines that need to use `w.balanceToSettle` instead of `totalFunds - settled`:**
Lines 104, 145, 250, 252, 271, 274, 355, 389, 395, 410 in SettlementPanel.jsx

**Fix:** Replace all 9+ instances of `w.totalFunds - w.settled` with `w.balanceToSettle`. Zero business logic in FE — just trust backend.

---

### BUG-186: Partial Settlement Broken (P1 HIGH)

**Root cause:** Side-effect of BUG-185. When FE Expected is wrong, prefill amount and downstream calculations are wrong.

**Live proof (July 14):**
- User settled Partial ₹2,500 with Actual Balance 2700
- FE sent `pilferage: -38` to backend
- After refresh, FE shows Expected=₹238, but real remaining is ₹200
- If user now enters 200 in Actual Bal and settles again, FE would compute Pilferage = 238 − 200 = ₹38 (WRONG — double-counting pilferage already recorded)

**Fix:** Same as BUG-185 — once Expected uses `w.balanceToSettle`, partial settle amounts and pilferage calcs will be correct.

---

### Report Formulas: Settlement History Still Has Old Circular Formula (UNFILED)

**Root cause:** BUG-132 was fixed in SettlementPanel.jsx (13 edits) but was explicitly excluded from SettlementReportMockup.jsx. The report still subtracts pilferage from Expected.

**Code locations (3 places):**

| File | Line | Formula (Wrong) | Should Be |
|---|---|---|---|
| `settlementReportTransform.js` | 46 | `expected: totalFunds - settled - Math.abs(pilferage)` | `totalFunds - settled` or ideally use `total_balance_to_settle` from API |
| `settlementReportTransform.js` | 80 | `expected: aggFunds - aggSettled - Math.abs(aggPilf)` | Same |
| `SettlementReportMockup.jsx` | 224 | `waiterExpected = w.totalFunds - w.settled - Math.abs(w.pilferage)` | Same |

**Impact:** Currently latent in cafe103 (all pilferage = 0 in historical data). Will produce wrong Expected numbers the moment any waiter has recorded pilferage. Also wrong for new data (Owner waiter now has pilferage=-38).

---

## 4. TRANSFER CASH MODAL — INVESTIGATION COMPLETE

### Status: CONFIRMED — Backend endpoint does NOT exist (still 404)

**What the screenshot shows:** Transfer Cash modal with yellow warning "Awaiting backend API. Transfer endpoint not yet available." All controls disabled. Button says "Transfer (API Pending)".

**Expected endpoint:** `POST /api/v1/vendoremployee/waiter/cash-transfer`
**Expected payload:** `{ from_waiter_id, to_waiter_id, amount, date }`

### API Probe Results (July 14, 2026)

| Endpoint Tried | HTTP Status |
|---|---|
| `POST /v1/.../waiter/cash-transfer` | **404** |
| `POST /v1/.../waiter/transfer` | 404 |
| `POST /v1/.../waiter/transfer-cash` | 404 |
| `POST /v1/.../waiter/cash-transfer-request` | 404 |
| `POST /v2/.../waiter/cash-transfer` | 404 |
| `POST /v1/.../waiter/waiter-cash-transfer` | 404 |

All return HTML 404 page — endpoint is **not deployed on preprod**.

### Code Evidence

**SettlementPanel.jsx (line 455):** Comment says `Transfer Modal (Backend-Blocked)`. All controls are `disabled`. Submit button is hardcoded disabled with text "Transfer (API Pending)".

**settlementService.js:** Has NO transfer function at all — only 5 functions (getSettlementReport, getWaiterList, setOpeningBalance, settleWaiter, selfSettle).

### History (from control docs)

| Doc | What It Says |
|---|---|
| `CR_015_INTAKE.md` line 65 | `/waiter/cash-transfer` — ❌ FLAGGED — does not exist. Backend team must build. |
| `CR_015_INTAKE.md` line 85 | Probed 5 variations — all 404 |
| `OPEN_GAPS_REGISTER.md` line 107 | Waiter cash transfer API — FLAGGED — 404 |
| `SPRINT_STATUS.md` line 130 | Backend escalation: `POST /waiter/cash-transfer` — 404, UI placeholder with disabled state |
| `POS5_0_SPRINT_PLANNING.md` line 120 | Listed as pending backend deliverable |
| `POS4_0_BASELINE_CONSOLIDATION.md` | CR-015 CLOSED, but "backend POST /waiter/cash-transfer still 404" |

### Conclusion

**The Transfer Cash feature was NEVER wired.** It has been a disabled UI placeholder since CR-015 was built (June 2026). The backend team has not shipped the `/waiter/cash-transfer` endpoint. This is tracked in the OPEN_GAPS_REGISTER and was carried into POS 5.0 sprint planning as a backend deliverable.

**To enable this feature, backend must deploy `POST /waiter/cash-transfer` first. Then FE needs:**
1. Add `transferCash` function to `settlementService.js`
2. Wire the Transfer modal's form + submit in `SettlementPanel.jsx`
3. Remove disabled states and warning banner

---

## 5. DATA FLOW TRACE

```
API: POST /waiter/get-settlement-report
  → settlementTransform.fromAPI.settlementReport()
    → Maps balance_to_settle → w.balanceToSettle ✅
    → Maps cash_draw → w.cashDraw ✅
    → Maps pilferage → w.pilferage ✅
  → SettlementPanel.jsx
    → KPI cards: read totals directly from API ✅
    → Expected column: RECOMPUTES as totalFunds - settled ❌ (BUG-185)
    → Actual Balance: placeholder from FE expected ❌ (BUG-185)
    → Pilferage column: backend value OR (FE_expected - actual) — partially correct
    → Settle Modal: uses FE-computed expected ❌ (BUG-185)
    → handleSettle(): pilferage calc based on wrong expected ❌ (BUG-185/186)
```

**BREAK POINT:** Transform correctly passes `balanceToSettle`. Panel ignores it everywhere and recomputes wrong.

---

## 6. COMPLETE BUG REGISTRY

| ID | Title | Status | Severity | Fix |
|---|---|---|---|---|
| BUG-185 | Expected ignores cash_draw + pilferage | 🔴 OPEN | P0 CRITICAL | Use `w.balanceToSettle` in 9+ places |
| BUG-186 | Partial settlement broken | 🔴 OPEN | P1 HIGH | Same fix as BUG-185 |
| Report formulas | Expected subtracts pilferage (circular) | 🟡 UNFILED | MEDIUM | Fix 3 lines in transform + mockup |
| BUG-132 | Circular pilferage in Settlement Panel | ✅ CLOSED | Was P1 | Fixed — 13 edits |
| BUG-113 | Partial payment auto-fill stuck | ✅ CLOSED | Was P1 | Fixed — onBlur |
| BUG-105 | No settlement module | ✅ CLOSED | Was P1 | Subsumed by CR-015/016 |
| Transfer | Transfer Cash modal disabled — `/waiter/cash-transfer` still 404 | 🔴 BACKEND-BLOCKED | P2 | Backend must deploy endpoint first, then FE wires modal |

---

*Investigation Report — 2026-07-14. Evidence saved to /tmp/settlement_now.json, /tmp/settlement_june_range.json, /tmp/settlement_july.json*
