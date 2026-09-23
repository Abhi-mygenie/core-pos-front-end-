# BUG-451 — Product list capped at `limit: 500` on boot / refresh — items 501+ never loaded — INTAKE 2026-09-23

Source: **OWNER-REPORTED** ("some offset or limit defined in front end for menu or other items. Backend provided curl with limit=500. limit needs to extend.") → investigated 2026-09-18 as `INV-LIMIT-001` (`investigations/INVESTIGATION_2026_09_18_LIMIT_OFFSET_PRODUCTS.md`) → validated + registered 2026-09-23 (INTAKE role, ALPHA v0.7).
Sprint: **`sep_bug_closure`** (owner 2026-09-23). Gate: **1 (INTAKE)**.

## Classification
| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (feature broken for any restaurant with > 500 menu items; no workaround; items silently missing from Order Entry, BulkEditor, Menu) |
| Risk | **HIGH** — `LoadingPage.jsx` is an R5 hotspot; change is an API request parameter |
| RCA classification | DATA_EDGE |
| Confidence | **SUSPECTED** (agent code-traced; owner-supplied backend curl uses `limit=500`; backend max not yet probed) |
| Code reality | **NONE** — no fix present at HEAD `1be4055` (remote `b2db5a01`) |
| Fast Lane eligible | NO (4 files, R5 hotspot) |
| Planning skip eligible | NO |

## Symptom
Restaurants with more than 500 products: items 501+ are never requested, never stored in `MenuContext`, never visible anywhere in the POS. Fails silently — no error, no toast.

## Evidence
- Screenshot: not provided
- Steps to reproduce: log in as a restaurant with > 500 products → Order Entry / Menu → count products; compare with backend `get-products-list?limit=1000&offset=1&type=all`
- Curl output: **not yet captured** (INV-LIMIT-001 did not curl-probe — R11 gap; Planning must probe backend max `limit` before Gate 3)
- Code grep: `evidence/BUG-451/BUG-451_code_grep_2026_09_23.txt`
- Source: OWNER-REPORTED
- Confidence: SUSPECTED

## RCA (code-read, confirmed against HEAD 2026-09-23)
| # | File | Line | Current | Effect |
|---|---|---|---|---|
| 1 | `src/pages/LoadingPage.jsx` | 422 | `productService.getProducts({ limit: 500, offset: 1, type: 'all' })` | Boot fetch — hard cap 500 |
| 2 | `src/hooks/useRefreshAllData.js` | 29 | same call, `limit: 500` | Manual refresh — same cap |
| 3 | `src/api/services/productService.js` | 28 (`getAllProducts`) | `limit: 500` | Same cap |
| 4 | `src/api/constants.js` | 463–467 | `PAGINATION.DEFAULT_LIMIT: 100 // Load all for caching` | Stale dead default (comment wrong); any new bare `getProducts()` caller inherits 100 |
| — | `src/api/services/insightsService.js` | 62 | `limit: 10000` | Already safe |
| — | `settingsService.js:27`, `insightsService.js:64`, `LoadingPage.jsx:491` | cancellation reasons `limit: 100` | LOW — out of scope, noted |

Data flow: `LoadingPage` → `productService.getProducts` → `GET /api/v1/vendoremployee/get-products-list?limit=500&offset=1&type=all` → `fromAPI.productListResponse()` → `MenuContext.setProducts` → BulkEditor / OrderEntry read from context. **Break point:** single fetch, no pagination loop; items 501+ never requested.

## Duplicate check
**DISTINCT.** Searched `registry.json`, `BUG_TRACKER.md`, `CR_REGISTRY.md`, `OPEN_GAPS_REGISTER.md` for `limit`, `500 items`, `product.*limit`, `PAGINATION` — no prior item. Related (same files, last 30 days): none open.

## Blast radius
- `getProducts|getAllProducts` references: 6 · `PAGINATION.` references: 5 (see evidence)
- Files to change: 4 (3 param edits + 1 constant) — **MEDIUM (3–5 files)**
- Hotspots touched: **YES — `LoadingPage.jsx` (R5)**; param-only edit, no sequencing change

## Owner decisions (OPEN — carried from INV-LIMIT-001; the investigation contradicted itself: §7 "decision needed" vs §8 "no decisions needed")
| # | Decision | Status |
|---|---|---|
| OD-451-01 | Target `limit` value | **LOCKED 2026-09-23 — 2000** (owner "ok" to agent recommendation). Planning must curl-probe that the backend accepts `limit=2000` before Gate 3 (R11). |
| OD-451-02 | Fix the stale `PAGINATION.DEFAULT_LIMIT: 100` in the same change | **LOCKED 2026-09-23 — YES** |

## Investigation-doc validation notes (2026-09-23)
All 5 cited call sites verified line-exact. Gaps in the source doc: no curl evidence (R11), no item-level risk label (R21), no duplicate-check section, OD contradiction §7/§8. Doc itself **not modified** (owner instruction).

## Next
**GATE 1 CLOSED — 2026-09-23 (owner).** Planning Gate 2 (Impact Analysis) — must include: backend `limit=2000` probe (R11, save to `evidence/BUG-451/`), R5 regression checklist for `LoadingPage.jsx` boot sequencing (param-only, but checklist mandatory).
