# CR-385 · `held_fallback` observed LIVE (G4-03 b · BQ-385-21) — 2026-09-21
Owner-provided scenario (`backend_replies/held_fallback_probe_2026-09-21.md`): BE pre-wiped suite-s-ep + executive-s-ep rates for 2026-11-15…17 to 0 and left stay **HF FE Guest · r4/8525 · order 1232648 · 2026-11-14 → 15 · held 36,800** in-house. Alias OWNER_TGK.

| Step | Result |
|---|---|
| `fetch-rates` 11-14…17 before | 11-14 suite 36,800 / exec 8,600 · **11-15, 11-16, 11-17 = 0 / 0** (wiped) — `h0_rates_wiped.json` |
| Stay before | in_house, 1 night, 36,800, total 43,424, adv 500, due 42,924, no `nights_detail` |
| **Extend → 2026-11-16** (`h1_extend_1116.json`) | 200 · nights 2 · `booking_charge 73,600` (36,800 × 2) · SGST 6,624 / CGST 6,624 · total 86,848 · due 86,348 · **`nights_detail`: 11-14 `held` 36,800 · 11-15 `held_fallback` 36,800 (18 %)** — exactly the BE table |
| LR read-back | checkout 11-16, same money, **`nights_detail` with `held_fallback` present on the list row** (so the chip survives reload, BQ-19) |
| Settle | TAB 86,348 → `departed`, `balance_due 0` |
| **Restore rates** (`h4_restore_rates.json`, `h5_rates_after.json`) | push-rates 11-15…17 suite **31,500** / executive **7,400** (ORIG per owner) → verified: 11-15/16/17 = 31,500 / 7,400; 11-14 untouched |
| Restore settings | `allow_early_checkin=false · extend_rate_mode=calendar · auto_print_checkin_receipt=false` (verified via profile) |
| Board after | 8525/8527/8528 `hk`; other testers' 8524/8526 untouched |

Not done: a second extend to 11-17 (`h2`) hit the runner timeout before the call — not needed; one live `held_fallback` night is the accept. BE's separate "FE open stay" order 1232647 / res 220 was not touched by FE (status checked in `log_hf_2.txt`/chat).

**Verdict: G4-03 (b) VERIFIED LIVE — no waiver needed.** FE fixture for the chip = `h1_extend_1116.json` (real response). Rule confirmed: fallback night priced at the held rate, GST per that rate, totals in `charge.*`.
