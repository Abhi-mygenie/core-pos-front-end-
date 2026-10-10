# Session Handover — 2026-09-11 — BUG-395 Addendum-2 Fix + CR-378 Intake

**Date:** 2026-09-11
**Sprint:** pos_7_0
**Agent roles used:** INVESTIGATION → BUG FIX → INTAKE
**Registry items at session start:** 644 | **At session close:** 645 (CR-378 added)
**Self-assessment — Registry synced:** YES | **Scope drift:** NONE

---

## 1. BUG-395 Addendum-2 — house/floor gap (BUG FIX role)

**Root cause confirmed by investigation + live CRM probe:**
`fromAPI.crossRestaurantAddress` in `customerTransform.js` was missing `house`, `floor`, `road`,
`contactPersonName`, `contactPersonNumber`. CRM `/pos/address-lookup` returns all these fields
(confirmed: `house: 'G-12'`, `floor: '1'` for customer 9696759712 on Hogwarts), but the transform
silently dropped them. `selectedAddress` in OrderEntry arrived with `house = undefined`,
`floor = undefined` → `buildDeliveryAddress` sent `null` to backend; `buildBillPrintPayload`
emitted `''` for `deliveryCustHouse`/`deliveryCustFloor`.

**Fix applied:**
- File: `src/api/transforms/customerTransform.js`
- Lines: L199-210 (5 fields added to `crossRestaurantAddress`)
- Code marker: `// BUG-395 addendum-2` at L195
- Compile: `webpack compiled successfully` — 0 new warnings

**Testing agent result:**
- Code fix: ✅ VERIFIED (5 fields confirmed present at L199-210)
- End-to-end UI test: ⚠️ INCOMPLETE (POS navigation complexity blocked automation)
- **Manual owner verification required:** Login as `owner@hogwarts.com`, create delivery order, search `9696759712`, select first address, check Network → order-temp-store/place-order payload for `deliveryCustHouse: "G-12"` and `deliveryCustFloor: "1"`

**EXIT GATE: 5/5 PASS**
**QA handover:** `handover/QA_HANDOVER_BUG395_ADDENDUM2_2026_09_11.md`

---

## 2. CR-378 — Sidebar Profile: Show Restaurant Name (INTAKE role)

**Registered:** CR-378
- Title: Sidebar Profile — Show Restaurant Name Alongside Restaurant ID
- Type: CR | Priority: P2 | Risk: LOW
- Area: Sidebar / Profile Section
- Sprint: pos_7_0
- Code reality: NONE | Duplicate check: DISTINCT | Blast radius: SMALL (1 file, 1 line)
- Fast Lane eligible: YES — awaiting owner OD-378-02 approval
- Intake doc: `change_requests/CR-378_SIDEBAR_RESTAURANT_NAME_INTAKE.md`
- Fix sketch: Change `Sidebar.jsx:820` from `#${restaurant.id}` to `${restaurant.name} · #${restaurant.id}`

---

## 3. Registry State — pos_7_0 Sprint (updated)

| ID | Gate | Status |
|----|:----:|--------|
| BUG-390, CR-373, BUG-392, CR-374, BUG-391, BUG-395 | 5 | IMPLEMENTED — QA PENDING |
| BUG-394 | 3 | GATE 3 COMPLETE — Awaiting Gate 4 GO |
| **CR-378** | **1** | **INTAKE COMPLETE — Fast Lane eligible (OD-378-02 open)** |
| CR-376 | 1 | All ODs locked — awaiting Gate 2 GO |
| CR-377 | 1 | 5 ODs open — owner to lock |

---

## 4. Immediate Priorities for Next Agent

1. **Owner verifies BUG-395 addendum-2** manually on preprod (Hogwarts, 9696759712, first address → check house/floor in Network payload)
2. **OD-378-02:** Owner approves Fast Lane for CR-378 → IMPLEMENTATION agent applies 1-line fix to Sidebar.jsx:820
3. **Gate 4 GO for BUG-394** → 18 edits, 4 files, plan ready
4. **Run Batch A QA** (`QA_HANDOVER_BATCH_A_2026_09_10.md`)

---

## 5. Evidence Artifacts

| File | Description |
|---|---|
| `evidence/BUG-395/crm_address_lookup_hogwarts_9696759712.json` | Live CRM probe — confirms `house: 'G-12'`, `floor: '1'` in API response |
| `investigations/INV-BUG395-FLOOR-HOUSE-2026-09-11.md` | Full investigation report |
| `investigations/INV-SIDEBAR-RESTAURANT-NAME-2026-09-11.md` | CR-378 investigation note |
| `handover/BUG_FIX_REPORT_BUG395_ADDENDUM2_2026_09_11.md` | Fix report |
| `handover/QA_HANDOVER_BUG395_ADDENDUM2_2026_09_11.md` | QA handover |
| `change_requests/CR-378_SIDEBAR_RESTAURANT_NAME_INTAKE.md` | Intake doc |

---

*Session closed: 2026-09-11*
*Registry: 644 → 645 (CR-378 added). Code changes webpack-clean. Gate violations: NONE.*
