# QA Handover — CR-132 Restaurant Settings Wizard (8-step rewrite)
**Date:** 2026-08-11
**Implementation agent:** CR-132 IMPL
**EXIT GATE:** 5/5 PASS
**Registry:** IMPLEMENTED — AWAITING QA

---

## 4. Registry Sync Confirmation
```
Registry synced: YES
CR-132: status: IMPLEMENTED — AWAITING QA, sprint_key: pos_5_1
EXIT GATE: ALL 5 PASSED
```

---

## 1. Files Changed + Self-Test Results

| File | Change | Self-test |
|---|---|---|
| `api/transforms/restaurantSettingsTransform.js` | Full 8-step rewrite. Regression fix `room: basic.room`. 49 fields. CR-135 pass-throughs. | ✅ All 8 step keys confirmed. room regression fix verified. |
| `pages/RestaurantSettingsPage.jsx` | Full 8-step wizard UI rewrite. Conditional Step 8 Room. Printer step 2. | ✅ Compile clean. All 8 STEPS verified. |

---

## 2. Test Cases

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| T1 | 8 steps in left rail (room OFF) | Load /restaurant-settings | 7 steps shown | `step-nav-1` through `step-nav-7` |
| T2 | Step 8 conditional | Turn Room ON in step3 | Step 8 appears in rail | `step-nav-8` |
| T3 | Step 1 — new fields | Navigate to step 1 | Restaurant Type select, Default Order Status select present | `select-restaurant-for`, `select-def-ord-status` |
| T4 | Step 1 — Show Popular Items | Step 1 Display section | Label reads "Show Popular Items" (not "Show Popular Category") | `toggle-show-popular-items` |
| T5 | Step 1 — phone absent | Step 1 | NO input-phone field on step 1 | input-phone absent |
| T6 | Step 2 — all 8 printer fields | Navigate to step 2 | Print KOT, Auto Print Bill, Print in KDS, Customer Copy, Bill Copies, KOT Copies, Token, KOT Language | `toggle-print-kot`, `select-no-of-bill` etc |
| T7 | Step 2 — info banner | Step 2 | Banner: "managed at Settings → Printers" | (text check) |
| T8 | Step 3 — 5 channels | Navigate to step 3 | Dine-In, Takeaway, Delivery, Room Service, Online Orders tiles | `channel-dineIn`, `channel-onlineOrder` |
| T9 | Step 3 — phone optional | Step 3 | Phone field present (optional, no asterisk) | `input-phone` |
| T10 | Step 4 — GST moved here | Navigate to step 4 | GST toggle present (was old Step 1) | `toggle-gst` |
| T11 | Step 4 — new charges | Step 4 | Takeaway Charges, Delivery Charge GST %, Service Charge Label | `input-service-chrg-taxt` |
| T12 | Step 5 — NO printer fields | Step 5 | Print KOT and Auto Print Bill NOT present | (absent) |
| T13 | Step 5 — new fields | Step 5 | Order Auto Serve, Schedule Orders, Confirm Order Tab, Confirm Order Tone, Location Selection | `toggle-order-auto-serve`, `select-confirm-order-tone` |
| T14 | Step 8 — Room fields | Enable room + navigate to step 8 | Room Billing Included, Room OTP, Pay Via Room, Guest Details, Booking Details, Billing Employee | `toggle-room-billing-included` etc |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Step 3 channels validation still works | Ensure "at least one channel" still required |
| R2 | GST validation on Step 4 (was Step 1) | gstCode required when gstEnabled |
| R3 | Navigation Back/Skip/Next buttons | Wizard flow not broken |

---

## 5. Credentials + Environment

- Preprod URL: https://preprod.mygenie.online
- Auth: `owner@cafe103.com` / `Qplazm@10`
- Navigate to: `/restaurant-settings`
- NOTE: `POST update-settings` returns 500 on preprod — UI navigation requires testing via React state dispatch
- Backend brief: `backend_briefs/BACKEND_BRIEF_CR132_UPDATE_SETTINGS_500_2026_08_11.md`
