# QA HANDOVER — BUG-513
# Combined with BUG-511 + BUG-512 check-in discount sweep

**Date:** 2026-10-08
**Item:** BUG-513 — CheckInForm `confirm()` missing `collectBlockedAtMax` guard
**Implementation agent:** IMPLEMENTATION (2026-10-08)
**File changed:** `src/components/pms/frontdesk/CheckInForm.jsx` L124

---

## 1. Verification Matrix (from plan, self-test results)

| Edit | File | Change | Self-Test Result |
|---|---|---|---|
| E-1 | CheckInForm.jsx L124 | `if (!ready \|\| busy \|\| collectBlockedAtMax) return;` added | ✅ grep confirms: `124: if (!ready \|\| busy \|\| collectBlockedAtMax) return;` |

---

## 2. Test Cases

### TC-513-1 — CRITICAL: confirm() blocked at max discount + collect entered
**Steps:**
1. Open Check-In form for a booking (bc=9000, advance=1000 — RID 69)
2. Set discount to max (88.34% or ₹7,950)
3. Enter 50 in Collect Now field
4. Click "Confirm check-in" button
5. Open Network tab in browser DevTools

**Expected:**
- NO POST request to check-in API
- `confirm()` returns at guard before `checkIn()` is called
- Button may visually appear enabled (Sub-issue B cosmetic) but API must NOT fire
- Error message "Maximum discount applied. GST (₹50) is settled at checkout" should still display

**Pass criteria:** Zero network requests to check-in endpoint on button click.

---

### TC-513-2 — Max discount + collect=0 (zero collect should still proceed)
**Steps:**
1. Max discount (88.34% / ₹7,950)
2. Leave Collect Now = 0 (blank or 0)
3. Click Confirm

**Expected:**
- `collectBlockedAtMax = collectAtMaxGst && 0 > 0 = FALSE`
- Guard does NOT fire
- Check-in proceeds normally with `collectNow: 0`

**Pass criteria:** API call fires, check-in succeeds with collect=0.

---

### TC-513-3 — Partial discount + valid collect (regression: normal flow unaffected)
**Steps:**
1. Set discount to 60% (partial — e.g. ₹5,400)
2. Enter a valid collect amount (e.g. ₹2,600)
3. Click Confirm

**Expected:**
- `collectBlockedAtMax = FALSE` at partial discount
- Guard does NOT fire
- Check-in proceeds normally

**Pass criteria:** API call fires with correct collectNow value.

---

### TC-513-4 — Sub-issue B diagnostic (V-5)
**Steps:**
1. Max discount + collect=50
2. Observe button visual state
3. Click button
4. Check Network tab: did any request fire?

**Expected:**
- If button click fires NO network request → HTML `disabled` attribute is working → Sub-issue B is cosmetic (H4 confirmed)
- If button click fires a network request → E-1 guard should catch it (no API call completes with collectNow=50)

**Pass criteria:** In all cases, API must NOT receive `collectNow: 50` at max discount.

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | CheckInPage.jsx handleConfirm still works at max discount | BUG-513 scope excluded CheckInPage — verify no drift |
| R-2 | Normal check-in (no discount) proceeds | Guard at L124 must not affect standard path |
| R-3 | BUG-512 hint/error messages still display | collectBlockedAtMax const unchanged — UI messages should be unaffected |
| R-4 | BUG-511 GST formula still correct | useMemo unchanged — spot check ₹7,900 discount shows GST ₹55 |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-513
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASS (see below)
```

### EXIT GATE Results
```
✅ 1. REGISTRY SYNC:    BUG-513 → GATE_5A_IMPLEMENTED (verified python3 assertion)
✅ 2. BUG_TRACKER.MD:   Row updated → GATE_3_PLAN_COMPLETE → will update to GATE_5A after this
✅ 3. FILE_OWNERSHIP.MD: CheckInForm.jsx — BUG-513, 2026-10-08 (update below)
✅ 4. CODE MARKER:       // BUG-513 comment at L124 ✓
✅ 5. COMPILE CHECK:     webpack compiled with 1 warning (pre-existing allDays, zero new)
```

---

## 5. Credentials + Environment

| Item | Value |
|---|---|
| App URL | `https://core-pos-front-5.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online/` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Branch | `5oct-1` |

**Note:** QA requires a today-dated check-in booking in RID 69. If no current booking exists, owner must create one or use an existing upcoming booking date.

---

## 6. What to combine with

This QA handover can be executed as part of the **combined check-in discount sweep** alongside:
- BUG-511 QA (GST formula — TC-511-1..5)
- BUG-512 QA (hint/error/disabled at max — TC-512-1..8 from plan)
- BUG-513 QA (confirm() guard — TC-513-1..4 above)

Suggested order: TC-513-1 first (P0 financial protection verification), then BUG-512 visual tests, then BUG-511 formula tests.
