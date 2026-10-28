# QA Handover — BUG-493

**Date:** 2026-10-06
**Implementation:** GATE_5A_IMPLEMENTED
**File changed:** `src/api/services/pmsService.js` (L68, L114)
**Sprint:** oct_bug_batch
**Credentials:** `owner@thegoankitchen.com` / `Qplazm@10` — RID 69 (The Goan Kitchen)
**URL:** https://mygenie-pos-frontend.preview.emergentagent.com → `/pms/front-desk-v2?tab=inhouse`

---

## 1. Inherited from Plan — Verification Matrix Self-Test

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E-493-1 L68 | pmsService.js | `row.charge = match.res.charge ?? null;` after `row.channel` | ✅ Verified — grep confirms BUG-493 marker at L68 |
| E-493-2 L114 | pmsService.js | `bp===0 ? 0 :` guard + OD-493-01 Option B comment | ✅ Verified — grep confirms BUG-493 marker at L114 |
| Compile | — | webpack 0 new warnings | ✅ PASS — still 1 pre-existing warning, no new |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|---------|
| TC-493-01 | BALANCE shows GST for no-discount order | Login RID 69 → `/pms/front-desk-v2?tab=inhouse` → find order 1232903 | BALANCE = ₹1,002.50 (was ₹950; +₹52.50 GST) |
| TC-493-02 | BALANCE shows GST for partial-discount order | Same page → find order 1232965 (₹200 discount) | BALANCE = ₹802.50 (was ₹750; +₹52.50 GST) |
| TC-493-03 | BALANCE = ₹0 when bp=0 (OD-493-01 Option B) | Same page → find order 1232972 / #000324 (100% effective discount) | BALANCE = ₹0 (GST waived, unchanged) |
| TC-493-04 | Graceful when charge is null | Order where LR has no charge object | BALANCE unchanged from Step 2 fallback (no crash, no NaN) |
| TC-493-R1 | Regression — non-room orders unaffected | Navigate to any F&B orders page | No change in F&B display |
| TC-493-R2 | Regression — transferred F&B balance unaffected | In-house orders with transferred F&B | `transferredFnbBalance` / `roomOrdersBalance` unchanged |

---

## 3. Regression Notes

- Only `pmsService.getInHouseGuests()` Step 2 and Step 3 are touched
- Step 3's fallback formula (`rp + gt - ap - rb - discount`) is **unchanged**
- `row.charge` was previously `undefined`; now `null` when absent — `??` guards in chargeGst formula are identical for both (`undefined ?? 0 === null ?? 0 === 0`)
- No other consumers of `row.charge` in the codebase

---

## 4. Registry Sync Confirmation

```
Registry synced:   YES
Item:              BUG-493
Status:            GATE_5A_IMPLEMENTED
Sprint:            oct_bug_batch
EXIT GATE:         5/5 PASS
  □1 registry.json PASS
  □2 BUG_TRACKER.md PASS
  □3 FILE_OWNERSHIP.md PASS
  □4 Code markers: L68 + L114 PASS
  □5 Compile: 0 new warnings PASS
```

---

## 5. Environment

```
App URL:  https://mygenie-pos-frontend.preview.emergentagent.com
Login:    owner@thegoankitchen.com / Qplazm@10 (alias: RID 69)
Tab:      /pms/front-desk-v2?tab=inhouse
Orders:   1232903 (no discount), 1232965 (₹200 disc), 1232972 / #000324 (bp=0)
```
