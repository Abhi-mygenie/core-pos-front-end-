# QA Handover — CR-135 Aggregator Setup
**Date:** 2026-08-10
**Implementation agent:** CR-135 IMPL
**EXIT GATE:** 5/5 PASS

---

## 1. Verification Matrix Results (from plan V1–V29)

| # | Check | File | Self-Test Result |
|---|---|---|---|
| V1 | AGGREGATOR_CONFIG_ENDPOINTS exported | `constants.js` | ✅ grep confirms 1 hit |
| V2 | `fromAPI.config` reads `response.data` | transform | ✅ code verified |
| V3 | `_raw` stored in fromAPI | transform | ✅ `_raw: deepClone(d)` |
| V4 | `toAPI.config` spreads `_raw` | transform | ✅ `...(state._raw \|\| {})` |
| V5 | `swiggi_code` used (not swiggy) | transform | ✅ `d.swiggi_code` + `swiggi_code:` |
| V6 | `swiggy_status` used (not swiggi) | transform | ✅ `d.swiggy_status` + `swiggy_status:` |
| V7 | `saveConfig` POSTs flat JSON | service | ✅ `api.post(CONFIG, payload)` |
| V8 | `storeToggle` sends action+platforms+optional client_id | service | ✅ body construction verified |
| V9-D1 | `updateOperationalSettings` sparse `{basic:{8 fields}}` | service | ✅ no step1-6 in payload |
| V10-D2 | `fromAPI.newBrand` reads `response.suggested_store_id` | transform | ✅ top-level access |
| V11-D3 | `isNewConfig = (d.id === null \|\| d.id === undefined)` | transform | ✅ |
| V12-D3 | `storeId` prefilled from `suggested_store_id` when null | transform | ✅ `d.store_id \|\| response?.suggested_store_id` |
| V13-D4 | `Array.isArray(response.clients)` guard | transform | ✅ |
| V14 | `capitalize` fn: `'ready'→'Ready'` | service | ✅ `replace(/^\w/, c => c.toUpperCase())` |
| V15 | `prep_time_bonus_config` sent as raw array | service | ✅ `Array.isArray ? form.prepTimeBonusConfig : []` |
| V26 | Operational save → sparse FormData `{basic:{8}}` | service | ✅ FormData.append('data', JSON.stringify({basic:{…}})) |
| V28 | `/aggregator/setup` protected route | App.js | ✅ line 197 |
| V29 | Sidebar AGGREGATOR section + VISIBLE_SECTIONS | Sidebar | ✅ grep confirmed |

---

## 2. Test Cases for QA Agent (V16–V27 — browser verification needed)

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Sidebar renders AGGREGATOR | Login → view sidebar | "AGGREGATOR" orange label, "Aggregator Setup" link, "Food Mapping" SOON badge |
| T2 | Route loads | Click "Aggregator Setup" in sidebar | `/aggregator/setup` loads, no crash |
| T3 | Config tab loads | Open page | "Configuration" tab active, brand setup card visible |
| T4 | Operational tab loads | Click "Operational Settings" | Tab switches, banner shows, toggles visible |
| T5 | State A — no sub-brands | (mock no clients) | "Main Brand" static label, no dropdown |
| T6 | State B — sub-brands | (mock with clients) | Dropdown with Main Brand + sub-brands |
| T7 | State C — Add New Brand form | Click "+ Add New Brand" | Inline form shows: Brand Name*, Phone*, Email, Address |
| T8 | Add New Brand validation | Submit with no name | Toast: "Brand name and phone are required" |
| T9 | Credentials masked | View mode | Urban Key + Token shown as ••••••••••••  |
| T10 | Credentials edit toggle | Click "✎ Edit" on Credentials | Edit mode inline, password inputs, Save/Cancel |
| T11 | Location view/edit | Click "✎ Edit" on Location | City/Pincode inputs, Save Changes, Cancel |
| T12 | Platform Links view/edit | Click "✎ Edit" on Links | 4 inputs, swiggi_code hint visible |
| T13 | Platform Status toggle non-clickable | Click Zomato toggle | NO action — toggle is display only |
| T14 | Disable button → dialog | Click "Disable on Zomato" | Confirmation dialog appears |
| T15 | Dialog cancel | Click Cancel in dialog | Dialog closes, no API call |
| T16 | No webhooks section | Scroll Config tab | UrbanPiper Atlas Setup section NOT present |
| T17 | isNewConfig banner | New brand selected | Blue banner "No UrbanPiper configuration yet" |
| T18 | Auto-bill-stage hidden | Operational tab, Auto Bill OFF | Stage select NOT rendered |
| T19 | Auto-bill-stage shown | Toggle Auto Bill ON | Stage select appears below |
| T20 | Bonus brackets — add row | Click "+ Add Bracket" | New empty row added |
| T21 | Bonus brackets — delete row | Click ✕ on a bracket | Row removed |
| T22 | Save Configuration | Fill fields, click "Save Configuration" | POST /aggregator-config called (network tab) |
| T23 | Save Settings | Edit operational field, click "Save Settings" | POST /update-settings with sparse basic{} only |
| T24 | Context updates after operational save | Save Settings | useRestaurant().settings reflects new values without page reload |
| T25 | Push Store button | Click "Push Store to UrbanPiper" | POST /push-store called |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | AutoPrintTab no longer shows Aggregator Orders section | CR-133 amendment done 2026-08-10 |
| R2 | Settings wizard (/restaurant-settings) still saves all fields | restaurantSettingsTransform.js NOT touched |
| R3 | Existing aggregator order flow unaffected (OrderEntry, aggregatorService) | Those files NOT touched |
| R4 | Sidebar existing sections still render | Added to array, did not replace anything |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
CR-135: gate 5, status: IMPLEMENTED — AWAITING QA
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

- Preprod URL: https://preprod.mygenie.online
- Auth: Bearer token from login (restaurant 478 / 18march)
- Preview URL: as per `.env` `REACT_APP_API_BASE_URL`
- Test with restaurant that HAS sub-brands (client_id=107) to verify State B
- Test with main brand only to verify State A

---

## 6. Known test note

The GET /aggregator-config and POST calls require a valid Bearer token (Firebase auth). Test login first, then navigate to /aggregator/setup. API calls will fail in unauthenticated state — expected behaviour.
