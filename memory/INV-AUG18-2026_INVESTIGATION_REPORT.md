# INVESTIGATION REPORT — Multi-Issue Batch (6 items)
**Date:** 2026-08-18  
**Role:** INVESTIGATION  
**Investigator:** Agent (ALPHA v0.7)  
**Account used:** owner@18march.com (login confirmed, token obtained)  
**Steps used:** 9/10  

---

## 1. Summary Table

| # | Issue | Root Cause | Classification | Confidence |
|---|-------|-----------|----------------|:---:|
| INV-1 | Logo uploaded in settings — how does it print? | Logo URL saved via settings API → printer agent fetches it; `logoSize` configurable; no FE show/hide toggle exists | ARCHITECTURE_QUESTION | HIGH |
| INV-2 | Phone on Bill shows 9990818342 but different number prints | `phone_number_on_bill` (settings API) ≠ `restaurant_information.phone_number` (printer config API) — backend may not sync | BACKEND_BUG (suspected) | MEDIUM |
| INV-3 | Discount report — reason not showing | `insights-discounts` API has no `by_reason` breakdown; report table has no reason column; `discountFor` hardcoded `null` in QSR flow | FEATURE_GAP + DATA_ISSUE | HIGH |
| INV-4 | How does Multiple Menu work? | Setting saved to `basic.multiple_menu` but frontend has ZERO consumers — purely backend-gated; FE UI not implemented | ARCHITECTURE_QUESTION | HIGH |
| INV-5 | Cancel after serve + Scheduled order not gated | (a) `allowPostServeCancel` mapped but OrderEntry gates cancel on permission only, not on this setting; (b) `schedule_order` not in profileTransform → no FE gate | FE_BUG (both) | HIGH |
| INV-6 | Search by not gated from settings | `searchOptions` IS mapped in profileTransform but ZERO UI components consume it | FE_BUG | HIGH |

---

## 2. Issue-by-Issue Deep Trace

---

### INV-1 — Logo Uploaded in Restaurant Settings: How Does It Print?

**Owner question:** Logo uploaded in Restaurant Setup needs to print on bill — how is this managed?

#### Data Flow Trace
```
RestaurantSettingsPage.jsx (step1)
  → FileUpload component → logoFile state
  → updateSettings(formState, logoFile, null)          [restaurantSettingsService.js:28]
  → formData.append('logo', logoFile)
  → POST basic.logo to restaurant settings API

profileTransform.js:113
  → logo: getImageUrl(api.logo)
  → restaurant.logo in RestaurantContext               (used for POS UI display, not printing)

printerAgentConfigTransform.js:233–235
  → logoSize.width  = gs.windows.logo_size_mm.width  (default 30mm)
  → logoSize.height = gs.windows.logo_size_mm.height (default 30mm)
  → PrintStyleTab.jsx:147-148 — "Logo W" / "Logo H" inputs (editable)

printerAgentConfigTransform.js:251–254
  → restaurantInfo.name  = sc.restaurant_information.restaurant_name
  → restaurantInfo.phone = sc.restaurant_information.phone_number
  → NO logo URL in printer config transform
```

#### Key Finding
- The logo image is uploaded and stored via the **Restaurant Settings API** (`basic.logo`)
- The **printer agent** (Windows/Android app) fetches the restaurant profile independently and reads `basic.logo` from its own data source — the FE does NOT pass the logo URL into the printer config
- The **size** of the logo on the printed bill IS configurable: Printer Settings → Print Style tab → "Logo W" / "Logo H" (saves to `style_config.global_settings.logo_size_mm`)
- There is **NO frontend toggle** to enable/disable logo printing. `BillContentTab` has a "Field Visibility" section marked **"Coming soon"** — it will eventually allow show/hide of logo and other fields
- **Action for owner:** Logo will print IF the printer agent is configured to show it (agent-side setting). To resize logo on bill: go to Printer Settings → Print Style. To enable/disable logo print: currently no FE control — deferred to CR-133 Phase 2/3

---

### INV-2 — Phone on Bill: Wrong Number Printing

**Screenshot evidence:** "Phone on Bill" field shows `9990818342` in Restaurant Settings.

#### Data Flow Trace — Two Independent Phone Fields
```
FIELD A — "Phone on Bill" in Restaurant Settings
  RestaurantSettingsPage.jsx step1 → phoneNumberOnBill
  restaurantSettingsTransform.js:34  → phoneNumberOnBill: basic.phone_number_on_bill
  restaurantSettingsTransform.js:219 → toAPI: phone_number_on_bill: s1.phoneNumberOnBill
  → Saved to: restaurants.phone_number_on_bill (restaurant settings DB table)

FIELD B — Phone shown in Printer Config (BillContentTab)
  printerAgentConfigTransform.js:191 → info = sc.restaurant_information
  printerAgentConfigTransform.js:253 → restaurantInfo.phone = info.phone_number
  BillContentTab.jsx:69 → {config.restaurantInfo.phone || "—"}
                           "Printed on bill header (managed in Restaurant Info)"
  → Source: settings_config.restaurant_information.phone_number
    from: GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config
```

#### Root Cause (MEDIUM confidence — backend probe needed to confirm)
There are **two separate phone fields** served by two separate API endpoints:
- `basic.phone_number_on_bill` — set by owner in Restaurant Settings step1 ("Phone on Bill")
- `settings_config.restaurant_information.phone_number` — read by the printer agent config API

If the backend is NOT syncing `phone_number_on_bill` → `restaurant_information.phone_number`, then the printer agent reads a different (possibly older or unrelated) phone number — which matches the owner's symptom.

**Most likely cause:** `restaurant_information.phone_number` in the printer agent config contains `basic.phone` (the main restaurant phone), NOT `basic.phone_number_on_bill`. When the owner updates "Phone on Bill" in settings, the printer agent config's `restaurant_information.phone_number` does NOT update.

#### Recommendation
→ **BACKEND_BRIEF needed.** Backend must confirm which field `restaurant_information.phone_number` is populated from. If it reads `basic.phone` instead of `basic.phone_number_on_bill`, backend should change it to sync from `phone_number_on_bill`.

---

### INV-3 — Discount Report: Discount Reason Not Coming

**Owner question:** Discount reason is not showing in the Discount Report.

#### Data Flow Trace
```
DiscountReportMockup.jsx (S26, CR-011)
  → fetchInsightsDiscounts(from, to)                  [insightsService.js:640]
  → POST INSIGHTS_DISCOUNTS endpoint
  → Returns: { summary, daily[], by_employee[] }

Table columns rendered:
  Date | Manual | Coupon | Loyalty | Comp | Total
  → NO "Reason" or "Discount Type" column in the table schema

CartPanel.jsx:513
  → discountFor: null,    // CR-137 pass-through: QSR quick-bill has no reason UI

orderTransform.js:1369
  → discount_for: discounts.discountFor || null   // always null in QSR flow

CartPanel.jsx:500-506
  → discountType is captured (preset vs percent/flat)
  → selectedDiscountType (from restaurant.discountTypes preset list) IS captured
  → But discountFor (free-text reason) = null
```

#### Root Cause — TWO layers
1. **API layer**: `insights-discounts` endpoint returns `summary/daily/by_employee` — there is no `by_reason` or `by_discount_type` breakdown in the API response. Even if the data existed, the report cannot display it.
2. **Capture layer**: `discountFor` is hardcoded `null` in the QSR quick-bill flow (CartPanel). The `selectedDiscountType` (preset discount type ID) IS passed to the order API, but the report endpoint does not aggregate by this field.

#### Recommendation
→ Two-part fix needed:
1. **Backend**: `insights-discounts` endpoint needs a `by_reason` or `by_discount_type` breakdown (list of `{ name, total_amount, order_count }`)
2. **Frontend**: DiscountReportMockup needs a new table/chart section consuming `by_reason` from the API

→ **BACKEND_BRIEF needed** to define the `by_reason` shape. This is a FEATURE_GAP (P2).

---

### INV-4 — How Does Multiple Menu Work?

**Owner question:** How does Multiple Menu feature work?

#### Code Trace
```
RestaurantSettingsPage.jsx:463
  → Toggle "Multiple Menus" → multipleMenu state
  → restaurantSettingsTransform.js:78  → fromAPI: multipleMenu: toBool(basic.multiple_menu)
  → restaurantSettingsTransform.js:242 → toAPI:   multiple_menu: toYesNo(s3.multipleMenu)
  → Saved to: basic.multiple_menu in restaurant settings

profileTransform.js (restaurant.features):
  → dineIn, delivery, takeaway, room, inventory, tip, serviceCharge, deliveryAssign
  → NO multipleMenu entry ← ABSENT

Codebase-wide grep for "multipleMenu" outside settings:
  → 0 consumers in MenuContext, CartPanel, DashboardPage, OrderEntry, or any other component
```

#### Finding
`multiple_menu` is saved to the backend but the **frontend has zero consumers**. No component reads `restaurant.features.multipleMenu` (it doesn't exist) or any other gate to change UI behavior.

**What "Multiple Menu" likely means architecturally:**  
The backend serves different menu versions (e.g., Lunch Menu, Dinner Menu, Happy Hour Menu) when `multiple_menu = Yes`. The **frontend MenuContext** fetches menus from the backend — if multiple menus exist, the backend may return multiple objects. But the frontend has no UI to switch between menus or display which menu is active.

**Conclusion:**  
The setting can be toggled and saved, but there is no frontend feature built for it. This is either:
- (a) A **BACKEND_ONLY** gate (backend logic changes; FE just displays whatever menus come back), OR
- (b) A **NOT_STARTED** feature in the frontend (the menu-switching UI was never built)

→ **Owner Decision needed:** What is the expected FE behavior when `multiple_menu = Yes`?

---

### INV-5 — Cancel After Serve + Scheduled Order: Not Gated from Settings

#### 5A — Cancel After Serve (Cancel After Server)

**Setting path:** Restaurant Settings step5 → `canclePostServe` → `advanced.cancle_post_serve`

```
profileTransform.js:222
  → cancellation.allowPostServeCancel: toBoolean(api.cancle_post_serve)   ✅ MAPPED
  → restaurant.cancellation.allowPostServeCancel in RestaurantContext

OrderEntry.jsx:307
  → const canCancelItem = hasPermission('food');    ← ONLY permission check
  → NO check of restaurant.cancellation.allowPostServeCancel

OrderEntry.jsx:322-324
  → const isItemCancelAllowed = useCallback((item) => {
      return canCancelItem;                          ← only permission, no setting gate
    }, [canCancelItem]);

CartPanel.jsx:64
  → showCancelBtn = !isCancelled && canCancelItem && (!isItemCancelAllowed || isItemCancelAllowed(item))
```

**ROOT CAUSE:** `allowPostServeCancel` is correctly mapped into `restaurant.cancellation` but **OrderEntry never reads it**. The cancel button visibility is gated only on role permission (`hasPermission('food')`). Turning off "Cancel After Serve" in Restaurant Settings has no effect on the UI.

**Fix scope:** 1 file (`OrderEntry.jsx`), ~3 lines — add `cancellation.allowPostServeCancel` check into `isItemCancelAllowed` logic.  
**Risk:** HIGH (order cancellation flow). **Planning skip eligible:** YES (≤10 lines, 1 file, not financial). **Needs owner approval.**

---

#### 5B — Scheduled Order: Not Gated

**Setting path:** Restaurant Settings step5 → `scheduleOrder` → `basic.schedule_order`

```
profileTransform.js:
  → schedule_order NOT mapped anywhere in fromAPI.restaurant()
  → NOT in restaurant.features, NOT in restaurant.settings, NOT in restaurant.cancellation

RestaurantContext.jsx:
  → No scheduleOrder property

CartPanel.jsx:1284
  → <toggle checked={!!isScheduled} ...>   ← ALWAYS rendered, no gate

OrderEntry.jsx:155
  → const [isScheduled, setIsScheduled] = useState(false)
  → No check against any restaurant setting before showing schedule UI
```

**ROOT CAUSE:** Two-part gap:
1. `schedule_order` is NOT mapped in `profileTransform.js` → it never reaches RestaurantContext
2. Even if it were mapped, no component gates the schedule toggle UI behind it

**Fix scope:** 2 files (`profileTransform.js` + `CartPanel.jsx` or `OrderEntry.jsx`), ~5 lines.  
**Risk:** MEDIUM. **Planning skip:** Needs review (2 files — borderline). Recommend full Gate 2-3.

---

### INV-6 — Search By: Not Gated from Settings

**Setting path:** Restaurant Settings step5 → `searchBy` → `advanced.search_by`

```
profileTransform.js:232
  → searchOptions: api.search_by || ['order id', 'table no', 'user id']  ✅ MAPPED
  → restaurant.searchOptions in RestaurantContext

Codebase-wide grep for "searchOptions" / "restaurant.search":
  → 0 consumers outside profileTransform
  → CartPanel.jsx:869 mentions "searchByPhone" (CHG-036 customer phone search)
    but this is UNRELATED to the search_by setting array
  → DashboardPage.jsx, CartPanel.jsx, OrderEntry.jsx — none read restaurant.searchOptions
```

**ROOT CAUSE:** `searchOptions` is correctly mapped in profileTransform and available at `restaurant.searchOptions`, but **no UI component reads it**. Whatever search filter/options UI exists in the app shows all options regardless of what the owner configured in settings.

**Fix scope:** Need to identify the search UI component and add a filter against `restaurant.searchOptions`.  
**Risk:** MEDIUM. Recommend full Gate 2-3 (need to identify which component renders search options).

---

## 3. Hypotheses Tested

| # | Issue | Hypothesis | Test Method | Result |
|---|-------|-----------|-------------|--------|
| H1 | INV-1 | Logo URL passed through printer config API | Grep printerAgentConfigTransform | ELIMINATED — logo not in printer config; only logoSize |
| H2 | INV-2 | phone_number_on_bill and restaurant_information.phone_number are same field | Code trace + API probe | ELIMINATED — 2 different fields, 2 different APIs |
| H3 | INV-3 | discount_for reason captured but not displayed | Code trace CartPanel + orderTransform | CONFIRMED — discountFor=null in QSR + no reason column |
| H4 | INV-4 | Multiple menu gates a menu-switcher UI | Codebase grep | ELIMINATED — zero FE consumers |
| H5 | INV-5A | allowPostServeCancel is read in OrderEntry | Code trace OrderEntry.jsx:307 | ELIMINATED — canCancelItem = hasPermission('food') only |
| H6 | INV-5B | schedule_order mapped in profileTransform | Grep profileTransform | CONFIRMED MISSING — not mapped at all |
| H7 | INV-6 | searchOptions is consumed somewhere | Codebase grep | ELIMINATED — zero consumers |

---

## 4. Evidence Artifacts
All saved to: `/app/memory/evidence/INV-AUG18-2026/`

- `restaurantSettingsTransform.js` — phoneNumberOnBill + logo field mapping (lines 34, 36, 219)
- `profileTransform.js` — searchOptions mapping (line 232), cancellation mapping (line 222), schedule_order absence
- `printerAgentConfigTransform.js` — restaurantInfo.phone source (lines 191, 253), logoSize (lines 233-235)
- `BillContentTab.jsx` — "Field Visibility = Coming soon" (line 98-106), restaurantInfo.phone display (line 69)
- `OrderEntry.jsx` — canCancelItem = hasPermission('food') (line 307), no scheduleOrder gate (line 155)
- `CartPanel.jsx` — discountFor: null (line 513), schedule toggle always rendered (line 1284)
- `DiscountReportMockup.jsx` — no reason column (lines 130-131), API shape (lines 67-73)

---

## 5. Recommendations

| # | Item | Action | Type | Priority | Planning Skip? |
|---|------|--------|------|----------|:---:|
| INV-1 | Logo on bill | Architecture understood — no FE bug. CR-133 Phase 2/3 will add Field Visibility toggle | OWNER_DECISION | P3 | N/A |
| INV-2 | Wrong phone on bill | Create BACKEND_BRIEF: backend must sync `phone_number_on_bill` → `restaurant_information.phone_number` in printer config | BACKEND_ASK | P1 | N/A |
| INV-3 | Discount reason missing | Two-part: (a) BACKEND_BRIEF for `by_reason` in `insights-discounts` endpoint; (b) FE adds reason column/chart | BACKEND_ASK + FE_FIX | P2 | NO — 2 parts |
| INV-4 | Multiple menu | Owner decision: is FE menu-switcher expected? If yes → new CR for menu selection UI | OWNER_DECISION | P2 | N/A |
| INV-5A | Cancel after serve ungated | FE_FIX: 1 file, ~3 lines in OrderEntry.jsx — add `cancellation.allowPostServeCancel` to `isItemCancelAllowed` | FE_FIX | P1 | YES (owner must approve) |
| INV-5B | Scheduled order ungated | FE_FIX: 2 files — add `schedule_order` to profileTransform + gate CartPanel schedule toggle | FE_FIX | P1 | NO — 2 files |
| INV-6 | Search by ungated | FE_FIX: identify search UI component + filter options against `restaurant.searchOptions` | FE_FIX | P2 | NO — component TBD |

---

## 6. Retroactive Candidates
- INV-5A: `allowPostServeCancel` mapped in profileTransform (registry may show IMPLEMENTED) but gate not wired → check if BUG exists or needs new registration
- INV-6: `searchOptions` mapped in profileTransform (may show IMPLEMENTED) but no consumer → check registry

---

## 7. Backend Briefs Required

### BACKEND_BRIEF — INV-2 (Phone on Bill)
```
Issue: phone_number_on_bill set in Restaurant Settings does not appear on printed bill
Classification: CONTRACT_MISMATCH
Frontend impact: Owner sets "Phone on Bill" but a different number prints
Priority: P1 / HIGH

Endpoint (read): GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config
Field: settings_config.restaurant_information.phone_number

Endpoint (write): POST /api/.../restaurant-settings (basic.phone_number_on_bill)

Expected: restaurant_information.phone_number === basic.phone_number_on_bill
Actual: restaurant_information.phone_number appears to source from basic.phone (different field)

Ask: Does the backend sync phone_number_on_bill into restaurant_information.phone_number?
     If not, please change the printer agent config endpoint to return phone_number_on_bill
     as the phone_number field.
```

### BACKEND_BRIEF — INV-3 (Discount Reason)
```
Issue: Discount Report has no breakdown by discount reason/type
Classification: BACKEND_GAP
Frontend impact: DiscountReportMockup cannot show reason column
Priority: P2 / MEDIUM

Endpoint: POST /api/.../insights-discounts { from_date, to_date }
Current response: { summary, daily[], by_employee[] }

Missing: by_reason[] array: [{ reason: string, total_amount: number, order_count: number }]
  OR: by_discount_type[] array with the discount type names from restaurant_discount_type

Ask: Can the insights-discounts endpoint add a by_reason or by_discount_type breakdown?
```

---

## 8. Handover

```
Root causes found for 6/6 issues. Confidence: HIGH (5), MEDIUM (1 — INV-2 needs backend confirmation).
Steps used: 9/10.

Owner decisions needed:
  - INV-1: Is the logo printing working as expected? If not, which printer agent version is deployed?
  - INV-4: Should the frontend implement a menu-switcher UI for Multiple Menu?
  - INV-5A: Approve direct bug fix (planning skip) for cancel-after-serve gate?

Backend briefs needed:
  - INV-2: Phone on bill sync
  - INV-3: Discount reason breakdown

FE fixes ready for planning:
  - INV-5A (planning skip eligible — P1, 1 file, ~3 lines, needs owner approval)
  - INV-5B (Gate 2-3 — 2 files)
  - INV-6 (Gate 2-3 — component TBD)

Investigation report at: /app/memory/INV-AUG18-2026_INVESTIGATION_REPORT.md
```
