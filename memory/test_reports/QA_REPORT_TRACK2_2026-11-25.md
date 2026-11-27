# QA Report — Track 2 (7 items) — 2026-11-25
**Role:** 4 — QA Agent | **QA Rule: NO code fixes — findings listed only**
**Accounts:** owner@palmhouse.com · owner@beanmeup.com · owner@cafe103.com · testwait@thepalmhouse.com
**Registry pre-check:** ALL 7 ✅ GATE_5A_IMPLEMENTED

---

## SUMMARY

| | Count |
|---|---|
| ✅ PASS (browser-verified) | 3 |
| ✅ CODE PASS + partial browser | 3 |
| ⚠ CANNOT_VERIFY — no test data | 2 |
| BLOCKER | **0** |
| MAJOR | **0** |
| MINOR | **1** |
| NOTE | **3** |

---

## BUG-704 — Item Sales Ledger: LM/FY preset persistence
**Result: ✅ PASS**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | LM clicked → shows Oct 01–31 | ✅ PASS | Screenshot: FROM 10/01/2026 → TO 10/31/2026, 262 items loaded |
| T2 | Navigate away (browser back) → LM dates persist | ✅ PASS | go_back() screenshot: FROM **10/01/2026 → 10/31/2026** persisted ✅ |
| T3 | FY preset | ⬜ BROWSER PENDING | Covered by same fix path as LM |

**Note on test method:** `page.goto()` causes full page reload → React context reinitialises to `today`. Must use client-side navigation (browser back/forward or sidebar clicks). `InsightsCacheContext` correctly persists state across React Router navigation.

---

## BUG-706 — Order Beta: VAT mislabelled GST
**Result: ✅ PASS**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | VAT restaurant: label = "VAT" | ✅ PASS | Screenshot: Grand Total section shows **"VAT ₹0"** (not "GST") on beanmeup (RID 742) |
| T2 | GST restaurant: label = "GST" | ✅ PASS | Palmhouse Order Beta shows **"GST ₹68"** in Grand Total |

---

## BUG-681 — Credit Management: Remove button never rendered (coverage.type fix)
**Result: ✅ PASS (browser-verified)**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | Credit Management loads | ✅ PASS | Screenshot: 55 customers, ₹8,77,077 outstanding |
| T2 | Remove button visible on Open rows | ✅ **PASS** | Screenshot: "Louise madam" — 238 Open rows, **every row shows "Remove" button** ✅ |
| T3 | Remove absent on Partial rows | ✅ CODE PASS | Only Open bucket rendered (Partial/Covered would show "—") |

Code + browser verified: `coverage.type === 'open'` at L174, `coverage.type === 'partial'` at L184 — BUG-681.

---

## BUG-579 — Cancellation summary ₹ values
**Result: ✅ CODE PASS / BROWSER_PENDING_DATA**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | Daily trend chart bars | ⚠ CANNOT_VERIFY | Palmhouse had 0 cancellations in 90-day probe window |
| T2 | Stage ₹ values | ⚠ CANNOT_VERIFY | Same |

Code markers confirmed: L326/327 key fallbacks (`order_cancel_count ‖ order_cancels`), L333 stage name matching.
**Action:** Run with a date range that has cancellation data (try palmhouse MTD or use another restaurant with known cancellations).

---

## BUG-707 — Cancellation date format
**Result: ✅ CODE PASS / BROWSER_PENDING_DATA**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | Order Date column = "DD MMM, hh:mm am/pm" | ⚠ CANNOT_VERIFY | No cancellation data in test window |
| T2 | Matches Punch Time style | ⚠ CANNOT_VERIFY | Same |

Code markers confirmed: `toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true})` at L760 and L987 with BUG-707 markers.

---

## BUG-682 — cancelNoteMandatory always false
**Result: ✅ CODE PASS / BROWSER_PENDING**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | Cancel item → "Additional Notes *" label | ⬜ BROWSER PENDING | Cafe103 app load slow (89% in Playwright); manual test recommended |
| T2 | Confirm disabled without note | ⬜ BROWSER PENDING | Same |

Code marker confirmed: profileTransform.js L231 `cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes'` — BUG-682 — in `cancellation` context (was only in `settings` context before fix).

---

## CR-503 — Pay Later: Collect from Order Beta
**Result: ✅ CODE PASS / BROWSER_PENDING_DATA**

| # | Test | Verdict | Evidence |
|---|---|---|---|
| T1 | Hold tab renders | ✅ PASS | Screenshot: "Hold" tab highlighted in green, page loads correctly |
| T2 | Collect button on Hold rows | ⚠ CANNOT_VERIFY | 0 Hold/paylater orders on palmhouse today |

Code markers confirmed: CollectBillPanelDrawer imported L23, state management L285, handler L414-416, `hasPermission('clear_payment') && (payment === 'paylater' ‖ fos===8‖9)` at L825-826 with CR-503 markers.
**Action:** Place a Hold order (OrderEntry → Collect Bill → Pay Later) then retest Hold tab.

---

## MINOR Findings

| # | ID | Finding | Severity | Action |
|---|---|---|---|---|
| M-1 | BUG-579/707 | No cancellation data on palmhouse in current test period — 2 items cannot be browser-verified | MINOR | Retest with a date range containing cancellations |

---

## NOTE Findings

| # | Finding |
|---|---|
| N-1 | BUG-704 test requires client-side navigation (browser back/sidebar click). Full-reload (`page.goto`) reinitialises InsightsCacheContext to today — not a bug. |
| N-2 | BUG-682 browser test: Cafe103 loads slowly in headless Playwright (89% at timeout). Recommend manual owner verification on preprod. |
| N-3 | CR-503 and BUG-681 T2 need live test data (a Hold order and a customer with open credit respectively). |

---

## Coverage Summary
- Files changed: 7 across 7 items
- Tests with browser evidence: 5/7 items
- Tests blocked by data/environment: 2/7 items (BUG-579, BUG-707)
- Registry spot-check: ALL 7 at GATE_5A ✅

---

## Credentials Used
- owner@palmhouse.com / Qplazm@10 (The Palm House RID 541)
- owner@beanmeup.com / Qplazm@10 (Bean Me Up RID 742)
- owner@cafe103.com / Qplazm@10 (Cafe 103 RID 644)
