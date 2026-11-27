# CR-522 — Payment tolerance % configurable per restaurant — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: NONE — ±3% hardcoded: CPP L893-894 (`*0.97` / `*1.03`), error text L3487, hint L3492, Pay block L3511. On/off toggle `reconcile_amount` → `reconcileEnabled` (L473).
Risk: CRITICAL (blocks payment). Backend-blocked: YES (tolerance key).
Conflict Pre-Check: CPP (see CR-514). Owner earlier: implement after Batch A PIN (CR-494) CPP edits.

## Owner decisions (locked)
- Free-typed %, same both ways (±), outside range = blocked.
- Phase 1: backend admin per restaurant. Phase 2: POS Settings (separate, see CR-541 note).
- OD-522-A (Q17, 2026-11-15): if the restaurant has **not set** a % → **tolerance OFF** (no ± range check, no range hint).

## Probe evidence
- 03 (RID 644) / 33 (RID 541): `basic.reconcile_amount: "No"`; no tolerance key in settings-list.

## Behaviour matrix (Phase 1)
| reconcile_amount | tolerance % | Received box | Range check |
|---|---|---|---|
| No | any | hidden | none (today) |
| Yes | blank / null | shown | **none** — hint hidden, Pay not blocked by range |
| Yes | 0 | shown | exact amount only (0% = must equal bill) — confirm at Gate 2.5 |
| Yes | N | shown | ±N%, text "±N% allowed (₹min – ₹max)" |

## Impact
| File | Change |
|---|---|
| `api/transforms/profileTransform.js` L375 + `restaurantSettingsTransform.js` L44 (where `reconcile_amount` is mapped) | Map new key e.g. `reconcile_tolerance_pct` → `reconcileTolerancePct` (number or null); write-back L229 only in phase 2 |
| `CollectPaymentPanel.jsx` L891-895 | min/max from pct; `receivedAmountError` only when pct is a number |
| `CollectPaymentPanel.jsx` L3485-3494 | Text uses pct; hide hint when pct null |
| `CollectPaymentPanel.jsx` L3511 | unchanged (driven by error) |

## Backend asks
- BB-08: restaurant setting `reconcile_tolerance_pct` (decimal, nullable) in settings-list + admin field.

## Open
- 0% meaning (exact match vs off) — proposed "exact match"; owner confirms at Gate 2.5 (M6).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M6 approved. OD-522-B: admin sets **0% → same as blank = no check** (tolerance OFF). Only a % > 0 enables the range check. Supersedes the "0 = exact" row in the behaviour matrix.

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_CR-522_API_CONTRACT_2026_11_15.md`
