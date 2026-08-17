# QA Handover — BUG-327 — 2026-08-17

**Date:** 2026-08-17
**Items:** BUG-327
**Test account:** `owner@thegoankitchen.com` / `Qplazm@10` (restaurant 69)
**URL:** https://react-pos-frontend-12.preview.emergentagent.com
**⚠️ BLOCKER:** QA requires backend to fix orphaned `aggregator_food` records 13312–13315 first to restore `foods-list?food_for=Aggregator` endpoint. Backend brief: `backend_briefs/BACKEND_BRIEF_BUG-327_2026-08-17.md`

---

## 1. Registry Sync Confirmation
BUG-327 → IMPLEMENTED, pos_5_0 ✅
EXIT GATE: 5/5 PASS ✅

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | `swiggyImage` loaded for existing food | Menu Mgmt → Aggregator → open food 13303 "echhi spcl" → check image section | "Swiggy Image" upload block shows existing image thumbnail (file uploaded 2026-08-17) |
| T2 | Swiggy image upload block visible for aggregator | Add new aggregator food → Product Image section | Two upload blocks: "Product Image" (always) + "Swiggy Image" (aggregator only) |
| T3 | Swiggy image upload block hidden for normal food | Menu Mgmt → Normal → open any food | Only "Product Image" block, no "Swiggy Image" block |
| T4 | Add aggregator food — both images | Add aggregator food → upload main image + swiggy image → Save → Network tab | Request: multipart, flat fields (no `food_info` key), `image` file + `swiggy_image` file present |
| T5 | Add aggregator food — no images | Add aggregator food → no upload → Save | Works; backend defaults to `1.png`; no error |
| T6 | Edit aggregator food — update main image only | Edit 13303 → upload new main image, leave swiggy → Save → Network | `image` file present, `swiggy_image` absent (backend keeps existing) |
| T7 | Edit aggregator food — update both images | Edit 13303 → upload both → Save → Network | Both `image` + `swiggy_image` files in multipart |
| T8 | Edit aggregator food — no images | Edit 13303 → change name only → Save → Network | Flat fields, no `image`/`swiggy_image` files, no `food_info` key |
| T9 | `variations`/`addon_ids` absent from multipart | Any aggregator save → Network tab | Neither `variations` nor `addon_ids` key present in multipart body |
| T10 | BulkEditor aggregator save — flat multipart | Aggregator BulkEditor → edit row → Save Changes → Network | Flat multipart, no `food_info` key |
| T11 | BulkEditor aggregator new row — flat multipart | Aggregator BulkEditor → + row → fill → Save → Network | `addFoodAggregatorMultipart` called (flat multipart, no `food_info`) |
| T12 | QuickEdit aggregator food — flat multipart | ProductCard quick-edit on aggregator food → Save → Network | `editFoodAggregator` called (flat multipart, no `food_info`) |

---

## 3. Regression Tests

| # | Test | Reason |
|---|---|---|
| R1 | Normal food add — `food_info` wrapper still sent | `addFood` unchanged; verify `food_info=JSON.stringify(...)` in Network |
| R2 | Normal food edit — `food_info` wrapper still sent | `editFood` unchanged; same check |
| R3 | Normal food image upload still works | Normal form save with image → verify image appears in list |
| R4 | Quick-edit normal food — `editFood` still called | Quick-save normal food → Network: `food_info` key present |

---

## 4. Files Changed

| File | Item |
|---|---|
| `api/transforms/menuManagementTransform.js` | BUG-327 |
| `api/services/menuManagementService.js` | BUG-327 |
| `components/panels/menu/ProductForm.jsx` | BUG-327 |
| `components/panels/menu/ProductList.jsx` | BUG-327 |
| `components/panels/menu/BulkEditor.jsx` | BUG-327 |
