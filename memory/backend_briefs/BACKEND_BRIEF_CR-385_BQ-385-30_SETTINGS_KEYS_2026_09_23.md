# BACKEND BRIEF — CR-385 · BQ-385-30 — Front Desk rule keys missing from `settings-list` (preprod, 2026-09-23)

```
Filed:       2026-09-23 by the CR-385 Phase 5 (Closure) execution agent — owner relays to backend (owner choice "c", 2026-09-23)
Severity:    BLOCKING for Phase 5 rows M7 / N7 (matrix 16 live, 32; smoke M2-S10 equivalent; probe n7n8). Non-blocking for booking / check-in / extend / bill paths.
Environment: preprod, RID 69 `sandbox-pms`, account QA_TGK (credentials in memory only)
Evidence:    evidence/CR-385/probes_2026_09_23_release/t0_entry_readback.json (12:30 UTC — keys present)
             evidence/CR-385/probes_2026_09_23_release/settings_list_after_it28.json (~13:40 UTC — keys gone)
             evidence/CR-385/probes_2026_09_23_release/env_settings_keys_missing_diag.json (update-settings echo + profile read)
             evidence/CR-385/probes_2026_09_22_p2_entry/s1_settings_list.json (09-22 sample, 75 keys)
```

## Summary
Between ~12:30 and ~13:40 UTC on 2026-09-23 the preprod `settings-list` response stopped carrying the three CR-385 Front Desk rule keys (and their `pms.*` aliases). The FE (M7 Rules tab + M3 early check-in gate) reads them from `data.basic` of `settings-list` (contract v1.9 / backend reply n7_n8_2026_09_20.md) and now always falls back to defaults. No FE change; nothing on our side wrote settings before the keys vanished (first `update-settings` call today was the diagnostic below, after the disappearance).

## Endpoint
- `GET /api/v2/vendoremployee/restaurant-settings/settings-list` → `data.basic` **before**: 75 keys incl. `allow_early_checkin`, `pms.allow_early_checkin`, `extend_rate_mode`, `pms.extend_rate_mode`, `auto_print_checkin_receipt`, `pms.auto_print_checkin_receipt`. **Now**: 70 keys — all six missing; one new key `customer_notification`.
- `POST /api/v2/vendoremployee/restaurant-settings/update-settings` (multipart `data={"basic":{"allow_early_checkin":false,"extend_rate_mode":"calendar"}}`) → 200 "Restaurant settings updated successfully", but `data.basic` echo also omits the six keys (v1.9 contract: echo carries them).
- `GET /api/v1/vendoremployee/profile` → `restaurants[0].settings` **still** has `allow_early_checkin=false`, `extend_rate_mode="calendar"`, `auto_print_checkin_receipt=false` → values persist; only the `settings-list` / `update-settings` serializers dropped them.

## Reproduction
1. Login QA_TGK (`common-login`), header `X-localization: en`.
2. `GET settings-list` → grep `data.basic` for `allow_early_checkin` → absent.
3. `POST update-settings` with the defaults body → echo absent.
4. `GET profile` → keys present with default values.

## Impact (FE, no code change possible under D50 / Phase 5 rules)
- Channel Manager › Front Desk Rules (M7): always renders OFF / "Rate table" regardless of the stored value; a Save round-trip cannot be verified.
- Front Desk (Beta) Arrivals (M3 N7): `allowEarlyCheckin` is always `false` on the FE → a tomorrow-arrival Check In stays greyed even after the rule is turned ON server-side (server guard N7 presumably still enforces; not probed today to avoid a mutating run on an unstable contract).
- Phase 5 rows 16 (N7 live 422), 32 (M7 read-back) and the `n7n8` probe are recorded **BLOCKED — backend (BQ-385-30)** until the keys return; all other Phase 5 rows proceed (owner choice "c").

## Ask
1. Restore the six keys on `settings-list` and the `update-settings` echo (contract n7_n8_2026_09_20.md, v1.9) on preprod; confirm the deploy that removed them (likely the same one that added `customer_notification` and slowed `/loading` bootstrap: Products / Running Orders / Popular Items 30–60 s each — see OG note in the Phase 5 QA report).
2. Reply in `backend_replies/bq_385_30_reply_<date>.md` with the deploy id; the FE agent re-runs rows 16 / 32 + `n7n8` the same day.

## Frontend workaround
None (D50: FE never invents rule state). Defaults hold the sandbox in the required end state (OFF / Rate table / no auto-print).
