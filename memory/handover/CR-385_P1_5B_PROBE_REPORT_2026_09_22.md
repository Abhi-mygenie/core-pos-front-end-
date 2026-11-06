# CR-385 Phase 1.5b — BUG-443 VERIFY-FIRST probe report — 2026-09-22

```
Owner routing:  BUG-444 → DEFERRED-TO-FU-385-C (no code) · BUG-443 → VERIFY-FIRST
Branch taken:   **3** — backend ignores the client-sent `amount_after_tax`; price correct → NO CODE; BUG-443 DEFERRED-TO-FU-385-C, severity MINOR; smoke S-25 added
Files changed:  none in frontend/src (docs + registry only)
Tests:          cr385 jest 63/63 green (unchanged) · guards empty · yarn build exit 0
Sandbox:        booking 234 (Suite, pending) created → modified → cancelled with numeric id (200); no No-Show; 8524/8526 untouched; settings at defaults (not touched)
Evidence:       evidence/CR-385/phase1_5b/01_create.json · 02_legacy_modify_patch.json · 03_lr_reread_after.json · 04_cancel_234.json
```

## Probe
| Step | Value |
|---|---|
| Create (API) | id 234, Suite `suite-s-ep`, 22 → 24 Sep, **2 nights**, rate 31,500/night, booking_charge 63,000, SGST 5,670, CGST 5,670, **total_with_gst ₹74,340** |
| Legacy `/pms/arrivals` ⋮ Modify → check-out 25 Sep → Confirm (UI) | `PATCH /local-reservations/234` body `{"reason":"","checkin":"2026-09-22","checkout":"2026-09-25","amount_after_tax":0}` → 200 "Reservation modified successfully" |
| Response `charge` | nights 3, booking_charge 94,500, SGST 8,505, CGST 8,505, **total_with_gst ₹111,510**, `amount_after_tax` "111510.00" |
| LR re-read (GET, independent) | 22 → 25 Sep, nights 3, total_with_gst **111,510** ✓ (= 3 × 31,500 × 1.18) · `special_requests` null (empty reason → no "| MODIFY:" append) |
| Verdict | **Backend recomputes and ignores the client amount** (0 was sent, 111,510 stored). Not zeroed, not unchanged, not wrong → branch 3 |

## Side observations (no action, same retirement)
- Legacy dialog rate cards render "3 nights × ₹0/night · ₹0" — the dialog reads `rp.rates[checkin]` which the `getRatesData` shape does not provide; cosmetic, retires with FU-385-C.
- Empty legacy `reason` means no `special_requests` pollution (BQ-385-23 only bites when a reason is sent, i.e. from Front Desk (Beta)).

## Registry / docs
BUG-443 → DEFERRED-TO-FU-385-C (P3/LOW/MINOR) · BUG-444 → DEFERRED-TO-FU-385-C · CR-385 status updated · BUG_TRACKER rows · smoke batch S-22 "blocked, BUG-444", S-25 "legacy Modify payload known dirty, harmless".
Next: Gate 6 — combined owner smoke S-1…S-25 → "Phase 0 smoke OK" + "Phase 1 smoke OK" → Phase 2 GO. Push via platform "Save to GitHub" (no git remote in the workspace).
