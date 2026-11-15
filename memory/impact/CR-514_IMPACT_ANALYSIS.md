# CR-514 — Reference / transaction-ID box per payment method — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL — Card-only "Transaction ID (last 4 digits)" (BUG-240): CPP state L554, single box L3262-3290, split box L3083-3101, Pay lock L3506/L3509, payload L1256/L1258. Reports already read `transection_id/transaction_id` → `transactionRef` (reportTransform L190/230/425/1080). No per-method config.
Risk: CRITICAL (payment payload, R5 CPP). Backend-blocked: YES (per-method config).
Conflict Pre-Check: CPP — Batch A CR-492/CR-494 + this batch BUG-672/CR-522/CR-536 all edit CPP → single CPP owner per sprint, sequence 672 → 514 → 522 → 536.

## Owner decisions (locked)
- Backend admin decides per method: show box yes/no AND required/optional; required → Pay locked until filled. Split: one box per part.
- OD-514-A: config-driven, not hardcoded. Card 4-digit stays until config exists.
- OD-514-B (Q18, 2026-11-15): config lives **on each payment method** in admin (same `payment_types` list that has `prepaid/postpaid`).
- CR-541 (P1): POS Settings editor for the same config — later.

## Probe evidence
- 21_C / 25: UPI pay with `transaction_id: TESTREF514` → stored + returned in Order Beta row → backend stores any method's ref already.
- 02: `payment_types` items have `id, name, display_name, prepaid, postpaid` — no ref flags yet.

## Impact
| File | Change |
|---|---|
| `api/transforms/profileTransform.js` L276 | Map `ref_enabled` / `ref_required` / `ref_label` (names per backend) per type (same edit as BUG-672) |
| `CollectPaymentPanel.jsx` L554, L3262-3290 | Generic reference box for selected method when enabled; label from config; required → Pay lock (L3506 rule generalised). Card: keep 4-digit rule when config absent (fallback) |
| `CollectPaymentPanel.jsx` L3083-3101, L3509 | Per split part box by that part's method |
| `CollectPaymentPanel.jsx` L1256/L1258 | `transactionId` for any method (not only card) |
| `orderTransform.js` | No change expected — `transaction_id` already sent from `paymentData.transactionId`; split `partial_payments[].transaction_id` verify at Gate 3 |
| Reports (Order Beta / Audit detail) | Already show `transactionRef` — verify label "Ref" for non-card |

## Backend asks
- BB-06: per payment type flags in profile `payment_types`: show ref (0/1), ref required (0/1), optional label + max length.
- BB-07: confirm `partial_payments[].transaction_id` stored per split part and returned in reports.

## Open
None (Q18 answered).

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M5 approved as shown.

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-B_CR-514_API_CONTRACT_2026_11_15.md`
