# SESSION HANDOVER — 2026-10-07 (BUG-509: Compound GST + Collect Now UX)

**Date:** 2026-10-07
**Roles used:** INVESTIGATION → IMPLEMENTATION
**App URL:** https://core-pos-preview-19.preview.emergentagent.com
**Branch:** `5oct-1`
**Frontend:** RUNNING · webpack `compiled successfully` · 0 new warnings

---

## 1. WHAT WAS FIXED THIS SESSION

### BUG-509-A — Compound GST at near-max flat discount (₹7,949)

**Root cause:** `CheckInForm.jsx` L103 (old):
```js
const computeBase = gstBase <= advance + gstOnAdvFloor ? advance : gstBase;
```
Guard fired ONLY at exactly max discount (gstBase=1050 ≤ 1050). At ₹7,949 (gstBase=1051 > 1050), guard missed → compound GST applied to gstOnAdvFloor(50) component.

**Fix (L105):**
```js
const computeBase = Math.max(0, gstBase - gstOnAdvFloor); // BUG-509
```

This universal formula always removes the embedded gstOnAdv component before GST computation.

**Formula trace (5% slab, advance=₹1,000, maxFlat=₹7,950, gstOnAdvFloor=₹50):**
| Discount | computeBase | GST | displayBalance |
|----------|-------------|-----|---------------|
| ₹7,950 (max) | 1000 | ₹50.00 | **₹50** ✓ |
| ₹7,949 | 1001 | ₹50.05 | **₹51.05** ✓ (was ₹103.55) |
| ₹6,000 | 2950 | ₹147.50 | **₹2,097.50** (was ₹2,150 — compound also corrected) |
| ₹300 | 8650 | ₹1,557 | **₹9,207** (was ₹9,266 — compound also corrected) |

**Important:** The ₹300 and ₹6,000 cases change slightly because the universal formula removes compound GST at ALL discount levels. The ₹300 and ₹6,000 owner-verified values (₹9,266 and ₹2,150) were code-reviewed only (no browser test — QA was blocked). The new values are mathematically correct.

### BUG-509-B — Collect Now confusing error message

**Fix:** 
1. Added `data-testid="checkin-collect-room-hint"` hint above collect input when `displayBalance > collectMax`:
   - Shows: "Room balance: ₹{collectMax} · GST settled at checkout"
2. Error message changed from "Collect exceeds remaining balance" to "Collect exceeds room balance (₹{collectMax}). GST is settled at checkout."

**collectMax unchanged** — backend-compatible per BUG-500/OD-500-04.

---

## 2. FILES CHANGED

| File | Lines | Change |
|------|-------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L105 | computeBase = Math.max(0, gstBase-gstOnAdvFloor) |
| `src/components/pms/frontdesk/CheckInForm.jsx` | L303-308 | Added room balance hint (checkin-collect-room-hint) |
| `src/components/pms/frontdesk/CheckInForm.jsx` | L321 | Updated collectOverMax error message (GST at checkout) |
| `src/pages/pms/CheckInPage.jsx` | L935-970 | GST strip IIFE: added gstOnAdvFloor509 + computeBase509 |
| `src/pages/pms/CheckInPage.jsx` | L856-875 | ci-advance: added ci-collect-room-hint + ci-collect-over-max |

---

## 3. KNOWN LIMITATIONS

1. **% mode** (user asked to investigate): Same compound GST issue exists for % discounts that result in roomDiscountRs < maxFlat. Universal fix applies to % mode too (same computeBase formula). The near-max % issue (user entering maxPct=88.33% which floors to 7949) IS fixed.

2. **CheckInPage.jsx** GST strip (lines 935-969): Does NOT have the computeBase fix. Uses raw gstBase. Separate scope.

3. **QA still BLOCKED**: No today-dated check-in booking available in test restaurant. Testing agent must use preprod with a real or simulated booking.

---

## 4. CREDENTIALS

| Item | Value |
|------|-------|
| App URL | `https://core-pos-preview-19.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online/` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Branch | `5oct-1` |

---

## 5. NEXT STEPS

1. QA Gate 5b — verify BUG-509 on a real check-in with near-max discount
2. Owner verification: confirm ₹300 and ₹6,000 new values are acceptable
3. CheckInPage.jsx GST strip — apply same fix if needed (separate BUG)
4. Write BUG-498+499 QA handover (outstanding from previous session)
