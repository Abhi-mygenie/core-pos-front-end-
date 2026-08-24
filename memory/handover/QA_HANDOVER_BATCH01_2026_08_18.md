# QA Handover — BATCH-01: GST Gating
**Items:** BUG-337 (P1), BUG-336 (P0), BUG-338 (P1)
**Date:** 2026-08-18
**Environment:** https://core-pos-deploy-11.preview.emergentagent.com
**Preprod API:** https://preprod.mygenie.online

---

## 1. Inherited from Plan — Verification Matrix

| # | Edit | File | Verification | Self-Test |
|---|---|---|---|---|
| 1 | BUG-337: profile re-fetch after save | `RestaurantSettingsPage.jsx` | Disable GST → Save → open Collect Bill immediately → SGST/CGST = ₹0 (no reload) | ✅ Code verified at lines 285–292 |
| 2 | BUG-337: non-blocking catch | `RestaurantSettingsPage.jsx` | Navigate still proceeds if getProfile() throws | ✅ try/catch present |
| 3 | BUG-336: GST gate in taxTotals | `CollectPaymentPanel.jsx` | gstStatus=false → bill shows ₹0 SGST/CGST | ✅ Guard at line 256 |
| 4 | BUG-336: existing GST unaffected | `CollectPaymentPanel.jsx` | gstStatus=true → amounts unchanged | ✅ Guard only fires on `=== false` |
| 5 | BUG-338: room GST gate | `CollectPaymentPanel.jsx` | isRoom=true + roomGstApplicable=false → ₹0 GST on room bill | ✅ Guard at line 258 |
| 6 | BUG-338: non-room unaffected | `CollectPaymentPanel.jsx` | dineIn/walkIn with roomGstApplicable=false → GST still applies | ✅ isRoom guard |
| 7 | Regression: BUG-304 intact | `CollectPaymentPanel.jsx` | Discount+GST (dSgst/dCgst split) still correct when GST enabled | ✅ Guard returns before accumulate lines |
| 8 | Regression: SC gate unaffected | `CollectPaymentPanel.jsx` | Service charge calculates correctly on dineIn orders | ✅ scApplicable logic untouched |

---

## 2. Test Cases for QA Agent

### TC-1 — BUG-337: Settings refresh on save (CRITICAL path)
**Account:** owner@18march.com / Qplazm@10 (restaurant 478)
1. Go to Restaurant Settings → Step 4 (Tax & Charges)
2. Toggle "GST Enabled" → OFF
3. Click Save (complete wizard to last step)
4. **DO NOT** reload the page
5. Navigate to Dashboard → open any table → Collect Bill
6. **Expected:** SGST = ₹0, CGST = ₹0 immediately
7. **Expected:** Bill total = items only (no tax added)

### TC-2 — BUG-336: GST gate in Collect Bill
**Account:** owner@18march.com / Qplazm@10
*(prerequisite: TC-1 completed — GST is currently disabled)*
1. Open Order Entry on any dine-in table
2. Add 2+ menu items that have GST percentages set
3. Open Collect Bill
4. **Expected:** Tax section shows SGST = ₹0.00, CGST = ₹0.00
5. **Expected:** Grand total = sum of items only
6. Re-enable GST in settings → save → open Collect Bill
7. **Expected:** GST is back, amounts match item tax percentages

### TC-3 — BUG-336: VAT restaurant unaffected
**Account:** any restaurant with VAT items (tax.type = 'VAT')
1. Disable GST in settings → save
2. Open Collect Bill on an order with VAT items
3. **Expected:** VAT still accumulates (only GST is zeroed, not VAT)

### TC-4 — BUG-338: Room GST gate
**Account:** owner@shimlaqohfoodcourt.com / Qplazm@10 (or any hotel/resort with rooms)
1. Restaurant Settings → Step 8 (Room & Hospitality)
2. Toggle "Room GST Applicable" → OFF → Save
3. Check in a guest to a room, add food items to room order
4. Open Collect Bill on the room order
5. **Expected:** SGST = ₹0, CGST = ₹0 on room bill
6. Non-room order (dine-in) on same restaurant:
7. **Expected:** GST still applies on dine-in orders (room guard is `isRoom`-specific)

### TC-5 — Regression: Service charge still correct
**Account:** owner@18march.com / Qplazm@10
1. Ensure GST is re-enabled
2. Open Collect Bill on a dine-in order
3. **Expected:** Service charge % appears as configured
4. **Expected:** SC toggle default follows `autoServiceCharge` flag

### TC-6 — Regression: BUG-304 discount+GST split still correct
**Account:** owner@18march.com / Qplazm@10
1. Open Collect Bill
2. Apply a discount to the order
3. **Expected:** Post-discount GST amounts (dSgst/dCgst) are correctly split (not full pre-discount GST amounts)

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Full order → settle → reports cycle after GST re-enable | CollectPaymentPanel is hotspot — end-to-end pass required |
| R2 | Login → Dashboard → open room order → Collect Bill (room) | Room billing untouched except GST gate |
| R3 | Settings save on each step (not just last step) | handleNext mid-step path unchanged (only last step calls re-fetch) |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-336, BUG-337, BUG-338
Sprint: pos_5_x
EXIT GATE: 5/5 PASSED
  □ 1 REGISTRY SYNC: PASS (all 3 → IMPLEMENTED, sprint_key=pos_5_x)
  □ 2 BUG_TRACKER: PASS (3 rows added)
  □ 3 FILE_OWNERSHIP: PASS (2 file entries added)
  □ 4 CODE MARKERS: PASS (// BUG-336, BUG-337, BUG-338 in both files)
  □ 5 COMPILE: PASS (webpack compiled successfully, 0 new warnings)
```

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| Regular restaurant | owner@18march.com / Qpl*** (restaurant 478) |
| Food court / room | owner@shimlaqohfoodcourt.com / Qpl*** (restaurant 598) |
| Preprod API | https://preprod.mygenie.online |
| Preview URL | https://core-pos-deploy-11.preview.emergentagent.com |
| Login endpoint | POST /api/v1/auth/vendoremployee/login |
| Settings page | /restaurant-settings |
| Dashboard | /dashboard |

---

**Files changed (2):**
- `src/pages/RestaurantSettingsPage.jsx`
- `src/components/order-entry/CollectPaymentPanel.jsx`
