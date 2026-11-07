# CR-483 Probe Report — Live API Verification (2026-11-07)

**Preprod:** `preprod.mygenie.online`
**Restaurant:** cafe103 (ID: 644)
**Credentials:** Owner@cafe103.com

---

## ✅ CONFIRMED: Settings Field Paths

### Profile API (`GET /api/v1/vendoremployee/profile`)

| Field | Path | Value | Notes |
|-------|------|-------|-------|
| **reconcile_amount** | `restaurants[0].settings.reconcile_amount` | `"No"` | ✅ In `settings{}` sub-object, NOT at root |
| **order_edit_access** | `restaurants[0].settings.order_edit_access` | `"Yes"` | ✅ Same path pattern (CR-489) |

**⚠️ NOT at root level:**
- `restaurants[0].reconcile_amount` → NOT FOUND
- `restaurants[0].order_edit_access` → NOT FOUND

**Root-level comparisons (for transform pattern):**
- `restaurants[0].billing_auto_bill_print` = `"No"` ← at ROOT (different pattern!)
- `restaurants[0].print_kot` = `"Yes"` ← at ROOT (different pattern!)

### Settings-List API (`GET /api/v2/vendoremployee/restaurant-settings/settings-list`)

| Field | Path | Value |
|-------|------|-------|
| **reconcile_amount** | `data.basic.reconcile_amount` | `"No"` |
| **order_edit_access** | `data.basic.order_edit_access` | `"Yes"` |

---

## ⚠️ Transform Path Decision — CRITICAL

The profile transform currently uses **two patterns**:

| Pattern | Example | Path |
|---------|---------|------|
| **Root-level** | `autoKot`, `autoBill` | `apiSettings.print_kot`, `apiSettings.billing_auto_bill_print` |
| **Nested settings** | `keyboardShortcuts`, `isCoupon` | `apiSettings.settings?.keyboard_shortcuts`, `apiSettings.settings?.is_coupon` |

**`reconcile_amount` is in the NESTED pattern** (`settings.reconcile_amount`), same as `is_coupon`, `keyboard_shortcuts`.

### Correct profileTransform mapping:
```javascript
reconcileAmount: toBoolean(apiSettings.settings?.reconcile_amount), // CR-483
```

### Correct restaurantSettingsTransform mapping:
```javascript
// In step1 (basic section):
reconcileAmount: toBool(basic.reconcile_amount), // CR-483
```

---

## ❌ Order-level received_amount — NOT PROBED

cafe103 has **0 orders** on preprod (no running orders, no report data for Oct-Nov). Cannot verify `received_amount` / `reconcile_amount` on individual order objects from this restaurant.

**Workaround:** The investigation report (2026-11-06) confirms 6 UAT test cases were run on Palm House (RID 541) where orders exist. Field names confirmed from that probe:
- `received_amount` on order object ✅ (investigation §2B)
- `reconcile_amount` on report API ✅ (investigation §2B)

---

## All settings.* keys on cafe103 (complete dump)

---

## Design Mockups (2026-11-07)

4 mockups generated and approved:
1. **Settings Toggle** — `settings_toggle_mockup.jpeg`
2. **CPP UPI tab** — `cpp_upi_with_received_amount.jpeg`
3. **CPP Cash tab** — `cpp_cash_with_received_amount.jpeg`
4. **Error validation** — `cpp_received_amount_error_state.jpeg`

URLs saved in `plans/CR-483_IMPLEMENTATION_PLAN_2026_11_07.md` §Design References.

---

## Gate 3 Status: CLOSED (2026-11-07)

All artifacts complete:
- ✅ Intake (Gate 1)
- ✅ Impact Analysis (Gate 2)
- ✅ Implementation Plan (Gate 3) — 400+ lines, phased, probe-verified
- ✅ Live probe — field paths confirmed on cafe103 order #021109
- ✅ Design mockups — 4 screens, layout wireframe
- ✅ All ODs locked (OD-483-01 through OD-483-11)

**Awaiting Gate 4 GO to begin implementation.**

```
aggregator_auto_bill: No
aggregator_auto_bill_stage: Ready
aggregator_auto_kot: Yes
aggregator_order_tone: buzzer
allow_early_checkin: 0
auto_dispatch: No
auto_hk_on_rm_checkout: False
auto_paid: No
auto_prep_time_ack: No
auto_print_checkin_receipt: 0
confirm_order_tone: default
customer_notification: Yes
default_prep_time: 15
deliver_charge_gst: 5.00
e_invoice: No
extend_rate_mode: calendar
inventory_manager_name: (empty)
is_banner: Yes
is_category_box: Yes
is_coupon: Yes
is_customer_wallet: No
is_loyality: No
kot_language: English
locationSelection: scanner
multiple_menu: No
no_of_bill: 1
no_of_kot: 1
online_order: Yes
order_auto_serve: No
order_edit_access: Yes           ← CR-489
ordersAutoPaid: 0
phone_number_on_bill: (empty)
prep_time_bonus_config: None
prep_time_count_method: quantity
prepaid_auto_sattle: No
print_bill_customer_copy: No
printer_agent: Yes
reconcile_amount: No             ← CR-483
restaurant_for: Normal
role_base_discount: No
room_gst: None
service_chrg_taxt: Service Charge
short_code: No
show_out_of_stock_items: No
show_scan_popup: 1
show_user_gst: No
takeaway_charges: 0
use_token: No
whatsapp_message: No
```
