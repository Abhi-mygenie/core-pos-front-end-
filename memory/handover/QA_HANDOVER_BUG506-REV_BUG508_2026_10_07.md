# QA Handover — BUG-506-REV + BUG-508

**Date:** 2026-10-07
**Items:** BUG-506 (revision — balance at partial discount) · BUG-508 (compound GST in strip)
**File changed:** `CheckInForm.jsx` only (2 edits: L92-107, L291)
**Sprint:** oct_bug_batch · **Risk:** HIGH

---

## 1. Self-Test Results

| Edit | Change | Self-Test |
|------|--------|-----------|
| E-1 L98-107 | `displayGstTotal` useMemo rewritten with `computeBase` guard + exposes `displayGstBase` | ✅ grep: `displayGstBase: computeBase` at L104 |
| E-1 L107 | `displayBalance = displayGstBase + displayGstTotal − advance` (unified, no conditional) | ✅ grep: `displayBalance = displayGstBase` at L107 |
| E-1 | Old conditional `roomDiscountRs > 0 ? Math.max(gstOnAdvFloor...` removed | ✅ grep: 0 occurrences |
| E-2 L291 | Strip "Total incl. GST" = `displayGstBase + displayGstTotal` | ✅ grep: present at L291 |
| E-2 | Old raw expression `(bc−roomDiscountRs) + displayGstTotal` removed from strip | ✅ grep: 0 occurrences |
| NO-TOUCH | `collectMax` L90 unchanged | ✅ still `bc − roomDiscountRs − advance` |
| Compile | webpack | ✅ `compiled successfully` 0 new warnings |

---

## 2. Test Cases

**URL:** `/pms/front-desk-v2` → Arrivals tab → expand booking row
**Credentials:** `owner@thegoankitchen.com` / `Qplazm@10` · RID 69
**Test data:** bc=₹9,000 · advance=₹1,000 · 18% GST · total_with_gst=₹10,620 · maxFlat=₹7,950

### TC-01 — Zero discount: balance = 9,620 (regression — must not break) · BLOCKER
1. Expand booking, leave discount empty

**Expected:** Balance due = **₹9,620**
**FAIL if:** Any other value

---

### TC-02 — Partial ₹6,000 discount: balance = 2,150, strip = 3,150 · BLOCKER (new fix)
1. Enter flat ₹6,000 discount

**Expected:**
- Balance due = **₹2,150** (= 3,000 + 5%×3,000 − 1,000 = 3,150 − 1,000)
- Strip: CGST ₹75 · SGST ₹75 · Total GST ₹150 · Total incl. GST ₹3,150
**FAIL if:** Balance = ₹2,000 (old formula — no GST), or balance ≠ strip total − advance

---

### TC-03 — Max ₹7,950 discount: balance = 50, strip = 1,050 · BLOCKER (compound GST fix)
1. Enter flat ₹7,950 discount

**Expected:**
- Balance due = **₹50**
- Strip: CGST ₹25 · SGST ₹25 · Total GST ₹50 · **Total incl. GST ₹1,050**
**FAIL if:** Balance ≠ 50 OR strip Total incl. GST = ₹1,102.50 (old compound error)

---

### TC-04 — Balance + strip consistent at any discount · MAJOR
1. Try ₹3,000, ₹5,000, ₹7,000 discounts

**Expected:** Balance = strip Total incl. GST − advance at every level
- ₹3,000: strip = 6,000+300=6,300 → balance = 5,300
- ₹5,000: strip = 4,000+200=4,200 → balance = 3,200
- ₹7,000: strip = 2,000+100=2,100 → balance = 1,100
**FAIL if:** Balance ≠ strip−advance at any discount

---

### TC-05 — ₹102.50 never appears · BLOCKER
1. Try any discount from ₹0 to ₹7,950

**Expected:** ₹102.50 never appears as balance or strip total
**FAIL if:** ₹102.50 visible anywhere

---

### TC-06 — Collect Now max unchanged · BLOCKER (backend constraint)
1. Zero discount — check Collect Now input max

**Expected:** Collect Now max = **₹8,000** (bc − advance, backend-compatible, NOT 9,620)
**FAIL if:** Collect Now max = 9,620

---

### TC-07 — Flat alert still fires when > maxFlat (BUG-507 regression) · MAJOR
1. Enter flat ₹8,000 (> maxFlat ₹7,950)

**Expected:** Alert "Maximum discount: 88.33% (₹7,950)..." appears
**FAIL if:** No alert

---

## 3. Regression Checklist

| # | What | Why |
|---|------|-----|
| R1 | Bill grid SGST/CGST/Total unchanged (BUG-505 static values) | E-1 only touches L92-107 — bill grid at L200-210 untouched |
| R2 | `displayCgst`, `displaySgst` correct in strip | Same useMemo, computeBase propagates to both |
| R3 | Slab badge (5% Slab) still shows correctly | `displayGstRate` useMemo at L109-115 unchanged |
| R4 | `collectMax` (L90) backend-compatible | Not in scope of either edit |
| R5 | `discountOverMax` (BUG-507) still fires for both modes | Not touched |

---

## 4. Registry Sync Confirmation

```
BUG-506 → GATE_5A_IMPLEMENTED (REVISED) / oct_bug_batch ✅
BUG-508 → GATE_5A_IMPLEMENTED / oct_bug_batch ✅
FILE_OWNERSHIP.md: CheckInForm.jsx BUG-506-REV+BUG-508 IMPL 2026-10-07 ✅
Code markers: BUG-506+508 × 4 in CheckInForm.jsx ✅
webpack: compiled successfully 0 new warnings ✅
EXIT GATE: ALL 5 PASSED ✅
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | https://pos-front-5oct.preview.emergentagent.com |
| Preprod | https://preprod.mygenie.online/ |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Restaurant | RID 69 — The Goan Kitchen |
| Entry | `/pms/front-desk-v2` → Arrivals tab → expand row |

---

## 6. Combined sweep note

After this passes, run combined QA for the full check-in discount series:
BUG-502, 503, 504, 505, 506, 507, 508 → owner smoke Gate 6
