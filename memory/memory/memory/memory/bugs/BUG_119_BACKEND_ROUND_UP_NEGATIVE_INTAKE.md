# BUG-119 — Backend stores negative `round_up` against FE's ceiling-only contract

**Status:** INTAKE
**Priority:** P2 (cosmetic UI symptom; financial impact is sub-rupee)
**Sprint:** POS 4.0
**Opened:** 2026-06-08
**Reporter:** Owner (surfaced during BUG-117 owner smoke)
**Component:** Backend order finalisation (settlement path) + `OrderDetailSheet.jsx` round-off display

---

## 1. Problem Statement

The Audit Report side-sheet shows **Round-off ₹-0** on a Lafetta order even though the FE's order-builder contract guarantees round-off is **ceiling-only and always ≥ 0**.

> User observation: "Why does Round-off show -0?? this restaurant doesn't have round off on, I believe; only when round off is on we should show."

Investigation showed Lafetta actually has `total_round = "Yes"` (round-off ON), so the row legitimately appears — but the **value is negative**, which contradicts the FE contract.

---

## 2. Live Evidence (Lafetta, rid=78, 2026-06-08)

### Order 012555 raw API (from `order-logs-report`)
```
order_amount                = 1546
order_sub_total_without_tax = 1520
total_gst_tax_amount        = 0.00
total_vat_tax_amount        = 26.40
total_service_tax_amount    = 0.00
round_up                    = "-0.40"      ← negative
```

### Expected per FE contract
```
rawTotal      = 1520 + 0 + 26.40 + 0 = 1546.40
roundOffEnabled = true (Lafetta total_round = "Yes")
orderAmount   = Math.ceil(1546.40) = 1547   ← FE would have sent this
round_up      = max(1547 − 1546.40, 0) = 0.60   ← always ≥ 0 per FE
```

### Actual backend record
```
order_amount  = 1546   ← floor, not ceil
round_up      = "-0.40"   ← negative
```

**Backend over-rode the FE-computed values with a floor-rounded result.**

---

## 3. Symptom Chain

```
Backend stores round_up = "-0.40" (violates FE contract)
        ↓
reportTransform.js:970  → toNum("-0.40") = -0.40
        ↓
OrderDetailSheet.jsx:843  → roundOff !== 0 → row renders
        ↓
formatCurrency(-0.40) with { maximumFractionDigits: 0 }  →  "₹-0"
```

---

## 4. FE Contract (Reference)

`src/api/transforms/orderTransform.js:709-722`:
```js
const orderAmount = rawTotal > 0
  ? (roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal * 100) / 100)
  : 0;
const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
const roundUpAbs = roundUp > 0 ? roundUp : 0;             // ← clamps negative to 0
round_up: String(roundUpAbs.toFixed(2)),                  // ← always ≥ 0
```

**Rules:**
- `round_up` is **ALWAYS ≥ 0** (negative clamped to 0)
- `order_amount` is **Math.ceil(rawTotal)** when `totalRound = true`
- `order_amount` is **Math.round(rawTotal × 100) / 100** when `totalRound = false`

The backend record for 012555 violates both rules.

---

## 5. Possible Root Causes (To Investigate)

| # | Hypothesis | Evidence to gather |
|---|------------|--------------------|
| H1 | Backend has its own rounding policy that overrides FE payload | Diff FE-sent payload (network tab on order place) vs backend stored `orders_table` |
| H2 | A `collect-bill` or settlement adjustment path recomputed `order_amount` and back-derived a negative `round_up` (without honouring `total_round` flag) | Trace operations log on order 012555 + check `collectBillExisting` payload contract |
| H3 | A split-payment/cancel-item flow reduced `order_amount` after rounding, leaving `round_up` orphaned | Check if order had any post-creation edits (`order_edit_count`) |
| H4 | Backend rounding uses different logic for cash settlements (floor to ₹1) vs other payment modes | Cross-check same flow on UPI/card |

**Note:** Order 012555 had `order_edit_count = 0`, `parent_order_id = null`, `payload_total_gst_tax_amount = null`, `snapshot_*` fields all null, `print_bill_status = "No"`, `payment_method = "cash"`. So it's a vanilla CASH settlement that was never edited.

---

## 6. Related Audit Rules (already in place)

`orderLedgerAuditEngine.js`:
- **FE-88 ROUND_OFF (AMBER)**: fires when `round_up = 0` BUT `order_amount` includes rounding (i.e., backend forgot to populate `round_up`)
- This bug is the **opposite direction**: `round_up = NEGATIVE` while contract says ≥ 0. No existing rule covers this.

→ A new audit rule could be added (e.g., **FE-90: round_up < 0 violation**) to catch the inconsistency at audit time.

---

## 7. Likely Affected Files

| File | Role |
|---|---|
| Backend (out of FE scope) | Order finalisation / settlement endpoint that overwrites `order_amount` + `round_up` |
| `src/api/transforms/reportTransform.js:970` | Pass-through `toNum(api.round_up)` — would be the place to clamp/normalise if we add a defensive FE guard |
| `src/components/reports/OrderDetailSheet.jsx:843` | Display gate — only checks `!== 0`, doesn't consult `profile.totalRound` |
| `src/utils/orderLedgerAuditEngine.js` | Candidate location for a new FE-90 audit rule |
| `src/components/reports/OrderDetailSheet.jsx:15-18` | `formatCurrency` strips decimals → "₹-0" signed-zero artefact |

---

## 8. Decision Points for Owner

1. **Backend fix vs FE workaround?** Root cause is backend (negative `round_up`). FE can mask the symptom but the underlying inconsistency remains in DB and aggregate reports.
2. **Add FE-90 audit rule?** Makes inconsistency visible in Order Ledger (orange row) rather than silent.
3. **Display refinement?** If we keep FE pass-through, options are:
   - Hide row when `Math.abs(roundOff) < 0.5`
   - Force 2-decimal precision on Round-off only ("₹-0.40")
   - Combination
4. **Gate on `profile.totalRound`?** Side-sheet currently doesn't consult the profile flag. Even though Lafetta has it ON, tenants with `total_round = "No"` would benefit if we add this gate.

---

## 9. Related Items

- **BUG-117** (parent context) — Audit side-sheet GST negative, fixed 2026-06-08, owner smoke surfaced this round-off question
- **BUG-051 / BUG-052 / ROUND-001 / ROUND-002** — historical round-off rules (orderTransform.js:702-707 comments)
- **`BUSINESS_RULES_BASELINE_FINAL.md`** — pending freeze of round-off rule (per orderTransform.js:703)

---

## 10. Next Steps (deferred)

1. Owner triage: pick decision points from §8
2. Backend team: investigate H1-H4 hypotheses, identify the path that overwrites `round_up`
3. FE: optional defensive guard + FE-90 audit rule
4. Cross-tenant scan: check if other restaurants (especially `total_round = "No"`) exhibit similar negative `round_up` values

**No code changes yet.** Intake captured for prioritisation.
