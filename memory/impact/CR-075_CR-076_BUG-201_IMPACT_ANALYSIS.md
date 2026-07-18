# Impact Analysis — CR-075 + CR-076 + BUG-201

**Gate:** 2 (Impact Analysis) — Gate 3 (Plan) will follow after owner clears blockers
**Author role:** PLANNING (per AGENT_PROMPT_ALPHA v0.7 §Role Decision Tree row 2)
**Date:** 2026-07-18
**Sprint:** pos_5_0
**Bundle rationale:** All three items share the Inventory / Expense surface; CR-076 is a direct dependency of CR-075 §P3 (Invoice Upload); BUG-201 shares `ExpenseSetupPanel.jsx` with recently-shipped CR-074-B — planning them together prevents rework.

---

## HEADER — MANDATORY CHECKS (§Planning Boot)

### Code Reality Check (§Step 0)

| Item | Reality | Notes |
|---|---|---|
| CR-075 S1 (export blob→url) | **PARTIAL** — buggy code exists at `inventoryService.js:68` + `InventoryDashboardPanel.jsx:65` | Needs surgical replacement, not new build |
| CR-075 S2/S3/S5 (filter UX, chips, error display) | **NONE** | Filters compute correctly but no chip UI / no per-field errors |
| CR-075 P1–P4 (Purchase form UX) | **NONE** | Form exists (`PurchaseEntryPanel.jsx`), UX/error/typeahead absent |
| CR-075 P5 (Purchase→Receive conditional) | **NONE** — `restaurant_type_flag` not read anywhere in codebase | Confirmed via `grep -r "restaurant_type_flag" /app/frontend/src/` → 0 hits |
| CR-075 P6 (batch/expiry payload) | **PARTIAL** — UI collects, transform drops silently | 2-line fix in `inventoryTransform.js` per audit doc |
| CR-075 PC1/PC2 (Physical Count → Stock Audit + wastage record) | **NONE** | Screen exists (`PhysicalCountPanel.jsx`), no wastage log guarantee |
| CR-076 (S3 upload) | **NONE** — no S3 client, no invoice endpoint | Multipart infra exists (menu/room/table services), reusable |
| BUG-201 (cascade warning) | **NONE** — current code uses `window.confirm("Delete?")` | Item delete cascades silently on backend |

### Conflict Pre-Check (§Step 1)

| Target file | Last modifier | Date | Overlap with this bundle | Conflict? |
|---|---|---|---|---|
| `components/inventory/InventoryDashboardPanel.jsx` | CR-072 impl (2026-07-15) | — | Whole file replaced by CR-075 UX work | **None active** — CR-072 CLOSED |
| `components/inventory/PurchaseEntryPanel.jsx` | CR-072 impl (2026-07-15) | — | Whole file rewritten in CR-075 | **None active** — CR-072 CLOSED |
| `components/inventory/PhysicalCountPanel.jsx` | CR-072 impl (2026-07-15) | — | Renamed + wastage-log logic added | **None active** — CR-072 CLOSED |
| `api/services/inventoryService.js` | CR-072 + BUG-197 | 2026-07-17 | Adds vendor list, receive endpoints, export fix | **None active** — BUG-197 IMPLEMENTED (queued for QA) |
| `api/transforms/inventoryTransform.js` | CR-072 + BUG-197 | 2026-07-17 | Adds vendor fromAPI + batch/expiry to payload | **None active** |
| `api/constants.js` | Multiple owners | Recent | Add S3 + RECEIVE endpoints | **None active** |
| `contexts/RestaurantContext.jsx` | Long-standing | — | Add `restaurantTypeFlag` + `parentRestaurantId` | **None active** |
| `api/transforms/authTransform.js` OR `profileTransform.js` | CR-013 series (stable) | Older | Emit `restaurant_type_flag` from profile response | **None active** (LOW-risk field add) |
| **`components/expense/ExpenseSetupPanel.jsx`** (BUG-201 target) | CR-074-B + BUG-202 + BUG-203 | **2026-07-17** (yesterday) | Delete-item handler = BUG-201's target | ⚠ **HOT — file at 1,772 lines with 8 recent modifiers.** Must read latest state before editing. Highest-risk file in the bundle. |
| `api/services/expenseService.js` | CR-074-B, BUG-152, BUG-203 | 2026-07-17 | Pre-delete count helper if backend endpoint exists | ⚠ Very active — read latest |

**No BLOCKING conflict**, but ExpenseSetupPanel.jsx must be entered with §Step 0 entry-verification during Implementation.

### FILE_OWNERSHIP.md Gap (§R1)
`grep Inventory /app/memory/control/FILE_OWNERSHIP.md` returns **0 hits** — all inventory files created by CR-072 were never registered in FILE_OWNERSHIP. This is a doc-drift **OPEN GAP** to file under `OPEN_GAPS_REGISTER.md` regardless of this CR's outcome.

---

## RISK CLASSIFICATION (§R21)

| Item | Risk | Trigger |
|---|---|---|
| **CR-075** | **HIGH** | Financial payload (Purchase Amount, Rate, batch), conditional endpoint routing (Receive vs Purchase), wastage-log write-path, 6 files, ~225 lines |
| **CR-076** | **MEDIUM** | New service layer, external system (S3) — but scoped to file storage, not order/billing. Upgrade to HIGH if presigned-URL flow requires FE holding IAM credentials |
| **BUG-201** | **HIGH** | Cascading deletion of financial transactions (expense records). Silent data destruction risk. Touches HIGH-traffic 1,772-line file |

**Fast Lane eligibility:** ❌ NONE — all three exceed LOW risk / hotspot / financial-logic criteria (§Fast Lane rules).

---

## §Step 2 — DATA FLOW TRACES

### A. CR-075 — Inventory UX

```
[STOCK DASHBOARD]
  Backend GET /stock-inventory (27 keys per row) 
  → inventoryTransform.js:65 fromAPIStockItem (isLowStock = !!is_low_stock)
  → InventoryDashboardPanel.jsx state (105 items, 12 low, 3 out) 
  → UI: KPI cards + <select> filter + <table>
  → Export click → inventoryService.exportStock({responseType:'blob'})  ← BROKEN
                → backend returns JSON {download_url}
                → createObjectURL(new Blob([res.data]))  ← breaks
  BREAK POINT: responseType: 'blob' at inventoryService.js:68

[PURCHASE ENTRY]
  User → PurchaseEntryPanel.jsx (vendorName free text, lines with batch/expiry inputs)
  → Submit → inventoryTransform.js addPurchase() → sends {Ingredient, Unit, quantity, rate, Amount, converion_factor}
  → BROKEN: batch, expiry, vendorId dropped silently
  → POST /add-stock
  BREAK POINT: transform omits batch/expiry/vendorId — confirmed via curl audit
```

### B. CR-076 — S3 Upload

```
User picks file → <input type="file"> (does NOT exist yet)
  → s3UploadService.js (does NOT exist)
     Option A (presigned): GET /files/presigned-url → PUT to S3 → return url to caller
     Option B (proxy):     POST /files/upload multipart → backend → S3 → return url
  → Consumers: PurchaseEntryPanel invoice + RoomCheckin docs
  BREAK POINT: entire pipeline is 0% built. Approach not decided.
```

### C. BUG-201 — Cascade Deletion

```
User clicks delete on item → ExpenseSetupPanel.jsx deleteItem()
  → window.confirm("Delete?")  ← insufficient warning
  → expenseService.deleteExpenseItem(id) → DELETE /expense/expenses/{itemId}
  → Backend: removes item + cascade deletes all expense_transactions with item_id
  BREAK POINT: user never told transactions will be destroyed.
  DATA LOSS: ₹-amount of transactions vanish from reports silently.
```

---

## §Step 2 — AFFECTED FILES & LINE ESTIMATES

### Files WILL change (14)

| # | File | CR/BUG | Change | Δ lines |
|---|---|---|---|---|
| 1 | `components/inventory/InventoryDashboardPanel.jsx` | CR-075 S1/S2/S3/S5 | Export use download_url + status chips + filter count/clear + error surfacer | ~80 |
| 2 | `components/inventory/PurchaseEntryPanel.jsx` | CR-075 P1/P2/P4/P6 + CR-076 A | Vendor typeahead, error display, red *, Rate/Payment validation, invoice picker, conditional title | ~110 |
| 3 | `components/inventory/PhysicalCountPanel.jsx` | CR-075 PC1/PC2 | Rename → StockAuditPanel; confirm dialog; wastage-log call path | ~50 |
| 4 | `pages/InventoryPhysicalCountPage.jsx` OR new `StockAuditPage.jsx` | CR-075 PC2 | Route + title rename | ~5 |
| 5 | `api/services/inventoryService.js` | CR-075 S1/P2/P5 + P6 | Remove blob responseType; add getVendors; add addReceive; keep addPurchase | ~25 |
| 6 | `api/transforms/inventoryTransform.js` | CR-075 P5/P6 + vendors | Vendor fromAPI, batch/expiry to payload, `addReceive` variant | ~30 |
| 7 | `api/constants.js` | CR-075 P5 + CR-076 | RECEIVE_STOCK, GET_VENDORS, S3_PRESIGN or S3_PROXY endpoints | ~8 |
| 8 | `contexts/RestaurantContext.jsx` | CR-075 P5 | Expose `restaurantTypeFlag`, `parentRestaurantId`, `isMasterOutlet` selector | ~15 |
| 9 | `api/transforms/authTransform.js` OR `profileTransform.js` | CR-075 P5 | Emit two new fields into context | ~5 |
| 10 | `api/services/s3UploadService.js` (NEW) | CR-076 | Upload + progress + error API surface | ~90 |
| 11 | `components/common/FilePicker.jsx` (NEW) | CR-076 | Reusable file picker (accept, size validation, thumbnail) | ~70 |
| 12 | `components/room/checkin/*` (TBD which file) | CR-076 B | Wire FilePicker for guest docs | ~40 |
| 13 | `components/expense/ExpenseSetupPanel.jsx` | BUG-201 | Cascade-warning dialog + pre-delete count fetch + informational category delete warning | ~90 |
| 14 | `api/services/expenseService.js` | BUG-201 | `preDeleteItemCheck(id)` — pending backend answer OQ-BUG201-1 | ~15 |

### Files WILL NOT touch (scope lock — §R14)

- Order flow (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`) — no financial-cart intersection
- `orderTransform.js`, `menuManagementTransform.js` — different domain
- Any HIGH-RISK R5 file except intentional ones listed above
- Menu Management `BulkEditor.jsx` — despite similar UX pattern, out of scope
- Payment/settlement/tax — not touched
- Auth flow — only field passthrough in authTransform, no logic change

### Estimated total

**~633 lines across 14 files** (11 modified, 3 new). CR-075 alone ≈ 335 lines; CR-076 ≈ 200 lines (mostly new); BUG-201 ≈ 105 lines.

---

## §Step 2 — DOWNSTREAM CONSUMERS

| Change | Consumers to verify |
|---|---|
| `RestaurantContext` shape change | Every `useRestaurant()` caller (grep found 1+ in `useSocketEvents.js`) — new fields are additive, no breakage |
| `inventoryTransform.addPurchase` gains batch/expiry | Consumers: PurchaseEntryPanel only |
| `expenseService.deleteExpenseItem` wrapped with pre-check | ExpenseSetupPanel bulk-delete path (CR-074-B added) — must gate same warning |
| `PhysicalCountPanel` → `StockAuditPanel` rename | Sidebar.jsx label, App.js route, any deep-links from dashboard |
| S3 service | Purchase + Room Check-in initially; potential future consumers (menu image upload already uses multipart) |

---

## §Step 2 — HIGH-RISK NOTES & MITIGATIONS

1. **ExpenseSetupPanel.jsx (1,772 lines, 8+ recent modifiers)** — MANDATORY §Implementation Step-0 entry verification: view current delete handler line-range BEFORE editing.
2. **Silent data destruction risk (BUG-201)** — cascade warning MUST fire before delete API call, not after. Any bug here = production data loss.
3. **Conditional Purchase→Receive routing (CR-075 P5)** — a wrong `restaurant_type_flag` read could push a "normal" restaurant into "master" flow (wrong endpoint, wrong payload). Add explicit default `'normal'` when field missing.
4. **S3 credentials in FE** — if we go presigned-URL route, backend must generate; NEVER embed AWS access key in FE (§R20).
5. **`isLowStock` semantics (CR-075 S4)** — owner ruled: threshold ≠ static, computed from consumption over selectable window (7d/14d/1mo). This requires a **new backend endpoint** — out of scope for CR-075. Ship current is_low_stock behaviour + park EP-1 as backend brief.

---

## §Step 4 — VERIFICATION MATRIX (seeds QA handover — not exhaustive; final list in Gate 3 plan)

| # | File | Change | Verification | Auto? |
|---|---|---|---|---|
| 1 | inventoryService.js | export uses JSON not blob | Unit: `exportStock()` response.data has `download_url` string | YES |
| 2 | InventoryDashboardPanel.jsx | download_url triggers window.open | Browser: click Export → new tab opens xlsx | NO |
| 3 | InventoryDashboardPanel.jsx | status chips replace select | Browser: filter interactions + count visible | NO |
| 4 | PurchaseEntryPanel.jsx | vendor typeahead loads /get-vendor | Curl-probe /get-vendor + browser autocomplete select | Both |
| 5 | PurchaseEntryPanel.jsx | batch/expiry in payload | Network tab: POST /add-stock body includes `batch` + `expiry_date` DD-MM-YYYY | NO |
| 6 | inventoryTransform.js | vendorId sent when selected | Unit: addPurchase output includes vendorId when set | YES |
| 7 | RestaurantContext.jsx | restaurantTypeFlag surfaced | Unit: context value has key with correct default | YES |
| 8 | PurchaseEntryPanel.jsx | Master outlet shows "Receive Stock" | Manual: switch flag + reload → title & endpoint change | NO |
| 9 | PhysicalCountPanel.jsx | Wastage log created on negative drift | Curl-probe: POST add-stock then GET wastage-list; entry present | NO |
| 10 | ExpenseSetupPanel.jsx | Cascade dialog fires when transactions>0 | Browser: delete item with tx → dialog with count + amount | NO |
| 11 | ExpenseSetupPanel.jsx | Standard confirm when transactions=0 | Browser: delete unused item → simple confirm | NO |
| 12 | s3UploadService.js | Upload returns URL | Unit + browser: pick PDF → URL returned + preview shown | Both |
| 13 | Both callers (Purchase, RoomCheckin) | URL persisted to backend | Network: submit form → invoiceUrl/docUrl in payload | NO |

---

## §Step 5 — POST-CODE REGISTRY CHECKLIST (Implementation agent must run)

```
- [ ] registry.json: CR-075 → IMPLEMENTED, sprint_key: pos_5_0
- [ ] registry.json: CR-076 → IMPLEMENTED (or PARTIAL if only §A shipped)
- [ ] registry.json: BUG-201 → IMPLEMENTED (Phase 1 only — role gate deferred to CR-071)
- [ ] CR_REGISTRY.md rows updated for CR-075, CR-076
- [ ] BUG_TRACKER.md row updated for BUG-201 with note "Phase 2 role-gate deferred to CR-071"
- [ ] FILE_OWNERSHIP.md — first-ever inventory entries added + expense/room lines updated
- [ ] Code markers // CR-075 / // CR-076 / // BUG-201 present in every modified file
```

---

## OPEN QUESTIONS — MUST RESOLVE BEFORE EXITING GATE 2

Owner directive: "all blocker should be resolved during this gate". Presenting all 13 blockers below in the format §Owner Approval Matrix expects.

### CR-075 blockers (8)

| # | Question | Impact if left open | Recommended default |
|---|---|---|---|
| **B1** | **Payment Method mandatory on Purchase?** (OQ-3) | Blocks P4 validation code | **YES — mandatory** (accounting hygiene) |
| **B2** | **Rate ≥ 0 or > 0?** (OQ-4) | Blocks P4 validation | **≥ 0** (allow free samples / donation entries; UI hint "0 = free/sample") |
| **B3** | **Receive endpoints MD file** for master-outlet flow (OQ-5, OQ-6) | Blocks P5 entirely — cannot code without endpoints | **DEFER P5 to a follow-up (CR-075-B)** until owner shares MD; ship the rest as CR-075-A |
| **B4** | **Batch/Expiry — send or remove?** (P6) | UI shows fields; transform drops them | **Send them** (Option C→B): batch + expiry_date DD-MM-YYYY. Backend brief for FIFO/expiry reporting queued separately |
| **B5** | **Wastage-log creation on physical count** (OQ-7) | Ships silent data (stock updated, wastage invisible in reports) | **Need curl-verify + backend confirmation**. If not auto-created, FE adds a second call to `add-wastage` |
| **B6** | **Wastage from Stock Audit shown in wastage reports?** (OQ-8) | Reporting scope | **YES** (default expectation) |
| **B7** | **Rename "Physical Stock Count" → "Stock Audit"** (PC2) | Sidebar + route + title changes | **CONFIRM Y/N** — recommended YES per intake |
| **B8** | **`is_low_stock` semantics** (S4) | Owner mentioned consumption-based EP-1 endpoint | **Ship current backend flag now; file EP-1 as backend brief for later** |

### CR-076 blockers (4)

| # | Question | Impact if left open | Recommended default |
|---|---|---|---|
| **B9** | **Direct S3 (presigned) or backend proxy?** (OQ-3) | Determines whole architecture | **Backend proxy** — never ship IAM creds to FE. Backend generates presigned URLs OR proxies upload |
| **B10** | **Bucket + region + endpoint contract** (OQ-1) | Cannot build without contract | Backend team owns the endpoint contract. Need: `POST /files/upload` returns `{url, key}` — or presigned flow via `GET /files/presigned-url?type=invoice` |
| **B11** | **Max file size + accepted types** (OQ-2) | UI validation | **10 MB, PDF+JPG+PNG+WEBP** (default) |
| **B12** | **Room Check-in — which docs + multi-file?** (OQ-4) | Component reuse in room flow | Investigation task inside CR-076-B (defer §B if needed) |

### BUG-201 blockers (2)

| # | Question | Impact if left open | Recommended default |
|---|---|---|---|
| **B13** | **Pre-delete count endpoint** (OQ-BUG201-1) | Cannot count transactions to show in dialog | **Approach A (preferred):** backend brief for `GET /expense/item/{id}/impact` returning `{transaction_count, total_amount}`. **Approach B (fallback):** compute client-side from current expense report data — less reliable but no backend dep |
| **B14** | **Cascade behaviour on aggregation totals** (OQ-BUG201-2) | User expectation on Report screen after delete | Assume backend auto-recalculates totals (standard SQL cascade). Note in fix report; QA to verify report refresh post-delete |

---

## RECOMMENDED SPLIT / DEFERRAL

To avoid a super-CR that stalls on backend, propose splitting into 4 shippable slices:

| Slice | Scope | Blockers remaining | Ship-ready? |
|---|---|---|---|
| **CR-075-A** | Stock export fix, filter chips + counts, error display, vendor typeahead, red-* validation, batch/expiry payload, Stock-Audit rename, cascade confirm dialog | B1, B2, B7 (owner defaults acceptable) | ✅ if owner confirms recommended defaults |
| **CR-075-B** | Purchase → Receive conditional (P5) | B3 (endpoints MD) | ⏸ owner-blocked |
| **CR-075-C** | Wastage-log write from physical count | B5, B6 (backend confirm) | ⏸ backend-blocked |
| **CR-076-A** | S3 upload service + FilePicker + Purchase invoice attachment | B9, B10, B11 | ⏸ backend contract needed |
| **CR-076-B** | Room Check-in doc upload | B12 (investigation) | ⏸ scoped after A |
| **BUG-201 Ph1** | Cascade warning dialog + category informational warning | B13 (Approach A pref, B acceptable fallback) | ✅ if owner accepts Approach B fallback |
| **BUG-201 Ph2** | Role gating on all 3 deletion types | — | ⏸ **DEFERRED to CR-071** (owner ruling in intake) |

---

---

## 🔒 GATE 2 CLOSURE — OWNER DECISIONS (2026-07-18)

All 15 blockers resolved. Bundle reshaped per owner directives below.

### Locked Owner Rulings

| # | Question | Owner ruling |
|---|---|---|
| B1 | Payment Method mandatory on Purchase? | ✅ **YES · mandatory** |
| B2 | Rate can be 0? | ✅ **NO · Rate > 0** (no free samples via UI) |
| B3 | Receive endpoints MD | ✅ received → scope moved to CR-077 |
| B4 | Batch/Expiry in payload | ✅ **SEND** to backend |
| B5 | Wastage log write | ✅ `add-stock` is unified — no extra call |
| B6 | Wastage in reports | ✅ implicit YES |
| B7 | Rename Physical Count → **"Stock Audit"** | ✅ **YES rename** |
| B8 | `is_low_stock` semantics | ✅ ship current flag + consumption-based Intelligence widgets |
| B9 | S3 upload architecture | ✅ **Presigned URL (9-a)** — parked to standalone S3 CR (out of this bundle) |
| B10 | S3 endpoint contract | ✅ **CR-076 removed from this bundle** — becomes standalone CR (env-driven), separate from Inventory |
| B11 | S3 size + types | ✅ 10 MB · PDF/JPG/PNG/WEBP (moved with S3 CR) |
| B12 | Room check-in | ✅ moved with S3 CR |
| B13 | Pre-delete count endpoint | ✅ **Approach A** — backend brief filed (`BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html`) |
| B14 | Cascade totals recompute | ✅ **Assume auto-recalc · all business logic at backend**; QA verifies |
| B15 | Promote P5 → CR-077 | ✅ **YES · new CR-077** (Hierarchy Stock Transfer — Receive/Reject/Return/Dispute) |
| NEW-Q1 | Wastage EVENTS read endpoint | ✅ backend brief filed (`BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html`) — Wastage widgets defer to Phase 2 |
| NEW-Q2 | P&L relevance | ✅ OUT OF SCOPE (Insights section, later) |
| NEW-Q3 | vendor-item-list shape | ✅ shape (b) full purchase history — Cost/Vendor/Recipe widgets unblocked |

### Backend Briefs Filed

| Brief | Blocks | Path | Preview |
|---|---|---|---|
| Wastage Report | Intelligence Widgets A + B (deferred) | `/app/memory/backend_briefs/BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html` | `/backend-briefs/wastage-report-2026-07-18.html` |
| Expense Item Impact | BUG-201-Ph1 cascade-warning dialog | `/app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html` | `/backend-briefs/expense-item-impact-2026-07-18.html` |

### Final Scope Split — 4 shippable slices

| Slice | Contents | Risk | Est. lines | Status |
|---|---|---|---|---|
| **CR-075-A** (this bundle) | Stock export fix, filter chips + counts, error display, vendor typeahead, red-* validation (Rate > 0, Payment Method mandatory), batch/expiry payload, error surfacer, filter clear/count | HIGH | ~285 | ✅ **READY for Gate 3 Plan** |
| **CR-075-B** (this bundle) | Rename Physical Count → Stock Audit (sidebar + route + title + confirm dialog) | MEDIUM | ~55 | ✅ **READY for Gate 3 Plan** |
| **CR-077** — Hierarchy Stock Transfer (NEW CR — must be registered separately) | Pending Queue page + Details drawer + Receive modal (full/partial/dispute) + Reject + Return module | HIGH | 600-900 (8-12 files) | 📋 needs new INTAKE + full Gate 2 cycle of its own |
| **CR-076** — S3 File Upload (separated from bundle) | Presigned-URL upload service + FilePicker + Purchase invoice attach + Room check-in docs (Phase B) | MEDIUM | ~200 (mostly new) | ⏸ **standalone CR-076 — parked, env + backend contract needed** |
| **BUG-201-Ph1** (this bundle) | Cascade-warning dialog + category informational warning · uses new `GET /expense/item/{id}/impact` | HIGH | ~90 | ⏸ **backend-blocked** on brief above |
| **BUG-201-Ph2** | Role gating on all 3 delete types | — | — | ⏸ DEFERRED to CR-071 (per owner ruling in intake) |
| **Intelligence Widgets** — 6 live + 2 deferred | Reorder Forecast · Consumption Trends · Cost Trend · Vendor Performance · Recipe Cost · Low-stock Alerts · Vendor Directory | (part of CR-075) | separate HTML mock first | 📋 mock-first, then Gate 3 |

---

# 🧾 ADDENDUM · FB Round 2 (Mock v5 · 2026-07-18)

Owner reviewed v3 → v4 → v5. Five additional feedback items · all resolved · mock v5 locked as the approved design artifact for CR-075/077/078/079.

## Feedback Log (FB-6 through FB-9 + implicit FB-10)

| # | Feedback | Resolution | Where it lives in v5 |
|---|---|---|---|
| **FB-6** | v4 "suggest" values inconsistent with Gap column (2.5 vs 2.1, 3.1 vs 3.04) | **Rule locked: Suggest = \|Gap\| exactly** (Owner Q1-a). No buffer, no rounding. | Smart Purchase rows: 2.1 / 3.04 / 1.6 / 3.3 |
| **FB-7** | Recipe cost / margin intelligence missing — recipe cards on Recipes Management show `Cost: ₹— · Margin: —%` (locked) | **New "Recipe Cost & Margin" widget** replacing v4 Recipe Cost Impact. Cost/serve · Sale ₹ · Margin % · Δ vs prev. Colour bands: green >50% · amber 30-50% · red <30% (Owner Q7-2 confirmed). Data sources: recipes from `/recipe/get-recipe` × latest rates from `/vendor-item-list` × sale price from `/product/active-foods-list`. Formula shown in footer. Threshold breach flagged (28.3% Kunafa Cheese). | Dashboard 4th row right, anchor `#recipe-margin` |
| **FB-8** | Widgets should link to detailed reports later | **Noted for future CR** — backlogged as candidate CR-08X (Inventory Reports · widget drill-downs). "View details →" affordance added to all 5 primary widgets so operators know detail views are coming. Non-functional in mock. | Present on Reorder Forecast · Consumption Trends · Cost Trend · Recipe Margin · Vendor Performance headers |
| **FB-9** | Master/franchise Receive screen missing from mock (was split into CR-077 during Gate 2) | **Full Receive screen added to v5 mock** (Owner Q9-b). New "Receive" nav pill with count badge. 4 tabs matching backend queue categories · pending-queue table · row-click drawer with per-line Accept / Partial / Dispute / Reject. Real transfer data (TRF-813-2026-0003) with real batch/expiry from `meta_json.segments`. Endpoint paths surfaced in footer. **This mock now covers CR-077 preview too.** | New `#screen-receive` |
| **FB-10** (self-caught) | Gate-2 B1 Payment Method dropped when Purchase flipped item-first | **Restored on per-vendor PO cards** in "Will submit as N vendor POs" section — each vendor gets its own Payment Method dropdown with red `*`. | Smart Purchase grouped-vendor preview |

## Live Signals Captured (Owner-provided creds this round)

Login validated: `owner@palmindia.com` — Palm India (id 816) — `restaurant_type_flag = "franchise"` · `parent_restaurant_id = 813`.

| Endpoint | Method | Purpose | Evidence file |
|---|---|---|---|
| `/api/v1/vendoremployee/profile` | GET | Confirms `restaurants[0].{restaurant_type_flag, parent_restaurant_id}` at existing shape — no backend brief needed for CR-075/CR-077 IA restructure | `/app/memory/evidence/CR-077/profile_master.json` |
| `/api/v2/vendoremployee/inventory-transfer/pending-queues` | **POST** | 6-category queue payload: `approval_pending`, `lateral_approval_pending`, `dispatch_pending`, `receive_pending` (2 rows for Palm India), `receive_dispute_pending`, `my_requests` | `/app/memory/evidence/CR-077/pending_queues.json` |
| `/api/v2/vendoremployee/inventory-transfer/details/{id}` | **GET** | Line-level shape: `{transfer, lines[]}`. Each line has `meta_json.segments[]` carrying batch, expiry_date, purchase_price · plus `stock_source`, `price_status`, `received_at`, `progress.received_qty/rejected_qty` | `/app/memory/evidence/CR-077/transfer_details.json` |
| `/api/v2/vendoremployee/recipe/get-recipe` | GET | 92 recipes with full `ingredients[]` blob — enables recipe cost math client-side | `/app/memory/evidence/CR-075/recipes_list.json` |
| `/api/v2/vendoremployee/product/active-foods-list` | GET | Foods with sale prices for margin calc | `/app/memory/evidence/CR-075/active_foods_list.json` |

## Key Discovery — `restaurant_type_flag` has ≥ 3 values

Confirmed: **`normal`** (Kunafa Mahal · standalone) · **`franchise`** (Palm India · child) · presumed **`master`** (Central Kitchen · parent #813). Impacts CR-077 P5 conditional logic — the flag is a tri-state, not a boolean. Franchise children see the Receive screen; master parents see Dispatch flows (out of this mock's scope).

## Mock Iteration Trail

| Version | Purpose | File |
|---|---|---|
| v2 | Original CR-072 mock (7 screens, no intelligence) | `/app/frontend/public/cr072-inventory-mockup.html` |
| v3 | Added Intelligence tab (9 widgets, 2 locked Phase-2 wastage) | `/app/frontend/public/cr072-inventory-mockup-v3-intelligence.html` |
| v4 | FB-1..5 addendum · IA reshuffle · Smart Purchase introduced | `/app/frontend/public/cr072-inventory-mockup-v4-smartpurchase.html` |
| **v5 · LOCKED** | FB-6..9 · Palm India context · Receive screen · Recipe Cost & Margin widget · Payment Method restored | `/app/frontend/public/cr072-inventory-mockup-v5-full.html` |

Public preview URL for v5: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html`

## Final Split — 5 shippable CRs

| Slice | Contents | Registry action | Gate 3 ready? |
|---|---|---|---|
| **CR-075-A** | Stock/Purchase surface polish (export fix · chips · error display · red-* validation · batch/expiry payload) — original ~285 lines, unchanged | ✅ Ready — no new intake needed | ✅ YES |
| **CR-075-B** | Physical Count → Stock Audit rename | ✅ Ready | ✅ YES |
| **CR-077** (NEW · from B15) | Hierarchy Stock Transfer — Receive/Dispatch/Dispute/Return module (screen designed in v5 mock) | 📋 Needs new INTAKE + own Gate 2 cycle | ⏸ |
| **CR-078** (NEW · from FB-1..3) | Smart Purchase — item-first planner with horizon picker, gap calc, vendor suggestion, per-vendor payment method | 📋 Needs new INTAKE + own Gate 2 cycle | ⏸ |
| **CR-079** (NEW · from FB-5) | Inventory IA restructure — Intelligence-as-Dashboard, Current Stock rename, Sidebar refresh | 📋 Needs new INTAKE | ⏸ |
| BUG-201-Ph1 | Cascade-warning dialog (unchanged) | ✅ | ⏸ backend-blocked on brief |
| CR-076 | S3 File Upload (parked, standalone) | ✅ | ⏸ |
| **CR-08X** (candidate · from FB-8) | Inventory Reports — widget drill-downs | 📋 Backlog only — not yet a CR | — |

## Backend Briefs — Complete Set Filed

| Brief | Status | Blocks |
|---|---|---|
| `BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html` | ✅ Filed | 2 Dashboard wastage widgets |
| `BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html` | ✅ Filed | BUG-201-Ph1 cascade dialog |
| `BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html` | ✅ Filed (this session) | CR-078 optimisation — single-call multi-vendor purchase (Owner Q7-b future) |

## Gate 2 Exit — CLOSED (per §R4)

- ✅ Code Reality Check complete
- ✅ Conflict Pre-Check complete
- ✅ Risk labels current
- ✅ Data flow traces documented
- ✅ Affected files list + scope lock
- ✅ Verification Matrix seeded
- ✅ All 17 original blockers + 5 FB-round decisions RESOLVED
- ✅ 3 backend briefs filed as external dependencies
- ✅ 5-way CR split registered (CR-075-A/B + CR-077 + CR-078 + CR-079)
- ✅ Design artifact locked (mock v5)
- ✅ Live endpoint evidence captured for all critical paths

**Gate 3 (Implementation Plans) is the next planning step — deferred to a fresh session per §Session Closure.**

---

## §Planning final response format

```
Planning complete (Gate 2 · Impact Analysis): CR-075-A, CR-075-B, BUG-201-Ph1
Split-outs: CR-077 (new intake needed) · CR-076 (parked standalone)
Stage: Impact Analysis (Gate 2 CLOSED) — Gate 3 Plan pending owner GO
Code reality: CR-075-A PARTIAL · CR-075-B NONE · BUG-201-Ph1 NONE
Risk: CR-075-A HIGH · CR-075-B MEDIUM · BUG-201-Ph1 HIGH
Files WILL change (this bundle): 9 files, ~430 lines
Files WILL NOT touch: order flow, tax, settlement, orderTransform, menu bulk editor, S3, hierarchy-transfer
Owner decisions: 17/17 RESOLVED
Backend dependencies: 2 briefs filed (wastage report · expense item impact)
Docs: /app/memory/impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md
       /app/memory/backend_briefs/BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html
       /app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html
Next: (1) Intelligence HTML mock v3 (before or in parallel with Gate 3)
      (2) Register CR-077 via INTAKE role (separate session)
      (3) Gate 3 Plan for CR-075-A + CR-075-B (BUG-201-Ph1 waits for backend brief ack)
      (4) Owner Gate 4 GO
```
