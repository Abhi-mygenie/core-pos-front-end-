# Session Handover — 2026-08-17 (Investigation: BUG-327 Aggregator Image Handling)

**Date closed:** 2026-08-17
**Session type:** INVESTIGATION
**Registry total:** 511 items
**Self-assessment — Registry synced:** YES ✅

---

## Last session: IMPLEMENTATION (CR-146 + BUG-325 + BUG-326). 6 files, 0 new warnings.

---

## Investigation This Session — BUG-327

### What was confirmed (API probed — 7 aggregator foods, restaurant_id=69)

**API shape `GET /foods-list?food_for=Aggregator`:**
| Field | Value |
|---|---|
| `image` | Full URL (`restaurant_panel/aggregater_img/`) OR `food-default-image.png` placeholder |
| `swiggy_image` | Full URL when uploaded, else `null` |
| `zomato_image` | Always `null` (backend column unused) |
| Default on create (no file) | `"1.png"` for both `image` + `swiggy_image` |

**Add endpoint** (`/add-food-aggregator`):
- Accepts JSON body (no images) — works, both images default to `1.png`
- Accepts multipart (required for image upload)
- ⚠️ `variations` and `addon_ids` MUST be omitted in multipart (sending as string `"[]"` corrupts DB)

**Update endpoint** (`/foods/{id}` with `food_for=Aggregator`):
- Flat multipart fields — NO `food_info` wrapper
- `image`/`swiggy_image` optional — omit = keep existing
- Works (confirmed on food 13303)

### 5 Frontend gaps found

| Gap | Location | Issue |
|---|---|---|
| G1 | `menuManagementTransform.js L38` | `api.swiggy_image` never read → no `swiggyImage` in frontend model |
| G2 | `menuManagementService.js L37-38` | `addFoodAggregator()` sends JSON → cannot upload images |
| G3 | `menuManagementService.js L54-61` | `editFood()` wraps in `food_info` key → aggregator update needs flat fields |
| G4 | `menuManagementService.js L57` | `editFood()` appends only `image` → `swiggy_image` never sent on edit |
| G5 | `ProductForm.jsx` | Single image upload UI → no second slot for `swiggy_image` |

### PREPROD BROKEN (P0)
Investigation multipart probes sent `variations=[]` as string via `-F "variations=[]"`.
Backend stored as string "[]" in `aggregator_food` table for orphaned food IDs 13312–13315.
`foods-list?food_for=Aggregator` now returns TypeError HTML — BACKEND DB FIX REQUIRED.
**Backend brief:** `backend_briefs/BACKEND_BRIEF_BUG-327_2026-08-17.md`
**Fix needed:** Set `food_status=1` for `aggregator_food` records 13312–13315 directly in DB.

---

## Next Session

**Immediate:** Share BACKEND_BRIEF_BUG-327 with backend team to fix preprod.
**After backend fix:** BUG-327 FE planning (Gate 2-3) — 5 files, MEDIUM risk.

**Still pending from previous sessions:**
- BUG-323 + BUG-324: Gate 4 GO + Owner Smoke (Gate 6)
- CR-146 + BUG-325 + BUG-326: QA Gate 5b
