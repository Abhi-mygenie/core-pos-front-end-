# QA Handover — BUG-396
## PMS Check-In: GST base corrected (advance is deposit, not additional charge)

**Date:** 2026-09-13
**Implementation agent:** ROLE 3 (ALPHA v0.7)
**Item:** BUG-396
**Gate:** 5a → QA (Gate 5b)
**Risk:** CRITICAL (R6 — GST, room billing, balance_payment)

---

## §1 Registry Sync Confirmation

```
Registry synced:  YES
Item:             BUG-396
Status:           GATE_5A_IMPLEMENTED
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS
  □1 registry.json     PASS — gate=5, sprint=pos_pms_1, IMPLEMENTED
  □2 BUG_TRACKER.md    PASS — row added
  □3 FILE_OWNERSHIP.md PASS — 3 entries added
  □4 Code markers      PASS — 4 × BUG-396 in CheckInPage.jsx, 1 × in pmsService.js
  □5 Compile           PASS — webpack compiled with 1 pre-existing warning, 0 new
```

---

## §2 Inherited from Plan (Verification Matrix)

| Edit | File | Change | Self-Test Result |
|---|---|---|---|
| E1 | `CheckInPage.jsx:256` | `gstBase = Number(form.orderAmount)` — advance removed | ✅ grep confirms: `Number(form.orderAmount)` only, no `advancePayment` on this line |
| E2 | `CheckInPage.jsx:766` | `advAmt` declaration removed; `gstBase = amt` only | ✅ grep confirms: `advAmt` does NOT appear anywhere in file |
| E3 | `pmsService.js:193` | `balance_payment = orderAmount + gstTax − advance` | ✅ grep confirms: `- advance` present on balance_payment line |

**Self-test: 3/3 edits verified. Webpack: 0 new warnings.**

---

## §3 Test Cases

**Credentials:**
```
URL:      https://preprod.mygenie.online  (via preview: https://core-pos-deploy-17.preview.emergentagent.com)
Login:    owner@thegoankitchen.com / Q***@10
Path:     Sidebar → PMS → Check-In
```

**Note:** BUG-389 skip rule still applies — Room ₹7,500 + Advance ₹0 hitting 5% is EXPECTED (backend slab2.min=7500.01).

### BLOCK 1 — GST strip display (no submit needed)

| TC | Room | Advance | Expected GST strip | Severity |
|---|---|---|---|---|
| **TC-01** | ₹100 | ₹100 | **5% slab**, CGST ₹2.50, SGST ₹2.50, Total GST ₹5.00, **Total incl. GST ₹105.00** | BLOCKER |
| **TC-02** | ₹7,500 | ₹100 | **5% slab** (gstBase=7,500 — NOT 18%), GST ₹375, Total ₹7,875 | BLOCKER |
| **TC-03** | ₹7,500 | ₹0 | 5% slab, GST ₹375, Total ₹7,875 (zero-advance regression) | MAJOR |
| **TC-04** | ₹8,000 | ₹0 | 18% slab, GST ₹1,440, Total ₹9,440 (unchanged) | MAJOR |
| **TC-05** | ₹5,000 | ₹200 | **5% slab**, GST ₹250, **Total ₹5,250** (advance must NOT affect slab) | BLOCKER |

### BLOCK 2 — Network payload (submit path)

| TC | Room | Advance | Expected payload fields | Severity |
|---|---|---|---|---|
| **TC-06** | ₹100 | ₹100 | `gst_tax: 5.00`, **`balance_payment: 5.00`** (= 100 + 5 − 100) | BLOCKER |
| **TC-07** | ₹7,500 | ₹100 | `gst_tax: 375.00`, **`balance_payment: 7775.00`** (= 7500 + 375 − 100) | BLOCKER |
| **TC-08** | ₹7,500 | ₹0 | `gst_tax: 375.00`, `balance_payment: 7875.00` (unchanged from pre-BUG-388) | MAJOR |

### BLOCK 3 — Regression

| R | Test | Why |
|---|---|---|
| **R-01** | Advance = 0 across all room prices → GST strip and payload unchanged vs pre-BUG-396 | Zero-advance: `gstBase = amt + 0` before = `gstBase = amt` after — must be identical |
| **R-02** | `gst_tax` field present in payload and non-zero when GST applicable (BUG-386 regression) | BUG-386 fix must still hold |
| **R-03** | `advance_payment` field still sent correctly in payload | E3 only changes balance_payment; advance_payment line untouched |

---

## §4 Coverage

| File | Changed | Tests covering it |
|---|---|---|
| `CheckInPage.jsx` E1 (submit) | ✅ | TC-06, TC-07, TC-08 |
| `CheckInPage.jsx` E2 (display) | ✅ | TC-01, TC-02, TC-03, TC-04, TC-05 |
| `pmsService.js` E3 (payload) | ✅ | TC-06, TC-07, TC-08 |

Coverage: **3/3 changed files have ≥1 test.**

---

## §5 Report Path

Write to: `/app/memory/test_reports/QA_REPORT_BUG396_<DATE>.md`
