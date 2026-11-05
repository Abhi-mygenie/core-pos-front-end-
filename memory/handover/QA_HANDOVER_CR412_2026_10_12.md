# QA Handover — CR-412

**Date:** 2026-10-12
**From:** Implementation agent
**To:** QA agent (Role 4)
**Item:** CR-412 — Loyalty Pre-tick when `loyalty_info.redeemed = true` (Scan & Order)

---

## 1. Inherited Verification Matrix (self-test results)

| Edit | File | Lines | Change | Self-Test |
|------|------|-------|--------|-----------|
| E-CR412-1 | `orderTransform.js` | L454 | Added `loyaltyRedeemed: api.loyalty_info?.redeemed === true` | ✅ grep hit confirmed |
| E-CR412-2a | `CollectPaymentPanel.jsx` | L78–79 | Added `initialLoyalty = null,` prop | ✅ grep hit confirmed |
| E-CR412-2b | `CollectPaymentPanel.jsx` | L336–342 | Added mount `useEffect` → `setUseLoyalty(true)` | ✅ grep hit confirmed |
| E-CR412-3 | `OrderEntry.jsx` | L1936–1939 | Added `initialLoyalty={…}` prop pass | ✅ grep hit confirmed |

**Unit test:** `orderTransform.cr409.test.js` — 4/4 PASS ✅
**Compile:** webpack 1 pre-existing warning — ZERO new warnings ✅
**`useLoyalty` useState:** L310 `useState(false)` — unchanged ✅

---

## 2. Test Cases

| # | Test | Steps | Expected | Blocker? |
|---|------|-------|---------|---------|
| TC-1 | Scan & order `redeemed=true, amount=7` → CPP pre-ticked | Log in as `owner@thegoankitchen.com` → find a scan & order with loyalty redeemed → open Collect Payment | Loyalty checkbox: **✅ pre-ticked on open**. Loyalty discount line visible. | YES |
| TC-2 | Scan & order `redeemed=true, amount=0` → still pre-ticked (OD-INV-02=B) | Same flow — order with `redeemed=true` but zero redeemed_amount | Loyalty checkbox: **✅ pre-ticked** regardless of amount | YES |
| TC-3 | Regular POS dine-in → loyalty NOT pre-ticked | Open any regular dine-in order → Collect Payment | Loyalty checkbox: **☐ unchecked** — zero change from before | YES |
| TC-4 | Cashier can manually un-tick after pre-tick | TC-1 flow → loyalty pre-ticked → cashier clicks checkbox | Loyalty **unchecks cleanly**. Discount line disappears. | NO |
| TC-5 | Regular POS order settles correctly | Regular dine-in → Collect Payment → pay Cash → complete | Order settles normally, no unexpected loyalty discount | NO |

---

## 3. Regression Test Cases

| # | Test | Why |
|---|------|-----|
| R1 | CR-413 still holds: CPP opens with empty coupon field | CR-412 must not re-introduce any coupon pre-load |
| R2 | Loyalty checkbox manually ticked still works (pre-existing) | Regular POS cashier manually enabling loyalty should still apply discount |
| R3 | `orderTransform.cr409.test.js` 4/4 PASS | Confirms coupon E-1 fields in transform are untouched |

---

## 4. Known Limitation (NOTE — not a FAIL)

**Socket wipe:** If a cashier edits a scan & order mid-session (adds an item), the `update-order` socket event fires and currently does not carry `loyalty_info`. This will reset `loyaltyRedeemed` to `false`, wiping the pre-tick. This is a **known gap (OD-GAP3=B)** — backend will add `loyalty_info` to the socket payload. When they do, this fix handles it automatically. **Document as NOTE in QA report — not a BLOCKER.**

---

## 5. What Changed

| File | Lines | Change |
|------|-------|--------|
| `orderTransform.js` | L454 +1 | `loyaltyRedeemed: api.loyalty_info?.redeemed === true` |
| `CollectPaymentPanel.jsx` | L78–79 +2 | `initialLoyalty = null,` prop |
| `CollectPaymentPanel.jsx` | L336–342 +7 | mount `useEffect` seeding `useLoyalty` |
| `OrderEntry.jsx` | L1936–1939 +4 | `initialLoyalty` JSX prop pass |

NOT touched: `socketHandlers.js` · `DashboardPage.jsx` · `CartPanel.jsx`

---

## 6. Registry Sync Confirmation

```
Registry synced:       YES
CR-412 status:         GATE_5A_IMPLEMENTED
CR-412 sprint:         oct_cr_batch
CR_REGISTRY.md:        UPDATED
FILE_OWNERSHIP.md:     UPDATED (CR-412 IMPL section)
Code markers:          // CR-412 on all 4 edit sites ✅
Unit test:             orderTransform.cr409 4/4 PASS
EXIT GATE:             5/5 PASS
```

---

## 7. Credentials + Environment

| Field | Value |
|-------|-------|
| Owner account | owner@thegoankitchen.com / Qplazm@10 |
| Restaurant | The Goan Kitchen (RID 69) |
| Preview URL | https://genie-core-pos.preview.emergentagent.com |
| Backend | https://preprod.mygenie.online |

---

## 8. Regression Scope

CR-412 touches 3 R5 hotspot files → run handover regression tests R1–R3 **plus** 2 cross-flow tests:
1. Scan & order settle: open CPP → pre-tick → settle → order closes correctly
2. Regular dine-in full cycle: place → collect payment → settle → no unexpected loyalty discount
