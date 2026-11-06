# CR-502 — Round Off Value to Be Printed on Bill (Pass via order_temp at All Print Paths)

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (billing accuracy: customers see rounded total but bill doesn't show the round-off line)
**Risk:** HIGH (touches order transforms, all printing paths, bill payload — R5 hotspots)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO** (multiple print paths, R5 hotspots)
**Sprint:** TBD

---

## Description

The round-off amount (difference between raw total and displayed rounded total) should be printed as a visible line item on the bill. The round-off value needs to be passed via `order_temp` (or equivalent key — exact key name to be confirmed during Impact Analysis) at ALL possible printing paths:

1. **Collect Bill** (postpaid settle)
2. **Place Order with Payment** (prepaid)
3. **Update Order** (if bill reprinted)
4. **Manual Bill Print** (from Dashboard/Order Card)
5. **Auto Print** (on settlement)

**Expected behavior:** Printed bill shows a "Round Off: ±₹X.XX" line near the Grand Total, so the customer can see the adjustment.

**Current behavior:** Round-off is computed in the frontend (`roundOffUtils.js`, `applyGrandTotalRoundOff`) and applied to the displayed Grand Total, but the round-off VALUE itself is NOT included in the print payload sent to the Printer Agent. The bill shows the rounded total without explaining the adjustment.

---

## Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Place an order where round-off applies → print bill → no round-off line visible
- **Confidence:** CONFIRMED (code-traced: `buildBillPrintPayload` in `orderTransform.js` does not include a dedicated round-off field in the printer payload)

---

## Code Reality Check

**Code reality: PARTIAL** — Round-off calculation is fully implemented:
- `roundOffUtils.js` — `applyGrandTotalRoundOff()` helper (CR-170)
- `orderTransform.js` L10, L822-823 — round-off gate + computation
- `CollectPaymentPanel.jsx` — displays round-off in UI
- `frontDeskService.js` L139 — room round-off
- `insightsService.js` L127 — `round_up` field in reports

But the round-off value is NOT passed in the bill print payload (`buildBillPrintPayload`, `buildManualBillPrintPayload`). The Printer Agent never receives it.

Key files with print payload construction:
- `orderTransform.js` — `buildBillPrintPayload` (~L1900+), `placeOrderWithPayment`, `collectBillExisting`
- All paths must include the round-off key in the payload

---

## Duplicate Check

**RELATED** to:
- BUG-126 (round_off vs round_up field name — CLOSED): field naming, different scope
- CR-170 (Grand Total Round-Off — CLOSED/IMPLEMENTED): calculation logic, this CR adds print output
- BUG-536 (SC GST missing from manual bill print — INTAKE): same pattern — missing field in print payload

**Verdict: DISTINCT** — no existing item covers passing round-off to the print payload.

---

## Blast Radius

- `buildBillPrintPayload` in `orderTransform.js` (R5) — main print payload builder
- `placeOrderWithPayment` — prepaid path
- `collectBillExisting` — postpaid path
- Manual print path (~L1964-2011)
- `CollectPaymentPanel.jsx` (R5) — round-off value source
- Hotspot files touched: YES — `orderTransform.js` (R5), `CollectPaymentPanel.jsx` (R5)
- Estimated scope: MEDIUM (2-3 files, ~15-25 lines across all print paths)

---

## Open Questions

- **OD-502-01:** What is the exact key name for round-off in `order_temp`? (To be confirmed during Impact Analysis — owner stated key name will be confirmed at IA stage)
- **OD-502-02:** Should the round-off line print even when the value is ₹0.00, or only when non-zero?
- **OD-502-03:** Should the round-off key be included in ALL 4+ print paths, or only the primary collect-bill path?
- **OD-502-04:** Does the Printer Agent already support rendering a round-off line, or does it need a template update (Printer Agent team dependency)?


---
## SUBSUMED into CR-513 (owner 2026-11-06)
Owner: duplicate — all bill-data work for this item is planned and implemented under **CR-513** (one CR, one plan). See `impact/CR-513_IMPACT_ANALYSIS.md` §9-§12. No further gates for CR-502.
