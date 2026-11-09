# CR-385 · N7 / N8 / N9 backend delivery — independent verification (2026-09-20)

```
Backend reply:  evidence/CR-385/backend_replies/n7_n8_2026_09_20.md
Runner:         run_n7n8.py (this folder) · log run.log · every raw response s*_*.json
Account:        owner@thegoankitchen.com (RID 69, sandbox-pms) · room 8525 · plan executive-s-ep · stay 10→11 Oct, extend →12 Oct
Sandbox after:  bookings 175 / 176 departed (TAB), room 8525 → hk, settings restored to defaults (allow_early_checkin=false, extend_rate_mode=calendar, auto_print=false)
```

## Result table
| # | Backend claim | Our run | Status |
|---|---|---|---|
| 0 | Settings GET shows `allow_early_checkin=false`, `extend_rate_mode=calendar` (+ `pms.*` aliases) on `settings-list` and `v1/profile` | both endpoints: `false` / `calendar`, aliases present | ✅ |
| 1 | Invalid `extend_rate_mode=bogus` → 422 | **422** `extend_rate_mode must be calendar or held` | ✅ |
| 1b | Raw JSON body on `update-settings` is **ignored** (200, unchanged) | 200, values unchanged → only multipart `data=` works (our BQ-11 probe already used multipart) | ✅ gotcha confirmed |
| 2 | CM rates Oct 10 = 8,600 · Oct 11/12 = 7,400 | same | ✅ |
| 3 | **N7 off** + future-dated check-in → 422 | **422** `Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-20).` · reservation `charge` untouched after the refusal (atomic) | ✅ |
| 4 | **N7 on** → 200, `booking_charge 10100` | 200 · `rate 8600 + upgrade 1500 = 10100`, GST 909 + 909 | ✅ |
| 5 | **N8 `calendar`** extend +1 → `rate_per_night 8000`, `booking_charge 17500`, `nights 2` | `8600 + 7400 + 1500 = 17500`, blended rate 8,000, SGST/CGST 1,575 each, `advance_payment 1500` (1,000 + 500), `balance_due 19150`; LR `charge` identical | ✅ |
| 6 | **N8 `held`** extend +1 → `rate 8600`, `booking_charge 18700` | `8600×2 + 1500 = 18700`, GST 1,683 + 1,683, `balance_due 20566`; LR identical | ✅ |
| 7 | Extend money under `data.charge` (not top-level) | confirmed (`'charge' in body` = False; `data.charge` present) | ✅ |
| 8 | TAB settle with the full FE body | 200 "Room payment received via TAB" both stays; board 8525 → `hk` | ✅ |
| 9 | N9 no change | not re-probed (owner: allow; board `occupied_hk` already seen in build 2/3) | — |

## Findings for the FE contract
- **N7 is now server-enforced** via property setting `allow_early_checkin` (default **false** = owner's decision b). FE guard stays (disable `Check In` when `checkin > meta.business_date` **and** setting is false) but the server is the source of truth; FE must surface the 422 message as-is.
- **N8 is server-enforced** via `extend_rate_mode` (default **calendar** = owner's decision b). **BQ-385-17 satisfied** with deviations: no `extension_nights[]` (blended `rate_per_night` instead), CM miss → **held fallback** (not 422), `preview:true` on extend not documented/tested.
- **New question N11 (money):** in `calendar` mode the GST slab is applied to the **blended** rate (8,000 ≥ 7,500 → 18 %). If a cheap added night pulls the average below ₹7,500 the whole stay could flip to 5 % (D10 lesson). Backend to confirm slab is decided per night (or on the original sold rate), not on the blend.
- **FE display rule:** on extended stays `rate_per_night` is an average → label "avg. rate / night" (or show `booking_charge` + nights only); never multiply it back.
- **Settings write:** only multipart `data={"basic":{…}}` — a raw JSON body silently does nothing.
- **Backend "Ask FE 1" (settings UI for the two keys)** = new FE scope → owner decision O-8 (recommend: Phase 1 backend-config only; defaults already equal the owner's decisions).
