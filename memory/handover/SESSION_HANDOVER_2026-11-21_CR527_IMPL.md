# Session Handover — 2026-11-21 — CR-527 (capture phase) IMPLEMENTATION

**Role:** IMPLEMENTATION (Gate 4 GO granted by owner → coded Gate 3 plan)
**Item:** CR-527 diner capture + running-order display → **IMPLEMENTED, GATE_5A**

## What shipped
Option A (additive): holder mapping unchanged, added `diner_name`/`diner_mobile` only. 12 edits / 5 files + 1 test:
- `CollectPaymentPanel.jsx` — diner state (`dinerName`/`dinerPhone`), plain-text handlers, **gated "Diner (who ate)" field** (appears only once holder name + valid phone entered), `dinerContact` threaded into paymentData.
- `orderTransform.js` — `placeOrderWithPayment` emits diner_* in the TAB block; `collectBillExisting` emits diner_* **omit-when-blank** (won't wipe a place-time diner); `fromAPI.order` reads `diner`/`dinerMobile`.
- `reportTransform.js` — `singleOrderNew` reads diner (for detail sheet).
- `OrderDetailSheet.jsx` — diner row (shown only when ≠ holder).
- `OrderCard.jsx` — diner chip (shown only when distinct).
- `__tests__/orderTransform.cr527.test.js` — 6/6 PASS.

## Status
- Webpack compiled clean; unit 6/6 PASS. EXIT GATE 5/5 PASS (registry GATE_5A, CR_REGISTRY, FILE_OWNERSHIP, markers `// CR-527`, compile).
- Credit-row display (E1-E3) already shipped earlier — now lights up for distinct diners.

## Decisions locked
- OD-527-E = **A** (additive). OD-527-D = send raw diner, blank→omit/'' (never echo holder; backend null-collapses). OD-527-D.1 = diner gated behind holder. Holder seed L557-558 unchanged.
- OD-527-F = detail sheet + conditional card chip (hidden when "—"). OD-527-G = socket NOT touched (diner via refetch / detail-sheet open).

## NOT done (next)
1. **Browser QA** (testing_agent) — see `handover/QA_HANDOVER_CR-527_2026-11-21.md`.
2. **Live write-probe** (preprod rest 69, `pms@macha.com`): place credit order holder≠diner, verify `employee-orders-list` + `get-single-order-new` + `tap-customer-record-list` return the diner; blank/holder==diner → `null`. (R11 read-probe this session returned an `errors` envelope on bare GET — FE supplies params; backend read already live-verified.)

## Notes
- Implementation deviation documented: `reportTransform.singleOrderNew` added (not in the 4-file plan list) because OrderDetailSheet sources data from it, not `fromAPI.order` — additive field, report lists unaffected. `collectBillExisting` omits diner when blank (A2 omit=keep safety).
