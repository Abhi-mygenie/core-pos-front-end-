# CR-019 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-10
**CR:** CR-019 — Restaurant Settings Self-Onboarding Wizard
**Prerequisite:** Gate 2 (Impact Analysis) — PASSED

---

## Plan Overview

| Phase | Title | Deliverable | Owner Gate |
|---|---|---|---|
| **Phase 1** | API Layer + Transform | Service + transform wired and tested via curl | Owner verifies GET/POST round-trip |
| **Phase 2** | Wizard Shell + Step 1 (Restaurant Identity) | Routable page, left-rail stepper, Step 1 form with pre-population + validation + save | Owner reviews Step 1 live |
| **Phase 3** | Step 2 (Channels & Payments) | Channel cards, payment chips, conditional fields, save | Owner reviews Step 2 live |
| **Phase 4** | Steps 3-5 (Optional Steps) | Charges/Tips, Order/Kitchen, Inventory/Extras — all with skip + save | Owner reviews skip flow + optional steps |
| **Phase 5** | Step 6 (Owner Info) + Full Save & Launch | Final step, full wizard end-to-end, Save & Launch → dashboard redirect | Owner full smoke — complete wizard start to finish |
| **Phase 6** | Sidebar Integration + Polish | Sidebar entry, permission gating, edge cases, loading states, error handling | Owner verifies sidebar + final UX |

---

## Phase 1: API Layer + Transform

### Goal
Wire the two backend endpoints and build the transform layer that converts API data ↔ form data. No UI yet — just the data plumbing, verified via console/curl.

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/api/constants.js` | MODIFY (+2 lines) | Add `RESTAURANT_SETTINGS_LIST` and `RESTAURANT_SETTINGS_UPDATE` endpoint constants |
| `frontend/src/api/services/restaurantSettingsService.js` | **NEW** | `getSettings()` → GET settings-list. `updateSettings(data, logoFile, pdfFile)` → POST update-settings (multipart FormData) |
| `frontend/src/api/transforms/restaurantSettingsTransform.js` | **NEW** | `fromAPI.settingsResponse(apiData)` → flat form object per step. `toAPI.settingsPayload(formState)` → reconstruct `{ basic, advanced, vendor }` JSON string. Handle: `"Yes"/"No"` ↔ bool for toggles, `1/0` ↔ bool for `gst.status`/`vat.status`, string numbers (`"5.00"`) ↔ number inputs, mixed bool types (`take_away` is boolean, `dine_in` is "Yes"/"No"), `search_by` array pass-through |

### Implementation Detail

#### constants.js additions
```js
RESTAURANT_SETTINGS_LIST: '/api/v2/vendoremployee/restaurant-settings/settings-list',
RESTAURANT_SETTINGS_UPDATE: '/api/v2/vendoremployee/restaurant-settings/update-settings',
```

#### restaurantSettingsService.js
```
getSettings()
  → api.get(RESTAURANT_SETTINGS_LIST)
  → fromAPI.settingsResponse(response.data.data)
  → returns { step1: {...}, step2: {...}, ..., step6: {...} }

updateSettings(formState, logoFile, pdfFile)
  → toAPI.settingsPayload(formState) → JSON string
  → new FormData()
  → formData.append('data', jsonString)
  → if (logoFile) formData.append('logo', logoFile)
  → if (pdfFile) formData.append('pdf', pdfFile)
  → api.post(RESTAURANT_SETTINGS_UPDATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
```

#### restaurantSettingsTransform.js — fromAPI

Maps the flat API response into per-step form objects:

```
fromAPI.settingsResponse(data) → {
  step1: {
    name: data.basic.name || '',
    phone: data.basic.phone || '',
    address: data.basic.address || '',
    fssai: data.basic.fssai || '',
    shortCode: data.basic.short_code || '',
    logoUrl: data.basic.logo || null,
    pdfMenuUrl: data.basic.pdf_menu || null,
    gstEnabled: data.basic.gst?.status === 1,
    gstCode: data.basic.gst?.code || '',
    gstMode: data.advanced.restaurent_gst || 'category',
    gstTax: parseFloat(data.advanced.gst_tax) || 0,
    tax: parseFloat(data.advanced.tax) || 0,
    vatEnabled: data.basic.vat?.status === 1,
    vatCode: data.basic.vat?.code || '',
  },
  step2: {
    dineIn: toBool(data.advanced.dine_in),
    takeAway: toBool(data.advanced.take_away),
    delivery: toBool(data.advanced.delivery),
    room: toBool(data.advanced.room),
    payCash: toBool(data.advanced.pay_cash),
    payUpi: toBool(data.advanced.pay_upi),
    payCc: toBool(data.advanced.pay_cc),
    payTab: toBool(data.advanced.pay_tab),
    onlinePayment: toBool(data.advanced.online_payment),
    upiId: data.advanced.upi_id || '',
    dynamicUpiValue: toBool(data.advanced.dynamic_upi_value),
    orderPaymentType: data.advanced.order_payment_type || 'both',
    showCashOnDelivery: toBool(data.advanced.show_cash_on_delivery),
    walkinOnlinePayment: toBool(data.advanced.walkin_online_payment),
    dineinOnlinePayment: toBool(data.advanced.dinein_online_payment),
    takeawayOnlinePayment: toBool(data.advanced.takeaway_online_payment),
    deliveryOnlinePayment: toBool(data.advanced.delivery_online_payment),
  },
  step3: {
    serviceCharge: toBool(data.advanced.service_charge),
    autoServiceCharge: toBool(data.advanced.auto_service_charge),
    serviceChargePercentage: parseFloat(data.advanced.service_charge_percentage) || 0,
    serviceChargeTax: parseFloat(data.advanced.service_charge_tax) || 0,
    tip: toBool(data.advanced.tip),
    availableDiscount: toBool(data.advanced.available_discount),
    totalRound: toBool(data.advanced.total_round),
  },
  step4: {
    defOrdStatus: data.advanced.def_ord_status || 2,
    listServeItem: data.advanced.list_serve_item || 'Dynamic',
    printKot: toBool(data.advanced.print_kot),
    billingAutoBillPrint: toBool(data.advanced.billing_auto_bill_print),
    canclePostServe: toBool(data.advanced.cancle_post_serve),
    voiceInKds: toBool(data.advanced.voice_in_kds),
    realTimeOrderStatus: toBool(data.advanced.real_time_order_status),
    showPopularCategory: toBool(data.advanced.show_popular_category),
    foodLevelNotes: toBool(data.advanced.food_level_notes),
    showFoodVarriance: toBool(data.advanced.show_food_varriance),
    orderConfirmForWeb: toBool(data.advanced.order_confirm_for_web),
    showAcNonMenu: toBool(data.advanced.show_ac_non_menu),
    foodDate: toBool(data.advanced.food_date),
    searchBy: data.advanced.search_by || [],
  },
  step5: {
    inventory: toBool(data.advanced.inventory),
    inventoryNegative: toBool(data.advanced.inventory_negative),
    inventoryAlertNumber: data.advanced.inventory_alert_number || '',
    inventoryManagerName: data.basic.inventory_manager_name || '',
    phoneNumberOnBill: data.basic.phone_number_on_bill || '',
    reportNumber: data.basic.report_number || '',
    deliveryContactNo: data.basic.delivery_contact_no || '',
    deliveryPersonName: data.advanced.delivery_person_name || '',
    settelmentReport: toBool(data.advanced.settelment_report),
    feedBack: toBool(data.advanced.feed_back),
    sendFeedbackLink: data.advanced.send_feedback_link || 'internal',
    feedbackUrl: data.advanced.feedback_url || '',
    onlineOrderingLink: data.basic.online_ordering_link || '',
  },
  step6: {
    firstName: data.vendor.f_name || '',
    lastName: data.vendor.l_name || '',
    phone: data.vendor.phone || '',
  },
}
```

Helper: `toBool(val)` — handles `"Yes"` → true, `"No"` → false, `true` → true, `false` → false, `1` → true, `0` → false.

#### restaurantSettingsTransform.js — toAPI

Reconstructs the 3-section API payload from form state:

```
toAPI.settingsPayload(formState) → {
  basic: {
    name: formState.step1.name,
    phone: formState.step1.phone,
    address: formState.step1.address,
    gst: { status: formState.step1.gstEnabled ? 1 : 0, code: formState.step1.gstCode },
    vat: { status: formState.step1.vatEnabled ? 1 : 0, code: formState.step1.vatCode },
    fssai: formState.step1.fssai,
    report_number: formState.step5.reportNumber,
    delivery_contact_no: formState.step5.deliveryContactNo,
    inventory_manager_name: formState.step5.inventoryManagerName,
    online_ordering_link: formState.step5.onlineOrderingLink,
    phone_number_on_bill: formState.step5.phoneNumberOnBill,
    short_code: formState.step1.shortCode,
  },
  advanced: {
    // Step 2 — Channels
    dine_in: toYesNo(formState.step2.dineIn),
    take_away: formState.step2.takeAway,           // boolean — API expects boolean
    delivery: formState.step2.delivery,              // boolean — API expects boolean
    room: toYesNo(formState.step2.room),
    // Step 2 — Payments
    pay_cash: toYesNo(formState.step2.payCash),
    pay_upi: toYesNo(formState.step2.payUpi),
    pay_cc: toYesNo(formState.step2.payCc),
    pay_tab: toYesNo(formState.step2.payTab),
    upi_id: formState.step2.upiId,
    dynamic_upi_value: toYesNo(formState.step2.dynamicUpiValue),
    order_payment_type: formState.step2.orderPaymentType,
    show_cash_on_delivery: toYesNo(formState.step2.showCashOnDelivery),
    walkin_online_payment: toYesNo(formState.step2.walkinOnlinePayment),
    dinein_online_payment: toYesNo(formState.step2.dineinOnlinePayment),
    takeaway_online_payment: toYesNo(formState.step2.takeawayOnlinePayment),
    delivery_online_payment: toYesNo(formState.step2.deliveryOnlinePayment),
    // Step 3 — Charges
    service_charge: toYesNo(formState.step3.serviceCharge),
    auto_service_charge: toYesNo(formState.step3.autoServiceCharge),
    service_charge_percentage: String(formState.step3.serviceChargePercentage.toFixed(2)),
    service_charge_tax: String(formState.step3.serviceChargeTax.toFixed(2)),
    tip: toYesNo(formState.step3.tip),
    available_discount: toYesNo(formState.step3.availableDiscount),
    total_round: toYesNo(formState.step3.totalRound),
    // Step 4 — Order & Kitchen
    def_ord_status: formState.step4.defOrdStatus,
    list_serve_item: formState.step4.listServeItem,
    print_kot: toYesNo(formState.step4.printKot),
    billing_auto_bill_print: toYesNo(formState.step4.billingAutoBillPrint),
    cancle_post_serve: toYesNo(formState.step4.canclePostServe),
    voice_in_kds: toYesNo(formState.step4.voiceInKds),
    real_time_order_status: toYesNo(formState.step4.realTimeOrderStatus),
    show_popular_category: toYesNo(formState.step4.showPopularCategory),
    food_level_notes: toYesNo(formState.step4.foodLevelNotes),
    show_food_varriance: toYesNo(formState.step4.showFoodVarriance),
    order_confirm_for_web: toYesNo(formState.step4.orderConfirmForWeb),
    show_ac_non_menu: toYesNo(formState.step4.showAcNonMenu),
    food_date: toYesNo(formState.step4.foodDate),
    search_by: formState.step4.searchBy,
    // Step 5 — Inventory & Extras
    inventory: toYesNo(formState.step5.inventory),
    inventory_negative: toYesNo(formState.step5.inventoryNegative),
    inventory_alert_number: formState.step5.inventoryAlertNumber,
    delivery_person_name: formState.step5.deliveryPersonName,
    settelment_report: toYesNo(formState.step5.settelmentReport),
    feed_back: toYesNo(formState.step5.feedBack),
    send_feedback_link: formState.step5.sendFeedbackLink,
    feedback_url: formState.step5.feedbackUrl,
    // Fields from GET that must be echoed back (not in wizard UI but needed in payload)
    restaurent_gst: formState.step1.gstMode,
    gst_tax: String(parseFloat(formState.step1.gstTax || 0).toFixed(2)),
    tax: String(formState.step1.tax || 0),
  },
  vendor: {
    f_name: formState.step6.firstName,
    l_name: formState.step6.lastName,
    phone: formState.step6.phone,
  },
}
```

Helper: `toYesNo(bool)` — `true` → `"Yes"`, `false` → `"No"`.

### Acceptance Criteria (Phase 1)
1. `getSettings()` returns correctly transformed per-step form data
2. `updateSettings()` constructs valid FormData with JSON `data` field
3. Round-trip test: GET → transform → toAPI → POST → GET again → values match
4. File uploads attach to FormData correctly (logo + pdf)

### ⛩️ OWNER GATE 1
> **Owner verifies:** API round-trip works. Agent demonstrates GET pre-population + POST save via console or test page. Values survive the round-trip without corruption.

---

## Phase 2: Wizard Shell + Step 1 (Restaurant Identity)

### Goal
Build the wizard page skeleton (left-rail stepper, content area, action bar) and implement Step 1 with real data pre-population, validation, and save.

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/pages/RestaurantSettingsPage.jsx` | **NEW** | Wizard shell + Step 1 content |
| `frontend/src/App.js` | MODIFY | Add route: `<Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />` |

### Implementation Detail

#### Wizard Shell Architecture (RestaurantSettingsPage.jsx)

```
State:
  - currentStep (1-6)
  - formState: { step1: {...}, step2: {...}, ..., step6: {...} }
  - isLoading (initial API fetch)
  - isSaving (per-step save)
  - completedSteps: Set<number>
  - logoFile: File | null
  - pdfFile: File | null

Lifecycle:
  - useEffect on mount → getSettings() → setFormState(transformed)
  - Loading spinner while fetching

Layout:
  - Left Rail (280px fixed): Logo, title, step list with status indicators
  - Main Area: Top bar (step title + progress), scrollable content, fixed bottom action bar

Step Navigation:
  - goToStep(n) — validates current step before allowing forward navigation
  - nextStep() — validates + saves current step → moves forward
  - prevStep() — no validation needed going back
  - clickable completed steps in rail (can revisit)
```

#### Step 1: Restaurant Identity & Tax

Components:
```
<BasicInfoSection>
  - Restaurant Name (text, required, pre-filled)
  - Phone (tel, required, pre-filled)
  - Address (textarea, required, pre-filled)
  - FSSAI (text, optional, pre-filled)
  - Short Code (text, optional)
  - Logo Upload (file picker → preview)
  - PDF Menu Upload (file picker → filename display)
</BasicInfoSection>

<TaxConfigSection>
  - GST Toggle (required — must decide)
  - [conditional: GST ON]
    - GST Number (text, required if GST ON)
    - GST Mode (select: "category" | "flat")
    - GST % (number)
    - Tax % (number)
  - VAT Toggle (optional)
  - [conditional: VAT ON]
    - VAT Code (text, required if VAT ON)
</TaxConfigSection>
```

Validation (Step 1):
```
- name: required, non-empty
- phone: required, non-empty
- address: required, non-empty
- gstCode: required IF gstEnabled === true
- vatCode: required IF vatEnabled === true
```

On "Save & Continue":
1. Validate required fields
2. Show inline errors if validation fails
3. If valid → call `updateSettings(formState, logoFile, pdfFile)`
4. On success → mark step 1 complete → advance to step 2
5. On error → show toast with error message

### Acceptance Criteria (Phase 2)
1. Page loads at `/restaurant-settings` with loading spinner
2. Step 1 form pre-populates from API data
3. Left-rail shows Step 1 as active (orange), rest as upcoming (gray)
4. Required field validation blocks Save if empty
5. GST/VAT conditional fields show/hide correctly
6. Logo/PDF file picker works
7. Save succeeds → Step 1 marked complete (green ✓) → auto-advances to Step 2

### ⛩️ OWNER GATE 2
> **Owner verifies:** Navigate to `/restaurant-settings`. Step 1 loads with CAFE 103 data pre-filled. Edit a field (e.g., FSSAI), save, reload — change persists. Validation blocks save when name is cleared. GST conditional fields toggle correctly.

---

## Phase 3: Step 2 (Channels & Payments)

### Goal
Implement the service channels visual cards and payment method chip selectors with conditional fields and per-channel online payment toggles.

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/pages/RestaurantSettingsPage.jsx` | MODIFY | Add Step 2 content section |

### Implementation Detail

#### Service Channels Section
- 4 visual cards (Dine-In, Takeaway, Delivery, Room Service)
- Click to toggle selected/deselected
- Green border + light green background when selected
- **Validation:** At least 1 channel must be selected

#### Payment Methods Section
- 5 chip selectors (Cash, UPI, Card, Tab/Credit, Online Payment)
- Click to toggle
- Green check + green border when selected
- **Validation:** At least 1 payment method must be selected

#### Conditional Fields
- UPI ID field: visible when UPI is selected
- Order Payment Type dropdown: always visible
- Dynamic UPI toggle: always visible
- Show Cash on Delivery toggle: visible when Delivery channel is selected

#### Online Payment per Channel Section
- 4 toggles (Walk-in, Dine-in, Takeaway, Delivery)
- Only show toggles for channels that are selected in the channels section above

Validation (Step 2):
```
- At least 1 of: dineIn, takeAway, delivery, room === true
- At least 1 of: payCash, payUpi, payCc, payTab, onlinePayment === true
- upiId: required IF payUpi === true (warn but don't block — can be set later)
```

### Acceptance Criteria (Phase 3)
1. Channel cards reflect API state (Dine-In/Takeaway/Delivery selected for CAFE 103)
2. Payment chips reflect API state (Cash/UPI/Card/Tab selected)
3. Toggling channels on/off works
4. At least 1 channel + 1 payment validation enforced
5. Online payment toggles only appear for active channels
6. Save persists selections

### ⛩️ OWNER GATE 3
> **Owner verifies:** Step 2 pre-populates correctly. Toggle Room Service ON, save, reload — Room is now ON. Toggle Cash OFF (with others still ON), save — works. Try to deselect ALL channels — validation blocks save.

---

## Phase 4: Steps 3-5 (Optional Steps)

### Goal
Implement the three optional steps. These all share the pattern: toggle rows + number inputs + "Skip for now" button.

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/pages/RestaurantSettingsPage.jsx` | MODIFY | Add Step 3, 4, 5 content sections |

### Implementation Detail

#### Step 3: Charges, Tips & Discounts
```
<ServiceChargeSection>
  - Service Charge toggle
  - Auto Service Charge toggle
  - SC Percentage (number, suffix %)
  - SC Tax % (number, suffix %)
</ServiceChargeSection>

<TipsDiscountsSection>
  - Enable Tips toggle
  - Discounts Available toggle
  - Total Rounding toggle
</TipsDiscountsSection>
```

#### Step 4: Order & Kitchen Config
```
<OrderWorkflowSection>
  - Default Order Status (select: 1-5)
  - Serve Item Display (select: Dynamic/Static)
  - Print KOT toggle
  - Auto Print Bill toggle
  - Cancel After Serve toggle
  - Voice in KDS toggle
</OrderWorkflowSection>

<DisplayPreferencesSection>
  - Real-Time Order Status toggle
  - Show Popular Category toggle
  - Food Level Notes toggle
  - Show Food Variance toggle
  - Confirm Web Orders toggle
  - Show AC/Non Menu toggle
  - Food Date toggle
  - Search By (multi-select chips: Order ID, Table No, Phone No, User ID)
</DisplayPreferencesSection>
```

#### Step 5: Inventory, Billing & Extras
```
<InventorySection>
  - Inventory ON/OFF toggle
  - [conditional: inventory ON]
    - Negative Inventory toggle
    - Inventory Alert Number (tel)
    - Inventory Manager (text)
</InventorySection>

<BillingContactSection>
  - Phone on Bill (tel)
  - Report Contact Number (tel)
  - Delivery Contact (tel)
  - Delivery Person Name (text)
  - Settlement Report toggle
</BillingContactSection>

<FeedbackSection>
  - Feedback ON/OFF toggle
  - [conditional: feedback ON]
    - Feedback Link Type (select: internal/external)
    - Feedback URL (url, visible if external)
  - Online Ordering Link (url)
</FeedbackSection>
```

#### Skip Flow
- All three steps show green "optional" banner at top
- "Skip for now →" button appears next to "Save & Continue"
- Skip = advance to next step WITHOUT calling POST (preserve existing API values)
- Save & Continue = call POST with current form state, then advance

Validation (Steps 3-5):
```
- No mandatory fields — all optional
- SC Percentage: 0-100 range if entered
- SC Tax %: 0-100 range if entered
- Inventory Alert Number: valid phone format if entered
```

### Acceptance Criteria (Phase 4)
1. All three steps pre-populate from API
2. "Skip for now" advances without saving
3. "Save & Continue" saves and advances
4. Conditional fields (inventory, feedback) show/hide correctly
5. Search By multi-select chips work
6. Green "optional" banner displays on all three steps

### ⛩️ OWNER GATE 4
> **Owner verifies:** Click through Steps 3→4→5 using "Skip for now" — arrives at Step 6 without errors. Go back to Step 3, enable Service Charge at 5%, save — reload, value persists. Step 4 search_by chips match API. Step 5 inventory conditional fields toggle.

---

## Phase 5: Step 6 (Owner Info) + Full Save & Launch

### Goal
Implement the final step with vendor details and the end-to-end "Save & Launch" flow that completes setup and redirects to dashboard.

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/pages/RestaurantSettingsPage.jsx` | MODIFY | Add Step 6 content + Save & Launch logic |

### Implementation Detail

#### Step 6: Owner / Vendor Details
```
<VendorInfoSection>
  - First Name (text, required, pre-filled)
  - Last Name (text, required, pre-filled)
  - Phone (tel, required, pre-filled)
</VendorInfoSection>

<CompletionCard>
  - Green background card: "Almost Done! Click Save & Launch to complete..."
</CompletionCard>
```

Validation (Step 6):
```
- firstName: required, non-empty
- lastName: required, non-empty
- phone: required, non-empty
```

#### Save & Launch Flow
1. Validate Step 6 fields
2. Call `updateSettings()` with full formState (all steps merged into one payload)
3. Show loading state on button ("Saving...")
4. On success:
   - Show success toast: "Restaurant setup complete!"
   - Navigate to `/dashboard`
5. On error:
   - Show error toast with message
   - Stay on Step 6

#### Button Label
- Steps 1-5: "Save & Continue →"
- Step 6: "✓ Save & Launch" (green, prominent)

### Acceptance Criteria (Phase 5)
1. Step 6 shows vendor info pre-populated
2. "Almost Done" card displays
3. "Save & Launch" validates vendor fields
4. Successful save redirects to `/dashboard`
5. Full wizard flow: Steps 1→2→3→4→5→6→Dashboard works end-to-end
6. Error handling: toast on API failure

### ⛩️ OWNER GATE 5
> **Owner verifies:** Complete full wizard flow from Step 1 to Step 6. Hit "Save & Launch" — redirects to dashboard. Verify data saved correctly by opening SettingsPanel (existing slide-over) — values match what was entered in wizard. Test error case: clear First Name, try to save — validation blocks.

---

## Phase 6: Sidebar Integration + Polish

### Goal
Add the sidebar entry, wire up permission gating, and polish edge cases (loading states, error recovery, responsive behavior).

### Files

| File | Action | Detail |
|---|---|---|
| `frontend/src/components/layout/Sidebar.jsx` | MODIFY | Add `restaurant-setup` item to menu + VISIBLE_SECTIONS + SIDEBAR_PERMISSIONS |
| `frontend/src/pages/RestaurantSettingsPage.jsx` | MODIFY | Loading skeleton, error state, save feedback polish |

### Implementation Detail

#### Sidebar Entry
```js
// In sidebarMenuItems array (after 'settlement', before 'menu-management'):
{
  id: "restaurant-setup",
  label: "Restaurant Setup",
  icon: Building2,   // from lucide-react (or Settings)
  path: "/restaurant-settings",
}

// In VISIBLE_SECTIONS:
const VISIBLE_SECTIONS = new Set([
  'dashboard', 'reports', 'insights', 'credit', 'settlement',
  'restaurant-setup',    // ← NEW
  'menu-management', 'visibility-settings'
]);

// In SIDEBAR_PERMISSIONS:
'restaurant-setup': 'restaurant_setup',  // permission from login role array
```

- No special click handler — `handleItemClick` default path navigation handles it
- Active state highlights when on `/restaurant-settings` route (existing useEffect handles this)

#### Polish Items
1. **Loading skeleton** — show pulsing skeleton while GET settings-list loads
2. **Save feedback** — button shows spinner during save, disables to prevent double-click
3. **Error state** — if GET fails, show retry button instead of empty form
4. **Toast notifications** — success toast on save, error toast on failure
5. **Unsaved changes** — if user clicks sidebar during edit, no prompt (acceptable for v1, form re-fetches on mount)

### Acceptance Criteria (Phase 6)
1. "Restaurant Setup" appears in sidebar for Owner role
2. Clicking it navigates to `/restaurant-settings`
3. Sidebar item highlights when on that route
4. Loading skeleton shows during initial data fetch
5. Save button shows spinner during API call
6. Permission gating: hidden if user lacks `restaurant_setup` permission

### ⛩️ OWNER GATE 6 (FINAL)
> **Owner full smoke test:**
> 1. Login → sidebar shows "Restaurant Setup" → click → wizard loads with CAFE 103 data
> 2. Walk through all 6 steps, modify at least one field per step
> 3. Skip Step 4 using "Skip for now"
> 4. Complete Step 6 → "Save & Launch" → dashboard
> 5. Re-open wizard from sidebar → verify all changes persisted (including skipped step preserved original values)
> 6. Open existing Settings panel (slide-over from dashboard) → confirm it still works independently
> 7. Verify sidebar highlight toggles correctly between Dashboard and Restaurant Setup

---

## Summary

| Phase | New Files | Modified Files | Estimated Lines | Depends On |
|---|---|---|---|---|
| Phase 1 | 2 (service + transform) | 1 (constants.js) | ~250 | None |
| Phase 2 | 1 (RestaurantSettingsPage.jsx) | 1 (App.js) | ~400 | Phase 1 |
| Phase 3 | 0 | 1 (RestaurantSettingsPage.jsx) | +150 | Phase 2 |
| Phase 4 | 0 | 1 (RestaurantSettingsPage.jsx) | +250 | Phase 2 |
| Phase 5 | 0 | 1 (RestaurantSettingsPage.jsx) | +100 | Phase 4 |
| Phase 6 | 0 | 2 (Sidebar.jsx, RestaurantSettingsPage.jsx) | +50 | Phase 5 |
| **Total** | **3** | **3** | **~1200** | |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Multipart form-data POST fails | Phase 1 validates API round-trip before any UI is built |
| Type mismatch corrupts settings | Transform layer tested in Phase 1 with exact GET→POST→GET round-trip |
| Sidebar breaks | Phase 6 is last — all core functionality works before sidebar is touched |
| Lost settings on partial save | Each step saves independently — no data loss if user abandons mid-wizard |
| Regression on SettingsPanel | Gate 6 explicitly tests existing panel still works |

---

*CR-019 Implementation Plan — 2026-06-10. 6 phases, 6 owner gates, 3 new files, 3 modified files, ~1200 lines. Gate 3 complete.*
