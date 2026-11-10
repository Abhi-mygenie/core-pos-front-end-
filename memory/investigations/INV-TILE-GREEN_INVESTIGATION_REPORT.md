# INV-TILE-GREEN — Tile turns green on Place Order with no bill printed

**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA.md Role 6)
**Date:** 2026-11-10
**Reported on:** Ruby ZAP (RID 672), dashboard Table view
**Registered as:** BUG-664 (fix known, awaiting implementation on this branch)
**Owner requirement:** tile should turn green only when the bill has really been printed (BUG-583 / CR-512), and only when the restaurant setting is Yes.

---

## 1. Summary

- **Root cause:** `orderTransform.js:313` maps `billPrinted = bill_print === 'Yes' || print_bill_status === 'Yes'`. The backend sets `print_bill_status = 'Yes'` **when the order is placed** if the place-order payload has `billing_auto_bill_print: 'Yes'` (every prepaid Place+Pay on an auto-bill restaurant). That field means "auto bill was requested". It does not mean "bill was printed". The BUG-583 fallback treats it as printed, so the card goes green straight away, before any print call is made.
- **Classification:** FE_BUG (wrong field semantics) + contributing INTERACTION_BUG (H3)
- **Confidence:** HIGH (reproduced live and traced in code)
- **Steps used:** 9/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | Backend sets a print flag at placement and the FE reads it as "printed" | Prepaid place-order with `billing_auto_bill_print:'Yes'` and no print call (cafe103 #021118) | **CONFIRMED**: `print_bill_status:'Yes'`, `bill_print:'No'` 2s after placement | `INV_place_order_payload_C.json`, `INV_orders_list_after_C.json` |
| H1-ctrl | Postpaid placement or auto-bill No does not set the flag | Postpaid #021116 / #021117 (incl. BILL agent); cafe103 prepaid #021114 (autoBill No) | All `print_bill_status:'No'`, `bill_print:'No'` | `INV_orders_list_after_AB_1.json`, `INV_api_response_1_orders_list.json` |
| H1-field | Same thing on reporter's restaurant | Ruby read-only orders-list | Every prepaid order has `print_bill_status:'Yes'`. Ruby #000629 has `bill_print:'No'` with `pbs:'Yes'`, created == updated (never printed) → renders green | `INV_ruby_orders_list.json` |
| H2 | `update-print-status` swaps/mis-sets counters (KOT print turns bill green) | Confirm KOT-only on #021116, bill-only on #021117 | **ELIMINATED**: flags set correctly (KOT→kot_print only) | `INV_confirm_*.json`, `INV_orders_list_after_confirm.json` |
| H3 | FE confirms "printed" on queue, not on a physical print | Code trace `orderService.js:186-202` | **CONFIRMED (contributing)**: `update-print-status` fires right after `order-temp-store` returns "stored in temp table" (queued). Printer agent result not checked | code |
| H4 | Stale `billPrinted` carried over from another order on same table | Trace `DashboardPage.jsx:581-683`, `OrderContext.jsx:343` | **ELIMINATED**: mapped per order | code |
| H5 | Real FE UI postpaid place order on Ruby (walk-in #000696 / 1537937) | Network + websocket | Only `place-order`. new-order socket: `bill_print:"No"`, `print_bill_status:"No"`, `f_order_status:5`. Tile: white bg, green border, "Bill" button | network capture |
| H6 | API postpaid place-order on Ruby with KDS+BILL printer agents (#000695) | Same | bill No, pbs No, fOS 5. No update-order socket | network capture |
| H7 | Ruby profile | Read profile | `def_ord_status: 5` (Default Order Status = Served/Bill), `billing_auto_bill_print: Yes`, BILL printer agent 4770 mapped | `INV_ruby_profile.json` |

---

## 3. Data Flow Trace

```
API POST place-order {payment_type:prepaid, billing_auto_bill_print:'Yes'}
  → backend stores print_bill_status='Yes'
  → socket new-order / employee-orders-list
  → orderTransform.js:313  billPrinted = … || print_bill_status==='Yes'  → true
  → DashboardPage.jsx:603/649/682
  → TableCard.jsx:287-288 / OrderCard.jsx:460  green bg + border
```

**BREAK POINT:** `orderTransform.js:313`, the `print_bill_status` fallback.

Secondary path (H3): OrderEntry prepaid auto-print (`OrderEntry.jsx:2268+`) → `printOrder('bill')` → `order-temp-store` (queue) → `update-print-status {bill_print:'Yes'}` → green even if printer agent never prints.

---

## 4. When can it happen?

1. **Prepaid Place+Pay on a restaurant where `billing_auto_bill_print` = Yes** — green appears instantly on placement (H1). The screenshot case (fresh order, 0m, Ready button, only `place-order` in network tab).
2. **Same restaurant ~0.5s later** — FE auto-print queues the bill and confirms it (H3). Card stays green even if no paper comes out.
3. **Any manual Bill / Reprint tap** (TableCard, OrderCard, RePrint, reports, PMS) — confirms as soon as bill is queued, not when it is printed (H3).
4. **Will NOT happen:** postpaid Place Order (no print), or auto-bill=No restaurants on placement.

---

## 5. Addendum v2 (2026-11-10) — Screenshot order was POSTPAID

Owner confirmed the screenshot order was postpaid. Two distinct findings:

**F-A (CONFIRMED, reproducible):** Ruby has `def_ord_status: 5` (Served). CR-433 colours fOS-5 with a **green border** (`getStatusColor`). Every new order on Ruby gets a green border immediately — not from bill_print, from the status colour. Background stays white.

**F-B (owner screenshot, MEDIUM confidence, NOT reproduced):** Green **background** at fOS-1 means the backend delivered `bill_print:"Yes"` via socket shortly after placement. FE sent no print call (confirmed in network tab). Most likely: Ruby has `billing_auto_bill_print=Yes` → backend/printer-agent queues a bill print job and marks `bill_print` even when no paper prints. Printer agent 4770 was likely offline during probe. **Still open — needs order number + backend confirmation.**

---

## 6. Addendum v3 (2026-11-10) — Code trace + fix as BUG-664

**Q1: Does green apply to ALL restaurants?**
YES. No setting check anywhere in the colour path. `billPrinted` is computed only at `orderTransform.js:313` and passed through unchanged. `TableCard.jsx:287-288` and `OrderCard.jsx:460`: if `billPrinted` → bg `#E8F5E9` and border green. No restaurant-setting gate.

**Q2: Is `print_bill_status` used anywhere else?**
No. Repo-wide grep: used in exactly one place — the OR-fallback at `orderTransform.js:313`.

**Fix (BUG-664):**
```diff
- billPrinted: api.bill_print === 'Yes' || api.print_bill_status === 'Yes',
+ billPrinted: api.bill_print === 'Yes', // BUG-583 + BUG-664
```
1 line, 1 file. `orderTransform.js` is **R5 hotspot** — not Fast Lane eligible, needs full gate cycle.

Side effect (intended): CR-489 edit lock also relies only on `bill_print` after fix.

---

## 7. Still Open

| # | Question | Owner decision needed |
|---|---|---|
| OD-INV-01 | Should green apply to ALL restaurants or only those with a specific setting? | Yes — requirement decision |
| OD-INV-02 | Cancel/settle test orders on preprod? cafe103 #021116-021118, Ruby #000695-000696 | Yes |
| H3 | Should "queued" = "printed" for the green colour? Or only after physical print? | Yes + backend answer |
| F-B | Order number / time of T-1 ₹127 order from video. Was printer agent running? | Yes, to close F-B |

---

## 8. Evidence

`/app/memory/evidence/INV-SC-STATION/` — probe responses, orders lists (cafe103 + Ruby), Ruby profile.
Test orders: cafe103 #021116, #021117, #021118; Ruby #000695, #000696.

---

## 9. Recommendations

- **FE_FIX (main):** remove `|| api.print_bill_status === 'Yes'` at `orderTransform.js:313`. 1 line, R5 hotspot → full Gate 2-3 cycle. Register as BUG-664. Registered below.
- **OWNER_DECISION / BACKEND_ASK (H3):** who confirms a physical print — printer agent, backend, or FE on queue?
- **BACKEND_ASK (F-B):** does `place-order` with BILL agent + `billing_auto_bill_print=Yes` set `bill_print` at queue time?

## 10. Retroactive Candidates
NONE.

---

**Handover line:** "Root cause: `print_bill_status` fallback in `orderTransform.js:313` reads backend 'auto-bill requested' flag as 'bill printed'. Confidence HIGH. Steps 9/10. FE fix: 1 line, R5 hotspot, full gate cycle. Planning skip: NO. Registered as BUG-664."
