# CR-132 — Restaurant Settings: Wire New Backend Fields to FE

**ID:** CR-132  
**Type:** CR  
**Priority:** P1 — HIGH  
**Risk:** MEDIUM (settings UI, some fields may affect order flow)  
**Status:** GATE 2 COMPLETE  
**Gate:** 2  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

The backend `settings-list` and `update-settings` API has been updated with new fields that are not yet wired in the FE `RestaurantSettingsPage.jsx` / `restaurantSettingsTransform.js`. The owner has provided the updated curl contracts.

### Settings API Curl Evidence
```
GET https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/settings-list
Auth: Bearer RLRmkWZBJm4xYGGUHDa8GnbXr2fL3nL40UT4rO0UTgdxi4wyYhnM5Xr6fLK8jhh3dL98QYkghmxIEuZD7QsHXGVmQeI6ORh7iD9ZL0mzYWdd7hDILmHIgCEd
```

### Known New/Missing Fields (from owner curl payload)
Fields present in the curl but NOT currently wired in `restaurantSettingsTransform.js`:
- `prepaid_auto_sattle` — in `basic` section (note: backend typo preserved per R9)
- `order_auto_serve` — in `advanced` section  
- Possibly others discovered after curl probe

Fields ALREADY wired (confirmed via code grep):
- `auto_service_charge`, `voice_in_kds`, `show_ac_non_menu`, `list_serve_item`, `cancle_post_serve`
- `send_feedback_link`, `feedback_url`, `restaurent_gst`
- `is_loyality`, `is_customer_wallet`, `aggregator_order_tone`

## Evidence
- Curl commands: provided verbatim by owner
- Auth token: provided (mask as `***` in code)
- Screenshot: not provided  
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner provided curl contract)

## Area
Restaurant Settings → `RestaurantSettingsPage.jsx`, `restaurantSettingsTransform.js`, `profileTransform.js`

## Code Reality Check
- `restaurantSettingsTransform.js` — many fields already wired (see above)
- `prepaid_auto_sattle`, `order_auto_serve` — NOT found in FE codebase
- **Code Reality: PARTIAL — majority of fields wired, new fields missing**

## Duplicate Check
- DISTINCT — no prior CR for these specific new fields
- RELATED: CR-019 (Restaurant Settings wizard), CR-020 (Settings bug sweep), CR-056 (scan popup toggle — IMPLEMENTED)

## Blast Radius
- `restaurantSettingsTransform.js` — fromAPI + toAPI for new fields
- `RestaurantSettingsPage.jsx` (or `ViewEditViews.jsx`) — UI toggles/inputs for new fields
- `profileTransform.js` — read-only profile path if applicable
- ~2-3 files, SMALL-MEDIUM blast radius
- Hotspot files: NO

## Severity Rubric
P1 — Settings features not configurable by owner (missing from FE)

## Risk Classification
- **Risk: MEDIUM**
- Trigger: Settings UI, some fields may touch order flow (`prepaid_auto_sattle`, `order_auto_serve`)
- Fast Lane eligible: NO (multiple files, some fields may affect order behavior)

## Owner Decisions — ALL RESOLVED (2026-08-08)

| OD | Question | Answer |
|---|---|---|
| OD-1 | Duplicate fields (in both basic + advanced) — which section to write to? | **basic{}** |
| OD-2 | Which Settings Step for each new field? | **Confirmed as suggested** — see Impact Analysis |
| OD-3 | Are auto-flow fields (prepaid_auto_sattle, order_auto_serve, ordersAutoPaid) CRITICAL risk? | **B — HIGH, not CRITICAL.** Normal gate process, no R6 regression. |
| OD-4 | Room fields (room_billing_included, room_otp_require, room_price) — settings or separate? | **Separate CR.** Out of CR-132 scope. |
| OD-5 | profileTransform fields (is_loyality, is_customer_wallet, aggregator_order_tone, use_token, room_gst_applicable) — add to settings form? | **Yes** — add as saveable toggles/selects |

## Curl Probe Results (2026-08-08)
- Endpoint: `GET /api/v2/vendoremployee/restaurant-settings/settings-list`
- New fields confirmed: **11 missing + 5 profileTransform = 16 total to add**
- Room fields deferred: `room_billing_included`, `room_otp_require`, `room_price` → new CR

## Next Step
Gate 2 Impact Analysis complete — see `/app/memory/impact/CR-132_IMPACT_ANALYSIS.md`
Awaiting Gate 3 GO.

---

## ✅ HOLD LIFTED — 2026-08-08 (revised)

**Backend confirmed field freeze. Full re-probe completed. Impact Analysis revised.**

Resumption checklist completed:
1. ✅ Re-probed `GET /api/v2/vendoremployee/restaurant-settings/settings-list` with fresh token
2. ✅ Diffed against old IA — 32 new fields found, 6 location corrections, 1 critical regression
3. ✅ Impact Analysis fully revised at `impact/CR-132_IMPACT_ANALYSIS.md`
4. ✅ OD-1..OD-5 reviewed — OD-4 overridden (room fields now in basic), rest still valid
5. ✅ 9 new ODs (OD-6..OD-14) — all have non-blocking suggested defaults

**Ready for Gate 3 — Implementation Plan.**
