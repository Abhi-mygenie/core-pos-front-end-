# BATCH-A · CR-493 (Cancel reason mandatory) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_PARTIAL — NOT FROZEN**. READY: E1, E3, E4, E5. BLOCKED: B5 (BA-05), B6 (BA-23).
> Source rows: G1 E1, E3, E4, E5 + B5, B6 (moved unchanged from `plans/BATCH-A_G1_CANCEL_IMPLEMENTATION_PLAN_2026_11_15.md`, now superseded).
> Risk: HIGH. Mockups: M1 `#m1`, M2 `#m2`, M3 `#m3`.
> Decisions: reason ALWAYS mandatory (order + item) · OD-493-A ("No reason provided" = backend auto-cancel → BA-23) · OD-493-B (no reasons configured → block + message) · one notes-mandatory setting, default optional (BA-05).

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: PARTIAL — reason already required by disabled button)
| File | Line | Current |
|---|---|---|
| `components/order-entry/CancelOrderModal.jsx` | L66 | label `Cancellation Reason` (no `*`) |
| same | L84 | `reasons.map(...)` — empty list → empty dropdown, button disabled, no message |
| `components/order-entry/CancelFoodModal.jsx` | L158 | label `Cancellation Reason` (no `*`) |
| same | L182 | `reasons.map(...)` — same empty-list behaviour |
| Probe `evidence/BATCH-A-G3/04_cancellation_reasons.json` | — | RID 644: Order 5 / Food 6 reasons |

## 2. Conflict pre-check
CancelOrderModal / CancelFoodModal: no open owners outside Batch A.

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CancelOrderModal.jsx | BUG-674 (E2), CR-494 (TBD) | BUG-674 E2 + CR-493 E1/E3 one pass → CR-494 |
| CancelFoodModal.jsx | BUG-670 (B1 L35), CR-494 (TBD) | CR-493 E4/E5 → BUG-670 B1 → CR-494 |

## 4. Exact edits — READY
| # | File / line | Current → New |
|---|---|---|
| G1-E1 | CancelOrderModal L66 | `Cancellation Reason` → `Cancellation Reason *` (M1) |
| G1-E3 | CancelOrderModal L63-L101 | If `reasons.length === 0`: hide dropdown, show M3 message (red box) testid `cancel-order-no-reasons`; button stays disabled |
| G1-E4 | CancelFoodModal L158 | `Cancellation Reason` → `Cancellation Reason *` (M2) |
| G1-E5 | CancelFoodModal L155-L199 | Same no-reasons block, testid `cancel-food-no-reasons` |

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G1-B5 | **BA-05** key | Notes mandatory/optional setting → `*` on Notes + button disabled while empty (both modals) |
| G1-B6 | **BA-23** | "No reason provided" in Insights — backend auto-cancel stores reason + who; no double count. FE verify only |

## 6. Scope lock
WILL change: CancelOrderModal.jsx (L63-L101), CancelFoodModal.jsx (L155-L199). Will NOT touch: SettingsContext reason loading, cancel timing, payloads (BUG-674/BUG-670 own those).

## 7. Risks
- Restaurants with no reasons configured cannot cancel at all until reasons are added (OD-493-B). Release note to support.
- Modal opened before `SettingsContext.isLoaded` shows the M3 block — acceptable (boot finishes before dashboard).

## 8. Execution order
E1 + E3 (with BUG-674 E2) → E4 + E5 → (after BA-05) B5 → verify B6.

## 9. Verification matrix
| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E1/E4 | Labels on order + item cancel | `Cancellation Reason *` | NO |
| V2 | E3/E5 | Reasons list empty (mock) | M3 message, no dropdown, button disabled (both) | NO |
| V3 | E1-E5 | Reasons present, none picked | Button disabled (unchanged) | NO |
| V4 | B5 | (after BA-05) setting ON, note empty | Button disabled | NO |
| V5 | B6 | (after BA-23) Insights cancellations | No "No reason provided" double count | NO |

## 10. Post-code registry checklist
- [ ] FILE_OWNERSHIP blocks · [ ] `registry.json` + `CR_REGISTRY.md` CR-493 · [ ] tracker BA-05/06/23 · [ ] marker `// CR-493`

## 11. Mockup links
M1 → E1, E3 · M2 → E4, E5 · M3 → E3, E5.
