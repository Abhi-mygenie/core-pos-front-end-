# BATCH-A · BUG-670 (Item-cancel notes dropped) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_BLOCKED — NOT FROZEN**. Only row G1-B1, blocked on **BA-01** (field name).
> Source rows: G1 B1 (moved unchanged from `plans/BATCH-A_G1_CANCEL_IMPLEMENTATION_PLAN_2026_11_15.md`, now superseded). Report display of item notes is G1-B2 in the BUG-674 plan.
> Risk: HIGH (order API payload). Mockup: M2 `#m2` (dialog unchanged; notes box already exists).

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: PARTIAL — box exists, value dropped)
| File | Line | Current |
|---|---|---|
| `components/order-entry/CancelFoodModal.jsx` | L201-L215 | `Additional Notes (Optional)` textarea (`additionalNotes`) |
| same | L35 | `onCancel({ item, reason, cancelQuantity, remainingQuantity })` — note dropped |
| `components/order-entry/OrderEntry.jsx` | `handleCancelFood` | forwards to `orderToAPI.cancelItem` — no note |
| `api/transforms/orderTransform.js` | L988 | `cancelItem: (currentTable, item, reason, cancelQty, options = {})` — no notes field |
| Probe (IA files 20–26) | — | `cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note` → 200 but none stored |

## 2. Conflict pre-check
OrderEntry.jsx: BUG-662/656/CR-512 (GATE_5A) · orderTransform.js: BUG-664/665/666, BUG-639 — no overlap with `cancelItem`.

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CancelFoodModal.jsx | CR-493 (E4, E5), CR-494 (TBD) | CR-493 → BUG-670 → CR-494 |
| OrderEntry.jsx | BUG-674 (E7), CR-515 (E9), CR-494 | BUG-674 → CR-515 → BUG-670 → CR-494 |
| orderTransform.js | BUG-674 (E6), CR-494 | BUG-674 E6 → BUG-670 → CR-494 |

## 4. Exact edits — READY
None.

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G1-B1 | **BA-01** field name | CancelFoodModal L35 add `note: additionalNotes.trim()`; OrderEntry `handleCancelFood` forwards it; orderTransform `cancelItem` (L988-L1010) sends it under BA-01 key. One unit (no dead plumbing) |

## 6. Scope lock
WILL change (after BA-01): CancelFoodModal.jsx L35, OrderEntry.jsx `handleCancelFood`, orderTransform.js `cancelItem`. Will NOT touch: dialog layout, reason logic, reports (BUG-674 B2).

## 7. Risks
- Wrong key → note silently not stored (probe shows backend returns 200 for unknown keys). Verify by reading back cancel-order-list.

## 8. Execution order
(after BA-01) B1 → verify with BUG-674 B2.

## 9. Verification matrix
| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | B1 | Item cancel with note "Burnt" | Payload carries note under BA-01 key | NO |
| V2 | B1 | Read back cancel-order-list | Note returned per line | NO |
| V3 | B1 | Unit test `cancelItem` with note | Key present | YES |

## 10. Post-code registry checklist
- [ ] FILE_OWNERSHIP blocks · [ ] `registry.json` + `CR_REGISTRY.md` BUG-670 · [ ] tracker BA-01 · [ ] marker `// BUG-670`

## 11. Mockup links
M2 → B1 (no visual change).
