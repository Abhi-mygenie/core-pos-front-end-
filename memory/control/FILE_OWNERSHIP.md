# Layer 7 — File Ownership Map

**Status:** POPULATED
**Last Updated:** 2026-09-01 (BUG-374/369/372/371: OrderEntry.jsx + CartPanel.jsx + profileTransform.js + CollectPaymentPanel.jsx + orderTransform.js + DashboardPage.jsx + VariationExpandPanel.jsx + BulkEditor.jsx) — 2026-09-01 (BUG-370: OrderCard.jsx + TableCard.jsx; BUG-373: profileTransform.js + CollectPaymentPanel.jsx; BUG-375: ProductForm.jsx) — 2026-09-01 (CR-353+CR-355: StationMappingTab + Sidebar) — 2026-08-30 (CR-352)

---

## FILE_OWNERSHIP — CR-360 (2026-09-03)

| File | Change | CR/BUG |
|---|---|---|
| `pages/pms/InHouseGuestsPage.jsx` | useNavigate import; navigate init; KPI derivations (checkoutToday, totalBalance, avgNights); KPI strip values replaced; View Bill onClick wired | CR-360 |

---



| File | Change | CR/BUG |
|---|---|---|
| `api/transforms/roomListTransform.js` | Added `phone: u.phone ?? null` to `rows.push()` output | BUG-378 |
| `api/services/aiosellService.js` | Added `getLocalReservations({ startDate, endDate })` function (additive) | BUG-378 |
| `api/services/pmsService.js` | Rewrote `getInHouseGuests()`: two-call join (GET_ROOM_LIST + local-reservations), dateOffset helper, graceful degradation | BUG-378 |
| `pages/pms/InHouseGuestsPage.jsx` | 4 field renames: `tableNo`→`roomNumber`, `orderNo`→`parentOrderId` (lines 38, 39, 136, 139) | BUG-378 |

---



| File | Change | CR/BUG |
|---|---|---|
| `api/transforms/aiosellTransform.js` | Root fix — `roomCode` chain: added `r.room_id` as primary key. `roomName` chain: added `r.room_name`. `areaName`: added `r.title` fallback. (+3 chars per line) | BUG-377 |
| `pages/pms/ChannelManagerPage.jsx` | Removed `Table #` prefix from LOCAL ROOM column — RM rooms shown as `room.tableNo` only | BUG-377 |

---



| File | Change | CR/BUG |
|---|---|---|
| `pages/pms/ChannelManagerPage.jsx` | MODIFIED — fallback `<option>` added to Room Mapping `<select>` for saved mapping code when `aiosellRooms` is empty (+4 lines, lines 424–433) | BUG-377 |

---



| File | Change | CR/BUG |
|---|---|---|
| `pages/pms/PmsPlaceholderPage.jsx` | NEW — shared "Coming in Phase N" placeholder for P2-P5 unbuilt routes | CR-358-P1 |
| `api/transforms/aiosellTransform.js` | NEW — AIOSELL API transforms: `fromAPI.status`, `fromAPI.rooms`, `fromAPI.inventory`, `decodeMealPlan` (OD-08) | CR-358-P1 |
| `api/services/aiosellService.js` | NEW — 9 async service functions: getAiosellStatus, saveAiosellProperty, start/stop, getAiosellRooms, saveRoomMapping, fetchInventory, pushInventory, fetchReservations | CR-358-P1 |
| `api/services/pmsService.js` | NEW — `getInHouseGuests()` wraps existing roomService.getRoomList(). P2 stubs declared. | CR-358-P1 |
| `pages/pms/ChannelManagerPage.jsx` | NEW — S8 Channel Manager: 4 tabs (OTA/Sync, AIOSELL Setup, Room Mapping, Rates P5 placeholder) | CR-358-P1 |
| `pages/pms/InHouseGuestsPage.jsx` | NEW — S6 In-House Guests: table + KPI strip + search, calls pmsService.getInHouseGuests() | CR-358-P1 |
| `api/constants.js` | MODIFIED — `AIOSELL_ENDPOINTS` block appended at EOF (20 endpoint constants, P1-P5) | CR-358-P1 |
| `components/layout/Sidebar.jsx` | MODIFIED — E1: BedDouble import; E2: pms permission; E3: 'pms' in VISIBLE_SECTIONS; E4: features.room gate; E5: Rooms & Reservations section (9 children). FROZEN after P1. | CR-358-P1 |
| `App.js` | MODIFIED — +3 PMS imports + 9 PMS routes. FROZEN after P1. | CR-358-P1 |

---



| File | Change | CR/BUG |
|---|---|---|
| `api/transforms/roleTransform.js` | R1: `fromAPI.role` derives `roleTypes` from `modules[0]` when `role_type` null (Sub-D). R2: `toAPI.createRole` strip-before-prepend role type string (Sub-A). R3: `toAPI.updateRole` same normalization (Sub-A). | BUG-376 |
| `components/panels/employee/RoleFormView.jsx` | F1: `checkedPerms` init excludes `modules[0]` (Sub-E). F2: `selectedMasterId` state added (Sub-B). F3: BUG-235 useEffect `rt.id`→`rt.value` (Sub-C). F4: `applyTemplate` stores `t.id`, uses `rt.value` (Sub-B+C). F5: `handleSave` `roleMasterId: selectedMasterId` (Sub-B). | BUG-376 |

---

## FILE_OWNERSHIP — BUG-368 (2026-09-02)

| File | Change | CR/BUG |
|---|---|---|
| `pages/reports-module/OrderReportBetaPage.jsx` | `handleReprint`: ordersArr length guard + `Array.isArray(raw)` rejection + `rawOrderDetails?.length` check | BUG-368 |
| `pages/AllOrdersReportPage.jsx` | `handlePrintBillFromAudit`: same pattern — parity fix | BUG-368 |

---

## BUG-374 + BUG-369 + BUG-372 + BUG-371 — 2026-09-01

| File | Change | CR/BUG |
|---|---|---|
| `components/order-entry/OrderEntry.jsx` | `genCartKey()` helper; `_cartKey` on all new cart slots; `updateQuantity` uses `_cartKey` match; `initialShowMerge` prop + useEffect | BUG-374 + BUG-372 |
| `components/order-entry/CartPanel.jsx` | All qty +/- buttons pass `item._cartKey \|\| item.id` to `updateQuantity` | BUG-374 |
| `api/transforms/profileTransform.js` | Added `printBillCustomerCopy` mapping | BUG-369 |
| `components/order-entry/CollectPaymentPanel.jsx` | `printBillCustomerCopy` added to `handlePrintBill` overrides | BUG-369 |
| `api/transforms/orderTransform.js` | `print_bill_customer_copy` conditional in `buildBillPrintPayload` | BUG-369 |
| `pages/DashboardPage.jsx` | `initialShowMerge` state; real Merge handler; Transfer timing fix; prop reset on close | BUG-372 |
| `components/panels/menu/VariationExpandPanel.jsx` | Full rewrite — price inputs + `onPriceChange` prop | BUG-371 |
| `components/panels/menu/BulkEditor.jsx` | `handleVariationPriceChange`; `isDirty.variations` updated; `buildPayload` includes variations | BUG-371 |

---

## CR-353 + CR-355 — 2026-09-01

| File | Change | CR/BUG |
|---|---|---|
| `components/panels/settings/printerConfig/StationMappingTab.jsx` | CREATED — new Station Mapping tab component | CR-353 |
| `components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` | Removed StationsTab; added StationMappingTab import + TABS entry + render | CR-353 |
| `api/services/printerMappingService.js` | Added `saveRawMapping()` export (additive) | CR-353 |
| `components/layout/Sidebar.jsx` | Line 115: removed `comingSoon: true`, added `path: "/settings"` | CR-355 |

---

## CR-359 — 2026-09-02

| File | Change | CR/BUG |
|---|---|---|
| `api/constants.js` | Added `STATION_PRINTER_MAP` constant (line 119, additive) | CR-359 |
| `api/services/printerMappingService.js` | Added `getStationMap()` + `saveStationMap()` (additive, end of file) | CR-359 |
| `components/panels/settings/printerConfig/StationMappingTab.jsx` | Full logic rewrite — new endpoint, correct data model (areas/default_users/all_users), OD-4 profile re-fetch after save | CR-359 |

---

## BUG-366 — 2026-08-31

| File | Change | CR/BUG |
|---|---|---|
| `api/transforms/profileTransform.js` | Added `restaurantFor: apiSettings.restaurant_for \|\| 'Normal'` to `settings()` (after printerType line ~394) | BUG-366 |

---

## BUG-365 — 2026-08-31

| File | Change | CR/BUG |
|---|---|---|
| `api/services/stationConfigService.js` | `updateStation()` line 22: `api.put()` → `api.post()` (backend only supports POST; id in body) | BUG-365 |

---

## CR-352 — 2026-08-30

| File | Change | CR/BUG |
|---|---|---|
| `api/transforms/profileTransform.js` | +`printerType` in `fromAPI.settings()` (line ~393) | CR-352 |
| `api/transforms/restaurantSettingsTransform.js` | +`printerType` in `fromAPI.step1` + `printer_agent` in `toAPI.basic` | CR-352 |
| `pages/RestaurantSettingsPage.jsx` | +`printerType` INITIAL_FORM + 3 imports + state vars + Step1 Printer Type toggle + Step2 4-tab layout | CR-352 |
| `components/panels/settings/ListFormViews.jsx` | Replaced static `PrinterAgentConfigView` re-export with `PrintersViewGate` component | CR-352 |

---

## Frozen Files (DO NOT MODIFY without owner approval)

| Path | Reason |
|---|---|
| `/app/memory/final/*` (8 files) | Frozen baseline |
| `/app/memory/crm/crm_1_0/*` | Closed CRM 1.0 baseline |
| `orderTransform.js` outbound payload contracts | Financial/payment truth |
| `DeliveryCard.jsx` | Legacy/unused — owner directive: do not delete or modify |

---

## High-Risk Hotspot Files

| File | Lines | Risk Areas | Last Modified By |
|---|---|---|---|
| `pages/DashboardPage.jsx` | 1975 | Orchestration boundary, cartsByTable, stay-on-order | PROD-HOTFIX-004 agent (2026-05-27) |
| `components/order-entry/OrderEntry.jsx` | 2493 | Transactional workflow, customer modal, CRM intel | CR-037 agent (2026-06-13) — Popular tab removed |
| `components/order-entry/CollectPaymentPanel.jsx` | 3050 | Final settlement, payment status, financial logic | CR-021 agent (2026-06-10) |
| `components/order-entry/CollectPaymentPanel.jsx` | BUG-304: E1 taxTotals split (dSgst/dCgst/dVat buckets) + E2 discountableRatio + itemGstPostDiscount + vat fix | BUG-304 IMPL 2026-08-11 |
| `components/modals/RoomCheckInModal.jsx` | 1362 | Room workflow, advance payment | POS 3.0 era |
| `pages/StatusConfigPage.jsx` | 1561 | Visibility settings, QSR toggles, auto-settle | CR-024 agent (2026-06-10) |
| `api/transforms/orderTransform.js` | 1916 | Financial payload builders, rider fields, discount payload | CR-025 agent (2026-06-10) |
| `api/transforms/orderTransform.js` | BUG-305: E1 `buildCartItem` +`_giveDiscount` marker (line 748). E2 `calcOrderTotals` +discountable buckets +`discountableRatio` (lines 787-855). E3 `buildBillPrintPayload` +split forEach +`discountableRatio` (lines 1859-1929). | BUG-305 IMPL 2026-08-11 |
| `api/services/reportService.js` | 744 | Report presentation (reduced from 1257) | Audit Report agent (2026-05-28) |
| `api/socket/socketHandlers.js` | 839 | Realtime event handling, scan-new-order, food_update | BUG-116 agent (2026-06-08) |
| `api/socket/useSocketEvents.js` | 248 | Socket subscriptions | BUG-116 agent (2026-06-08) |
| `pages/LoadingPage.jsx` | 845 | Bootstrap sequencing, retry policy | CR-037/CR-038 agent (2026-06-13) |
| `components/panels/SettlementPanel.jsx` | 487 | Settlement module, KPI formulas | BUG-132 agent (2026-06-13) |
| `components/layout/Sidebar.jsx` | ~350 | Navigation, report labels, sticky bottom | CR-040/CR-042/BUG-131/CR-044 agent (2026-06-13) |

---

## Recently Modified Files

### 2026-08-26 — BUG-361 Implementation (Sidebar Phase 2 Sweep)
| File | Change | CR/BUG |
|---|---|---|
| 68 files across `pages/` + `pages/reports-module/` (full list in intake doc) | Python script: `useState(false)` → localStorage-backed init. `setIsExpanded={setState}` → wrapper writing `mygenie_sidebar_expanded`. | BUG-361 |
| File | Change | CR/BUG |
|---|---|---|
| `pages/RestaurantSettingsPage.jsx` | Step 4 GST section: replaced 4-field grid (GST Number + GST Mode + GST Tax% + Tax%) with single GST Number input. `grid grid-cols-2 gap-4` → `mt-4` wrapper. | BUG-359 |
| `components/panels/menu/ProductForm.jsx` | Tax section: removed Tax Calculation dropdown (Inclusive/Exclusive). Grid `grid-cols-3` → `grid-cols-2`. taxCalc state init kept at Exclusive default for save payload. | BUG-359 |
| `components/panels/menu/BulkEditor.jsx` | ALL_COLUMNS: removed taxCalc tier-2 column definition (line 54). Cell renderer: removed taxCalc if-block (lines 1344-1350). Save payload `tax_calc: row.taxCalc \|\| "Exclusive"` unchanged. | BUG-359 |
| File | Change | CR/BUG |
|---|---|---|
| `pages/reports-module/OrderReportBetaPage.jsx` | +8 imports (paymentMutationService, MarkUnpaidConfirmDialog, PaymentMethodPicker, printOrder, orderFromAPI, api, API_ENDPOINTS, isMutationAllowedForSelectedDate). +printerAgents/paymentTypes destructure. +5 state vars (pendingChangeMethodIds, markUnpaidTarget, markUnpaidPending, optimisticUnpaidIds, printingIds). +3 handlers (handleChange, handleUnpaidConfirm, handleReprint). +isWithinMutation per day loop. +actions td (Change/Unpaid/Reprint/Refund). +MarkUnpaidConfirmDialog. | CR-349 |
| File | Change | CR/BUG |
|---|---|---|
| `components/order-entry/AddCustomItemModal.jsx` | +`showGst` prop, +`taxPercent`/`taxCalc` state, +GST UI block (conditional), +tax fields in onAdd call | CR-348 |
| `api/transforms/orderTransform.js` | `addCustomItem()` signature extended: +`taxPercent`/`taxCalc` params, hardcoded `0`/`'Exclusive'` → user values | CR-348 |
| `components/order-entry/OrderEntry.jsx` | `handleAddCustomItem` destructures + passes `taxPercent`/`taxCalc`; `AddCustomItemModal` mount gets `showGst` prop | CR-348 |
| `pages/StatusConfigPage.jsx` | +`roomIdUploadReq` state, hydrate, save, reset; new "Room Check-In Requirements" section with ID Document toggle | CR-350 |
| `components/modals/RoomCheckInModal.jsx` | Validation lines 611+614: replaced hard upload guard with `localStorage.getItem('mygenie_room_id_upload_required') === 'true'` gate | CR-350 |
| `pages/DashboardPage.jsx` | Line 451: `useState(false)` → localStorage-backed init; line 1681: `setIsExpanded` → localStorage write wrapper | BUG-358 |
| `components/order-entry/CollectPaymentPanel.jsx` | Line 195: `roomInfo.balancePayment` → `roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment` | BUG-360 |
| `components/reports/RoomRowCard.jsx` | +`displayBalance` variable (live balance), added to return object, passed to `RoomBillingCard`; `balance` kept for `roomService` formula | BUG-360 |

### INV-003 — BUG-295 Room Check-In Docs Fix (2026-08-05)
| File | Change | Agent |
|---|---|---|
| `components/modals/RoomCheckInModal.jsx` | RC2: `if (customerId) setCrmCustomerId(customerId)` inside handleSubmit BUG-092 block (L675-676). RC1: `uploadDocument()` non-blocking call + `CRM_DOC_TYPE` map after `roomService.checkIn()` (L728-735). Import updated to include `uploadDocument`. | BUG FIX agent (INV-003) |
| `api/services/documentService.js` | RC1: Added `uploadDocument(customerId, docType, file)` function — POST /pos/customers/{id}/documents with FormData `doc_type` + `file`. Probe confirmed payload shape. | BUG FIX agent (INV-003) |

### CR-129 — Room Check-In UX + CRM Docs (2026-08-05)
| File | Change | Agent |
|---|---|---|
| `api/services/documentService.js` | **NEW** — CR-129: `getDocuments()` with object→array normaliser. Uses `crmApi` interceptor (no token param). ~40 lines. | CR-129 IMPL agent |
| `api/constants.js` | CR-129: added `CUSTOMER_DOCUMENTS: '/pos/customers'` endpoint key (L56, additive) | CR-129 IMPL agent |
| `components/modals/RoomCheckInModal.jsx` | CR-129: C1 ShieldCheck import; C2 removed PhoneInput+isValidPhoneNumber, added getDocuments; C3 3 state vars (crmCustomerId/crmDocuments/crmDocsLoading); C4 doc-fetch useEffect; C5 selectCrmCustomer +setCrmCustomerId; C6 handleNameChange reset; C7 handlePhoneChange new (e) signature; C8 validate() 10-digit check; C9 +91 prefix input (PhoneInput removed); C10 FileField thumbnail rewrite with onRemove+docLabel; C11 CRM docs section JSX; C11b primary+adult FileField callers +docLabel+onRemove; C12 removed PhoneInput CSS block | CR-129 IMPL agent |

### BUG-294 — CustomerModal CRM non-blocking fix (2026-08-05)
| File | Change | Agent |
|---|---|---|
| `components/order-entry/CustomerModal.jsx` | BUG-294: E1 Branch-1 updateCustomer try/catch (L285-294). E2 throw lookupErr→warn (L324-327). E3 Branch-2 updateCustomer try/catch (L347-356). E4 createCustomer try/catch + CUST-{ts} fallback (L360-375). | BUG-294 IMPL agent |


| File | Change | Agent |
|---|---|---|
| `api/transforms/orderTransform.js` | BUG-280: +cust_name/cust_mobile/cust_membership_id in collectBillExisting payload (E1b); BUG-281: +custGST/custGSTName in collectBillExisting destructuring (E1a) + payload (E1b) | BUG-280/281 implementation agent |
| `components/order-entry/OrderEntry.jsx` | BUG-281: +custGST/custGSTName to 5 auto-print override blocks (E2 M1 L1398, E3 M2 L1438, E4 M_NEW-A L1512, E5 M_NEW-B L1911, E6 M3 L2194) | BUG-280/281 implementation agent |

### CR-098 + CR-099 + CR-056 + CR-062 + BUG-164/165/203 (2026-07-24)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderTransform.js` | +`itemCode` field (L118) | CR-098 |
| `components/order-entry/OrderEntry.jsx` | +`itemCode` in adaptProduct, search, pill display | CR-098 |
| `components/cards/OrderCard.jsx` | +short code (CR-098) + prep/serve time (CR-099) on item rows | CR-098, CR-099 |
| `api/transforms/profileTransform.js` | +`showScanPopup` in settings mapping | CR-056 |
| `api/transforms/restaurantSettingsTransform.js` | +`showScanPopup` in fromAPI step4 + toAPI advanced | CR-056 |
| `pages/RestaurantSettingsPage.jsx` | +`showScanPopup` default + Toggle in Step 4 | CR-056 |
| `pages/DashboardPage.jsx` | +`settings` destructure + conditional gate on ScanOrderPopOut | CR-056 |
| `api/constants.js` | +`EXPENSE_AGGREGATION` endpoint (L448) | CR-062 |
| `api/services/expenseService.js` | +`getExpenseAggregation()`, extended `updateExpenseItem()` with `unit_price` | CR-062, BUG-203 |
| `pages/reports-module/ExpenseReportPage.jsx` | Swapped to server-side aggregation with client fallback | CR-062 |
| `components/expense/ExpenseSetupPanel.jsx` | Removed BUG-164 body-inspection, merged BUG-203 2-call into single PUT | BUG-164, BUG-203 |



### CR-014 Phase 2 — Bulk Editor (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/menu/BulkEditor.jsx` | Production bulk editor (650 lines), 33 editable columns, 4-tier picker, category grouping, batch save | CR-014 P2 agent |
| `components/panels/MenuManagementPanel.jsx` | +Bulk Edit toggle button, BulkEditor import + rendering | CR-014 P2 agent |

### CR-015 — Settlement Module (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/SettlementPanel.jsx` | NEW — Settlement slide-over panel (487 lines), 5 KPIs, waiter table, 3 modals | CR-015 agent |
| `api/services/settlementService.js` | NEW — 5 API functions | CR-015 agent |
| `api/transforms/settlementTransform.js` | NEW — fromAPI + toAPI + date helpers | CR-015 agent |
| `pages/DashboardPage.jsx` | +SettlementPanel import, isSettlementOpen state | CR-015 agent |
| `components/layout/Sidebar.jsx` | +Settlement entry, Banknote import | CR-015 agent |
| `App.js` | +settlement/preview route | CR-015 agent |

### BUG-116 — Realtime Menu Socket (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `api/socket/socketEvents.js` | NEW — channel generator + payload-type const | BUG-116 agent |
| `api/socket/socketHandlers.js` | +handleFoodUpdate | BUG-116 agent |
| `contexts/MenuContext.jsx` | +addOrUpdateProduct delta upsert | BUG-116 agent |
| `api/socket/useSocketEvents.js` | +food_update subscription | BUG-116 agent |

### CR-017 / CR-018 / CR-019 / BUG-122 — June 8-10
| File | Change | Agent |
|---|---|---|
| `components/modals/WhatsAppPaymentModal.jsx` | NEW — WhatsApp payment link modal | CR-017 agent |
| `api/services/paymentLinkService.js` | NEW — Razorpay payment link API | CR-017 agent |
| `components/order/OrderCard.jsx` | +WhatsApp button, +POS YTC Cancel (BUG-122 post) | CR-017/BUG-122 agent |
| `components/order-entry/CartPanel.jsx` | +Schedule checkbox, schedule_at fix (BUG-122 post) | CR-018/BUG-122 agent |
| `components/order-entry/CartPanel.jsx` | BUG-304: E3 taxTotals split (dSgst/dCgst/dVat) + E4 discountableRatio + itemGstPostDiscount + vatAmount fix | BUG-304 IMPL 2026-08-11 |
| `components/order/TableCard.jsx` | +Snooze web-gate (BUG-122 post) | BUG-122 agent |
| `pages/ScanOrderPopOut.jsx` | +isWebOrder gate | BUG-122 agent |
| `pages/RestaurantSettingsPage.jsx` | NEW — 6-step wizard | CR-019 agent |
| `api/services/restaurantSettingsService.js` | NEW — settings API | CR-019 agent |
| `api/transforms/restaurantSettingsTransform.js` | NEW — settings transform | CR-019 agent |

### CR-020 / CR-021 / CR-022 / CR-023 / CR-024 / CR-025 — June 10-11
| File | Change | Agent |
|---|---|---|
| `pages/RestaurantSettingsPage.jsx` | B1-B15 fixes across 4 phases | CR-020 agent |
| `api/transforms/restaurantSettingsTransform.js` | Bug fixes | CR-020 agent |
| `api/transforms/orderTransform.js` | +partial_payments[], discount payload fix | CR-021/CR-025 agent |
| `components/order-entry/CollectPaymentPanel.jsx` | Split amount fix, disabled guard | CR-021 agent |
| `components/panels/menu/ProductList.jsx` | item_type enum filter | CR-022 agent |
| `api/transforms/menuManagementTransform.js` | +Number() coercion | CR-022 agent |
| `components/panels/menu/BulkEditor.jsx` | LocalTextInput + React.memo, CR-036 + FU-01/02/03 | CR-023/CR-036 agent |
| `pages/StatusConfigPage.jsx` | Channel feature-gate | CR-024 agent |
| `pages/DashboardPage.jsx` | Channel visibility (CR-024) | CR-024 agent |
| `api/transforms/profileTransform.js` | +gstStatus from api.gst_status, channel feature gate | CR-020/CR-036-FU-03 agent |

### CR-026 — Report Data & Rounding Sweep (2026-06-11)
| File | Change | Agent |
|---|---|---|
| `api/transforms/reportTransform.js` | 2-decimal rounding across 12 report files | CR-026 agent |
| `api/services/orderLedgerService.js` | orderLogsReportRow fields | CR-026 agent |
| `api/services/creditService.js` | credit totals from API | CR-026 agent |
| `components/panels/CreditManagementPanel.jsx` | drill-down bill summary | CR-026 agent |
| `components/reports/OrderDetailSheet.jsx` | 12 financial fields | CR-026 agent |
| + 11 report files | display rounding | CR-026 agent |

### Insights Batch — CR-029→CR-035, BUG-125→BUG-128 (2026-06-11)
| File | Change | Agent |
|---|---|---|
| `api/services/insightsService.js` | Room classification, cancel scope, round_up fix, double-fetch | Insights agent |
| `api/transforms/reportTransform.js` | +400 lines new transform, payment classifier | Insights agent |
| `api/services/paymentClassifier.js` | NEW — shared classifier | CR-032 agent |
| `pages/reports-module/*` | All 10 Insights report pages (classification, new columns, help links) | Insights agent |
| `pages/AllOrdersReportPage.jsx` | Cancelled filter fix (BUG-115) | BUG-115 agent |

### June 12-13 Implementation Session (CR-037→CR-045, BUG-131→BUG-133)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderPayloadStripper.js` | NEW — FE field stripper | CR-045 agent |
| `api/services/insightsCache.js` | NEW — module-level cache | CR-044 agent |
| `contexts/InsightsCacheContext.jsx` | NEW — shared date context | CR-044 agent |
| `components/panels/SettlementPanel.jsx` | 13 formula edits + Total Funds KPI | BUG-132 agent |
| `components/layout/Sidebar.jsx` | Rename labels, remove X/Y/Z, Item Ledger, sticky bottom, cache logout | CR-040/042/BUG-131/CR-044 |
| `pages/LoadingPage.jsx` | Remove popular-items, retry counter | CR-037/CR-038 |
| `components/order-entry/OrderEntry.jsx` | Remove Popular tab | CR-037 |
| `components/order-entry/CategoryPanel.jsx` | Remove Popular category | CR-037 |
| `components/panels/CreditManagementPanel.jsx` | Wire Total Credit/Paid KPI tiles | CR-039 |
| `api/services/creditService.js` | Portfolio export optimization | CR-039 |
| `pages/AllOrdersReportPage.jsx` | Rename "Daily Report" header | CR-040 |
| `pages/OrderSummaryPage.jsx` | Rename "Daily Summary" header | CR-040 |
| `pages/RoomOrdersReportPage.jsx` | Rename "Daily Room Report" header | CR-040 |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Item Ledger rename + cache | CR-042/CR-044 |
| 9x `pages/reports-module/*Mockup.jsx` | Cache wiring + strip wiring | CR-044/CR-045 |
| `api/services/insightsService.js` | Check In filter + strip + cache | BUG-133/CR-045/CR-044 |
| `api/services/orderLedgerService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/roomOrdersService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/foodCourtService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/prepServeService.js` | Strip + cache | CR-045/CR-044 |
| `api/transforms/reportTransform.js` | Check In filter | BUG-133 |
| `api/constants.js` | Remove POPULAR_ITEMS constant | CR-037 |
| `contexts/MenuContext.jsx` | Remove popular items, move isLoaded | CR-037 |
| `hooks/useRefreshAllData.js` | Remove popular refresh | CR-037 |
| `App.js` | InsightsCacheProvider wrap | CR-044 |
| `api/transforms/productTransform.js` | (verified — already had check-in filter) | BUG-133 |

---

## Dependency Map ("If you touch X, verify Y")

| If you touch... | Verify these downstream files... |
|---|---|
| `orderTransform.js` | `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `CartPanel.jsx`, `reportService.js`, `socketHandlers.js`, `orderService.js`, print payloads |
| `socketHandlers.js` | `useSocketEvents.js`, `DashboardPage.jsx`, `useOrderPollingReconciliation.js`, `ScanOrderPopOut.jsx` |
| `OrderEntry.jsx` | `DashboardPage.jsx` (mounts it), `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `CustomerModal.jsx`, `ItemCustomizationModal.jsx` |
| `CollectPaymentPanel.jsx` | `OrderEntry.jsx`, `SplitBillModal.jsx`, `CollectBillPanelDrawer.jsx`, `orderTransform.js`, `couponService.js`, `loyaltyTransform.js` |
| `DashboardPage.jsx` | `OrderEntry.jsx`, `socketHandlers.js`, all card components, `StatusConfigPage.jsx` (settings) |
| `reportService.js` | `AllOrdersReportPage.jsx`, `RoomOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `OrderDetailSheet.jsx`, `reportTransform.js`, `orderTransform.js` |
| `reportTransform.js` | `reportService.js`, `AllOrdersReportPage.jsx`, `OrderTable.jsx`, `orderTransform.js` |
| `LoadingPage.jsx` | All contexts (bootstrap data), `AuthContext.jsx` |
| Provider order (`AppProviders.jsx`) | Everything — provider order is architecture-significant |
| Any localStorage key | `StatusConfigPage.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`, related prefs utilities |
| `insightsCache.js` | All 10 report pages, 5 service files, `InsightsCacheContext.jsx`, `App.js` |
| `orderPayloadStripper.js` | **DELETED (2026-06-17)** — was imported by 7 service files, backend now strips server-side |
| `BulkEditor.jsx` | `MenuManagementPanel.jsx`, `profileTransform.js` (gstStatus), CR-036 test file |

---

## Cross-Sprint Conflict Zones

| File | Touched By | Risk |
|---|---|---|
| `OrderEntry.jsx` | POS 3.1 + CRM 2.0 (2026-05-27) + CR-037 (2026-06-13) | HIGH — Popular tab removed |
| `CartPanel.jsx` | POS 3.1 (2026-05-27) + CR-018 (2026-06-08) + BUG-122 post (2026-06-10) | HIGH — schedule + split |
| `Sidebar.jsx` | CR-015 (2026-06-08) + CR-040/042/BUG-131/CR-044 (2026-06-13) | MEDIUM — 4 CRs same session |
| `DashboardPage.jsx` | PROD-HOTFIX-004/005 (2026-05-27) + CR-024 (2026-06-10) | MEDIUM |
| `reportTransform.js` | Audit Report (2026-05-28) + Insights batch (2026-06-11) + BUG-133 (2026-06-13) | MEDIUM |
| `BulkEditor.jsx` | CR-023 (2026-06-10) + CR-036/FU-01/02/03 (2026-06-12) | HIGH — 5 CRs layered |
| `insightsService.js` | Insights batch (2026-06-11) + BUG-133 + CR-045 + CR-044 (2026-06-13) + CR-045 cleanup (2026-06-17, -481 lines) | MEDIUM |

## BUG-134 (2026-06-15) — Scroll fix (Windows/QSR)
| File | Change |
|------|--------|
| `OrderEntry.jsx` | +min-h-0 (L1455, L1608), +overflow-y-auto (L1608) |
| `CartPanel.jsx` | +min-h-[200px] (L1163) |
| `CategoryPanel.jsx` | +min-h-0 (L20) |
| `App.css` | scrollbar width 6→8px (L33-34) |

### CR-049 / BUG-096 / BUG-092 / CR-048 — 2026-06-15 Implementation Session
| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | +4 INSIGHTS_* endpoint constants | CR-049 agent |
| `api/services/insightsService.js` | +4 cached fetch functions, +2 transforms, percentage fix | CR-049 agent |
| `pages/reports-module/DashboardMockup.jsx` | Switched to fetchInsightsDashboard | CR-049 agent |
| `pages/reports-module/SalesMockup.jsx` | Switched to fetchInsightsSales | CR-049 agent |
| `pages/reports-module/PaymentsMockup.jsx` | Switched to fetchInsightsSales | CR-049 agent |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Switched to fetchInsightsItems + audit lazy fetch | CR-049 agent |
| `pages/reports-module/CancellationsMockup.jsx` | Switched to fetchInsightsCancellations | CR-049 agent |
| `api/socket/socketEvents.js` | +DELETE_FOOD constant | BUG-096 agent |
| `api/socket/socketHandlers.js` | +delete-food handler | BUG-096 agent |
| `contexts/MenuContext.jsx` | +removeProduct action | BUG-096 agent |
| `api/socket/useSocketEvents.js` | +removeProduct wiring | BUG-096 agent |
| `components/modals/RoomCheckInModal.jsx` | Phone normalize + CRM lookup/create | BUG-092 agent |
| `api/services/roomService.js` | +customer_id in FormData | BUG-092 agent |
| `scripts/gen_dashboard_sync.js` (NEW) | Registry → dashboard JSON generator | CR-048 agent |
| `scripts/watch_registry.js` (NEW) | Chokidar file watcher | CR-048 agent |

### CR-011 Phase 3 — All Screens (2026-06-16)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/DailySalesMockup.jsx` | NEW — S11 Daily Sales Summary | CR-011 Phase 3 |
| `pages/reports-module/HourlySalesMockup.jsx` | NEW — S12 Hourly Sales Curve | CR-011 Phase 3 |
| `pages/reports-module/DayOfWeekMockup.jsx` | NEW — S13 Day-of-Week Trend | CR-011 Phase 3 |
| `pages/reports-module/ChannelPivotMockup.jsx` | NEW — S14 Channel & Payment | CR-011 Phase 3 |
| `pages/reports-module/CancelDetailMockup.jsx` | NEW — S28 Item Cancel Detail | CR-011 Phase 3 |
| `pages/reports-module/AuditLogMockup.jsx` | NEW — S34 Order Edit Audit | CR-011 Phase 3 |
| `pages/reports-module/OrderNotesMockup.jsx` | NEW — S35 Order Note Audit | CR-011 Phase 3 |
| `pages/reports-module/DiscountReportMockup.jsx` | NEW — S26 Discount Report | CR-011 Phase 3 |
| `pages/reports-module/CouponUsageMockup.jsx` | NEW — S27 Coupon Usage | CR-011 Phase 3 |
| `pages/reports-module/StaffServersMockup.jsx` | NEW — S32 Server Performance | CR-011 Phase 3 |
| `pages/reports-module/StaffCashiersMockup.jsx` | NEW — S33 Cashier Activity | CR-011 Phase 3 |
| `pages/reports-module/CustomersRfmMockup.jsx` | NEW — S36 Customer RFM | CR-011 Phase 3 |
| `pages/reports-module/CustomersMixMockup.jsx` | NEW — S37 Guest vs Registered | CR-011 Phase 3 |
| `pages/reports-module/TaxDetailMockup.jsx` | NEW — S23 GST/VAT Detail | CR-011 Phase 3 |
| `pages/reports-module/TaxSlabsMockup.jsx` | NEW — S24 Tax Slab Summary | CR-011 Phase 3 |
| `pages/reports-module/TaxCalcMockup.jsx` | NEW — S25 Inclusive/Exclusive | CR-011 Phase 3 |
| `pages/reports-module/TableSalesMockup.jsx` | NEW — S29 Table-wise Sales | CR-011 Phase 3 |
| `pages/reports-module/DeliveryChargeMockup.jsx` | NEW — S30 Delivery Charges | CR-011 Phase 3 |
| `pages/reports-module/RoomTransfersMockup.jsx` | NEW — S31 Room Transfer Trail | CR-011 Phase 3 |
| `pages/reports-module/CashierSettlementMockup.jsx` | NEW — S19 Cashier Settlement | CR-011 Phase 3 |
| `pages/reports-module/GatewayReconMockup.jsx` | NEW — S20 Gateway Recon | CR-011 Phase 3 |
| `pages/reports-module/TipReportMockup.jsx` | NEW — S21 Tip Report | CR-011 Phase 3 |
| `pages/reports-module/RoundOffMockup.jsx` | NEW — S22 Round-Off Report | CR-011 Phase 3 |
| `pages/reports-module/KotVarianceMockup.jsx` | NEW — S38 KOT Variance | CR-011 Phase 3 |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | MODIFIED — +4 tabs (S15-S18) + transformItemRows fix | CR-011 Phase 3 |
| `api/services/insightsService.js` | MODIFIED — +5 fetch functions + transformItemRows fix | CR-011 Phase 3 |
| `api/constants.js` | MODIFIED — +5 endpoint URLs | CR-011 Phase 3 |
| `App.js` | MODIFIED — +24 imports + routes | CR-011 Phase 3 |

### CR-011 Phase 3 — Sidebar Rearrangement (2026-06-16)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — Insights children restructured: flat 16 items → grouped 60+ items with `isGroup` category headers. comingSoon flags removed. All Phase 3 screens navigable. | CR-011 Phase 3 |

### BUG-136 — Sidebar Scroll Persistence (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — +`useSidebarScroll` hook (navRef + saveScroll + useLayoutEffect restore), 4× `saveScroll()` before navigate calls, `ref={navRef}` on `<nav>`. ~15 lines added. | BUG-136 agent |
| `contexts/InsightsCacheContext.jsx` | MODIFIED — +`sidebarScrollTop`/`setSidebarScrollTop` state + provided in context value. 3 lines added. | BUG-136 agent |

### BUG-125-B — Food Type Persistence Fix (retroactive, verified 2026-06-17)
| File | Change | Agent |
|---|---|---|
| `api/transforms/menuManagementTransform.js` | MODIFIED — +`veg:` field at L251 (alongside existing `item_type`). Covers Quick Edit, Full Edit, Add Food. | BUG-125-B (shipped on discount-menu branch, merged to 16-june) |

### CR-041 — Sidebar Restructure (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — Full rewrite of `sidebarMenuItems[]` (new order, renames, new children), `VISIBLE_SECTIONS`, `SIDEBAR_PERMISSIONS`, `COMING_SOON_ITEMS`. Removed 4 `onOpen*` props + 4 special-case handlers. Added `settings` + `reports` child handlers. | CR-041 agent |
| `pages/DashboardPage.jsx` | MODIFIED — Removed 4 panel imports, 4 state vars, 4 `onOpen*` props, 4 panel mounts (~40 lines removed). | CR-041 agent |
| `App.js` | MODIFIED — Added 4 imports + 4 routes: `/menu`, `/credit`, `/day-closure`, `/settings`. | CR-041 agent |
| `pages/MenuManagementPage.jsx` | NEW — Full-page wrapper for MenuManagementPanel (~20 lines). | CR-041 agent |
| `pages/CreditManagementPage.jsx` | NEW — Full-page wrapper for CreditManagementPanel (~20 lines). | CR-041 agent |
| `pages/DayClosurePage.jsx` | NEW — Full-page wrapper for SettlementPanel renamed "Day Closure" (~20 lines). | CR-041 agent |
| `pages/SettingsPage.jsx` | NEW — Full-page wrapper for SettingsPanel (~20 lines). | CR-041 agent |
| `components/panels/menu/BulkEditor.jsx` | MODIFIED — +`veg:` field at L159 (alongside existing `item_type`). Covers Bulk Editor save. | BUG-125-B |

### CR-011 FE-Only Fixes — F-1, F-2, F-5, F-6, F-10 (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/ItemSalesHybridMockup.jsx` | MODIFIED — Line 301: F-1 defensive label remap (`[]`/`"default"`/null → "No Variation"). Lines 1120-1148 removed: F-5 By Station summary block deleted from All Items tab. | CR-011 FE-fixes agent (2026-06-17) |
| `pages/reports-module/HourlySalesMockup.jsx` | MODIFIED — F-2: Added `Sunrise` import, breakfast bucket filter `[06,10)` + `breakfastRev` computation (lines 129-136), KPI grid-cols-5→6 with Breakfast card (line 218-223). | CR-011 FE-fixes agent (2026-06-17) |
| `pages/reports-module/PaymentsMockup.jsx` | MODIFIED — F-6: Removed Daily Payment Trends stacked bar + Cash vs Digital Trend area chart JSX (~55 lines). Kept `daily` array for breakdown table. `trend` stubbed as `[]`. | CR-011 FE-fixes agent (2026-06-17) |
| `components/layout/Sidebar.jsx` | MODIFIED — F-10: Added `featureGate: "room"` to Room Transfers sidebar item (line 147). Added feature-gate render filter at line 495: `if (child.featureGate && !restaurant?.features?.[child.featureGate]) return null`. | CR-011 FE-fixes agent (2026-06-17) |

### CR-045 Phase A+B — FE Stripper Removal + Dead Code Cleanup (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderPayloadStripper.js` | **DELETED** — backend now strips server-side. 119 lines removed. | CR-045 cleanup agent (2026-06-17) |
| `pages/reports-module/ItemSalesMockup.jsx` | **DELETED** — dead code, no route pointed to it (superseded by ItemSalesHybridMockup). | CR-045 cleanup agent (2026-06-17) |
| `api/services/insightsService.js` | MODIFIED — removed `stripOrders` import + 4 call sites. Deleted `getDashboardAggregated` function (474 lines). Removed from default export. | CR-045 cleanup agent (2026-06-17) |
| `api/services/foodCourtService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/roomOrdersService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/prepServeService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/orderLedgerService.js` | MODIFIED — removed `stripOrders` import + 2 call sites. | CR-045 cleanup agent (2026-06-17) |
| `pages/reports-module/CancellationsMockup.jsx` | MODIFIED — removed commented-out stripper import. | CR-045 cleanup agent (2026-06-17) |
| `App.js` | MODIFIED — removed dead `ItemSalesMockup` import. | CR-045 cleanup agent (2026-06-17) |

## Session 2026-06-18 Changes

| File | Change | CR/BUG |
|------|--------|--------|
| `components/order-entry/RePrintButton.jsx` | +1 line: `const { getOrderById } = useOrders()` in RePrintOnlyButton | BUG-137 |
| `api/transforms/orderTransform.js` | `self_discount` + `order_discount` = `(manual+preset)` across 3 payment paths (7 lines) | BUG-138 |
| `api/constants.js` | +`CHANNEL_VISIBILITY` key in `STORAGE_KEYS` | BUG-130 |
| `api/services/authService.js` | +`localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY)` in `logout()` | BUG-130 |
| `components/layout/Sidebar.jsx` | +flyout state, click handler, click-outside dismiss, flyout JSX panel (~80 lines). Removed BUG-139 auto-expand. | CR-052 |
| `pages/StatusConfigPage.jsx` | +6 toggle states (CR-051: walkin name/phone, dinein name/phone, takeaway name/phone), hydrate, save, reset, UI section. Sidebar default `false`. | CR-051 + CR-052 |
| `components/order-entry/OrderEntry.jsx` | +6-field validation at 3 sites (handlePlaceOrder, prepaid, QSR). TakeAway Name hardcoded→toggle. | CR-051 |
| 35× `pages/reports-module/*.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/AllOrdersReportPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/OrderSummaryPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/RoomOrdersReportPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |

### BUG-167 — App-level socket fix (2026-07-11 session 4)
| File | Change | Agent |
|------|--------|-------|
| `components/AppSocketManager.jsx` | **NEW** — calls `useSocketEvents()`, returns null. Persists across all routes. // BUG-167 fix | BUG FIX agent |
| `App.js` | Import `AppSocketManager` + mount `<AppSocketManager />` inside `<BrowserRouter>` before `<Routes>` | BUG FIX agent |
| `pages/DashboardPage.jsx` | Removed `import { useSocketEvents }` (L20) + removed `const { isConnected: socketConnected } = useSocketEvents()` (L186) | BUG FIX agent |

### BUG-159 + BUG-160 — Category CRUD fixes (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | +`CATEGORY: '/api/v2/vendoremployee/expense/category'` constant — BUG-159 + BUG-160 | IMPL agent |
| `api/services/expenseService.js` | +`createEmptyCategory()` (POST /expense/category) — BUG-159 fix | IMPL agent |
| `api/services/expenseService.js` | +`renameExpenseCategory()` (PUT /expense/category/{id}) — BUG-160 fix | IMPL agent |
| `api/services/expenseService.js` | +`deleteExpenseCategory()` (DELETE /expense/category/{id}) — BUG-160 fix | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `addCategory()`: `createCategoryWithItems(name, [])` → `createEmptyCategory(name)` — BUG-159 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `renameCategory()`: removed items filter, `updateCategory` → `renameExpenseCategory` — BUG-160 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `deleteCategory()`: removed per-item loop, `deleteExpenseItem` → `deleteExpenseCategory` — BUG-160 | IMPL agent |

### BUG-163 / BUG-VQTY / BUG-ROOM-PAIDROOM — Bug Fix Batch (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/services/expenseService.js` | L65: added `{ type: 'all' }` POST body to `exportStockMaster()` — BUG-163 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L703: `variationAmount * (item.qty \|\| 1)` — BUG-VQTY fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1492: `variationAmount * qty` — BUG-VQTY fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1632: `paid_room: table?.isRoom ? 'yes' : ''` — BUG-ROOM-PAIDROOM fix | BUG FIX agent |

### BUG-166 — addon_amount × qty fix (2026-07-12)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/orderTransform.js` | L704: `addonAmount * (item.qty \|\| 1)` — BUG-166 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1493: `addonAmount * qty` — BUG-166 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L698: `addonQtys.map(q => q * (item.qty \|\| 1))` — BUG-168 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1808-1826: `addonPerUnit` reduce over `item.add_ons[]` + `(price*qty) + (addonPerUnit*qty)` — BUG-168 v2 fix (2026-07-08). Fallback subtotal loop in `buildBillPrintPayload` now includes addons. Replaces prior 2026-07-08 patch that used non-existent `item.total_add_on_price` field. Mirrors `CollectPaymentPanel.getItemLinePrice` L212-224. Curl-verified against live order #002384. | BUG FIX agent |
| `components/order-entry/CartPanel.jsx` | L8-23: getAddonText/hasAddons helpers, L99+L124+L240: addon display × item.qty — BUG-168 display fix | BUG FIX agent |
| `components/order-entry/CollectPaymentPanel.jsx` | L1862+L1877+L2217+L2232: addon display × item.qty — BUG-168 display fix | BUG FIX agent |


### CR-067 — Expense Bulk Editor Redesign (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseBulkEditor.jsx` | Full rewrite ~330 lines — toolbar (Search, + Add Item, Save N Changes, Excel, Import, X close), category-grouped rows, new rows pinned to top with auto-focus, dirty tracking (amber per row), per-row status (saving/✓/✗+tooltip), internal save logic (new=POST, cat-change=DELETE+POST, rename=blocked/OQ-1=B, priced-cat-change=blocked/OQ-2=B), Reset All footer, beforeunload guard // CR-067 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | Removed handleBulkSave function + bulkSaving state; updated <ExpenseBulkEditor> props to onRefresh+onClose; passes allItems (not filtered) // CR-067 | IMPL agent |

### BUG-175 + BUG-176 — Expense Entry Form fixes (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseEntryPanel.jsx` | BUG-175: removed qty input from Case A; amount = unitPrice directly; removed handleQtyChange. BUG-176: added physical_quantity to EMPTY_LINE; added Case B optional fields block (qty+unit+physical_qty); wired physical_quantity through handleSave + startEdit | IMPL agent |

### BUG-229 + BUG-230 — Employee Auto-Email + Name→Email Sync (2026-07-22)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/panels/employee/EmployeeListView.jsx` | BUG-229 + BUG-230 | 2026-07-22 | +useRestaurant import, +generateEmail helper, updateNewRow auto-gen on firstName, updateExisting sync, email mandatory validation, _emailManual tracking |

### BUG-231 — Role Form: Hide role_type + Validation/Error Toasts (2026-07-22)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/panels/employee/RoleFormView.jsx` | BUG-231 | 2026-07-22 | Sub-A: removed role_type dropdown UI (grid 3→2), kept state+payload for API compat. Sub-B: +errors state, +permissions validation, +visual error indicators, +backend error parsing in catch |

### BUG-234 + BUG-235 — Employee Role Dropdown + Role Permissions Save Fix (2026-07-24)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/panels/employee/EmployeeListView.jsx` | BUG-234 | 2026-07-24 | Wire `roleOptions` to both Add+Edit `<select>` (lines 292, 359). Safe `String()` ID compare (lines 287, 354). Fix `addRow` default role to first editable+active (lines 69-70). |
| `api/transforms/roleTransform.js` | BUG-235 | 2026-07-24 | Add `roleTypes: api.role_type \|\| []` to `fromAPI.role()` (line 20) — was never mapped, causing roleTypes to always be undefined. |
| `components/panels/employee/RoleFormView.jsx` | BUG-235 | 2026-07-24 | Add auto-populate `useEffect`: when `catalogRoleTypes` loads and `roleTypes` is still `[]`, set to all catalog IDs. Fixes 422 on new role create. |
| `components/panels/employee/RoleFormView.jsx` | CR-096 | 2026-07-24 | Extend `applyTemplate()` to derive `roleTypes` from `t.mapRole` (case-insensitive match against `catalogRoleTypes.value`). Build-from-scratch: resets to all catalog IDs. Guard: skips if catalog not yet loaded. |
| `api/transforms/roleTransform.js` | CR-096 | 2026-07-24 | Add `mapRole: t.map_role \|\| null` to `roleMasterList()` (line 57). Was dropped silently; now exposed for use in `applyTemplate`. |
| `components/panels/employee/RoleListView.jsx` | BUG-235 | 2026-07-24 | Line 89: `roleTypes: []` → `roleTypes: role.roleTypes` in active status toggle. Fixes 422 on toggle. |

| `api/services/expenseService.js` | BUG-176: fixed physical_quantity in addExpenseEntry + editExpenseEntry — removed hard-coded 0, now passes user value | IMPL agent |

### CR-059 — Expense Module Phase 1 (2026-07-06)
| File | Change | Agent |
|---|---|---|
| `api/constants.js` | +EXPENSE_ENDPOINTS block (~30 lines) | CR-059 agent |
| `api/services/expenseService.js` | NEW — 20 API wrapper functions (~234 lines) | CR-059 agent |
| `api/transforms/expenseTransform.js` | NEW — fromAPI + toAPI + date helpers. BUG-CR059-A fix: mapped non-standard API keys ('Date & Time', 'EXPENSE', 'Amount', 'Payment Method', 'Category') | CR-059 agent |
| `components/expense/ExpenseEntryPanel.jsx` | NEW — daily expense logging UI. BUG-CR059-B fix: edit row uses ItemCombobox (replaces free-text input that caused 500 errors) | CR-059 agent |
| `components/expense/ExpenseSetupPanel.jsx` | MODIFIED 2026-07-08 — BUG-DND-CR059: handleDragEnd rewritten (DELETE+POST workflow); BUG-P2: GripVertical drag handles removed | CR-059 agent |
| `components/expense/ExpenseBulkEditor.jsx` | NEW — spreadsheet bulk editor for expense items | CR-059 agent |
| `pages/ExpenseEntryPage.jsx` | NEW — route wrapper for /expenses | CR-059 agent |
| `pages/ExpenseSetupPage.jsx` | NEW — route wrapper for /expense-setup | CR-059 agent |
| `components/layout/Sidebar.jsx` | +Expenses menu entry + route | CR-059 agent |
| `App.js` | +/expenses and /expense-setup routes | CR-059 agent |
| `pages/index.js` | +ExpenseEntryPage + ExpenseSetupPage exports | CR-059 agent |

### CR-060 — Table/Room Management CRUD (Gate 3 ready, 2026-07-06)
| File | Change | Agent |
|---|---|---|
| `components/panels/settings/TableManagementView.jsx` | REWRITE — replace mocked CRUD with real API calls. Add Dialog (TB/RM toggle, Number, Area, Waiter). Add bulk edit toggle. Add room support. Real error handling. (~400 lines) | CR-060 agent |
| `components/panels/settings/TableBulkEditor.jsx` | NEW — spreadsheet bulk editor (BulkEditor.jsx pattern simplified, 4 columns). (~350 lines) | CR-060 agent |
| `api/services/tableService.js` | +CRUD functions: getTableConfig, storeTable, deleteTable, getAreaOptions, getWaiterList, exportSample, exportList, importTables (+80 lines additive) | CR-060 agent |
| `api/transforms/tableTransform.js` | +configFromAPI (tableConfigItem, areaOptions, waiterList) + toAPI.storeTable (+60 lines additive) | CR-060 agent |
| `api/constants.js` | +TABLE_CONFIG_ENDPOINTS block (~15 lines additive) | CR-060 agent |
| `components/layout/Sidebar.jsx` | Remove `comingSoon: true` from table-management entry (1 line) | CR-060 agent |

### CR-061 — Expense Report FE (Gate 3 ready, 2026-07-06)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/ExpenseReportPage.jsx` | NEW — full Insights expense report page. KPIs, recharts (daily bar + category pie + payment split), filterable/sortable table, Excel/PDF export. (~500 lines) | CR-061 agent |
| `api/services/expenseReportService.js` | NEW — fetchExpenseReport, aggregateExpenses (client-side), fetchExpenseCategories, fetchPaymentMethods, exportExpenseReport. (~120 lines) | CR-061 agent |
| `components/layout/Sidebar.jsx` | +Expenses group under Insights section | CR-061 agent |
| `App.js` | +/reports-module/expense-report route + import | CR-061 agent |
| `pages/OrderSummaryPage.jsx` | +Expense Summary Card (Surface B — today's total + payment breakdown + link to report) | CR-061 agent |


### BUG-144 — Token Number Display + Print (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/profileTransform.js` | L364: +`useToken: toBoolean(apiSettings.settings?.use_token)` — gate for token display/print | BUG-144 IMPL agent |
| `api/transforms/orderTransform.js` | L197: +`dailyToken: api.daily_token \|\| null` in `fromAPI.order()` — extract token from all order sources | BUG-144 IMPL agent |
| `api/transforms/orderTransform.js` | L2038: +`daily_token: order.dailyToken \|\| ''` in `buildBillPrintPayload()` — bill print passthrough | BUG-144 IMPL agent |
| `api/services/orderService.js` | L159: +`daily_token: orderData?.dailyToken \|\| ''` in KOT inline payload — KOT print passthrough | BUG-144 IMPL agent |
| `components/cards/OrderCard.jsx` | L97-98: +`dailyToken` + `useToken` extraction. L434: token display inline with orderNumber (`#{orderNumber} · T{dailyToken}`). L437-445: standalone token chip for dineIn/room orders. All gated by `useToken` | BUG-144 IMPL agent |
### BUG-194 + BUG-186 + BUG-195 + BUG-188 — FE Fix Batch (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `pages/reports-module/PaymentsMockup.jsx` | L213+L219+L255: `.data?.` prefix on salesData access — BUG-194 (CR-049 regression) | IMPL agent |
| `components/panels/SettlementPanel.jsx` | L145-149: effectiveExpected for negative balance, L386: removed red border guard, L388: removed over-expected error, L396: Full button uses effectiveExpected, L410: removed over-expected disabled guard — BUG-186 | IMPL agent |
| `components/order-entry/CartPanel.jsx` | L805-819: isNameRequired+isPhoneRequired read localStorage CR-051 toggles — BUG-195. L526: +overflow-hidden, L566: +flex-shrink-0 whitespace-nowrap — BUG-188 | IMPL agent |

### BUG-135-C + BUG-147 — Bulk Editor Error Visibility (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/panels/menu/BulkEditor.jsx` | L520: hybrid ≤3 inline toast / >3 drawer — BUG-135-C. L508: prefixed item name on _saveError — BUG-147 | IMPL agent |
| `components/order-entry/AddCustomItemModal.jsx` | L78: prefixed item name on inline error — BUG-147 | IMPL agent |
| `components/panels/menu/ProductForm.jsx` | L531: prefixed item name on toast error — BUG-147 | IMPL agent |


### CR-074-B — Expense Setup Design Refresh + CR-064 + BUG-162 + BUG-202 (2026-07-17)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseSetupPanel.jsx` | CR-074-B Phases 1-4: BUG-162 optimistic updates, CR-064 unit-price quick-add (two-call), BUG-202 inline edit via PUT, DnD rewrite (single PUT), bulk-select delete+move+banner. Smoke-fixes SF-1/2/3. ~1100 lines. | IMPL agent |
| `components/expense/ExpenseBulkEditor.jsx` | CR-074-B Phase 5: full redesign — OQ-1/OQ-2 removed, catChanged→PUT, checkbox column, selection banner, bulk delete+move, pre-flight dup check, malformed-404 handler. 454→875 lines. | IMPL agent |
| `api/services/expenseService.js` | +`updateExpenseItem(id, {stock_title, category_id})` wrapper for PUT /expenses/{id}. BUG-202-fwd-compat. | IMPL agent |
| `api/constants.js` | +`STOCK_ITEM_UPDATE` endpoint constant for PUT /expenses. BUG-202-fwd-compat. | IMPL agent |
| `api/transforms/expenseTransform.js` | +`fromAPI.updatedItem(res)` transform for PUT response. BUG-202-fwd-compat. | IMPL agent |
| `pages/ExpenseSetupPage.jsx` | SF-4: removed redundant `marginLeft: 280` (layout fix). 2 lines. | IMPL agent |
| `pages/ExpenseEntryPage.jsx` | SF-4: removed redundant `marginLeft: 280` (layout fix). 2 lines. | IMPL agent |
### BUG-203 + BUG-204 — Inline Edit Price + Expense Entry Qty×Price (2026-07-17)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseSetupPanel.jsx` | BUG-203: editItemPrice state, startEditItem/cancelEditItem price init, eager pricedItems load, saveEditItem 2-call price logic, price validation, inline edit price input UI | IMPL agent |
| `components/expense/ExpenseBulkEditor.jsx` | BUG-203: _originalPrice tracking in buildRow, PRICE column header, per-row price input, 2-call save for price changes | IMPL agent |
| `components/expense/ExpenseEntryPanel.jsx` | BUG-204: handleItemSelect clears qty/amount, handlePricedQtyChange live auto-calc, Case A rendering (qty input + breakdown text), amount placeholder, startEdit cross-reference unitPrice | IMPL agent |

## BUG-205 (2026-07-17) — Qty/Unit columns in expense tables
| `components/expense/ExpenseEntryPanel.jsx` | BUG-205: added Qty + Unit `<th>` headers + `<td>` cells (view + edit), updated tfoot colSpan |
| `pages/reports-module/ExpenseReportPage.jsx` | BUG-205: added Qty + Unit to columns config, `<th>` headers, `<td>` cells, updated colSpans |

## BUG-203 Sub-B/C/D (2026-07-17) — Unit price in Bulk Editor + edit row auto-calc
| `components/expense/ExpenseBulkEditor.jsx` | BUG-203 Sub-B: removed _isNew guard on price input, chain addUnitPrice after createCategoryWithItems. Sub-C: accept pricedItems prop, use for edit-vs-add decision in save handler |
| `components/expense/ExpenseSetupPanel.jsx` | BUG-203 Sub-C: pass pricedItems prop to ExpenseBulkEditor |
| `components/expense/ExpenseEntryPanel.jsx` | BUG-203 Sub-D: edit row shows qty input + auto-calc for priced items |

## BUG-198 (2026-07-17) — Employee CRUD fixes + role type wiring
| `api/services/employeeService.js` | BUG-198: POST→PUT for updateEmployee, removed resetEmployeePassword |
| `api/transforms/employeeTransform.js` | BUG-198: status:1 on create, optional password on update, email omit-if-empty |
| `components/panels/employee/EmployeeListView.jsx` | BUG-198: removed ResetPasswordDialog, inline password + Eye/EyeOff toggle |
| `api/services/roleService.js` | BUG-198: POST→PUT for updateRole |
| `api/axios.js` | BUG-198 + BUG-197: X-localization: en header |
| `components/panels/employee/RoleFormView.jsx` | BUG-198: role_type dropdown wired (onChange + value) |
| `components/panels/employee/ResetPasswordDialog.jsx` | BUG-198: DELETED — no longer needed |

## BUG-197 Addendum A2-A7 (2026-07-17) — Recipe transform field renames
| `api/transforms/recipeTransform.js` | BUG-197-A2/A3: recipe_qty/recipe_unit for standard recipe store/update. BUG-197-A4/A5: sub_recipe_name, subunit, prepration_time, thershold_qty/unit for sub-recipe. BUG-197-A6/A7: recipe_qty/recipe_unit + preparation_time/serves_people/serve_time for addon recipe. |

## Employee Edit UX Fixes (2026-07-17)
| `components/panels/employee/EmployeeListView.jsx` | Fix 1: backend error parsing (L117-126), Fix 2: password hint placeholders (L237,L301), Fix 3a/3b: role dropdown uses all roles (L250,L255,L317,L322), Fix 5: Email (User ID) header (L205) |
| `api/transforms/employeeTransform.js` | Fix 4: always send email field on create+update (L39,L51) |

### CR-073 · Recipe Bulk Editor (2026-07-19 — retroactive registration)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/inventory/RecipeBulkEditor.jsx` | CR-073 | 2026-07-16 | NEW — 567 lines. Bulk editor spreadsheet with expandable ingredient rows. |
| `components/inventory/RecipeManagementPanel.jsx` | CR-073 | 2026-07-16 | MODIFIED — Added Card/Bulk toggle, viewMode state, conditional render. |

| `components/inventory/RecipeBulkEditor.jsx` | BUG-206 | 2026-07-19 | MODIFIED — merged foodId reverse-lookup into normaliseRecipe + hydration useEffect deps. ~15 lines changed. |
| `components/inventory/RecipeBulkEditor.jsx` | BUG-207 | 2026-07-19 | MODIFIED — added purchaseRates state, vendor-item-list cross-join, costMarginFor rewrite, null-guard cost render. ~25 lines. |

### CR-077 Phase 1 · Receive Stock (2026-07-19)
| File | CR | Date | Notes |
|---|---|---|---|
| `pages/InventoryReceivePage.jsx` | CR-077 | 2026-07-19 | NEW — page wrapper |
| `components/inventory/ReceiveStockPanel.jsx` | CR-077 | 2026-07-19 | NEW — queue tabs + table (~200 lines) |
| `components/inventory/ReceiveDrawer.jsx` | CR-077 | 2026-07-19 | NEW — transfer detail drawer (~170 lines) |
| `api/services/inventoryTransferService.js` | CR-077 | 2026-07-19 | NEW — 4 endpoints |
| `api/transforms/inventoryTransferTransform.js` | CR-077 | 2026-07-19 | NEW — fromAPI normalizers |
| `App.js` | CR-077 | 2026-07-19 | MODIFIED — +1 route, +1 import |
| `api/constants.js` | CR-077 | 2026-07-19 | MODIFIED — +INVENTORY_TRANSFER_ENDPOINTS |
| `api/socket/socketEvents.js` | CR-082 | 2026-07-19 | MODIFIED — +JOIN_EVENT, +JOINED_ACK_EVENT constants |
| `api/socket/socketService.js` | CR-082 | 2026-07-19 | MODIFIED — +joinRestaurant() method, +restaurantId state, +re-join on connect, +clear on disconnect |
| `api/socket/useSocketEvents.js` | CR-082 | 2026-07-19 | MODIFIED — +socketService.joinRestaurant(restaurantId) call in subscription effect |
| `components/expense/ExpenseSetupPanel.jsx` | BUG-208 | 2026-07-20 | MODIFIED — fetchAll cross-join pricedItems→allItems, improved error message (line 573), Unit Prices edit hint |
| `components/expense/ExpenseBulkEditor.jsx` | BUG-208 | 2026-07-20 | MODIFIED — price clearing via deleteUnitPrice when user clears price field (2 paths) |
| `components/expense/ExpenseEntryPanel.jsx` | CR-083 | 2026-07-20 | MODIFIED — Split payment: EMPTY_LINE+splitPayments, EntryLine+split props, split rows UI, validation bar, Cash Draw hint, handleSplitToggle/Change/Remove, flatMap save expansion |
| `components/inventory/InventoryTabBar.jsx` | CR-081 | 2026-07-20 | NEW — horizontal pill tab bar (OPERATIONS + SETUP groups), 9 pills, active state, franchise-only Receive, sticky |
| `pages/InventoryIntelligencePage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="dashboard" |
| `pages/InventoryCurrentStockPage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="current-stock" |
| `pages/SmartPurchasePage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="smart-purchase" |
| `pages/InventoryReceivePage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="receive" |
| `pages/StockAuditPage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="audit" |
| `pages/InventorySetupPage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active={tabFromQuery} + useSearchParams |
| `pages/RecipeManagementPage.jsx` | CR-081 | 2026-07-20 | MODIFIED — +InventoryTabBar active="recipes" |


### BUG-211 + BUG-212 — Current Stock Sort/Filter + Ingredients Edit/Add/Export (2026-07-21)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/inventory/CurrentStockPanel.jsx` | BUG-211 | 2026-07-21 | MODIFIED — .sort() default (Out→Low→In), KPI cards clickable toggle filters with ring, status chip row removed (Option A) |
| `components/inventory/InventorySetupPanel.jsx` | BUG-212 | 2026-07-21 | MODIFIED — Pencil edit icon + inline edit row (blue-bordered) + saveEdit→PUT, add form 3→7 fields, export→real API, +Loader2 import |
| `api/services/inventoryService.js` | BUG-212 | 2026-07-21 | MODIFIED — +updateIngredient(id, data) function |
| `api/transforms/inventoryTransform.js` | BUG-211 + BUG-212 | 2026-07-21 | MODIFIED — +toAPI.updateIngredient(), stockItems de-dupe by id |
| `api/constants.js` | BUG-212 | 2026-07-21 | MODIFIED — +UPDATE_INVENTORY endpoint |

### CR-086 F4 + BUG-213 — IngredientBulkEditor (2026-07-21)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | CR-086 + BUG-213 | 2026-07-21 | NEW (CR-086 F4) — 422-line spreadsheet bulk editor for ingredients. BUG-213: +title span in toolbar (G8 gap). |

### BUG-223 + BUG-224 + BUG-227 — Wave 4 Implementation (2026-07-23)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/inventory/StockAuditPanel.jsx` | BUG-223 | 2026-07-23 | MODIFIED — amber preview badge (red→amber), "preview" sub-label, unsaved adjustments banner with AlertCircle. ~18 lines. |
| `utils/purchasePlanner.js` | BUG-224 | 2026-07-23 | MODIFIED — B2 Rule 2 low-stock alert rows added after velocity rows. minQtyAlert×conversionFactor threshold, G9 sub-recipe filter, origin='stock_alert'. ~22 lines. |
| `components/inventory/SmartPurchasePanel.jsx` | BUG-224 + BUG-227 | 2026-07-23 | MODIFIED — BUG-224: origin pass-through from planner. BUG-227: +getVendors in Promise.all, vendorMaster state, vendorNamesById seeded from master, rankVendors passes master, submit guard for vendor_id='system'. |
| `components/inventory/smart/AutoShoppingList.jsx` | BUG-224 | 2026-07-23 | MODIFIED — Low stock amber badge for origin='stock_alert' rows. ~2 lines. |
| `utils/vendorRanking.js` | BUG-227 | 2026-07-23 | MODIFIED — +vendorMaster param, null-vid→'system' bucketing, master vendors appended unranked after priced candidates. B3/B5 math untouched. ~30 lines. |
| `components/inventory/smart/VendorSuggestionCell.jsx` | BUG-227 | 2026-07-23 | REWRITE — plain select→searchable combobox (shadcn Popover+Command). Winner "Recommended" badge, master-only "(no history)" tag, System Vendor "(system)" tag, null-price guard on isMateriallyMoreExpensive. ~120 lines. |

### CR-088 — Recipe By Ingredient Reverse View (2026-07-23)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `components/inventory/RecipeManagementPanel.jsx` | CR-088 | 2026-07-23 | MODIFIED — 4th "By Ingredient" tab: ingredient selector dropdown, client-side reverse filter across Standard+Sub+Addon, table view with qty highlight column + total row, Create/Card-Bulk hidden on this tab. ~90 lines. |

### CR-094 — P&L Report (2026-07-23)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `pages/reports-module/PLReportPage.jsx` | CR-094 | 2026-07-23 | NEW — P&L Report page. KPI strip (Sales, Paid Revenue, Expenses, Net P&L), bar chart (revenue vs expenses), pie chart (cost breakdown), sortable table, PDF export. ~200 lines. |
| `api/constants.js` | CR-094 | 2026-07-23 | MODIFIED — +PL_REPORT_ENDPOINT |
| `api/services/reportService.js` | CR-094 | 2026-07-23 | MODIFIED — +getProfitLossReport() with DD/MM/YYYY date format conversion |
| `components/layout/Sidebar.jsx` | CR-094 | 2026-07-23 | MODIFIED — +P&L Report as first child of Daily Report |
| `App.js` | CR-094 | 2026-07-23 | MODIFIED — +PLReportPage import + /profit-loss route |

### CR-095 — Waiter Transfer Unlock (2026-07-23)
| File | CR/BUG | Date | Notes |
|---|---|---|---|
| `api/services/settlementService.js` | CR-095 | 2026-07-23 | MODIFIED — +transferCollection() function |
| `components/panels/SettlementPanel.jsx` | CR-095 | 2026-07-23 | MODIFIED — Transfer modal unlocked: +5 state vars, +resetTransferState, +handleTransfer with validation, replaced disabled modal with enabled modal (to-waiter select, full/partial type, amount input, remark, submit) |
| `components/inventory/RecipeManagementPanel.jsx` | BUG-232 | 2026-07-23 | MODIFIED — By Ingredient loading guard: added spinner while fetchData() in-flight to prevent empty combobox race condition |
| `pages/reports-module/ConsumptionReportPage.jsx` | CR-093 | 2026-07-23 | NEW — Consumption Report screen: date filter, category/ingredient client-side filter, summary table with expandable drill-down, Excel+PDF export, pending cost/margin placeholders |
| `components/layout/Sidebar.jsx` | CR-093 | 2026-07-23 | MODIFIED — +1 line: Consumption Report link after P&L in Daily Report section |
| `App.js` | CR-093 | 2026-07-23 | MODIFIED — +import + route for /reports-module/consumption-report |
| `api/services/inventoryService.js` | CR-093 | 2026-07-23 | MODIFIED — getDailyConsumptionReport extended with ...rest spread for filter passthrough |

### CR-097 — Auto-Settle Sequential Queue (2026-07-23)
| File | Agent | Date | Change |
|---|---|---|---|
| `pages/DashboardPage.jsx` | CR-097 | 2026-07-23 | MODIFIED — L1418-1506: Replaced burst .forEach() auto-settle with ref-based sequential queue (800ms delay, max 2 retries, pre-call staleness check, cleanup on unmount) |

### CR-102 + CR-103 (2026-07-24)
| File | Change | Agent |
|---|---|---|
| `api/transforms/inventoryTransform.js` | +consumption_unit in addIngredient/updateIngredient with hasConversion guard | CR-102 |
| `components/inventory/SmartPurchasePanel.jsx` | +selectedRows state, selection handlers, activeRows filter, validate skip, new props | CR-103 |
| `components/inventory/smart/AutoShoppingList.jsx` | +checkbox column, select-all header, bulk remove toolbar, prominent × button | CR-103 |

### CR-089 + CR-101 (2026-07-24)
| File | Change | Agent |
|---|---|---|
| `components/inventory/RecipeManagementPanel.jsx` | +jsPDF imports, +handleExportPDF, +Download PDF button | CR-089 |
| `pages/AllOrdersReportPage.jsx` | +punchedBy/collectedBy filter state, filter logic, options useMemo, FilterBar props | CR-101 |
| `components/reports/FilterBar.jsx` | +punchedByOptions/collectedByOptions props, +2 Select dropdowns | CR-101 |


### BUG-302 (2026-08-06)
| File | Change | Agent |
|---|---|---|
| `components/inventory/RecipeManagementPanel.jsx` | BUG-302: L6 `import autoTable from 'jspdf-autotable'` (was side-effect import). L437 `autoTable(doc,{...})` (was `doc.autoTable({...})`). | BUG-302 BUG FIX agent 2026-08-06 |


### BUG-296 (2026-08-06) — Food Court Revenue Fix
| File | Change | Agent |
|---|---|---|
| `api/services/foodCourtService.js` | BUG-296: E1 L105 cache key `'created_at'`→`'collect_bill'`. E2 L108 `sort_by: 'created_at'`→`'collect_bill'`. E3 L129 `itemTotal` add `.filter(foodStatus!==3)`. | BUG-296 IMPL agent 2026-08-06 |

### CR-131 (2026-08-06) — CRM Customer Intelligence Beta Screens
| File | Change | Agent |
|---|---|---|
| `api/constants.js` | CR-131: +3 CRM_REPORT_* endpoint constants (L71-73) |CR-131 IMPL agent 2026-08-06 |
| `api/services/crmReportService.js` | **NEW** CR-131: getSummary, getTopCustomers, getChurnRisk + 5-min TTL cache. Import: `../crmAxios`. | CR-131 IMPL agent 2026-08-06 |
| `pages/reports-module/CustomerIntelligenceBeta.jsx` | **NEW** CR-131: KPI strip, lifecycle funnel, tier dist, revenue, top-customers (sort toggle), win-back (2 bands + WhatsApp). | CR-131 IMPL agent 2026-08-06 |
| `pages/reports-module/GuestVsRegisteredBeta.jsx` | **NEW** CR-131: lifecycle funnel hero, AOV trend, redemption dial, points outstanding, both churn bands side-by-side. | CR-131 IMPL agent 2026-08-06 |
| `components/layout/Sidebar.jsx` | CR-131: +2 entries after L189 — customers-intel-beta + customers-gvr-beta. | CR-131 IMPL agent 2026-08-06 |
| `App.js` | CR-131: +2 imports (L35-36) + 2 routes (L142-143). | CR-131 IMPL agent 2026-08-06 |


### BUG-240 + BUG-241 + BUG-242 (2026-07-24)

### BUG-301 (2026-08-06)
| File | Change | Agent |
|---|---|---|
| `api/services/menuManagementService.js` | BUG-301: `toggleFoodStatus(foodId,status,foodFor='Normal')` — sends `{food_for:'Aggregator'}` when aggregator else `{status}`. | BUG-301 BUG FIX agent 2026-08-06 |
| `components/panels/menu/ProductList.jsx` | BUG-301: L109 passes `menuType` to `toggleFoodStatus`. L116 adds `menuType` to `useCallback` dep array. | BUG-301 BUG FIX agent 2026-08-06 |
| `components/panels/menu/BulkEditor.jsx` | BUG-301: L510 passes `menuType` to `toggleFoodStatus`. | BUG-301 BUG FIX agent 2026-08-06 |


| File | Change | Agent |
|---|---|---|
| `utils/purchasePlanner.js` | +display_on_hand field in velocity + stock_alert rows | BUG-240 |
| `components/inventory/smart/AutoShoppingList.jsx` | Render display_on_hand + display_unit; rate placeholder + suggestedRate hint | BUG-240, BUG-241 |
| `components/inventory/SmartPurchasePanel.jsx` | rate='' + suggestedRate; vendor_id defaults 'system'; validate blocks null vendor | BUG-241, BUG-242 |

### BUG-244 — add-purchase Payload Fix (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/inventoryTransform.js` | BUG-244: `toAPI.addPurchase()` — payment_method→payment_type, +tot_amount/item_total/tot_fair/tot_tax, removed converion_factor from line items | BUG-244 IMPL agent |

### BUG-245 + BUG-246 + BUG-247 — Implementation Batch (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `components/dashboard/ChannelColumn.jsx` | BUG-245: Removed occupied-first bucketing in channel mode. Single `.sort(compare)` replaces 8-line split. Tables stay in label-numeric position regardless of order status. | BUG-245 IMPL |
| `components/order-entry/OrderEntry.jsx` | BUG-246: +`customizationKey()` builder + merge logic in `addCustomizedItemToCart()`. Identical customized items (same id+size+variants+addons+notes) merge qty instead of appending duplicate lines. | BUG-246 IMPL |
| `components/inventory/smart/VendorSuggestionCell.jsx` | BUG-247: Wrapped in `React.memo()` to prevent re-render on parent typeahead state change. Import `memo` added. | BUG-247 IMPL |

### BUG-248 — Bulk Editor isDirty + portionSize (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `components/panels/menu/BulkEditor.jsx` | +9 isDirty checks (packedFood, isInventory, stockOut, isDisabled, taxCalc, itemUnit, availableTimeStart, availableTimeEnd, portionSize) at L289-298. +`portion_size` in buildPayload at L168. | BUG-248 IMPL agent |

### CR-048-REBUILD — Dashboard Sync Script (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `frontend/scripts/gen_dashboard_sync.py` | NEW — Python sync script reads registry.json, outputs cr_registry.json + bug_tracker.json for Control Dashboard. 130 CRs, 263 BUGs synced. | CR-048-REBUILD IMPL agent |

### BUG-249 — effectiveQty status fix (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `components/inventory/CurrentStockPanel.jsx` | +effectiveQty helper (L24). Replaced 10 sites: StatusBadge, KPI counts, filters, sort, Excel/PDF export, row tint. // BUG-249 | BUG-249 IMPL agent |

### CR-105 — Show All + Add Item (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `utils/purchasePlanner.js` | +showAll param (L107), +inStockRows (L143-146), merged return (L173). // CR-105 | CR-105 IMPL agent |
| `components/inventory/SmartPurchasePanel.jsx` | +showAll state (L20), pass to computePlan (L50) + AutoShoppingList (L241-242), deps (L77). // CR-105 | CR-105 IMPL agent |
| `components/inventory/smart/AutoShoppingList.jsx` | +showAll/onToggleShowAll props (L82), +in_stock rowBg (L74), +toggle UI (L107-114), uncommented Add Item button (L116-120), +in_stock badge (L170). // CR-105 | CR-105 IMPL agent |

### CR-090 — Inventory Category Delete (2026-07-25)
| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | +DELETE_STOCK_CATEGORY endpoint (L159). // CR-090 | CR-090 IMPL agent |
| `api/services/inventoryService.js` | +deleteCategory(id) function (L63-65). // CR-090 | CR-090 IMPL agent |
| `components/inventory/InventorySetupPanel.jsx` | +deleteCategory handler (L95-111), sidebar category rows → div wrapper + Trash2 icon on hover (L226-240). // CR-090 | CR-090 IMPL agent |

| `api/transforms/inventoryTransform.js` | BUG-269-A: hasConversion guard — `data.unit !== data.smallUnit` check in addIngredient (L130) + updateIngredient (L149) | BUG-269 IMPL agent |
| `components/inventory/InventorySetupPanel.jsx` | BUG-269-B: UNIT_SMALL_MAP (L16), unit onChange auto-select smallUnit (ADD L309, EDIT L365), smallUnit onChange syncs alert (ADD L321, EDIT L377), alert unit read-only span (ADD L330-334, EDIT L386-390), startEdit sync (L153-157) | BUG-269 IMPL agent || `api/transforms/orderTransform.js` | BUG-270: +cust_mobile/cust_membership_id (L1132-1133). BUG-271: Per-item GST/VAT accumulation replacing proportional split (L1879-1893). CR-116: overrides.custGST/custGSTName in print payload (L2067-2068). **BUG-271 FIX-COMPLETE (2026-07-30): L1879-1910 — added lineTotal + food_details.tax fallback to manual print path (backend returns gst_tax_amount=null, fallback computes lineTotal×taxPct/100). Mirrors Collect Bill path L1821-1830.** | BUG-270+271+CR-116 IMPL agent / BUG-271 FIX-COMPLETE agent |
| `api/transforms/reportTransform.js` | BUG-272: Parse partial_payments → cashAmount/cardAmount/upiAmount (L842-848, L1100-1108). | BUG-272 IMPL agent |
| `api/transforms/inventoryTransform.js` | BUG-275: fromAPI `|| 1` → conditional (L18, L62). toAPI isAutoUnit guard (L131-132, L151-152). | BUG-275 IMPL agent |
| `components/inventory/InventorySetupPanel.jsx` | BUG-275: AUTO_CONV_UNITS/NO_CONV_UNITS constants (L17-18). ADD form conditional conv/small (L314-339). EDIT form conditional conv/small (L370-404). | BUG-275 IMPL agent |
| `components/order-entry/CollectPaymentPanel.jsx` | CR-116: custGST/custGSTName state (L378-379). Settle overrides (L1099-1100). Print overrides (L1166-1167). B2B input UI (L3045-3061). | CR-116 IMPL agent |
| `components/reports/OrderTable.jsx` | BUG-272: Stacked partial payment badges in paymentMethod case (L546-585). Cash=emerald, Card=blue, UPI=violet. | BUG-272 IMPL agent |
| `components/reports/OrderDetailSheet.jsx` | BUG-272: Partial leg badges below "Mode of Payment: PARTIAL" (L692-699). | BUG-272 IMPL agent |
| `pages/AllOrdersReportPage.jsx` | BUG-272: Payment filter includes partial orders with matching legs (L411-425). Cash filter shows partial-with-cash-leg. | BUG-272 IMPL agent |
| `components/inventory/IngredientBulkEditor.jsx` | BUG-274: dirtyCount includes pending deletes (L89), handleSave checks toDelete (L148-149), toDelete moved before early return (L148). BUG-276: AlertDialog replaces window.confirm (L60, L140-146, L472-488), fragment wrapper (L284). | BUG-274+276 IMPL agent |
| `components/expense/ExpenseBulkEditor.jsx` | BUG-276: Category move keeps item in place with "→ Category" badge (L286-300, L803-808). Auto-refresh skipped after move (L322). | BUG-276 IMPL agent |
| `components/inventory/IngredientBulkEditor.jsx` | BUG-277: prevItemIds useRef + stable ID guard in useEffect (L62, L66-72). BUG-278: saveInProgress useRef + re-entry guard in handleSave (L63, L155, L212). BUG-279: sticky thead (L346). | BUG-277+278+279 IMPL agent |

### BUG-292 (2026-08-02) — Aggregator TableCard Amount Hide
| File | Change | Agent |
|------|--------|-------|
| `components/cards/TableCard.jsx` | BUG-292: `table.amount` pill wrapped in `(!isAggregator && ...)` guard (L365) — prevents flex-shrink-0 amount from truncating aggrId in header pill | BUG FIX agent |

### Batch A — BUG-282/283/284/285 + CR-120 (2026-07-31)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/aggregatorTransform.js` | BUG-283: Strip "Order Instructions :::" prefix from Zomato order notes (L23) | Batch A IMPL agent |
| `components/dashboard/AggregatorOrderPopOut.jsx` | BUG-284: formatAddress dedup + sub_locality + landmark (L27-34). BUG-282: addon/variation render block (L299-321). | Batch A IMPL agent |
| `components/cards/OrderCard.jsx` | CR-120: KOT condition narrowed fOS=1 only (L1013). BUG-285: button→span label (L1071-1079). CR-120: Bill condition narrowed fOS=2 only (L1082). | Batch A IMPL agent |
| `components/cards/TableCard.jsx` | BUG-285+CR-120: fOS=2 block rewrite — KOT→Bill, button→label (L490-517). SOURCE_COLORS import added (L5). | Batch A IMPL agent |

### BUG-286 + BUG-287 (2026-07-31)
| File | Change | Agent |
|------|--------|-------|
| `components/cards/OrderCard.jsx` | BUG-286: KOT L1013 `(isAggregator || canPrintBill)` bypasses permission gate. Bill L1082 removed `canPrintBill` for aggregator. | BUG-286 IMPL agent |
| `api/transforms/aggregatorTransform.js` | BUG-287: Added placeholder filter — "This is order level instructions" → null (L25). | BUG-287 IMPL agent |

### BUG-289 (2026-07-31) — Fast Lane
| File | Change | Agent |
|------|--------|-------|
| `pages/RestaurantSettingsPage.jsx` | BUG-289: Line 510 — Replaced "Default Order Status" options (labels + removed value 3) + updated hint to "Order flow configuration". Fast Lane. | BUG-289 IMPL agent |

### CR-118 (2026-07-31) — Aggregator KOT & Bill Manual Print
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/aggregatorTransform.js` | CR-118: `aggrId` field (line 33) + `customer` display label (line 77) | CR-118 IMPL agent |
| `api/transforms/profileTransform.js` | CR-118: `aggregatorAutoBill` + `aggregatorAutoBillStage` mapped (line 335) | CR-118 IMPL agent |
| `api/constants.js` | CR-118: `MANUALLY_PRINT` endpoint added to `AGGREGATOR_ENDPOINTS` | CR-118 IMPL agent |
| `api/services/aggregatorService.js` | CR-118: `manuallyPrintAggregator()` function added | CR-118 IMPL agent |
| `components/dashboard/AggregatorOrderPopOut.jsx` | CR-118: import, `printKot`/`printBill` state, sync useEffect, `handleAccept` print calls, KOT/Bill checkbox UI | CR-118 IMPL agent |
| `components/cards/OrderCard.jsx` | CR-118: import, `handleAggregatorPrint()`, KOT routing, Bill button (fOS 1+2), "Ready to Dispatch" label, ID chip fix | CR-118 IMPL agent |
| `components/cards/TableCard.jsx` | CR-118: import, `handleAggregatorPrint()`, KOT+Ready (fOS=1), Bill+Ready to Dispatch (fOS=2) | CR-118 IMPL agent |

### BUG-288 (2026-07-31)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/menuManagementTransform.js` | BUG-288: `stationPrinterList` — add `data.printers` key + `s.area_name` field + null guard. Curl confirmed API returns `{ printers: [{id, area_name}] }`. Lines 192-203. | BUG-288 IMPL agent |

### CR-122 (2026-07-31)
| File | Change | Agent |
|------|--------|-------|
| `components/inventory/InventoryTabBar.jsx` | CR-122: label 'Smart Purchase' → 'Stock Update' (line 11) | CR-122 IMPL agent |
| `components/layout/Sidebar.jsx` | CR-122: label "Smart Purchase" → "Stock Update" (line 128) | CR-122 IMPL agent |
| `pages/SmartPurchasePage.jsx` | CR-122: heading + description renamed (lines 24-26) | CR-122 IMPL agent |
| `components/inventory/SmartPurchasePanel.jsx` | CR-122: 6 edits — error/loading/notes strings renamed, toolbar button removed, GroupedVendorPreview moved above AutoShoppingList, submit button renamed to "Update Stock" | CR-122 IMPL agent |


### CR-123 (2026-07-31)
| File | Change | Agent |
|------|--------|-------|
| `components/inventory/SmartPurchasePanel.jsx` | CR-123: Edit 1 — `pb-20` on panel container (L217). Edit 2 — Replace static submit div with `fixed bottom-6 right-6 z-50` floating button gated on `activeRows.length > 0` (L288-297). `shadow-lg` added. Code markers at L217, L288. | CR-123 IMPL agent |
### 2026-08-06 BUG-300 — CRM Token Storage Fix

| File | Change | Agent |
|------|--------|-------|
| `api/transforms/orderTransform.js` | CR-130: E1 L4 — added `selectAgentsForBill` to import. E2 L1013-1016 — placeOrder: `printerAgentForKot` + `printerAgentForPlace = [...kot, ...selectAgentsForBill(printerAgents)]`. E3 L1277-1280 — placeOrderWithPayment: identical pattern. Cancel/update paths untouched. | CR-130 IMPL agent 2026-08-06 |

---

### 2026-08-06 BUG-300 — CRM Token Storage Fix

| File | Change | Agent |
|------|--------|-------|
| `api/crmAxios.js` | BUG-300: L16-17 — read `crm_token` from `localStorage` instead of `sessionStorage`. Comment updated. | BUG-300 BUG FIX agent |
| `api/services/authService.js` | BUG-300: L23-27 — write `crm_token` to `localStorage` on login. L58-60 — `localStorage.removeItem('crm_token')` added to logout(). | BUG-300 BUG FIX agent |
| `api/axios.js` | BUG-300: L47-48 — clear `crm_token` from `localStorage` (was sessionStorage) on POS 401. | BUG-300 BUG FIX agent |

| `api/crmAxios.js` | BUG-300 T2: L8 `import api from './axios'`. L20 `_crmTokenRefreshing` flag. L84 `async (error)` + 401 branch → GET /restaurant-crm-token → setCrmToken → retry. | BUG-300 T2 IMPL agent 2026-08-06 |

---

### 2026-07-31 BUG-291 — Aggregator Rider Details Fix

| File | Change | Agent |
|------|--------|-------|
| `api/transforms/aggregatorTransform.js` | BUG-291: Added `rider:` key (L86), `riderStatus:` derivation (L91-93), removed orphaned `riderInfo:` block (L87-94 deleted). Gate 4 GO: owner 2026-07-31. | BUG-291 IMPL agent |

---

### 2026-08-07 CR-133 — Printer Agent Config Full Settings Screen

| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | CR-133: +`PRINTER_AGENT_CONFIG` endpoint key (after RESTAURANT_SETTINGS_UPDATE, additive) | CR-133 IMPL agent 2026-08-07 |
| `api/transforms/printerAgentConfigTransform.js` | NEW — merge-onto-raw fromAPI/toAPI, normalizePrinter/denormalizePrinter, newPrinter, findReinjectedPrinters (QA fix). // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `api/services/printerAgentConfigService.js` | NEW — getConfig/saveConfig against PRINTER_AGENT_CONFIG. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `api/transforms/__tests__/printerAgentConfigTransform.test.js` | NEW — 20 tests: V2-V7 verification matrix + reinjection helper. Fixture: `__tests__/fixtures/cr133_printer_agent_config.json` (live GET evidence copy) | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` | NEW — container: fetch/save/4 tabs/dirty/sticky save + post-save delete-drift reconciliation. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/printerConfig/PrintersTab.jsx` | NEW — defaults strip, printer cards, 3-step wizard, validation (IPv4/MAC/required), delete confirm w/ bill-printer warning, OD-8 coming-soon affordances. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/printerConfig/AutoPrintTab.jsx` | NEW — copies steppers, in-house + aggregator toggles (incl auto_settle), stage select. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/printerConfig/BillContentTab.jsx` | NEW — read-only restaurant banner, footer, QR toggles (incl upi_dynamic), display + Windows PDF options, field-visibility coming-soon. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | NEW — global typography/margins/logo/QR sizes + bill/KOT per-section per-row 58mm/80mm/bold editors, alignment coming-soon. // CR-133 | CR-133 IMPL agent 2026-08-07 |
| `components/panels/settings/ListFormViews.jsx` | CR-133: L183-258 PrintersView stub REPLACED by thin re-export of PrinterAgentConfigView; BoolBadge import moved into printerConfig/. SettingsPanel.jsx untouched. | CR-133 IMPL agent 2026-08-07 |
| `components/inventory/smart/GroupedVendorPreview.jsx` | CR-100: FULL REWRITE — Paid/Partial/Unpaid type tabs, split rows (method+amount+refId), add/remove row, live sum indicator, unpaid credit notice. 62→~145 lines. // CR-100 | CR-100 IMPL agent 2026-08-08 |
| `components/inventory/SmartPurchasePanel.jsx` | CR-100: validate() — replaced missingPm string check with split-sum/type validation loop. handleSubmit() — paymentMethod+notes → paymentType+splits. // CR-100 | CR-100 IMPL agent 2026-08-08 |

| `components/inventory/IngredientBulkEditor.jsx` | BUG-311 L3: dup skip+badge in handleSave() for new rows (L192). BUG-310: numCls Option A — border-slate-100 bg-slate-50/50 (L296). BUG-309: minUnitAlert input→read-only span (L442). | BUG-309/310/311 IMPL 2026-08-13 |
| `components/inventory/InventorySetupPanel.jsx` | BUG-314: Promise.allSettled in fetchData() (L42). BUG-311 L2: isDuplicate guard in addIngredient() (L146). BUG-311 L1: IngredientNameCombobox typeahead (L23, position:fixed dropdown) + isExactDuplicate useMemo + Save disabled guard. | BUG-311 Layer 1 IMPL 2026-08-14 |
| `components/inventory/InventorySetupPanel.jsx` | BUG-311 Layer 1B: edit form combobox wired (L412, excludeId={editingId}) + isEditDuplicate useMemo (L96) + Edit Save disabled (L470). Local IngredientNameCombobox removed → shared import. | BUG-311 L1B/L4 IMPL 2026-08-15 |
| `components/inventory/IngredientBulkEditor.jsx` | BUG-311 Layer 4: import IngredientNameCombobox (L13) + replace native name input with shared combobox (L406, excludeId=row._isNew?null:row._id). | BUG-311 L1B/L4 IMPL 2026-08-15 |
| `components/inventory/IngredientNameCombobox.jsx` | **NEW FILE** — BUG-311 Layer 1B/L4: shared typeahead warning combobox. Extracted from InventorySetupPanel + added excludeId prop for self-exclusion in edit/rename contexts. | BUG-311 L1B/L4 IMPL 2026-08-15 |
| `components/inventory/IngredientBulkEditor.jsx` | BUG-311 Layer 5: `hasDuplicateInDirty` useMemo (L103) + both Save buttons disabled (L346, L519). BUG-311 L5b: handleSave EDITED-row defence-in-depth guard (L220). | BUG-311 L5/L5b IMPL 2026-08-15 |
| `components/inventory/RecipeFormPanel.jsx` | BUG-322: SearchableSelect (L12-103) — position:fixed + getBoundingClientRect on triggerRef + dropRef for outside-click. Fixes ingredient row dropdown clipped by overflow-hidden table container (L305). All 3 recipe types fixed (sub/standard/addon). | BUG-322 IMPL 2026-08-14 |
| `components/inventory/smart/AutoShoppingList.jsx` | BUG-236: E1 removed overflow-hidden from Section 1 card (L130). E2 z-10→z-50 on "no match" div (L42). E3 z-10→z-50 on adhoc-typeahead-dropdown (L47). Fixes ad-hoc typeahead dropdown clipped on Smart Purchase. | BUG-236 IMPL 2026-08-14 |
| `components/inventory/SubRecipeStockPanel.jsx` | BUG-320-A: removed physicalQty from addSubRecipeStock call (L94). | BUG-320 IMPL 2026-08-13 |

| `components/inventory/SubRecipeStockPanel.jsx` | BUG-SRSTOCK/BUG-321: full rewrite — Produce/Recount mode toggle, correct payload per mode, drift+wastage UI in Recount | BUG-321 IMPL 2026-08-14 |
| `components/inventory/StockAuditPanel.jsx` | BUG-SRSTOCK/BUG-321: sub-recipe branch quantity:0 + physicalQty:shelf (recount-only, no production credit) | BUG-321 IMPL 2026-08-14 |
| `api/transforms/inventoryTransform.js` | BUG-SRSTOCK/BUG-321: addSubRecipeStock mode-aware payload — hasRecount guard, conditional physical_qty | BUG-321 IMPL 2026-08-14 |

| `api/transforms/inventoryTransform.js` | BUG-320-B: removed physical_qty from toAPI.addSubRecipeStock() (L227). | BUG-320 IMPL 2026-08-13 |

| `api/transforms/inventoryTransform.js` | CR-100: addPurchase() — payment_type now enum (data.paymentType), +partial_payments[] (splits.map→payment_mode/amount/transaction_id), notes dropped, data.paymentMethod→data.paymentType. // CR-100 | CR-100 IMPL agent 2026-08-08 |

| `api/constants.js` | CR-135: +AGGREGATOR_CONFIG_ENDPOINTS (4 URLs) | CR-135 IMPL agent 2026-08-10 |
| `api/services/aggregatorConfigService.js` | NEW — 7 functions: getBrands, getConfig, saveConfig, createBrand, pushStore, storeToggle, updateOperationalSettings | CR-135 IMPL agent 2026-08-10 |
| `api/transforms/aggregatorConfigTransform.js` | NEW — fromAPI.config/brands/newBrand + toAPI.config | CR-135 IMPL agent 2026-08-10 |
| `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | NEW — container: brand state, tabs, dirty, loading | CR-135 IMPL agent 2026-08-10 |
| `components/settings/aggregatorSetup/ConfigTab.jsx` | NEW — 3-state brand UI, view/edit cards, platform status | CR-135 IMPL agent 2026-08-10 |
| `components/settings/aggregatorSetup/OperationalTab.jsx` | NEW — 8 operational flags + bonus brackets editor | CR-135 IMPL agent 2026-08-10 |
| `pages/AggregatorSetupPage.jsx` | NEW — route wrapper | CR-135 IMPL agent 2026-08-10 |
| `components/layout/Sidebar.jsx` | CR-135: +Link2 import, +aggregator section, +VISIBLE_SECTIONS | CR-135 IMPL agent 2026-08-10 |
| `App.js` | CR-135: +AggregatorSetupPage import + /aggregator/setup protected route | CR-135 IMPL agent 2026-08-10 |

| `components/panels/settings/shared.jsx` | CR-133-GAP: NumberInput allow-empty onChange + blur clamp (G1) | CR-133-GAP IMPL 2026-08-11 |

| `components/panels/settings/shared.jsx` | BUG-315: NumberInput → stateful localVal+useEffect; import useState+useEffect | BUG-315 IMPL 2026-08-13 |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | BUG-315: StyleInput → stateful localVal+useEffect; import useState+useEffect. BUG-317: android subtitle "Min:1" + max={maxScale} removed from 3 fields | BUG-315/317 IMPL 2026-08-13 |
| `api/transforms/printerAgentConfigTransform.js` | BUG-316: FALLBACK_FONTS constant + conditional fonts line. BUG-318: FALLBACK_AGGREGATOR_STAGES constant + conditional aggregatorStages line | BUG-316/318 IMPL 2026-08-13 |
| `components/panels/settings/printerConfig/AutoPrintTab.jsx` | BUG-318: full rewrite — removed banner+useNavigate; added Aggregator Orders section (2 toggles + conditional SelectInput for stage) | BUG-318 IMPL 2026-08-13 |

| `api/transforms/printerAgentConfigTransform.js` | CR-133-GAP: normalizeStyle/applyStyle windows+android+flat, fromAPI employeeId+global_settings, toAPI global_settings+employee_id (G3b,G5+G6) | CR-133-GAP IMPL 2026-08-11 |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | CR-133-GAP: RowEditor platform-aware, Windows/Android toggle, global settings split, allow-empty inputs (G4,G5+G6) | CR-133-GAP IMPL 2026-08-11 |
| `api/services/printerAgentConfigService.js` | CR-133-GAP: +getEmployeeList() using EMPLOYEES_LIST (G3b) | CR-133-GAP IMPL 2026-08-11 |
| `components/panels/settings/printerConfig/BillContentTab.jsx` | CR-133-GAP: +employee dropdown with useEffect fetch + pre-select (G3b) | CR-133-GAP IMPL 2026-08-11 |
| `pages/RestaurantSettingsPage.jsx` | CR-132: Full 8-step wizard rewrite (was 6 steps). New screens: Printer Settings, Tax & Charges expanded, Room & Hospitality conditional. | CR-132 IMPL 2026-08-11 |
| `api/transforms/restaurantSettingsTransform.js` | CR-132: Full 8-step rewrite. Regression fix (room: basic not advanced). 49 new fields. 8 step keys. CR-135 pass-throughs. | CR-132 IMPL 2026-08-11 |
| `api/transforms/restaurantSettingsTransform.js` | CR-132 BUG-FIX: line 260 `schedule_order` changed from `toYesNo()` (string) to `? 1 : 0` (integer) — MySQL INT column type mismatch fix. | CR-132 BUG FIX 2026-08-11 |
| `api/constants.js` | CR-136: +TOP_FOOD_SALES_REPORT endpoint constant (L118) | CR-136 IMPL agent 2026-08-12 |
| `api/services/topFoodSalesService.js` | CR-136: NEW FILE — parseTopFoodSalesRow + getTopFoodSalesForRange. parseFloat all 14 fields. payload {from,to} not {from_date,to_date}. No businessDay. | CR-136 IMPL agent 2026-08-12 |
| `pages/reports-module/ItemSalesLedgerMockup.jsx` | CR-136: NEW FILE — 4-tab item sales report. Column chooser. Accordion for Category+Station. Export uses visibleColList. | CR-136 IMPL agent 2026-08-12 |
| `App.js` | CR-136: +import ItemSalesLedgerMockup (L51) + routes item-sales + item-sales/preview (L139-140) | CR-136 IMPL agent 2026-08-12 |
| `components/layout/Sidebar.jsx` | CR-136: +insights-item-sales nav entry under Sales Ledger group (L152) | CR-136 IMPL agent 2026-08-12 |


### CR-137 — Optional discount_for Field (2026-08-12)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderTransform.js` | CR-137: E1 `discount_for: null` in placeOrder (L1066). E2 `discount_for: null` in updateOrder (L1190). E3 `discount_for: discounts.discountFor \|\| null` in placeOrderWithPayment (L1369). E4 `discount_for: discounts.discountFor \|\| null` in collectBillExisting (L1645). | CR-137 IMPL agent 2026-08-12 |
| `components/order-entry/CollectPaymentPanel.jsx` | CR-137: E5a `discountFor` useState (L306). E5b `discountFor` in discounts object (L1115). E5c `setDiscountFor('')` in None-clear handler (L1310). E5d1 reason input in main drawer (L1373). E5d2 reason input in inline Room Service path (L2006). | CR-137 IMPL agent 2026-08-12 |
| `components/order-entry/CartPanel.jsx` | CR-137: E6 `discountFor: null` pass-through in QSR handleCollectBill (L513). | CR-137 IMPL agent 2026-08-12 |
| `api/services/orderLedgerService.js` | CR-137: E7 `o.discount_for \|\|` fallback replacing hardcoded 'Customer' (L85). | CR-137 IMPL agent 2026-08-12 |

### CR-142 + CR-144 + CR-143 + CR-145 — Addon & Aggregator Module (2026-08-15)
| File | Change | CR/BUG |
|------|--------|--------|
| `api/transforms/menuManagementTransform.js` | `addonList()` expanded to 9 fields (status/weight/veg/hasInventory/recipeId/hasRecipe/isPushedManaged) | CR-142/CR-144 |
| `api/services/menuManagementService.js` | `addAddon()` V2 payload, `updateAddon()` POST→PUT, `+toggleAddonStatus()` | CR-142/CR-144 |
| `components/panels/menu/ProductForm.jsx` | Addon row veg dot + inactive opacity + quick-create veg select + addAddon caller updated | CR-142 |
| `components/panels/MenuManagementPanel.jsx` | +addonPanelMode state, +Settings import, +Add-ons button, +AddonManagementPanel branch, +useRestaurant, +addons prop to BulkEditor | CR-144, CR-145 |
| `components/panels/menu/AddonManagementPanel.jsx` | NEW — full CRUD panel (list+inline edit+status+delete+confirm) | CR-144 |
| `api/constants.js` | +7 AGGREGATOR_SYNC_ENDPOINTS (force-swiggy/bulk-addons/apply/toggle-addon/variations/toggle-variation) | CR-143 |
| `api/services/aggregatorConfigService.js` | +7 functions (forceSwiggyEnable/getBulkAddons/getBulkAddonItems/applyBulkAddon/toggleAddonStock/getVariations/toggleVariation) | CR-143 |
| `components/settings/aggregatorSetup/SyncCatalogTab.jsx` | +forceSwiggyEnable import, run() extended for dynamic msg, +Force Enable Swiggy card | CR-143 |
| `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | +AddonStockTab/VariationStockTab imports+tab buttons+tab renders | CR-143 |
| `components/settings/aggregatorSetup/AddonStockTab.jsx` | NEW — Addon Stock tab with catalog/UP toggles + OOS confirm + item expand | CR-143 |
| `components/settings/aggregatorSetup/VariationStockTab.jsx` | NEW — Variation Stock tab with accordion food list + per-value/group toggles | CR-143 |
| `components/panels/menu/BulkEditor.jsx` | +productImage/addons/variations columns, +addonIds/variations/productImage in buildRow, +addons prop, +currencySymbol, +expand state, +isDirty addon cases, +addon_ids in buildPayload, +CellRenderer image/chip types, +sub-row render, +expand panel imports | CR-145 |
| `components/panels/menu/AddonExpandPanel.jsx` | NEW — checkbox addon list with food image header | CR-145 |
| `components/panels/menu/VariationExpandPanel.jsx` | NEW — read-only variation summary with food image header | CR-145 |

### BUG-323 + BUG-324 — BulkEditor dirty-state fixes (2026-08-15)
| File | Change | CR/BUG |
|------|--------|--------|
| `components/panels/menu/BulkEditor.jsx` | L324: `categoryId` isDirty — `Number(o.categoryId ?? 0)` null-safe coercion. L372: `isRowDirty` useCallback — added `menuType` to deps array. | BUG-323, BUG-324 |
| `components/panels/menu/BulkEditor.jsx` | GAP-BULK-DEFAULTS fix: CellRenderer `image`/`addon_expand`/`var_expand` handlers moved to top-level (L1189-L1229). Were nested inside `dropdown` if-block (L1131), making them structurally unreachable. Cells now render chips/thumbnails correctly. | GAP-BULK-DEFAULTS 2026-08-15 |

### BUG-325 + BUG-326 + CR-146 (2026-08-17)
| File | Change | Agent |
|---|---|---|
| `components/settings/aggregatorSetup/VariationStockTab.jsx` | BUG-325: +`val.available` badge (Active/Inactive, green/red) | IMPL 2026-08-17 |
| `api/transforms/menuManagementTransform.js` | BUG-326: `fromAPI` reads `is_packaged_good??packed_food` + adds `swiggyPackingChrg`; `toAPI` Aggregator spread +`is_packaged_good`+`swiggy_packing_chrg` | IMPL 2026-08-17 |
| `components/panels/menu/BulkEditor.jsx` | BUG-326: AGGR_COLUMNS +`swiggyPackingChrg` col; buildRow +field; buildPayload +2 aggregator keys; isDirty +check | IMPL 2026-08-17 |
| `components/panels/menu/ProductForm.jsx` | BUG-326: state init (edit+new) +`swiggyPackingChrg`; Platform Sync +ToggleField | IMPL 2026-08-17 |
| `components/panels/menu/ProductCard.jsx` | BUG-326: state init +`swiggyPackingChrg`; quick-edit +conditional Swiggy Pack Chrg select | IMPL 2026-08-17 |
| `components/panels/MenuManagementPanel.jsx` | CR-146: +`selectedClientId` state, +reset useEffect, +`filteredFoods` useMemo, `categoriesWithCounts`→filteredFoods, +client dropdown JSX, ProductList+BulkEditor→filteredFoods | IMPL 2026-08-17 |

### BUG-327 (2026-08-17)
| File | Change | Agent |
|---|---|---|
| `api/transforms/menuManagementTransform.js` | BUG-327: +`swiggyImage: api.swiggy_image \|\| null` in `fromAPI.food()` | IMPL 2026-08-17 |
| `api/services/menuManagementService.js` | BUG-327: +`addFoodAggregatorMultipart()` (flat multipart, SKIP variations/addon_ids) +`editFoodAggregator()` (flat multipart, no food_info wrapper) | IMPL 2026-08-17 |
| `components/panels/menu/ProductForm.jsx` | BUG-327: state +swiggyImageFile/swiggyImagePreview; Swiggy image upload UI (aggregator guard); save path → new services | IMPL 2026-08-17 |
| `components/panels/menu/ProductList.jsx` | BUG-327: `handleQuickSave` aggregator branch → `editFoodAggregator(id, foodInfo, null, null)` | IMPL 2026-08-17 |
| `components/panels/menu/BulkEditor.jsx` | BUG-327: `processOne` aggregator new → `addFoodAggregatorMultipart`; edit → `editFoodAggregator` | IMPL 2026-08-17 |

### BATCH-01 — BUG-336 + BUG-337 + BUG-338 (2026-08-18)
| File | Change | Agent |
|---|---|---|
| `src/pages/RestaurantSettingsPage.jsx` | BUG-337: +`import { useRestaurant }` (line 5). +`import { getProfile }` (line 13). +`const { setRestaurant } = useRestaurant()` (line 215). handleNext last-step branch: await getProfile() + setRestaurant(fresh.restaurant) in try/catch before navigate (lines 285–292). | BATCH-01 IMPL agent 2026-08-18 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | BUG-336: +`const taxType` + GST gate `taxType === 'GST' && gstStatus === false → return` inside taxTotals forEach (lines 254–256). BUG-338: +room GST gate `taxType === 'GST' && isRoom && roomGstApplicable === false → return` (lines 257–258). Deps updated: `[billableItems]` → `[billableItems, restaurant, isRoom]` (line 286). | BATCH-01 IMPL agent 2026-08-18 |

### BATCH-02 — BUG-339/329/331/330/332 (2026-08-19)
| File | Change | Agent |
|---|---|---|
| `src/pages/RestaurantSettingsPage.jsx` | BUG-339: +`food_court` option to restaurant type select (line 386) | BATCH-02 IMPL 2026-08-19 |
| `src/pages/reports-module/DiscountReportMockup.jsx` | BUG-329: +`ordersTable` in analytics (line 71-72); +Discount Orders table section (after line 133) | BATCH-02 IMPL 2026-08-19 |
| `src/api/transforms/profileTransform.js` | BUG-331: +`scheduleOrderEnabled: toBoolean(api.schedule_order)` in features block (line 134) | BATCH-02 IMPL 2026-08-19 |
| `src/api/transforms/profileTransform.js` | CR-148 BUG FIX 2026-08-22: +`showPopularCategory` mapping (line 391) — was missing from boot transform causing Popular tab to never appear | BUG FIX agent 2026-08-22 |
| `src/components/order-entry/CartPanel.jsx` | BUG-331: +`import { useRestaurant }` (line 7); +`const { features } = useRestaurant()` (line 804); +`features?.scheduleOrderEnabled !== false &&` in wrapper (line 1280) | BATCH-02 IMPL 2026-08-19 |
| `src/components/order-entry/OrderEntry.jsx` | BUG-330: `isItemCancelAllowed` — added post-serve gate `item.status !== 'preparing' && allowPostServeCancel === false` + dep update (lines 322-328) | BATCH-02 IMPL 2026-08-19 |
| `src/pages/DashboardPage.jsx` | BUG-332: +`searchOptions` to `useRestaurant()` destructure (line 168); `opts` filter on 4 searchItems `all:[]` call sites (lines 1170, 1207, 1214, 1221, 1233); +`searchOptions` to searchResults deps (line 1239) | BATCH-02 IMPL 2026-08-19 |

| `src/utils/roundOffUtils.js` | NEW — CR-170: applyGrandTotalRoundOff helper (conditional < 10 paise floor, ≥ 10 paise ceil) | CR-170 2026-08-20 |
| `api/transforms/orderTransform.js` | CR-170: L10 import, L869 formula → applyGrandTotalRoundOff, L872 remove >0 clamp, L1630 remove Math.max(0,...) | CR-170 2026-08-20 |
| `components/order-entry/CollectPaymentPanel.jsx` | CR-170: L17 import, L679 formula → applyGrandTotalRoundOff | CR-170 2026-08-20 |
| `components/order-entry/CartPanel.jsx` | CR-170: L8 import, L450 formula → applyGrandTotalRoundOff | CR-170 2026-08-20 |
| `api/transforms/orderTransform.js` | BUG-170: +variationPerUnit (L1963-1966) in MANUAL PRINT PATH forEach — fixes wrong GST on manual bill reprint when variation upcharge present | BUG-170 2026-08-20 |
| `components/order-entry/CollectPaymentPanel.jsx` | BUG-209: +formatQty helper (L152-160), L1935/L2320/L2890/L2928/L2966 x{item.qty} → formatQty(item) — weight-item unit label fix | BUG-209 2026-08-20 |
| `components/panels/menu/BulkEditor.jsx` | CR-158: +ShieldCheck import (L5), +validateIssueCount state (L244-245), +handleValidate fn (L521-544), +setValidateIssueCount(null) in updateCell (L448), +Validate Tax button in toolbar (L873-892) | CR-158 2026-08-20 |

### CR-166 — Multi-Restaurant Login (2026-08-21)
| File | Change | Agent |
|---|---|---|
| `src/api/constants.js` | CR-166: +4 endpoints (COMMON_LOGIN/ASSIGNED_RESTAURANTS/LOGIN_AS_RESTAURANT/COMMON_LOGOUT) + COMMON_TOKEN storage key | CR-166 IMPL 2026-08-21 |
| `src/api/transforms/authTransform.js` | CR-166: +loginType field in loginResponse + new loginAsRestaurantResponse transform (maps restaurant_token→token) | CR-166 IMPL 2026-08-21 |
| `src/api/services/authService.js` | CR-166: login() branches on loginType (admin→COMMON_TOKEN, employee→AUTH_TOKEN); logout() adds COMMON_TOKEN cleanup + COMMON_LOGOUT call; +getCommonToken/clearCommonToken helpers | CR-166 IMPL 2026-08-21 |
| `src/api/services/commonAuthService.js` | **NEW** CR-166: getAssignedRestaurants, loginAsRestaurant (sets AUTH_TOKEN+CRM), commonLogout | CR-166 IMPL 2026-08-21 |
| `src/pages/LoginPage.jsx` | CR-166: capture authData from login(); navigate branches on loginType ('admin'→/restaurant-picker, else→/loading) | CR-166 IMPL 2026-08-21 |
| `src/pages/RestaurantPickerPage.jsx` | **NEW** CR-166: Card grid picker — COMMON_TOKEN guard, getAssignedRestaurants, loginAsRestaurant, initials fallback for logo (CDN URL D3 open), search filter, logout | CR-166 IMPL 2026-08-21 |
| `src/App.js` | CR-166: +RestaurantPickerPage import + /restaurant-picker route (no ProtectedRoute) | CR-166 IMPL 2026-08-21 |
| `src/contexts/AuthContext.jsx` | CR-166: +clearCommonToken() call in logout (belt-and-suspenders) | CR-166 IMPL 2026-08-21 |
| `src/components/layout/Sidebar.jsx` | CR-166: +ArrowLeftRight import, +getCommonToken import, +Switch Restaurant button (gated on getCommonToken()) between Profile and Logout | CR-166 IMPL 2026-08-21 |

### CR-159 + CR-155 — BATCH-08 Menu Management (2026-08-21)
| `api/services/menuManagementService.js` | CR-159: +`deleteFoodBulk()` function | CR-159 IMPL 2026-08-21 |
| `components/panels/menu/BulkEditor.jsx` | CR-159: +selectedIds/bulkDeleteOpen/bulkDeleteReason/bulkDeleting state, +showBulkDelete guard, +handleBulkDeleteConfirm, +checkbox th/td, +selection banner, +confirm dialog, +deleteReasons prop | CR-159 IMPL 2026-08-21 |
| `components/panels/MenuManagementPanel.jsx` | CR-159: +deleteReasons prop to BulkEditor. CR-155: +AddonStockTab/VariationStockTab imports, +stockMode state, +Aggregator Stock button, +stockMode render block, +menuType useEffect reset | CR-159+CR-155 IMPL 2026-08-21 |
| `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | CR-155: removed AddonStockTab+VariationStockTab imports, tab buttons, conditional renders | CR-155 IMPL 2026-08-21 |

### CR-358-P2 — PMS Phase 2: New Booking (S3) + Check-In (S4) (2026-09-03)
| File | Change | Agent |
|---|---|---|
| `src/api/transforms/aiosellTransform.js` | CR-358-P2: +fromDirectReservation (lines 107-118), +fromPendingArrival (lines 122-158), +2 entries in fromAPI public object | CR-358-P2 IMPL 2026-09-03 |
| `src/api/services/pmsService.js` | CR-358-P2: +getBookableRooms (L72-77), getPmsReservations replaces stub (L80-87), createDirectReservation replaces stub (L90-104), +pmsCheckIn (L108-148), +imports (aiosellService, axios, constants, aiosellTransform) | CR-358-P2 IMPL 2026-09-03 |
| `src/pages/pms/NewBookingPage.jsx` | **NEW** CR-358-P2 S3: Guest details form, room pill picker (getBookableRooms), stay/amount, booking summary, Save as Booking (createDirectReservation 201→success card), Walk-in (navigate to /pms/check-in with state) | CR-358-P2 IMPL 2026-09-03 |
| `src/pages/pms/CheckInPage.jsx` | **NEW** CR-358-P2 S4: KPI strip, walk-in banner, arrivals list (getPmsReservations), right-panel form (room select, advance payment), Confirm Check-In (pmsCheckIn JSON), 3 entry paths (URL param, walk-in state, auto-select) | CR-358-P2 IMPL 2026-09-03 |
| `src/App.js` | CR-358-P2 SC-01: +NewBookingPage +CheckInPage imports, /pms/new-booking and /pms/check-in routes swapped from PmsPlaceholderPage to real pages | CR-358-P2 IMPL 2026-09-03 |

### BUG-379 — Stock Audit save 422: toAPI.addStock() missing unit + physical_qty (2026-09-03)
| File | Change | Agent |
|---|---|---|
| `api/transforms/inventoryTransform.js` | BUG-379: toAPI.addStock() rebuilt — +unit, +physicalqty_master, +physical_qty, +waste_reason, quantity defaults 0. Mirrors addSubRecipeStock pattern. L216-229. | BUG-379 IMPL 2026-09-03 |
| `components/inventory/StockAuditPanel.jsx` | BUG-379: Regular ingredient branch (L79-88) — quantity:0, +unit, +physicalQty, +reason fallback. Mirrors sub-recipe branch L69-73. | BUG-379 IMPL 2026-09-03 |
