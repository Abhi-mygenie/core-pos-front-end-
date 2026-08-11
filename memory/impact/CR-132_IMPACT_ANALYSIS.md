# CR-132 — Impact Analysis (Gate 2) — REVISED
**Date:** 2026-08-08 (original) | **Revised:** 2026-08-09 (screen architecture + owner design review feedback)
**Updated:** 2026-08-09 Session 2 (comparison pages built — awaiting owner feedback)
**Role:** PLANNING | **Risk:** MEDIUM (3 fields HIGH — see §2)
**Code Reality:** PARTIAL — 15 basic fields wired, 49 missing/moved
**Probe token used:** `cKbodC8T...` (masked) | Endpoint: `GET /api/v2/vendoremployee/restaurant-settings/settings-list`

---

## Design Review Status (2026-08-11 — DESIGN FREEZE)

| Screen | Comparison Page | Owner Review |
|---|---|---|
| 1 — Basic Settings | `/screen1-compare` | ✅ LOCKED — F1-01..F1-09 |
| 2 — Printer Settings | `/screen2-compare` | ✅ LOCKED — 2026-08-11 (8 fields from settings-list API) |
| 3 — Channels, Payments & Info | `/screen3-compare` | ✅ APPROVED — no changes |
| 4 — Tax & Charges | `/screen4-compare` | ✅ APPROVED — no changes |
| 5 — Order & Kitchen | `/screen5-compare` | ✅ APPROVED — printer fields MOVED to Step 2 |
| 6 — Online Ordering | `/screen6-compare` | ✅ APPROVED — no changes |
| 7 — Aggregator | ~~`/screen7-compare`~~ | ❌ REMOVED from CR-132 — moved to CR-135 (Q1=A, 2026-08-11) |
| 8 → **7** — Inventory | `/screen8-compare` | ✅ APPROVED — renumbered Step 7 |
| 9 → **8** — Room & Hospitality | `/screen9-compare` | ✅ APPROVED — renumbered Step 8 |
| **All screens (print)** | `/cr132-print` | Printable PDF |

**DESIGN FREEZE — 2026-08-11. All screens locked. Gate 3 (Implementation Plan) unblocked.**

---

## Owner Design Review Feedback Log (Screen-by-Screen)

### Screen 1 — Basic Settings (reviewed 2026-08-09, closed 2026-08-11)
| # | Feedback | Action |
|---|---|---|
| F1-01 | `phone_number_on_bill` must appear on Screen 1 under Restaurant Identity, below main Phone Number | **CONFIRMED** — move `phone_number_on_bill` from Screen 2 (Contact & Delivery) → Screen 1 (Restaurant Identity section) |
| F1-02 | `def_ord_status` (Default Order Status dropdown) must be on Screen 1 — core restaurant configuration | **CONFIRMED** — move `def_ord_status` from Screen 4 (Order & Kitchen) → Screen 1, below Restaurant Type |
| F1-03 | `basic.phone` (Phone Number) — remove from Screen 1 UI entirely. Only `phone_number_on_bill` stays | **CONFIRMED** — `basic.phone` removed from Screen 1 UI. Must move to Screen 2 (Channels & Info) alongside `delivery_contact_no`, `delivery_person_name`, `report_number`. Still sent in `toAPI basic.phone` payload from Screen 2 value |
| F1-04 | PDF Menu label must read "PDF Menu (Digital Menu Link)" | **CONFIRMED** — label updated |
| F1-05 | PDF Menu upload must show "Copy Link" + "View Menu" buttons when file exists, surfacing the `basic.pdf_menu` URL | **GAP CONFIRMED** — current `FileUpload` component (RestaurantSettingsPage.jsx line 141-158) shows only "Current file ×" — URL (`basic.pdf_menu`) is never surfaced to owner. Needs new CR or scope addition. See PDF Menu Gap section below |
| F1-06 | All other Screen 1 groupings confirmed as proposed | No change |
| F1-07 | `is_banner` — not used, hide from UI | **CONFIRMED** — pass-through only in transform, no UI rendered |
| F1-08 | `is_category_box` — not used, hide from UI | **CONFIRMED** — pass-through only in transform, no UI rendered |
| F1-09 | `show_popular_category` — rename UI label to "Show Popular Items" | **CONFIRMED** — UI label updated |

### Screens 3–8 — All Approved 2026-08-11 (no changes)
Owner reviewed all comparison pages (`/screen3-compare` → `/screen8-compare`) and confirmed: **no changes needed on any screen.**

---

## Printer Fields — Moved to CR-133 (2026-08-09)

Following cross-CR analysis, all printer-related fields are consolidated under CR-133. The wizard embeds `PrinterAgentConfigView` as Screen 2 (deferred pending CR-133 amendment).

### Fields REMOVED from CR-132 wizard scope (pending backend confirmation OD-CR133-D1..D7)

| Field | Was in wizard | Now owned by |
|---|---|---|
| `advanced.billing_auto_bill_print` | **Step 2 (Printer Settings)** — MOVE from Screen 5. Both wizard + CR-133 write this; wizard via `update-settings`, CR-133 via `printer-agent-config` |
| `advanced.print_kot` | **Step 2 (Printer Settings)** — MOVE from Screen 5. Same dual-write as above |
| `basic.no_of_bill` | Screen 5 Print section | CR-133 `print_copies.bill_copy_count` |
| `basic.no_of_kot` | Screen 5 Print section | CR-133 `print_copies.kot_copy_count` |
| `basic.aggregator_auto_kot` | Screen 7 Aggregator | CR-133 `auto_printing.aggregator_auto_kot` |
| `basic.aggregator_auto_bill` | Screen 7 Aggregator | CR-133 `auto_printing.aggregator_auto_bill` |
| `basic.aggregator_auto_bill_stage` | Screen 7 Aggregator | CR-133 `auto_printing.aggregator_auto_bill_stage` |

### Fields pending migration to CR-133 (OD-CR133-U1..U4 — backend must confirm)

| Field | If migrated → remove from wizard | If NOT migrated → stays in Screen 5 |
|---|---|---|
| `basic.print_bill_customer_copy` | Remove | Screen 5 Print section |
| `basic.printing_in_kds` | Remove | Screen 5 Print section |
| `basic.use_token` | Remove | Screen 5 Print section |
| `basic.kot_language` | Remove | Screen 5 Print section |

### Screen 5 (Order & Kitchen) Print section — updated scope
If all 4 U-fields migrate to CR-133: Print section removed entirely from Screen 5.
If U-fields stay: Screen 5 retains `print_bill_customer_copy`, `printing_in_kds`, `use_token`, `kot_language`.

**Amendment doc:** `handover/CR133_AMENDMENT_SETTINGS_INTEGRATION_2026_08_09.md`

--- (raised 2026-08-09)

### Scope
Both Logo and PDF Menu uploads to move from preprod server storage → AWS S3.

### Current upload flow
```
FE → multipart POST /update-settings → Backend → stores at preprod.mygenie.online/storage/ or /assets/landing/
Returns: full URL in basic.logo and basic.pdf_menu
```

### Two implementation options

**Option A — Backend handles S3 (recommended)**
```
FE → multipart POST /update-settings (unchanged) → Backend → uploads to S3 → returns S3 URL
```
- FE impact: **ZERO code changes**
- `getImageUrl()` in `profileTransform.js` (line 57): already handles `http://` prefixed URLs — `if (imagePath.startsWith('http')) return imagePath` ✅
- `restaurantSettingsTransform.js`: `basic.logo` and `basic.pdf_menu` already stored as full URLs ✅
- Copy Link / View Menu buttons work identically — URL just changes from `preprod.mygenie.online/...` to `s3.amazonaws.com/bucket/...`
- **Backend work only**: AWS SDK, S3 bucket config, credentials

**Option B — FE uploads directly to S3 via pre-signed URLs**
```
FE → GET /presigned-url from backend → FE → PUT directly to S3 → FE tells backend the S3 key
```
- FE impact: **MEDIUM** — requires new upload service, modify `restaurantSettingsService.js`
- More complex, more files changed, higher risk
- Not recommended unless backend team prefers this pattern

### Recommended: Option A
Backend change only. FE receives S3 URL instead of preprod URL — already handled transparently.

### FE files that reference storage URLs (all already handle http:// gracefully)
| File | Usage | S3 impact |
|---|---|---|
| `profileTransform.js` line 57–63 | `getImageUrl()` — prepends baseUrl only for relative paths | ✅ None — S3 URL starts with `https://` |
| `restaurantSettingsTransform.js` line 45–46 | `logoUrl: basic.logo` | ✅ None — full URL passed through |
| `RestaurantSettingsPage.jsx` | Displays `existingUrl` | ✅ None — URL displayed as-is |

### Action required
- Confirm Option A with backend team
- Backend: AWS S3 bucket + IAM credentials + SDK integration
- FE: No code changes (only label and Copy Link UX from PDF Menu Gap — already planned in CR-132)
- URL format in mockup updated: now shows `s3.amazonaws.com/mygenie-assets/...`

---

## PDF Menu Gap Analysis (raised during Screen 1 review, 2026-08-09)

### Current state
- `FileUpload` component in `RestaurantSettingsPage.jsx` (lines 141–158)
- When `existingUrl` (`basic.pdf_menu`) is present, shows: `[icon] Current file [×]`
- Actual URL is **never shown, copied, or linked** — owner cannot share the digital menu
- File uploads to: `https://preprod.mygenie.online/assets/landing/<filename>.pdf`

### Gap — what's missing
| # | Feature | Priority |
|---|---|---|
| G1 | Show truncated URL when `pdfMenuUrl` exists | P1 |
| G2 | "Copy Link" button → copies `pdfMenuUrl` to clipboard | P1 |
| G3 | "View Menu" button → opens `pdfMenuUrl` in new tab | P1 |
| G4 | Post-save toast: "Digital menu link ready — Copy Link" | P2 |

### Scope decision
**Suggested: Add to CR-132 scope** — Screen 1 is being rewritten anyway. Add a `FileUploadWithLink` variant for `pdf_menu` only. Zero risk, purely additive.

---

## Screen Architecture — FINAL FROZEN 2026-08-11

8-step wizard (Aggregator removed — moved to CR-135):

| Step | Screen | Required | Key fields | Decision |
|---|---|---|---|---|
| 1 | Basic Settings | Always | Identity, Operational Flags, Display & UI, CRM & Loyalty | Locked F1-01..F1-09 |
| **2** | **Printer Settings** | Always | `print_kot`, `billing_auto_bill_print`, `no_of_bill`, `no_of_kot`, `printing_in_kds`, `print_bill_customer_copy`, `use_token`, `kot_language` | **NEW step — 2026-08-11. All printer settings-list fields here.** |
| 3 | Channels, Payments & Info | Always | Channels, Payments, Online Payment/Channel, Contacts, Settlement, Feedback, Owner Info | `basic.phone` optional (Q3=B) |
| 4 | Tax & Charges | Always | GST (inc/exc), VAT, Service Charge (all), Other Charges | — |
| 5 | Order & Kitchen | Always | Order Workflow, Kitchen Display, Scheduling. **NOT printer fields** | `print_kot`/`billing_auto_bill_print` MOVED to Step 2 |
| 6 | Online Ordering | Always | Online Order, Scan, Confirm Order Tone | — |
| 7 | Inventory | Always | Tracking, Auto Accept, Alerts | Was Screen 8 — renumbered |
| 8 | Room & Hospitality | Room=ON (Step 3) | Room settings, Guest, Booking, Billing Employee | Was Screen 9 — renumbered |

### Screen 1 — Confirmed Field List (post F1-01 → F1-05)
```
Restaurant Identity:
  restaurant_for (NEW)          ← SelectInput: Normal / Hotel — TOP of card
  def_ord_status                ← SelectInput: Serve/Ready/Accept/Bill — MOVED from Screen 4 (F1-02)
  name*                         ← Restaurant Name (required)
  address*                      ← Full address (required)
  fssai                         ← FSSAI license
  phone_number_on_bill          ← "Phone on Bill" — ONLY phone field on this screen (F1-03)
  short_code                    ← Toggle
  logo                          ← File upload → preprod storage
  pdf_menu                      ← File upload → preprod storage + COPY LINK + VIEW button (F1-04/F1-05)

REMOVED from Screen 1:
  basic.phone                   ← REMOVED completely from Screen 1 (F1-03)
                                   MOVE TO: Screen 2 (Channels & Info) alongside
                                   delivery_contact_no, delivery_person_name

Operational Flags:
  prepaid_auto_sattle (NEW), auto_dispatch (NEW), ordersAutoPaid (NEW)

Display & UI:
  show_popular_category [UI LABEL → "Show Popular Items"] (F1-09), show_food_varriance, show_ac_non_menu
  food_date, food_level_notes
  is_banner (NEW) — HIDDEN, pass-through only (F1-07)
  is_category_box (NEW) — HIDDEN, pass-through only (F1-08)

CRM & Loyalty:
  is_loyality (NEW), is_customer_wallet (NEW), is_coupon (NEW)
```

---

| File | Last modified by | Date | Conflict? |
|---|---|---|---|
| `restaurantSettingsTransform.js` | BUG-SCAN-DEDUP (show_scan_popup fix) | 2026-08-08 | None |
| `RestaurantSettingsPage.jsx` | BUG-289 (defOrdStatus labels) | prior sprint | None |
| `profileTransform.js` | CR-118 / aggregatorAutoBill | 2026-07-31 | None — read-only, no write change planned |

No active items in registry.json touching these files.

---

## Risk Classification

| Risk | Fields | Reason |
|---|---|---|
| **HIGH** | `prepaid_auto_sattle`, `ordersAutoPaid`, `order_auto_serve` | Touch payment/order-status flow. OD-3 confirmed: HIGH gate, no R6 full regression |
| **MEDIUM** | `room_billing_included`, `room_otp_require`, `room_price`, `pay_via_room`, `is_loyality`, `is_customer_wallet`, `auto_dispatch`, `aggregator_auto_kot`, `aggregator_auto_bill` | Affect feature availability gates used at runtime |
| **LOW** | All remaining fields — toggles and display settings | UI only, no financial logic |

---

## SECTION A — CRITICAL REGRESSION (Fix BEFORE adding new fields)

### A1. `room` field moved from `advanced` → `basic`

**Status: LIVE BUG — room toggle is broken today**

| | Old API | New API |
|---|---|---|
| GET location | `advanced.room` | `basic.room` |
| POST location | sent in `advanced{}` | must be in `basic{}` |

**Current broken code:**
```js
// restaurantSettingsTransform.js — fromAPI
step2: {
  room: toBool(advanced.room),  // ❌ advanced.room is undefined — always reads false
```
```js
// restaurantSettingsTransform.js — toAPI
advanced: {
  room: toYesNo(s2.room),  // ❌ backend ignores room in advanced{}
```

**Fix required:**
```js
// fromAPI — read from basic
room: toBool(basic.room),

// toAPI — move to basic{}
basic: {
  ...
  room: toYesNo(s2.room),  // moved from advanced
```

**Risk:** HIGH — any restaurant with `room: 'Yes'` will have the Room channel silently cleared on next wizard save.
**Note:** `dine_in`, `take_away`, `delivery` remain in `advanced{}` — ONLY `room` moved.

---

## SECTION B — Old IA Field Location Corrections

The previous impact analysis (2026-08-08) assigned wrong source sections to 6 fields. All 6 moved from `advanced` → `basic` in the new API.

| Field | Old IA said | New API actual | toAPI target |
|---|---|---|---|
| `room_gst_applicable` | advanced | **basic** | basic |
| `auto_dispatch` | advanced | **basic** | basic |
| `is_loyality` | advanced | **basic** | basic |
| `is_customer_wallet` | advanced | **basic** | basic |
| `order_auto_serve` | advanced | **basic** | basic |
| `aggregator_order_tone` | advanced | **basic** | basic |

**Impact:** In toAPI, these 6 fields were planned to go into `advanced{}`. They must now go into `basic{}`.

**OD-1 update:** Now irrelevant for these 6 — they only exist in `basic`, not duplicated.

---

## SECTION C — Old IA Fields Confirmed (No Location Change)

These 7 fields from the original impact analysis are in `basic` as expected. No changes to their planned read/write targets.

| Field | Location | Status |
|---|---|---|
| `prepaid_auto_sattle` | basic | ✅ Confirmed |
| `ordersAutoPaid` | basic | ✅ Confirmed |
| `takeaway_charges` | basic | ✅ Confirmed |
| `print_bill_customer_copy` | basic | ✅ Confirmed |
| `kot_language` | basic | ✅ Confirmed |
| `locationSelection` | basic | ✅ Confirmed |
| `use_token` | basic | ✅ Confirmed |

---

## SECTION D — New Fields Added by Backend (36 completely new fields)

These fields are now in the live API but were NOT in the previous impact analysis.

### D1 — Step 1: Restaurant Identity (6 new UI fields)

| Field | API key | Type | Value seen | UI Component |
|---|---|---|---|---|
| Restaurant Type | `restaurant_for` | Select | `'Normal'` | SelectInput: Normal / Hotel / ... |
| Show App Banner | `is_banner` | Toggle | `'Yes'` | **HIDDEN — pass-through only** (F1-07: not used) |
| Category Box UI | `is_category_box` | Toggle | `'Yes'` | **HIDDEN — pass-through only** (F1-08: not used) |
| Show GST to User | `show_user_gst` | Toggle | `'No'` | Toggle Yes/No |
| Delivery Charge GST% | `deliver_charge_gst` | Number | `'5.00'` | NumberInput (%) |
| Service Charge Tax Label | `service_chrg_taxt` | Text | `'Service Charge'` | TextInput |

### D2 — Step 2: Channels & Payments (15 new UI fields)

| Field | API key | Type | Value seen | UI Component | Notes |
|---|---|---|---|---|---|
| Online Orders | `online_order` | Toggle | `'Yes'` | Toggle | Enable online ordering |
| Multiple Menus | `multiple_menu` | Toggle | `'No'` | Toggle | Multiple menu support |
| Room Billing Included | `room_billing_included` | Toggle | `'Yes'` | Toggle | **Was OD-4 deferred — now in basic** |
| Room OTP Required | `room_otp_require` | Toggle | `'No'` | Toggle | **Was OD-4 deferred — now in basic** |
| Room Price Override | `room_price` | Toggle | `'No'` | Toggle | **Was OD-4 deferred — now in basic** |
| Pay Via Room | `pay_via_room` | Toggle | `'Yes'` | Toggle | **Was OD-4 deferred — now in basic** |
| Dine-in OTP Required | `dinein_otp_require` | Toggle | `'Yes'` | Toggle | |
| Collect Guest Details | `guest_details` | Toggle | `'Yes'` | Toggle | |
| Show Booking Details | `booking_details` | Toggle | `'Yes'` | Toggle | |
| Billing by Employee | `billing_employee` | Toggle | `'Yes'` | Toggle | Note: API also returns `billing_emp` (alias) — ignore `billing_emp`, use `billing_employee` only |
| Role-Based Discount | `role_base_discount` | Toggle | `'No'` | Toggle | |
| Coupon Enabled | `is_coupon` | Toggle | `'Yes'` | Toggle | |
| Dine-in Number | `dinein_number` | Toggle | `'No'` | Toggle | |
| Food Different Price | `food_different_price` | Toggle | `'No'` | Toggle | |
| Different Price by Channel | `food_different_price` | Toggle | `'No'` | Toggle | |

### D3 — Step 4: Order & Kitchen (14 new UI fields)

| Field | API key | Type | Value seen | UI Component |
|---|---|---|---|---|
| No. of KOT Prints | `no_of_kot` | Select/Number | `'1'` | SelectInput: 1/2/3 |
| No. of Bill Prints | `no_of_bill` | Select/Number | `'1'` | SelectInput: 1/2/3 |
| Print in KDS | `printing_in_kds` | Toggle | `'Yes'` | Toggle |
| Schedule Orders | `schedule_order` | Toggle | `True` | Toggle |
| Confirm Order Tab | `confirm_order_show_tab` | Toggle | `'No'` | Toggle |
| Confirm Order Tone | `confirm_order_tone` | Select | `'default'` | SelectInput: default/buzzer/... |
| Aggregator Auto KOT | `aggregator_auto_kot` | Toggle | `'Yes'` | Toggle |
| Aggregator Auto Bill | `aggregator_auto_bill` | Toggle | `'No'` | Toggle |
| Aggregator Auto Bill Stage | `aggregator_auto_bill_stage` | Select | `'Ready'` | SelectInput: Ready/Served/... |
| Default Prep Time (min) | `default_prep_time` | Number | `15` | NumberInput |
| Prep Time Count Method | `prep_time_count_method` | Select | `'quantity'` | SelectInput: quantity/time/... |
| Auto Acknowledge Prep Time | `auto_prep_time_ack` | Toggle | `'No'` | Toggle |

### D4 — Step 5: Inventory & Extras (1 new UI field)

| Field | API key | Type | Value seen | UI Component |
|---|---|---|---|---|
| Auto Accept Inventory | `auto_accept_inventory` | Toggle | `'No'` | Toggle |

### D5 — Pass-Through Only (wire in transform, no wizard UI)

These fields must round-trip through the transform to prevent backend clearing them on save, but do NOT need UI in the wizard.

| Field | API key | Reason for no UI |
|---|---|---|
| Prep Time Bonus Config | `prep_time_bonus_config` | Complex object (null currently) — not owner-configurable from wizard |
| Auto Paid | `auto_paid` | Operational flag — not user-configurable |
| Billing Emp (alias) | `billing_emp` | Duplicate alias of `billing_employee`. Read ignored, NOT sent in toAPI. |

---

## SECTION E — Complete Updated Field Map

All fields that need changes to `restaurantSettingsTransform.js` and `RestaurantSettingsPage.jsx`.

### fromAPI changes — basic{}

| Field | FE Key | Step | Type | Transform |
|---|---|---|---|---|
| `room` | `room` | step2 | bool | `toBool(basic.room)` ⚠️ MOVE FROM advanced |
| `room_gst_applicable` | `roomGstApplicable` | step2 | bool | `toBool(basic.room_gst_applicable)` |
| `room_billing_included` | `roomBillingIncluded` | step2 | bool | `toBool(basic.room_billing_included)` |
| `room_otp_require` | `roomOtpRequire` | step2 | bool | `toBool(basic.room_otp_require)` |
| `room_price` | `roomPrice` | step2 | bool | `toBool(basic.room_price)` |
| `pay_via_room` | `payViaRoom` | step2 | bool | `toBool(basic.pay_via_room)` |
| `prepaid_auto_sattle` | `prepaidAutoSattle` | step2 | bool | `toBool(basic.prepaid_auto_sattle)` |
| `ordersAutoPaid` | `ordersAutoPaid` | step2 | bool | `toBool(basic.ordersAutoPaid)` (0→false, 1→true) |
| `auto_dispatch` | `autoDispatch` | step2 | bool | `toBool(basic.auto_dispatch)` |
| `is_loyality` | `isLoyality` | step2 | bool | `toBool(basic.is_loyality)` ⚠️ typo preserved (R9) |
| `is_customer_wallet` | `isCustomerWallet` | step2 | bool | `toBool(basic.is_customer_wallet)` |
| `online_order` | `onlineOrder` | step2 | bool | `toBool(basic.online_order)` |
| `multiple_menu` | `multipleMenu` | step2 | bool | `toBool(basic.multiple_menu)` |
| `is_coupon` | `isCoupon` | step2 | bool | `toBool(basic.is_coupon)` |
| `dinein_otp_require` | `dineinOtpRequire` | step2 | bool | `toBool(basic.dinein_otp_require)` |
| `dinein_number` | `dineinNumber` | step2 | bool | `toBool(basic.dinein_number)` |
| `food_different_price` | `foodDifferentPrice` | step2 | bool | `toBool(basic.food_different_price)` |
| `guest_details` | `guestDetails` | step2 | bool | `toBool(basic.guest_details)` |
| `booking_details` | `bookingDetails` | step2 | bool | `toBool(basic.booking_details)` |
| `billing_employee` | `billingEmployee` | step2 | bool | `toBool(basic.billing_employee)` |
| `role_base_discount` | `roleBaseDiscount` | step2 | bool | `toBool(basic.role_base_discount)` |
| `takeaway_charges` | `takeawayCharges` | step3 | int | `parseInt(basic.takeaway_charges) \|\| 0` |
| `service_chrg_taxt` | `serviceChrgTaxt` | step3 | str | `basic.service_chrg_taxt \|\| 'Service Charge'` |
| `deliver_charge_gst` | `deliverChargeGst` | step3 | float | `parseFloat(basic.deliver_charge_gst) \|\| 0` |
| `print_bill_customer_copy` | `printBillCustomerCopy` | **step2 (printer)** | bool | `toBool(basic.print_bill_customer_copy)` |
| `kot_language` | `kotLanguage` | **step2 (printer)** | str | `basic.kot_language \|\| 'English'` |
| `locationSelection` | `locationSelection` | step5 | str | `basic.locationSelection \|\| 'scanner'` |
| `order_auto_serve` | `orderAutoServe` | step5 | bool | `toBool(basic.order_auto_serve)` |
| `aggregator_order_tone` | `aggregatorOrderTone` | step4 | str | `basic.aggregator_order_tone \|\| 'buzzer'` |
| `use_token` | `useToken` | **step2 (printer)** | bool | `toBool(basic.use_token)` |
| `aggregator_auto_kot` | `aggregatorAutoKot` | step4 | bool | `toBool(basic.aggregator_auto_kot)` |
| `aggregator_auto_bill` | `aggregatorAutoBill` | step4 | bool | `toBool(basic.aggregator_auto_bill)` |
| `aggregator_auto_bill_stage` | `aggregatorAutoBillStage` | step4 | str | `basic.aggregator_auto_bill_stage \|\| 'Ready'` |
| `confirm_order_tone` | `confirmOrderTone` | step4 | str | `basic.confirm_order_tone \|\| 'default'` |
| `confirm_order_show_tab` | `confirmOrderShowTab` | step4 | bool | `toBool(basic.confirm_order_show_tab)` |
| `no_of_kot` | `noOfKot` | **step2 (printer)** | str | `basic.no_of_kot \|\| '1'` |
| `no_of_bill` | `noOfBill` | **step2 (printer)** | str | `basic.no_of_bill \|\| '1'` |
| `printing_in_kds` | `printingInKds` | **step2 (printer)** | bool | `toBool(basic.printing_in_kds)` |
| `schedule_order` | `scheduleOrder` | step4 | bool | `toBool(basic.schedule_order)` |
| `default_prep_time` | `defaultPrepTime` | step4 | int | `parseInt(basic.default_prep_time) \|\| 15` |
| `prep_time_count_method` | `prepTimeCountMethod` | step4 | str | `basic.prep_time_count_method \|\| 'quantity'` |
| `auto_prep_time_ack` | `autoPrepTimeAck` | step4 | bool | `toBool(basic.auto_prep_time_ack)` |
| `auto_accept_inventory` | `autoAcceptInventory` | step5 | bool | `toBool(basic.auto_accept_inventory)` |
| `restaurant_for` | `restaurantFor` | step1 | str | `basic.restaurant_for \|\| 'Normal'` |
| `is_banner` | `isBanner` | step1 | bool | `toBool(basic.is_banner)` — **no UI, pass-through in toAPI** (F1-07) |
| `is_category_box` | `isCategoryBox` | step1 | bool | `toBool(basic.is_category_box)` — **no UI, pass-through in toAPI** (F1-08) |
| `show_user_gst` | `showUserGst` | step1 | bool | `toBool(basic.show_user_gst)` |
| `prep_time_bonus_config` | `prepTimeBonusConfig` | step4 | any | `basic.prep_time_bonus_config \|\| null` (pass-through) |
| `auto_paid` | `autoPaid` | step2 | bool | `toBool(basic.auto_paid)` (pass-through, no UI) |

**Total new fromAPI additions: 49 fields** (+ 1 REGRESSION FIX for `room`)

### toAPI changes — basic{} additions

All 49 fields above must be added to the `basic{}` block in `toAPI.settingsPayload()`.

**Also: REMOVE `room` from `advanced{}` block — it now belongs only in `basic{}`.**

Key type conversions for toAPI:
- bool → `toYesNo()`: most toggle fields
- `ordersAutoPaid` → `s2.ordersAutoPaid ? 1 : 0` (integer, not Yes/No)
- `takeaway_charges` → `parseInt(s3.takeawayCharges || 0)`
- `deliver_charge_gst` → `String(parseFloat(s3.deliverChargeGst || 0).toFixed(2))`
- `no_of_kot`, `no_of_bill` → String passthrough
- `schedule_order` → `toBool` on read, `toYesNo` on write (API returns `True` boolean but expects `Yes/No` or `1/0`)
- `prep_time_bonus_config` → pass `null` as-is
- `aggregator_auto_bill_stage` → string passthrough

---

## SECTION F — Files Affected

### 1. `src/api/transforms/restaurantSettingsTransform.js` — EDIT

**fromAPI.settingsResponse():**
- Remove `room: toBool(advanced.room)` from step2
- Add `room: toBool(basic.room)` to step2
- Add all 49 new fields to their respective steps (see Section E)

**toAPI.settingsPayload():**
- Move `room: toYesNo(s2.room)` from `advanced{}` to `basic{}`
- Add all 49 new fields to `basic{}` (with correct type conversions)

### 2. `src/pages/RestaurantSettingsPage.jsx` — EDIT

**DEFAULT_FORM_STATE** (line 25–30) — add all new fields to each step's default object.

**Step 1 UI** — add after VAT section:
- SelectInput: "Restaurant Type" (`restaurantFor`) — options: Normal / Hotel / ...
- Toggle: "Show Banner" (`isBanner`)
- Toggle: "Category Box" (`isCategoryBox`)
- Toggle: "Show GST to Customers" (`showUserGst`)
- NumberInput: "Delivery Charge GST %" (`deliverChargeGst`)

**Step 2 UI** — add two new SectionCards:
- **SectionCard "Online & Menu":** online_order, multiple_menu
- **SectionCard "Room Settings":** room (already exists ✓ — no duplicate), room_billing_included, room_otp_require, room_price, room_gst_applicable, pay_via_room, dinein_otp_require
- **SectionCard "Operations & Access":** guest_details, booking_details, billing_employee, role_base_discount, is_coupon, dinein_number, food_different_price
- **SectionCard "Auto-Payment":** prepaid_auto_sattle, ordersAutoPaid, auto_dispatch, is_loyality, is_customer_wallet

**Step 3 UI** — add to existing SectionCard or new "Other Charges":
- NumberInput: "Takeaway Charges (₹)" (`takeawayCharges`)
- TextInput: "Service Charge Label" (`serviceChrgTaxt`)
- NumberInput: "Delivery Charge GST %" (`deliverChargeGst`)

**Step 4 UI** — add to existing SectionCard or new subsections:
- **Printing group:** print_bill_customer_copy, no_of_kot, no_of_bill, printing_in_kds
- **KOT/Token group:** kot_language, use_token, locationSelection
- **Order flow group:** order_auto_serve, schedule_order, confirm_order_show_tab, confirm_order_tone
- **Aggregator group:** aggregator_order_tone, aggregator_auto_kot, aggregator_auto_bill, aggregator_auto_bill_stage
- **Prep time group:** default_prep_time, prep_time_count_method, auto_prep_time_ack

**Step 5 UI** — add:
- Toggle: "Auto Accept Inventory" (`autoAcceptInventory`)

### 3. `src/api/transforms/profileTransform.js` — NO CHANGE
Still reads these fields via the login-time profile endpoint. Settings form adds a parallel write path. profileTransform remains unchanged.

---

## SECTION G — OD Status Update

| OD | Original Decision | Status |
|---|---|---|
| OD-1 | Write duplicates to basic{} only | **SUPERSEDED** — All these fields now ONLY exist in basic{}. No duplication in advanced. Write to basic only is still correct. |
| OD-2 | Step placements as suggested | **UPDATED** — New step assignments in Section E above. Existing OD-2 placements still valid for original 13 fields. |
| OD-3 | HIGH not CRITICAL for auto-flow fields | **STILL VALID** |
| OD-4 | Room fields deferred to separate CR | **OVERRIDDEN** — `room_billing_included`, `room_otp_require`, `room_price`, `pay_via_room` are now in `basic{}`. Including them in CR-132 scope. |
| OD-5 | profileTransform fields add write path via settings | **STILL VALID** — is_loyality, is_customer_wallet, aggregator_order_tone, use_token, room_gst_applicable all confirmed in basic{} |

---

## SECTION H — New Owner Decisions Required

| # | Question | Suggested Answer | Blocker? |
|---|---|---|---|
| OD-6 | `restaurant_for` — expose in wizard Step 1? Values beyond 'Normal' unknown. | YES — add SelectInput. Known value: 'Normal'. Others TBD — add as free-text until enum confirmed. | NO (can default to text input) |
| OD-7 | `confirm_order_tone` / `aggregator_order_tone` enum values — only 'default' and 'buzzer' seen. Others? | Proceed with known values + free-text fallback | NO |
| OD-8 | `aggregator_auto_bill_stage` enum values — only 'Ready' seen. Others? | Same — proceed with 'Ready' known | NO |
| OD-9 | `prep_time_count_method` enum values — only 'quantity' seen | Proceed with 'quantity' known | NO |
| OD-10 | `no_of_kot` / `no_of_bill` — are these string dropdowns ('1','2','3') or free number input? | Use SelectInput: 1/2/3 based on '1' value pattern | NO |
| OD-11 | `service_chrg_taxt` — free text or fixed options? | Free TextInput | NO |
| OD-12 | `billing_emp` (alias) — ignore or map? | Ignore `billing_emp`, use `billing_employee` only | NO |
| OD-13 | `auto_paid` — pass-through only or needs UI? | Pass-through only (operational flag) | NO |
| OD-14 | `prep_time_bonus_config` — always null. Pass-through null or omit from payload? | Pass `null` as-is (so backend doesn't clear it) | NO |

**All OD-6 through OD-14 can proceed with suggested answers unless owner objects.**

---

## SECTION I — Scope Lock

**WILL change:**
- `src/api/transforms/restaurantSettingsTransform.js`
- `src/pages/RestaurantSettingsPage.jsx`

**WILL NOT touch:**
- `src/api/transforms/profileTransform.js` — read-only path unchanged
- `src/api/services/restaurantSettingsService.js` — interface unchanged
- `src/components/panels/settings/ViewEditViews.jsx` — settings content lives in RestaurantSettingsPage
- Any order flow, billing, payment, or financial calculation files

---

## SECTION J — Revision Summary (vs previous IA dated 2026-08-08)

| Change | Count | Impact |
|---|---|---|
| Critical regression found | 1 | `room` field reads/writes wrong section — live bug today |
| Old IA field location corrections | 6 | `room_gst_applicable`, `auto_dispatch`, `is_loyality`, `is_customer_wallet`, `order_auto_serve`, `aggregator_order_tone` all moved to basic |
| Old IA fields confirmed unchanged | 7 | Same as before |
| OD-4 room fields reinstated | 4 | `room_billing_included`, `room_otp_require`, `room_price`, `pay_via_room` now in scope |
| Completely new fields | 32 | Backend added in this update |
| **Total new fromAPI additions** | **49** | vs 16 in previous IA |
| New ODs needed | 9 (OD-6 to OD-14) | All have suggested non-blocking answers |

---

## Next Step

Gate 3 — Implementation Plan.
All OD-6 through OD-14 can proceed with suggested defaults unless owner objects.
Priority order for implementation:
1. REGRESSION FIX: `room` field location (highest risk — live bug)
2. Original 13 IA fields (already planned, location corrections applied)
3. New functional fields (D1–D4)
4. Pass-through fields (D5)

---

## SECTION K — Screen 7 Removed (2026-08-09)

**Owner direction:** CR-132 Screen 7 (Aggregator) moved to new **CR-135 (Aggregator Setup)**.

### Fields removed from CR-132 scope

| Field | API key | Moved to |
|---|---|---|
| Aggregator Order Tone | `aggregator_order_tone` | CR-135 OperationalTab |
| Aggregator Auto KOT | `aggregator_auto_kot` | CR-135 OperationalTab |
| Aggregator Auto Bill | `aggregator_auto_bill` | CR-135 OperationalTab |
| Aggregator Auto Bill Stage | `aggregator_auto_bill_stage` | CR-135 OperationalTab |
| Default Prep Time | `default_prep_time` | CR-135 OperationalTab |
| Prep Time Count Method | `prep_time_count_method` | CR-135 OperationalTab |
| Auto Acknowledge Prep Time | `auto_prep_time_ack` | CR-135 OperationalTab |

### Updated counts
- fromAPI additions: ~~49~~ → **42 fields**
- Wizard screens: ~~9~~ → **8 screens** (Screen 7 removed; old Screen 8 → Screen 7, old Screen 9 → Screen 8)
- Comparison page `/screen7-compare` (Aggregator) → **no longer part of CR-132**

### Updated screen architecture

| # | Screen | Status |
|---|---|---|
| 1 | Basic Settings | ✅ Reviewed |
| 2 | Printer Setup | ⏸ Deferred (CR-133) |
| 3 | Channels, Payments & Info | ⏳ Awaiting owner feedback |
| 4 | Tax & Charges | ⏳ Awaiting owner feedback |
| 5 | Order & Kitchen | ⏳ Awaiting owner feedback |
| 6 | Online Ordering | ⏳ Awaiting owner feedback |
| 7 | ~~Aggregator~~ → **Inventory** (renumbered) | ⏳ Awaiting owner feedback |
| 8 | ~~Inventory~~ → **Room & Hospitality** (renumbered, conditional) | ⏳ Awaiting owner feedback |

### fromAPI — fields removed from Section E
Remove these 7 rows from `restaurantSettingsTransform.js` fromAPI + toAPI scope:
- `aggregator_order_tone` / `aggregatorOrderTone`
- `aggregator_auto_kot` / `aggregatorAutoKot`
- `aggregator_auto_bill` / `aggregatorAutoBill`
- `aggregator_auto_bill_stage` / `aggregatorAutoBillStage`
- `default_prep_time` / `defaultPrepTime`
- `prep_time_count_method` / `prepTimeCountMethod`
- `auto_prep_time_ack` / `autoPrepTimeAck`

**Note:** These fields are still READ from profile via `profileTransform.js` (existing). CR-135 will add the WRITE path via `aggregatorConfigTransform.js` + `restaurantSettingsService` update endpoint.

### Impact on CR-133 Amendment
- OD-CR133-D5..D7 (`aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage`) — **RESOLVED**: owned by CR-135 via `settings-list` write path
- CR-133 amendment now only has D1-D4 remaining: `no_of_bill`, `no_of_kot`, `billing_auto_bill_print`, `print_kot`

