# CR-130 — Implementation Plan (Gate 3)

**ID:** CR-130  
**Title:** Add BILL Printer to `printer_agent` Array in Place Order Payload  
**Date:** 2026-08-06  
**Role:** PLANNING AGENT (Gate 3 — Implementation Plan)  
**Risk:** HIGH (R5 hotspot: `orderTransform.js`)  
**Sprint:** pos_5_1  
**Gate 2 ref:** `impact/CR-130_IMPACT_ANALYSIS.md` — CLOSED ✅ All ODs resolved.

---

## Entry Verification (Plan vs Reality)

| Plan says | Actual line in file | Match? |
|---|---|---|
| L4: `import { selectAgentsForKot, cartStationsToSet }` | `import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';` | ✅ |
| L1010-1014: `// R-OWNER-9 / R-OWNER-10. BILL is excluded…` + 3-line const | Verified at L1010-1014 | ✅ |
| L1272-1276: identical pattern in placeOrderWithPayment | Verified at L1272-1276 | ✅ |

**Plan is NOT stale. Proceed.**

---

## Scope Lock

**Files WILL change:**
- `api/transforms/orderTransform.js` — 3 surgical edits

**Files will NOT touch:**
- `api/transforms/printerAgentSelector.js` — `selectAgentsForBill()` already exists, no change
- `api/transforms/printerAgentSelector.test.js` — already has full coverage, no change
- `components/order-entry/OrderEntry.jsx` — printerAgents already threaded correctly, no change
- `components/order-entry/CollectPaymentPanel.jsx` — out of scope (OD-2)
- All cancel / update-order paths in `orderTransform.js` — out of scope (OD-2)

---

## Execution Sequence

Execute edits **in order**. Do not skip. Compile after all 3.

---

### Edit 1 — `orderTransform.js` L4 — Add `selectAgentsForBill` to import

**Current (L4):**
```js
import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';
```

**New:**
```js
import { selectAgentsForKot, selectAgentsForBill, cartStationsToSet } from './printerAgentSelector'; // CR-130
```

**Verification:** `grep -n "selectAgentsForBill" src/api/transforms/orderTransform.js` → must return 3+ hits (import + 2 call sites after Edits 2+3).

---

### Edit 2 — `orderTransform.js` L1010-1014 — `placeOrder` (dine-in unpaid, Flow 1)

**Current (L1010-1014):**
```js
    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
    const printerAgentForPlace = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];
```

**New:**
```js
    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10 amended by CR-130: BILL now appended unconditionally.
    // OD-3 (2026-08-06): always include BILL — backend gates printing via billing_auto_bill_print.
    const printerAgentForKot = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];
    const printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(printerAgents)]; // CR-130
```

**Note on warn block (L1079-1085 — no change needed):**
`printerAgentForPlace.length === 0` now fires only when BOTH KOT agents AND BILL agent are absent — more accurate than before. No modification to the warn block required.

**Verification:** After Edits 1+2+3, unit test confirms BILL in payload (see Verification Matrix).

---

### Edit 3 — `orderTransform.js` L1272-1276 — `placeOrderWithPayment` (QSR/prepaid, Flow 3)

**Current (L1272-1276):**
```js
    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
    const printerAgentForPlace = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];
```

**New:**
```js
    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10 amended by CR-130: BILL now appended unconditionally.
    // OD-3 (2026-08-06): always include BILL — billing_auto_bill_print already gates actual print.
    const printerAgentForKot = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];
    const printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(printerAgents)]; // CR-130
```

**Note on warn block (L1412-1418 — no change needed):** Same reasoning as Edit 2.

---

## Verification Matrix (Implementation Agent Self-Test)

| Edit # | File | Expected | How to Verify | Automated? |
|--------|------|----------|---------------|:---:|
| 1 | `orderTransform.js:4` | `selectAgentsForBill` in import | `grep -n selectAgentsForBill src/api/transforms/orderTransform.js` → 3 hits | YES — grep |
| 2 | `orderTransform.js:~1010` | `placeOrder` builds `[...kotAgents, ...billAgents]` | Code inspection: `printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(...)]` present | YES — grep |
| 3 | `orderTransform.js:~1272` | `placeOrderWithPayment` same pattern | Same grep | YES — grep |
| C1 | Compile | 0 new webpack warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "webpack compiled" | YES — log |
| R1 | Regression | KOT agents still present when BILL appended | Code trace: `[...printerAgentForKot, ...]` — KOT is first arg | YES — code |
| R2 | Regression | No crash when BILL absent from printerAgents | `selectAgentsForBill([]) === []` — proven by existing test T-3 in test file | YES — existing test |
| R3 | Regression | Cancel/update paths NOT changed | `grep -n "CR-130" orderTransform.js` — markers only in placeOrder + placeOrderWithPayment blocks | YES — grep |
| R4 | Regression | `printerAgentForKot` var rename safe | No other code in file references `printerAgentForKot` (new var name) | YES — grep |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | R5 hotspot — regression in other orderTransform paths | LOW | HIGH | Edits confined to L1010-1014 and L1272-1276. All cancel/update/collectBill paths untouched. Grep confirms scope. |
| R2 | Warn block fires differently | LOW | LOW | Warn now fires only when truly no agents found (both KOT + BILL absent). More correct — monitor console. |
| R3 | printerAgentForKot var name collision | NONE | — | New internal variable, not exported, not referenced anywhere else. |
| R4 | Backend prints unexpectedly | LOW | MEDIUM | OD-3 decision: backend already controls via `billing_auto_bill_print`. Passing BILL in array ≠ forcing print. |

---

## Post-Code Registry Checklist

Implementation Agent MUST execute after coding, before writing handover:

```
- [ ] registry.json: CR-130 → status: "IMPLEMENTED — Gate 5a <date>", gate: 5, sprint_key: "pos_5_1"
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add section "### CR-130 (2026-08-06)" with orderTransform.js row
- [ ] Code markers: // CR-130 comment present in all 3 edited locations
- [ ] Compile: webpack compiled with 0 new warnings (pre-existing warning is OK)
```

---

## QA Handover Seed

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| T1 | placeOrder includes BILL | Dine-in → add item → Place Order (unpaid) → Network tab → inspect `printer_agent` array | Contains both `{ station: "BAR/KDS/...", ... }` AND `{ station: "BILL", ... }` |
| T2 | placeOrderWithPayment includes BILL | QSR → add item → Place+Pay → Network tab → inspect `printer_agent` array | Same — BILL present alongside KOT agents |
| T3 | No BILL when not configured | Restaurant with no BILL agent in profile → Place Order | `printer_agent` has KOT agents only, no BILL row — no crash |
| T4 | KOT agents preserved | Any place order → check Network | Both KOT + BILL agents in array — KOT not removed |
| T5 | Cancel-item unchanged | Place order → cancel item → Network tab → cancel-item payload | `printer_agent` on cancel-item has NO BILL (unchanged) |
| T6 | Update-order unchanged | Placed order → add new item → update → Network tab | `printer_agent` on update-order has NO BILL (unchanged) |
| T7 | Compile clean | Check frontend log | `webpack compiled with 1 warning` (pre-existing only, 0 new) |

---

## Summary

- **1 file changed** (`orderTransform.js`)
- **3 surgical edits** — import line + 2 identical 5-line blocks
- **0 logic changes** to any other path — cancel, update, collect-bill untouched
- **Gate 4 GO required** from owner before Implementation Agent begins coding
