# CR-394 — GST on open / custom items: Exclusive only — Impact Analysis (Gate 2) — 2026-11-15

Code Reality: PARTIAL (new scope) — original ask already FULL (CR-348 added GST % + Inclusive/Exclusive to `AddCustomItemModal.jsx` L14-16, L232-268; `OrderEntry.jsx` L1610-1612 → `orderToAPI.addCustomItem(…, taxCalc)`; CPP L294 handles inclusive). **Owner now reverses scope.**
Risk: CRITICAL (tax). Backend-blocked: NO.
Conflict Pre-Check: `AddCustomItemModal.jsx`, `panels/menu/ProductCard.jsx` — no open edits.

## Owner decision (Q16, 2026-11-15)
- OD-394-A: keep **Exclusive** (today's default). "We don't have inclusive GST" → user must not be able to choose Inclusive anywhere (custom items + menu management).
- Backward/inclusive GST (original CR-394 text) is **NOT** built.

## Where Inclusive can still be chosen (grep)
| File | Line | What |
|---|---|---|
| `components/order-entry/AddCustomItemModal.jsx` | L16, L254-265 | "Tax Calc" select with Inclusive option |
| `components/panels/menu/ProductCard.jsx` | L220-228 | Menu product edit "Tax Calc" select (Inclusive first!) |
| `components/panels/menu/ProductCard.jsx` | L392 | "Tax Incl." badge (display only — keep for legacy data) |
| `components/panels/menu/BulkEditor.jsx` | L55 | already removed (BUG-359) |
| `components/panels/menu/ProductForm.jsx` | L245/L291 | defaults Exclusive, no select |

R5 probe 32 (RID 541): 0 of 286 products are Inclusive → removing the option breaks no live data there.

## Impact
| File | Change |
|---|---|
| `AddCustomItemModal.jsx` | Remove Tax Calc select; always send `Exclusive`; GST % box stays |
| `ProductCard.jsx` L220-228 | Remove Tax Calc select (keep value as stored); new edits save `Exclusive` |
| Inclusive calc code (CPP L294, orderTransform) | **Keep** — legacy inclusive products/orders still compute correctly |

## Open
- Gate 2.5 M8: existing product already stored Inclusive — show read-only "Inclusive (old)" or force Exclusive on next save? Proposal: read-only label, no change until edited.
- Registry: retitle CR-394 → "Open items & menu: GST Exclusive only (remove Inclusive choice)".

## Gate 2.5 owner decisions (2026-11-15) — design APPROVED
- M8 approved (Inclusive choice removed in custom item + menu product edit).
- OD-394-B: existing products saved **Inclusive → changed to Exclusive now**, **only in outlets where GST is ON**; GST-off outlets untouched (no GST applies). Done **once by backend (Gyan) — BB-13**, not by POS. FE keeps inclusive maths for legacy orders.
