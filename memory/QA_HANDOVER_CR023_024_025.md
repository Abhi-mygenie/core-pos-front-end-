# QA Handover — CR-023, CR-024, CR-025

> **⚠ PARTIALLY SUPERSEDED (2026-06-11, baseline consolidation):**
> 1. **CR-024 Bug A section is OBSOLETE** — final ruling (live API test, see `CR_024_CHANNEL_VISIBILITY_OVERRIDE.md` §2.1): `take_away`/`delivery` are backend INTEGER columns and must stay RAW BOOLEAN; `toYesNo()` on them returns SQL errors. Do NOT verify "take_away/delivery use toYesNo".
> 2. CR-023 + CR-024: owner smoke DONE 2026-06-11 (CLOSED). CR-025 (discount) remains in smoke batch (`control/POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` S-1).

## Context
Three CRs were implemented this session but have NO QA (no testing agent, no owner smoke test). The next agent must run testing agent on each before declaring them done. Login credentials for preprod.mygenie.online are NOT available — testing is code-level + structural verification only.

---

## CR-023: Bulk Editor Typing Lag

**Priority:** P1
**File:** `src/components/panels/menu/BulkEditor.jsx`
**Doc:** `/app/memory/change_requests/CR_023_BULK_EDITOR_TYPING_LAG.md`

### What was changed
1. **Line 1:** Added `React` to import: `import React, { useState, useMemo, ... }`
2. **Lines ~671-682:** New `LocalTextInput` component — manages local state for text inputs, flushes to parent on `onBlur`
3. **Line ~683:** `CellRenderer` wrapped in `React.memo(function CellRenderer(...))`
4. **Lines ~688-689:** Text/textarea cells now use `<LocalTextInput>` instead of raw `<input>`
5. **Lines ~336-339 (handleSave):** Added `document.activeElement?.blur()` + `await new Promise(r => setTimeout(r, 0))` at top of save to flush in-progress text edits

### What to verify
- [ ] `LocalTextInput` component exists and has: `useState(value)`, `useEffect` to sync from parent, `onBlur` that calls `onChange(local)` only when `local !== value`
- [ ] `CellRenderer` is wrapped in `React.memo`
- [ ] Text/textarea cells use `LocalTextInput`, not raw `<input>`
- [ ] Number/dropdown/toggle/yesno cells are UNCHANGED (still use direct `updateCell`)
- [ ] `handleSave` starts with `document.activeElement?.blur()`
- [ ] Webpack compiles without errors
- [ ] Regression: dropdown, toggle, yesno, number cells still work (unchanged code paths)

---

## CR-024: Channel Visibility Override + Save Type Fix

**Priority:** P1
**Files:** `src/api/transforms/restaurantSettingsTransform.js`, `src/pages/StatusConfigPage.jsx`, `src/pages/DashboardPage.jsx`
**Doc:** `/app/memory/change_requests/CR_024_CHANNEL_VISIBILITY_OVERRIDE.md`

### What was changed

**Bug A — restaurantSettingsTransform.js (~L156-160):**
- `take_away: toYesNo(s2.takeAway)` — was `s2.takeAway` (raw boolean)
- `delivery: toYesNo(s2.delivery)` — was `s2.delivery` (raw boolean)
- Comment changed to: `"CR-024 Bug A: all channels use toYesNo"`

**Bug B — StatusConfigPage.jsx:**
1. Import: added `useRestaurant` to contexts import (L7)
2. Default config: `enabled: false` (was `true`) in `DEFAULT_CHANNEL_CONFIG` (~L101)
3. Inside component: added `const { features } = useRestaurant()` and `availableChannels` filter array that filters `ALL_CHANNELS` by `features.dineIn`, `features.takeaway`, `features.delivery`, `features.room`
4. Three render locations changed from `ALL_CHANNELS.map` to `availableChannels.map`:
   - Channel Visibility cards (~L1191)
   - Table View layout (~L1494)
   - Order View layout (~L1548)
5. `saveConfiguration` (~L496): cleans stale channel IDs before saving to localStorage

**DashboardPage.jsx (~L257):**
- Default: `enabled: false` (was `true`)

### What to verify
- [ ] `restaurantSettingsTransform.js`: `take_away` and `delivery` both use `toYesNo()` — no raw booleans
- [ ] `StatusConfigPage.jsx`: imports `useRestaurant`, has `availableChannels` filter, all 3 `.map()` use `availableChannels` not `ALL_CHANNELS`
- [ ] `StatusConfigPage.jsx`: `DEFAULT_CHANNEL_CONFIG.enabled` is `false`
- [ ] `DashboardPage.jsx`: default channelVisibility has `enabled: false`
- [ ] `saveConfiguration` filters `channelConfig.channels` by `availableIds`
- [ ] Webpack compiles without errors
- [ ] Regression: all 4 channel toggles in Restaurant Settings Step 2 still work (Dine-In, Takeaway, Delivery, Room)

---

## CR-025: Discount Payload Fix

**Priority:** P0 (money-impacting)
**File:** `src/api/transforms/orderTransform.js`
**Doc:** `/app/memory/change_requests/CR_025_DISCOUNT_PAYLOAD_FIX.md`

### What was changed

**Three payload builders modified:**

1. **`placeOrderWithPayment` (prepaid, ~L1175-1198):**
   - `self_discount: 0` (was `discounts.manual`)
   - `order_discount: discounts.manual || 0` (was `discounts.orderDiscountPercent`)
   - Added: `comm_discount: discounts.preset || 0` (was missing)
   - Added: `discount_value: discounts.total || 0` (was missing)
   - Added: `discount_type: discounts.discountType || ''` (was missing)

2. **`collectBillExisting` (postpaid, ~L1396-1407):**
   - `self_discount: 0` (was `discounts.manual`)
   - `order_discount: discounts.manual || 0` (was `discounts.orderDiscountPercent`)
   - Comment: `"CR-025: order_discount sends ₹ amount, self_discount zeroed"`

3. **`transferToRoom` (~L1468-1470):**
   - `order_discount: discounts.manual || 0` (was `discounts.orderDiscountPercent`)
   - `self_discount: 0` (was `discounts.manual`)

### What to verify
- [ ] ALL `self_discount` in the file should be `0` — run: `grep -n 'self_discount' orderTransform.js` — none should reference `discounts.manual`
- [ ] ALL `order_discount:` (not `order_discount_type`) should be `discounts.manual || 0` — run: `grep -n 'order_discount:' orderTransform.js | grep -v type`
- [ ] Prepaid now sends `comm_discount`, `discount_value`, `discount_type` (parity with postpaid)
- [ ] `payment_mode` in `collectBillExisting` uses: `splitPayments?.length > 0 ? 'partial' : method` (CR-021 B1 fix from same session)
- [ ] Webpack compiles without errors
- [ ] Regression: non-discount orders (no discount applied) should send `order_discount: 0, self_discount: 0` — no breakage

### Quick verification commands
```bash
# CR-025: Verify self_discount is always 0
grep -n 'self_discount' /app/frontend/src/api/transforms/orderTransform.js

# CR-025: Verify order_discount sends discounts.manual
grep -n 'order_discount:' /app/frontend/src/api/transforms/orderTransform.js | grep -v type

# CR-024: Verify toYesNo on all channels
grep -n 'take_away:\|delivery:' /app/frontend/src/api/transforms/restaurantSettingsTransform.js

# CR-024: Verify availableChannels used
grep -n 'ALL_CHANNELS.map\|availableChannels.map' /app/frontend/src/pages/StatusConfigPage.jsx

# CR-023: Verify React.memo and LocalTextInput
grep -n 'React.memo\|LocalTextInput' /app/frontend/src/components/panels/menu/BulkEditor.jsx
```

---

## Testing Agent Call Template

```json
{
  "original_problem_statement_and_user_choices_inputs": "QA for CR-023 (Bulk Editor typing lag fix), CR-024 (Channel Visibility override + save type fix), CR-025 (Discount payload: order_discount sends ₹ amount, self_discount zeroed). All code-level structural verification — no login credentials available.",
  "features_or_bugs_to_test": [
    "CR-023: LocalTextInput component exists with local state + onBlur flush",
    "CR-023: CellRenderer wrapped in React.memo",
    "CR-023: handleSave starts with document.activeElement?.blur()",
    "CR-024: take_away and delivery use toYesNo() in restaurantSettingsTransform",
    "CR-024: StatusConfigPage imports useRestaurant, filters ALL_CHANNELS by features",
    "CR-024: Three render locations use availableChannels.map not ALL_CHANNELS.map",
    "CR-024: DEFAULT_CHANNEL_CONFIG.enabled is false",
    "CR-024: DashboardPage default channelVisibility.enabled is false",
    "CR-025: All self_discount in orderTransform.js are 0",
    "CR-025: All order_discount send discounts.manual (not orderDiscountPercent)",
    "CR-025: Prepaid has comm_discount, discount_value, discount_type",
    "CR-025: collectBillExisting payment_mode uses partial ternary",
    "Webpack compiles without errors"
  ],
  "files_of_reference": [
    "src/components/panels/menu/BulkEditor.jsx — CR-023 (LocalTextInput, React.memo, handleSave blur)",
    "src/api/transforms/restaurantSettingsTransform.js — CR-024 Bug A (toYesNo on channels)",
    "src/pages/StatusConfigPage.jsx — CR-024 Bug B (useRestaurant, availableChannels, default OFF)",
    "src/pages/DashboardPage.jsx — CR-024 (default enabled: false)",
    "src/api/transforms/orderTransform.js — CR-025 (self_discount:0, order_discount:manual, prepaid parity, payment_mode:partial)"
  ],
  "required_credentials": "No login credentials available — code-level verification only",
  "testing_type": "frontend only(skip backend)",
  "agent_to_agent_context_note": "Previous test iterations 1-7 all passed. This is iteration 8 covering CR-023/024/025. No login possible — focus on code structural verification using grep and file reads.",
  "prev_test_files_and_folder": "/app/test_reports/iteration_1.json through iteration_7.json",
  "mocked_api": { "value": { "has_mocked_apis": false, "mocked_apis_list": [] } }
}
```
