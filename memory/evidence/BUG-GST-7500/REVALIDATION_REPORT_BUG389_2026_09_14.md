# BUG-389 — Re-Validation Investigation Report

**Date:** 2026-09-14 (re-validation)
**Role:** INVESTIGATION
**Steps used:** 4/10
**Confidence:** HIGH — reproduced + traced

---

## 1. Summary

**Root cause:** STILL PRESENT — NOT FIXED.

| Field | Value |
|---|---|
| Classification | BACKEND_BUG — config data |
| Root cause | `room_gst.slabs[1].min = 7500.01` — creates a dead zone at exactly ₹7,500 |
| Confidence | HIGH (API probe + FE simulation) |
| Backend fixed? | **NO** — `slab2.min = 7500.01` still in production config as of 2026-09-14 |

---

## 2. Re-validation Steps

### Step 1 — Fresh API probe (2026-09-14)

```
GET https://preprod.mygenie.online/api/v1/vendoremployee/profile
Authorization: Bearer *** (goankitchen_owner alias)
```

**Response `restaurants[0].settings.room_gst.slabs`:**
```json
[
  { "min": 0,       "max": 7500, "gst_percent": 5,  "itc": false },
  { "min": 7500.01, "max": null, "gst_percent": 18, "itc": true  }
]
```

`slab2.min = 7500.01` — **unchanged from original probe on 2026-09-09.**

Evidence saved: `evidence/BUG-GST-7500/room_gst_slabs_revalidation_2026_09_14.json`

---

### Step 2 — FE simulation with current config

`roomGstCalculator.js` uses inclusive bounds: `nightlyUnit >= s.min && nightlyUnit <= s.max`

| Room Price | Slab Matched | Expected | Result | GST Charged |
|---|---|---|---|---|
| ₹7,499 | 5% | 5% | ✅ | ₹374.95 |
| **₹7,500** | **5%** | **18%** | **❌ BUG** | **₹375.00** |
| ₹7,500.01 | 18% | 18% | ✅ | ₹1,350.00 |
| ₹7,501 | 18% | 18% | ✅ | ₹1,350.18 |
| ₹8,000 | 18% | 18% | ✅ | ₹1,440.00 |

**Financial impact at ₹7,500:** Guest is undercharged ₹975.00 GST per room per night (₹375 charged vs ₹1,350 correct).

---

### Step 3 — FE code check

`roomGstCalculator.js` matching logic is correct given the data. No FE bug.
The dead-zone is purely a backend config issue.

---

### Step 4 — Fix still required

**Backend must change:**
```json
// CURRENT (wrong)
{ "min": 7500.01, "max": null, "gst_percent": 18 }

// REQUIRED
{ "min": 7500, "max": null, "gst_percent": 18 }
```

Optional (belt-and-suspenders): also change `slab1.max` from `7500` to `7499.99` to make the boundary unambiguous.

---

## 3. Hypotheses tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | Backend fixed slab2.min to 7500 | API probe profile | ELIMINATED — still 7500.01 |
| H2 | FE calculator has a workaround | Code trace roomGstCalculator.js | ELIMINATED — no workaround, logic is data-driven |

---

## 4. Recommendations

| Action | Owner | Priority |
|---|---|---|
| Update slab2.min from 7500.01 → 7500.00 for RID 69 | Backend team | P1 |
| Sweep all restaurants for same pattern | Backend team | P1 |
| After backend fix: re-probe profile + simulate ₹7,500 | Agent | Verify |

**FE action:** None required (OD-389-02 not yet answered).

---

*Investigation re-validation written 2026-09-14 · Investigation agent (ALPHA v0.7) · Steps: 4/10*
