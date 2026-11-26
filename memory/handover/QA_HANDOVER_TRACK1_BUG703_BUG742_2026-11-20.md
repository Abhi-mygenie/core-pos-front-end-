# QA Handover — Track 1 (BUG-703 + BUG-742) — 2026-11-20

**From:** IMPLEMENTATION agent · **Gate reached:** 5A (code complete, webpack clean) · **Owner Gate-4 GO:** given ("gate 3 go", Track 1).
**Scope:** 2 items, 4 files, additive-only. No backend, no transform math, no socket/print-logic change.

## 1. Inherited from Plan (Verification Matrix results)

### BUG-703 — aggregator tile tap no-op in live channel/table layout (MEDIUM)
| Edit | File | Change | Self-Test |
|---|---|---|---|
| 1 | `components/dashboard/ChannelColumn.jsx` (:53 destructure, :338 TableCard render) | destructure + forward `onAggregatorView` to `<TableCard>` | ✅ code verified, webpack clean |
| 2 | `components/dashboard/ChannelColumnsLayout.jsx` (:75 destructure, :215 ChannelColumn render) | destructure + forward `onAggregatorView` to `<ChannelColumn>` | ✅ code verified |
| 3 | `pages/DashboardPage.jsx` (:2077) | pass `onAggregatorView={handleAggregatorView}` to LIVE `<ChannelColumnsLayout>` | ✅ code verified |

Handler/state/popout pre-existed (`handleAggregatorView` :1479, `aggregatorViewOrder` :485, `<AggregatorOrderPopOut>` :1950). `TableCard` already consumes `onAggregatorView` (:57-59, tap at :317).

### BUG-742 — custom-item KOT not printed on first placement (CRITICAL, printing)
| Edit | File | Change | Self-Test |
|---|---|---|---|
| 4 | `api/transforms/orderTransform.js` (:2336, inside `customItemFromAPI`) | add `station: data.station_name \|\| null` | ✅ code verified, webpack clean |

Field-name parity confirmed read-only: `productTransform.js:106` maps `station: api.station_name`; `get-products-list` returns `station_name="KDS"`, `station_source="category"` (evidence `evidence/BUG-742/PRODUCT_STATION_PROBE_2026-11-20.md`).

## 2. Test cases to execute (preprod — needs owner/live data)
Login: `owner@thegoankitchen.com` / `Qplazm@10`.

| # | Item | Steps | Expected |
|---|---|---|---|
| T1 | BUG-703 | Channel/table mode → tap an **accepted** Swiggy/Zomato tile that has an order | `AggregatorOrderPopOut` opens read-only |
| T2 | BUG-703 | Aggregator tile with **no** order | still no-op (unchanged) |
| T3 | BUG-703 | Non-aggregator table tile | normal open-modal (unchanged) |
| T4 | BUG-703 | Grid/old layout aggregator + OrderCard aggregator | unchanged (out of scope) |
| T5 | BUG-742 | Add a **custom item** (category mapped to a station e.g. KDS) → place order **first time** | KOT prints to that station immediately; payload carries `station` + non-empty `printer_agent` |
| T6 | BUG-742 | Custom item in a category with **no** station | no KOT (null contract preserved) |
| T7 | BUG-742 | Normal menu item + reprint of a custom item | unchanged |

## 3. OWED dev-test (blocks "sufficient" for BUG-742 — do during QA/smoke)
Add a custom item on preprod and inspect `POST /api/v2/vendoremployee/product/add-single-product` → confirm `response.data.data.station_name` is populated from the chosen category. Overwhelmingly expected (same product entity as `get-products-list`). If **absent** → the one-liner is insufficient → escalate.

## 4. Registry Sync Confirmation
- Registry synced: YES (BUG-703, BUG-742 → `GATE_5A_IMPLEMENTED`, sprint `nov_cr_batch`)
- BUG_TRACKER.md rows updated ✅ · FILE_OWNERSHIP.md rows added ✅ · code markers `// BUG-703` / `// BUG-742` in all 4 files ✅
- Webpack: compiled successfully, 0 new warnings
- EXIT GATE: 5/5 PASS

## 5. Conflict note
`orderTransform.js` is an R5 hotspot shared with **CR-552** (PLANNING, edits `fromAPI.order`). BUG-742 edit is in the isolated `customItemFromAPI` fn — no line overlap; coordinate commit order.

## 6. Risk / regression
Pure additive prop threading (BUG-703) + single additive field read (BUG-742). Rollback = revert the prop additions / remove the one line. BUG-742 is CRITICAL (printing) → run an **E2E print** test before owner sign-off.
