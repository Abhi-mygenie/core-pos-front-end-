# API Mapping Documentation - Gap Analysis Report

> Generated: 2026-04-02
> Comparing: `/app/memory/API_MAPPING.md` vs Current Codebase

---

## Executive Summary

The API_MAPPING.md documentation is **outdated** and missing significant additions from later development phases. Key gaps include:

| Area | Status | Gap Severity |
|------|--------|--------------|
| Auth Transform | ✅ Accurate | Low |
| Profile Transform | ✅ Accurate | Low |
| Category Transform | ✅ Accurate | Low |
| Product Transform | ⚠️ Missing `foodFor` field | Low |
| Table Transform | 🔴 Missing `toAPI` methods | High |
| Settings Transform | ✅ Accurate | Low |
| Order Transform | 🔴 Major gaps - missing `toAPI` methods | Critical |
| Customer Transform | 🔴 **NOT DOCUMENTED** | Critical |
| Report Transform | 🔴 **NOT DOCUMENTED** | Critical |
| Room Service | 🔴 **NOT DOCUMENTED** | High |
| Socket Events | 🔴 **NOT DOCUMENTED** | High |

---

## 1. MISSING SECTIONS (Not in API_MAPPING.md)

### 1.1 Customer Transform & Service (Sprint 3 - CHG-036)
**Endpoint:** `POST /api/v2/vendoremployee/restaurant-customer-list`

**Needs to be added:**
```
| API Field | Frontend Field | Status |
|-----------|----------------|--------|
| id | customerId | Mapped |
| customer_name | name | Mapped |
| phone | phone | Mapped |
| loyalty_point | loyaltyPoints | Parked (Phase 3) |
| wallet_balance | walletBalance | Parked (Phase 3) |
| date_of_birth | birthday | Parked (Phase 3) |
| date_of_anniversary | anniversary | Parked (Phase 3) |
| membership_id | memberId | Parked (Phase 3) |
| gst_number | gstNumber | Parked (Phase 3) |
| gst_name | gstName | Parked (Phase 3) |
```

### 1.2 Report Transform (Phase 4A - Order Reports)
**Completely missing section - 7 different endpoint transforms:**

1. `REPORT_PAID_ORDERS` - `/api/v2/vendoremployee/paid-order-list`
2. `REPORT_CANCELLED_ORDERS` - `/api/v2/vendoremployee/cancel-order-list`
3. `REPORT_CREDIT_ORDERS` - `/api/v2/vendoremployee/paid-in-tab-order-list`
4. `REPORT_HOLD_ORDERS` - `/api/v2/vendoremployee/paid-paylater-order-list`
5. `REPORT_AGGREGATOR_ORDERS` - `/api/v1/vendoremployee/urbanpiper/get-complete-order-list`
6. `REPORT_ORDER_DETAILS` - `/api/v2/vendoremployee/employee-order-details`
7. `SINGLE_ORDER_NEW` - `/api/v2/vendoremployee/get-single-order-new`
8. `DAILY_SALES_REPORT` - `/api/v2/vendoremployee/daily-sales-revenue-report`
9. `ORDER_LOGS_REPORT` - `/api/v2/vendoremployee/report/order-logs-report`

### 1.3 Room Service (Phase 2A + 2B)
**Endpoint:** `POST /api/v1/vendoremployee/pos/user-group-check-in`

**Payload fields:**
- phone, name, email, room_id[], booking_type, booking_for
- order_amount, advance_payment, balance_payment, payment_mode
- order_note, total_adult, total_children, id_type
- checkin_date, checkout_date, front_image_file, back_image_file

---

## 2. MISSING toAPI TRANSFORMS

### 2.1 Table Transform - `toAPI` Section
**Current code has these, doc doesn't:**

```javascript
toAPI.shiftTable(currentTable, targetTable)
// → { order_id, old_table_id, new_table_id, order_edit_count }

toAPI.transferFood(currentTable, targetOrder, item)
// → { source_order_id, target_order_id, food_item_id }

toAPI.mergeTable(currentTable, sourceOrder)
// → { source_order_id, target_order_id, transfer_note }
```

### 2.2 Order Transform - `toAPI` Section (MAJOR GAP)
**Documented as "Phase 2" but fully implemented:**

```javascript
toAPI.cancelItemFull(currentTable, item, reason)
// Endpoint: PUT /api/v2/vendoremployee/cancel-food-item

toAPI.cancelItemPartial(currentTable, item, reason, cancelQty)
// Endpoint: PUT /api/v2/vendoremployee/partial-cancel-food-item

toAPI.cancelOrderItem(currentTable, item, reason)
// Endpoint: PUT /api/v2/vendoremployee/food-status-update

toAPI.addCustomItem(name, categoryId, price)
// Endpoint: POST /api/v1/vendoremployee/add-single-product

toAPI.placeOrder(table, cartItems, customer, orderType, options)
// Endpoint: POST /api/v2/vendoremployee/pos/place-order

toAPI.collectBill(table, cartItems, customer, orderType, paymentData, options)
// Endpoint: POST /api/v1/vendoremployee/pos/place-order-and-payment

toAPI.updateOrder(table, newItems, customer, orderType, options)
// Endpoint: PUT /api/v2/vendoremployee/pos/update-place-order

toAPI.clearBill(table, paymentData)
// Endpoint: POST /api/v2/vendoremployee/order-bill-payment

toAPI.transferToRoom(table, paymentData, roomId)
// Endpoint: POST /api/v1/vendoremployee/order-shifted-room
```

### 2.3 customItemFromAPI Helper
**Undocumented utility function for custom item cart mapping**

---

## 3. MISSING ENDPOINTS IN constants.js

**Documented endpoints: 8**
**Actual endpoints in constants.js: 25+**

**Missing from documentation:**
| Endpoint Key | Path | Phase |
|--------------|------|-------|
| ORDER_TABLE_SWITCH | /api/v1/vendoremployee/pos/order-table-room-switch | 1C |
| MERGE_ORDER | /api/v2/vendoremployee/transfer-order | 1C |
| TRANSFER_FOOD | /api/v2/vendoremployee/transfer-food-item | 1C |
| CANCEL_ITEM_FULL | /api/v2/vendoremployee/cancel-food-item | 1C |
| CANCEL_ITEM_PARTIAL | /api/v2/vendoremployee/partial-cancel-food-item | 1C |
| CANCEL_ORDER | /api/v2/vendoremployee/food-status-update | 1C |
| ADD_CUSTOM_ITEM | /api/v1/vendoremployee/add-single-product | 1C |
| CUSTOMER_SEARCH | /api/v2/vendoremployee/restaurant-customer-list | 3 |
| PLACE_ORDER | /api/v2/vendoremployee/pos/place-order | 3 |
| PLACE_ORDER_AND_PAYMENT | /api/v1/vendoremployee/pos/place-order-and-payment | 3 |
| UPDATE_ORDER | /api/v2/vendoremployee/pos/update-place-order | 3 |
| CLEAR_BILL | /api/v2/vendoremployee/order-bill-payment | 3 |
| ROOM_CHECK_IN | /api/v1/vendoremployee/pos/user-group-check-in | 2A |
| ORDER_SHIFTED_ROOM | /api/v1/vendoremployee/order-shifted-room | 2B |
| REPORT_PAID_ORDERS | /api/v2/vendoremployee/paid-order-list | 4A |
| REPORT_CANCELLED_ORDERS | /api/v2/vendoremployee/cancel-order-list | 4A |
| REPORT_CREDIT_ORDERS | /api/v2/vendoremployee/paid-in-tab-order-list | 4A |
| REPORT_HOLD_ORDERS | /api/v2/vendoremployee/paid-paylater-order-list | 4A |
| REPORT_AGGREGATOR_ORDERS | /api/v1/vendoremployee/urbanpiper/get-complete-order-list | 4A |
| REPORT_ORDER_DETAILS | /api/v2/vendoremployee/employee-order-details | 4A |
| SINGLE_ORDER_NEW | /api/v2/vendoremployee/get-single-order-new | 4A |
| DAILY_SALES_REPORT | /api/v2/vendoremployee/daily-sales-revenue-report | 4A |
| ORDER_LOGS_REPORT | /api/v2/vendoremployee/report/order-logs-report | 4A |

---

## 4. FIELD MAPPING UPDATES NEEDED

### 4.1 Product Transform
**Missing field:**
| API Field | Frontend Field | Notes |
|-----------|----------------|-------|
| food_for | foodFor | Filter "Normal" vs "Buffet"/"HappyHour" |

### 4.2 Order Transform - fromAPI.orderItem
**Missing tax fields:**
```javascript
tax: {
  percentage: parseFloat(foodDetails.tax) || 0,
  type: foodDetails.tax_type || 'GST',
  calculation: foodDetails.tax_calc || 'Exclusive',
  isInclusive: foodDetails.tax_calc === 'Inclusive',
}
```

### 4.3 Order Transform - fromAPI.order
**Missing fields:**
| API Field | Frontend Field | Notes |
|-----------|----------------|-------|
| order_note | orderNote | Order-level notes |
| print_kot | kotPrinted | KOT print status |
| print_bill_status | billPrinted | Bill print status |
| delivery_charge | deliveryCharge | Delivery fee |
| associated_order_list | associatedOrders | Room sub-orders (Phase 2B) |

### 4.4 Table Transform - fromAPI.tableList
**Added deduplication logic:**
```javascript
// Dedupe by id — API can return duplicate records (see BACKEND_CLARIFICATIONS B32)
const seen = new Set();
const unique = apiTables.filter(r => {
  if (seen.has(r.id)) return false;
  seen.add(r.id);
  return true;
});
```

---

## 5. SOCKET EVENTS DOCUMENTATION NEEDED

**File:** `/app/frontend/src/api/socket/socketEvents.js`

**Events to document:**
| Event | Channel | Payload | Handler |
|-------|---------|---------|---------|
| new-order | new_order_{restaurantId} | Full order object | Fetch & add to context |
| update-order | new_order_{restaurantId} | Order ID | Fetch & update in context |
| update-food-status | new_order_{restaurantId} | Order ID, status | Update item status |
| update-order-status | new_order_{restaurantId} | Order ID, status | Update order status |
| scan-new-order | new_order_{restaurantId} | Order ID | Fetch & add (QR orders) |
| update-table | update_table_{restaurantId} | Table ID, status | Update table engage status |
| aggrigator-order | aggregator_order_{restaurantId} | Order data | Add aggregator order |
| aggrigator-order-update | aggregator_order_{restaurantId} | Order data | Update aggregator order |

---

## 6. RECOMMENDED ACTIONS

### Priority 1 (Critical)
1. Add **Section 9: Customer API** with full field mapping
2. Add **Section 10: Report APIs** with all 9 endpoints
3. Update **Section 8 (Orders)** with all `toAPI` transforms

### Priority 2 (High)
4. Add **Section 11: Room Check-In API**
5. Add **Section 12: Socket Events**
6. Update **Table Transform** with `toAPI` methods

### Priority 3 (Medium)
7. Add missing endpoints to API_ENDPOINTS summary table
8. Update Product Transform with `foodFor` field
9. Add `customItemFromAPI` helper documentation

### Priority 4 (Low)
10. Add table deduplication note
11. Update section headers with actual status (remove "Phase 2" stubs)
12. Add business day filtering documentation for reports

---

## 7. RECOMMENDED DOCUMENT STRUCTURE

```
API_MAPPING.md
├── 1. Login API (existing - accurate)
├── 2. Profile API (existing - accurate)
├── 3. Categories API (existing - accurate)
├── 4. Products API (update: add foodFor)
├── 5. Tables API (update: add toAPI)
├── 6. Cancellation Reasons API (existing - accurate)
├── 7. Popular Food API (existing - accurate)
├── 7b. Variations & Add-ons (existing - accurate)
├── 8. Running Orders API (major update: add toAPI)
├── 9. Customer Search API (NEW)
├── 10. Order Reports APIs (NEW - 9 endpoints)
├── 11. Room Check-In API (NEW)
├── 12. Socket Events (NEW)
└── Summary Table (update counts)
```

---

## Appendix: Files Analyzed

| File | Line Count | Last Modified |
|------|------------|---------------|
| constants.js | 208 | Current |
| authTransform.js | 37 | Stable |
| profileTransform.js | 189 | Stable |
| categoryTransform.js | 63 | Stable |
| productTransform.js | 191 | Current |
| tableTransform.js | 167 | Current (toAPI added) |
| settingsTransform.js | 89 | Stable |
| orderTransform.js | 593 | Current (major additions) |
| customerTransform.js | 61 | NEW |
| reportTransform.js | 711 | NEW |
| orderService.js | 52 | Current |
| customerService.js | 23 | NEW |
| reportService.js | 589 | NEW |
| roomService.js | 85 | NEW |
| paymentService.js | 17 | Stub |
