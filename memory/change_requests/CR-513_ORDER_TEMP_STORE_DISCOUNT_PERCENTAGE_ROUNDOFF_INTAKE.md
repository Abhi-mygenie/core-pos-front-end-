# CR-513 — Intake
## Add `discount_percentage` and `roundoff` to order-temp-store API (bill print payload)

**Date:** 2026-11-06
**Type:** CR (Change Request)
**Priority:** P1 (owner-stated; rubric agrees — printed customer bill shows wrong/missing financial lines, no FE workaround)
**Risk:** **CRITICAL** (upgraded by INTAKE agent from owner-stated MEDIUM — see Risk section)
**Area:** `Printing / Printer Agent`
**Sprint:** TBD (proposed `nov_cr_batch`)
**Source:** OWNER-REPORTED (2026-11-06)
**Registered by:** INTAKE role (Role 1)
**ID note:** CR-512 intentionally skipped — owner instruction: CR-512 belongs to a different branch. Last CR in this branch registry = CR-511.

---

## 1. What This Is

`POST /api/v1/vendoremployee/order-temp-store` (bill/KOT payload consumed by the Printer Agent) must start receiving two new fields from the frontend:

1. **`discount_percentage`** (number) — % discount applied (e.g. `50`). Today only `discount_amount` is sent, so the template cannot print "Discount (50%): ₹180.96".
2. **`roundoff`** (number) — rounding adjustment on the bill total (e.g. `0.12`). Today not sent at all, so bills cannot show a round-off line.

Both fields are **additive and optional** (absent → backend treats as 0). No existing payload field changes.

## 2. Backend Status — VERIFIED ✅ (owner probe 2026-11-06)

Owner-run curl probe on preprod (account alias: `cafe103 owner`) — backend stores and echoes both fields in `data` and `data.raw_payload`. Backward compatible. Evidence: `/app/memory/evidence/CR-513/CR-513_order_temp_store_probe_2026_11_06.json`.

## 3. Code Reality Check (Step 0a) — **NONE**

```
grep -rn "discount_percentage\|\broundoff\b" frontend/src  → 0 hits in any payload builder
```
- `buildBillPrintPayload` (`orderTransform.js` L1809; discount line L2165) sends `discount_amount` only. No `discount_percentage`, no `roundoff`.
- Only `roundoff` hits are **display-only** in reports (`OrderReportBetaPage.jsx:786`, `OrderDetailSheet.jsx:915`) — unrelated to print.

### ⚠ Finding — intake's assumed source fields do NOT exist in the order model
The intake suggests `order.discountPercent` and `order.roundoff`. **Neither is mapped** in `fromAPI.order` (`orderTransform.js` ~L226-243):
- Discount: only `discount` (L234 — `restaurant_discount_amount || discount_value`, the BUG-592 fallback) and `orderDiscountJson { discount, discountType, discountNote }` (L237-243, BUG-538).
- Round-off: no API→model mapping of `round_up`. Round-off exists only on the **place/collect** side (`round_up` computed L913-923; `roundOff` in collect payload L1516/L1686, CR-029/CR-170).

**Consequence:** the FE change is larger than "2-3 lines". Planning must decide the source of each value per print path:
- Collect Bill path → overrides threaded from `CollectPaymentPanel.jsx` (discount % input + computed round-off) — may add a 2nd file.
- Dashboard / manual reprint path → needs new `fromAPI.order` mappings (e.g. `order_discount_json` percent / `discount_value` when type=percent; `round_up` from API) — confirm API field names by curl probe at Gate 2 (Rule R11).

## 4. Duplicate Check (Step 0b) — **RELATED** (significant overlap — owner to confirm)

| ID | Title | Status | Overlap |
|---|---|---|---|
| **BUG-592** | Manual bill print shows discount as % (50) not ₹ (180.96) | GATE_1_INTAKE_COMPLETE (P0, assignee Piyush) | Same function/payload. BUG-592 fixes the **wrong value in `discount_amount`**; CR-513 adds a **separate `discount_percentage`** so both can coexist. Must be sequenced together at Gate 2 — CR-513 does NOT fix BUG-592. |
| **CR-487** | Printed bill — show discount % and ₹ amount | GATE_2_PLANNING in registry.json / "FROZEN — TRACKING ONLY (Printer Agent team)" in CR_REGISTRY.md (**drift**) | CR-487 is the bill-content outcome; CR-513 is the FE payload enabler for it. OD-487-04 ("does Printer Agent need `discount_percent` from FE?") is effectively **answered YES** by this CR — key is `discount_percentage`. |
| **CR-502** | Round Off value on printed bill (all print paths) | GATE_1_INTAKE_COMPLETE — 4 ODs open | Same FE work for the `roundoff` half. OD-502-01 (key name) is effectively **answered: `roundoff`** by the backend probe. CR-502 scope = ALL print paths + CPP. |

Classification: **RELATED to BUG-592, CR-487, CR-502** — registered as distinct per owner instruction. **Agent recommendation (OD-513-03):** owner decide whether CR-513 *subsumes* the FE-payload part of CR-502 (roundoff) and CR-487 (discount %), or whether CR-513 stays a single-path payload CR and the others track template/all-path work. Avoid two CRs editing the same `buildBillPrintPayload` lines independently.

## 5. Risk Classification (Step 1b)

- **Risk: CRITICAL** — triggers: printing + discounts + customer-facing bill amounts (v0.7 Risk table). Agent upgraded from owner-stated MEDIUM; downgrade requires owner approval + written rationale.
- Mitigating: additive fields only, backend already accepts, no existing field changes.
- Hotspot: **YES** — `orderTransform.js` (R5). Possibly `CollectPaymentPanel.jsx` (R5) depending on OD-513-04.
- **FAST LANE eligible: NO** (financial/print logic + R5 hotspot). Full gate flow + owner approval at Gate 4.

## 6. Blast Radius (Step 3)

- `buildBillPrintPayload` callers + discount/round-off references in `orderTransform.js`: 1 builder function + `fromAPI.order` mapping.
- Estimated scope: **SMALL** (1-2 files: `orderTransform.js` R5; `CollectPaymentPanel.jsx` R5 only if Collect-Bill overrides needed). Lines: ~5-15 (not 2-3 — see §3 finding).
- Hotspot files touched: YES — `src/api/transforms/orderTransform.js` (R5).

## 7. Evidence (Step 2)

- Screenshot: not provided (related bill photos exist under BUG-592 — Bill No. 000524).
- Steps to reproduce: print any bill with a % discount → printed bill lacks "(50%)" label and has no round-off line.
- Curl output: `/app/memory/evidence/CR-513/CR-513_order_temp_store_probe_2026_11_06.json` (owner-provided, token masked).
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (backend acceptance) / SUSPECTED (FE gap — code-verified by agent, grep 0 hits)

## 8. Proposed FE Change (for Planning — NOT approved)

```js
// buildBillPrintPayload (orderTransform.js ~L2165)
discount_amount:     overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
discount_percentage: overrides.discountPercent ?? <source TBD at Gate 2>,   // CR-513
roundoff:            overrides.roundoff ?? <source TBD at Gate 2>,          // CR-513
```

## 9. Open Owner Decisions

- **OD-513-01:** Show `discount_percentage` as a label on the printed bill ("Discount (50%): ₹180.96")? — OPEN (template owned by Printer Agent team, see CR-487 OD-487-06)
- **OD-513-02:** Show `roundoff` as a separate line ("Round-off: ₹0.12")? Print when ₹0.00? — OPEN (overlaps OD-502-02)
- **OD-513-03:** Do CR-513 subsume FE-payload scope of CR-502 (roundoff) and CR-487 (discount %)? — OPEN (agent recommends YES — single owner of the payload lines)
- **OD-513-04:** Which print paths in scope — Collect Bill only, or also prepaid / manual reprint / auto-print? — OPEN (overlaps OD-502-03)
- **OD-513-05:** For flat (₹) discounts, send `discount_percentage = 0` or computed %? — OPEN (overlaps OD-487-01)
- **OD-513-06 (Gate 2):** Active % only — one discount at a time — **LOCKED 2026-11-06**
- **OD-513-07 (Gate 2):** `roundoff` signed (+/−) — **LOCKED 2026-11-06**
- **OD-513-08 (Gate 2):** Combined plan + coding pass with BUG-592 FE fix — **LOCKED 2026-11-06**
- **OD-513-09:** Both fields optional — **LOCKED YES** (backend probe; was OD-513-06 at intake, renumbered)
- PMS paths → follow-up CR (owner 2026-11-06)
- Full decision log: `impact/CR-513_IMPACT_ANALYSIS.md` §9

## 10. Delivery Phases

| Phase | Owner | Status |
|---|---|---|
| Backend: accept fields | Backend team | ✅ DONE (probe 2026-11-06) |
| FE: send fields in payload | FE team | NOT STARTED |
| Printer template: render fields | Printer Agent team | UNKNOWN — needs verification |

## 11. Credential Note

Owner-reported: the `pav2` owner alias returned "Invalid credentials" on preprod (2026-11-06); probe was done with the `cafe103` owner alias. Passwords: see `/app/memory/control/test_credentials.md` (not reproduced here per v0.7 Security rule).

## Next
Planning Gate 2 (Impact Analysis) — must include: curl probe of order API for discount %/round_up field names, per-print-path source mapping, sequencing vs BUG-592 / CR-487 / CR-502.
