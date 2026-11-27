# BUG-599 / BUG-600 / BUG-601 — Investigation Report
## Aggregator Orders: 3 Issues (Goan Kitchen, RID 69)

**Date:** 2026-10-21
**Steps used:** 8/10
**Confidence:** HIGH — all 3 root causes confirmed in code
**Restaurant:** The Goan Kitchen (ID: 69), owner@thegoankitchen.com

---

## Issue 1 — BUG-599: Aggregator orders vanish on refresh (HIGH)

**Root cause:** `useRefreshAllData.js:44` calls `getRunningOrders()` → returns POS orders only → `setOrders(freshOrders)` replaces ALL orders in context → aggregator orders wiped. The aggregator boot fetch at `DashboardPage.jsx:210-222` uses `aggregatorBootDone.current = true` ref guard — won't re-run after refresh.

**Chain:**
1. User refreshes → `useRefreshAllData` fires
2. `getRunningOrders()` → POS orders only (no aggregator)
3. `setOrders(freshOrders)` → REPLACES all orders → aggregator orders gone
4. `aggregatorBootDone.current = true` → aggregator fetch won't re-trigger
5. Orders return only when next aggregator socket event arrives

**Fix:** After `setOrders(freshOrders)` in `useRefreshAllData`, also fetch and merge aggregator orders via `getAggregatorOrderList()`.

**Files:** `useRefreshAllData.js` (~5 lines)

---

## Issue 2 — BUG-600: Aggregator orders play confirm_order sound instead of buzzer (MEDIUM)

**Root cause:** Restaurant has `aggregator_order_tone: "buzzer"` in profile settings. This field is mapped in `profileTransform.js:398` and displayed in the Settings UI. But **nobody reads it** when determining notification sound.

**Sound chain:**
1. Aggregator order arrives → FCM notification fires
2. `NotificationContext.processNotification()` resolves sound from `data.sound` or `inferSoundFromContent()`
3. If notification looks like confirm-order → `isConfirmOrderNotification()` triggers → `mapConfirmOrderTone(confirm_order_tone)` → uses `confirm_order_tone: "default"` → plays `confirm_order` sound
4. `aggregator_order_tone: "buzzer"` is **never checked**

**Evidence from `toneMapper.js:18`:**
> "Do NOT use confirm_order_ringer, tone_timing, **aggregator_order_tone**, or voice_in_kds in this mapping."

The tone mapper was explicitly scoped to confirm-order only. No equivalent mapper exists for aggregator orders.

**Fix:** In `NotificationContext.processNotification()`, detect aggregator order notifications (data.type/source contains aggregator/swiggy/zomato) and map sound using `restaurant.settings.aggregatorOrderTone`:
- `"buzzer"` → `"five_sec_buzzer"`
- `"default"` → `"new_order"`
- `"silent"` → `"silent"`

**Files:** `NotificationContext.jsx` (~10 lines), possibly new `mapAggregatorOrderTone` in `toneMapper.js`

---

## Issue 3 — BUG-601: Aggregator menu variations + addons not saving (HIGH)

**Root cause:** `menuManagementService.js:88` (edit) and `L48` (add):
```js
const SKIP = new Set(['variations', 'addon_ids']);
```

Both `addFoodAggregatorMultipart` and `editFoodAggregator` **intentionally skip** `variations` and `addon_ids` when building the FormData payload. Comment says "multipart string value corrupts DB (cleanBindings TypeError)."

The user can enter/modify variations and addons in the ProductForm UI, click Save, see "Saved" toast — but the data never reaches the backend. Silently dropped.

**Contrast with normal menu:** `editFood` (L74-81) wraps everything in `JSON.stringify(foodInfo)` as a single `food_info` field — variations included. The aggregator functions use flat FormData fields instead (BUG-327), and FormData can't serialize nested objects (arrays of objects) — hence the skip.

**Fix options:**
- **Option A:** Serialize `variations` and `addon_ids` as JSON strings in FormData: `formData.append('variations', JSON.stringify(foodInfo.variations))` — backend must parse the JSON string
- **Option B:** Send variations/addon_ids via a separate JSON API call after the multipart save
- **Option C:** Switch aggregator edit to the same `food_info` JSON wrapper approach as normal menu (L76: `formData.append('food_info', JSON.stringify(foodInfo))`) — but this was explicitly changed in BUG-327 because it didn't work

**This likely needs backend coordination** — the aggregator food endpoints need to accept variations in some format. Currently they reject nested objects in multipart.

**Files:** `menuManagementService.js` L48 + L88 (frontend), aggregator food endpoints (backend)

---

## Summary

| # | Bug ID | Issue | Severity | Root Cause | Fix By |
|---|--------|-------|----------|-----------|--------|
| 1 | BUG-599 | Aggregator orders vanish on refresh | HIGH | `useRefreshAllData` replaces all orders with POS-only | FE (~5 lines) |
| 2 | BUG-600 | Buzzer not playing for aggregator | MEDIUM | `aggregator_order_tone` never read by notification logic | FE (~10 lines) |
| 3 | BUG-601 | Variations/addons silently dropped on save | HIGH | `SKIP = ['variations', 'addon_ids']` in aggregator multipart | FE + Backend coordination |
