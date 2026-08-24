# Session Handover — 2026-08-17 INTAKE + INVESTIGATION SESSION CLOSE

**Date:** 2026-08-17
**Roles used:** INTAKE × 3 batches, INVESTIGATION × 4
**Status:** SESSION CLOSED
**Registry:** 511 → 540 items (+29 new)

---

## Session Summary

Full intake + investigation session. No code written. All items registered, all owner decisions deferred to Gate 2.

---

## All Items Registered This Session

### BUGS (8)

| ID | Title | P | Risk | Code Reality | Fast Lane | Blocked |
|----|-------|---|------|--------------|-----------|---------|
| BUG-328 | Discount Type Configuration Not Accessible | P1 | HIGH | FULL | NO | — |
| BUG-329 | Table Management Nav Redirects to All Settings | P1 | MEDIUM | FULL | ELIGIBLE | — |
| BUG-330 | Payment Methods Not Visible Until Admin Activation | P1 | HIGH | PARTIAL | NO | — |
| BUG-331 | Menu Item Can Be Added Without Item Name | P1 | HIGH | FULL | ELIGIBLE | — |
| BUG-332 | Printer Wizard: Station Input Is Free-Text (Should Be Dropdown) | P1 | LOW-MEDIUM | FULL | ELIGIBLE | — |
| BUG-333 | New Order Always Opens as Walk-In (Hardcoded) | P1 | LOW | FULL | ELIGIBLE | — |
| BUG-334 | Pre-Place Table Switch Clears Food Cart | P1 | MEDIUM | FULL | ELIGIBLE | — |
| BUG-335 | PG Payment Triggers Immediate OrderEntry Close | P1 | HIGH | FULL | NO | — |

### CHANGE REQUESTS (17)

| ID | Title | P | Risk | Code Reality | Blocked |
|----|-------|---|------|--------------|---------|
| CR-147 | Delivery Charge with Distance Calculation | P1 | HIGH | PARTIAL | — |
| CR-148 | Popular Food Category | P2 | MEDIUM | PARTIAL | — |
| CR-149 | Remove Coming-Soon Settings Tiles (Printers/OpHours/Cancel) | P2 | LOW | FULL | — |
| CR-150 | Purchase Report in New POS | P1 | HIGH | NONE | Backend endpoint |
| CR-151 | Sub Recipe Excel Upload | P2 | MEDIUM | PARTIAL | Backend endpoint |
| CR-152 | Test Connection for LAN Printer | P2 | LOW | NONE | Depends on Printers feature |
| CR-153 | Wastage Report / Top Wasted Items | P1 | HIGH | PARTIAL | Backend confirm |
| CR-154 | Settings Flags for Central Inventory | P1 | HIGH | NONE | Backend contract |
| CR-155 | Move Addon Stock + Variation Stock to Menu Management | P1 | MEDIUM | FULL | — |
| CR-156 | Table Number in Cancellation Reports | P2 | MEDIUM | PARTIAL | Backend endpoint missing field |
| CR-157 | Food Court Report | P1 | HIGH | PARTIAL | Backend API contract pending |
| CR-158 | GST/VAT Validate Button in Menu Management | P1 | HIGH | PARTIAL | — |
| CR-159 | Bulk Delete in Menu Management | P1 | HIGH | PARTIAL | Backend bulk delete endpoint |
| CR-160 | Printer Mapping Screen (Employee → Printer) | P1 | HIGH | NONE | API READY ✅ |
| CR-161 | Station Management + Printing Mode Screen | P1 | HIGH | NONE | API READY ✅ |
| CR-162 | Mid-Stay Partial Payment for Room Orders | P1 | HIGH | PARTIAL | Backend endpoint confirm |
| CR-163 | Move Food Items from Room to Table | P1 | HIGH | PARTIAL | Backend confirm TRANSFER_FOOD |
| CR-164 | Send Payment Link from Daily Reports | P1 | LOW-MEDIUM | NONE | — |

### INVESTIGATIONS (4)

| ID | Title | Outcome |
|----|-------|---------|
| INV-ROOM-001 | Room: Partial Payment + Food-to-Table Transfer | Case 1A works; Case 1B → CR-162; Case 2 → CR-163 |
| INV-OE-001 | Default Walk-In + Pre-Place Table Cart Clear | → BUG-333, BUG-334 |
| INV-PG-001 | PG Link Close Behavior + Reports Payment Link | → BUG-335, CR-164 |
| BUG-332 | Printer Wizard Station Dropdown | Root cause confirmed; Fast Lane eligible |

---

## Fast Lane Queue (5 items — owner approval needed per item)

| ID | Title | File | Lines | Say to proceed |
|----|-------|------|-------|----------------|
| BUG-329 | Table Mgmt nav wrong path | `Sidebar.jsx` | ~1 | `FAST LANE APPROVED for BUG-329` |
| BUG-331 | Menu item name validation | `ProductForm.jsx` | ~3 | `FAST LANE APPROVED for BUG-331` |
| BUG-332 | Printer station dropdown | `PrintersTab.jsx` | ~15 | `FAST LANE APPROVED for BUG-332` |
| BUG-333 | Default walk-in | `DashboardPage.jsx` | ~5 | `FAST LANE APPROVED for BUG-333` |
| BUG-334 | Cart clear on table switch | `OrderEntry.jsx` | ~3 | `FAST LANE APPROVED for BUG-334` |
| CR-149 | Remove coming-soon settings tiles | `SettingsPanel.jsx` | ~6 | `FAST LANE APPROVED for CR-149` |

---

## Backend Items Needed Before Gate 3

| Item | Backend Action Needed |
|------|-----------------------|
| CR-147 | Distance-based delivery charge endpoint |
| CR-150 | Purchase report endpoint |
| CR-151 | Bulk sub-recipe upload endpoint |
| CR-153 | Wastage report endpoint + cost_impact field |
| CR-154 | Central inventory flag field name + API |
| CR-156 | Add `table_no` to cancellation report endpoint |
| CR-157 | Food court report API contract (owner to share) |
| CR-159 | Bulk delete endpoint for menu items |
| CR-162 | `receive_balance` update endpoint for active rooms |
| CR-163 | Confirm `/transfer-food-item` accepts room as `from_order_id` |

---

## Owner Decision Policy

All owner decisions for all items are **deferred to Gate 2 (Planning)**. Owner confirmed answers will be provided during impact analysis sessions. Planning agent must collect answers before writing implementation plans.

---

## Next Session Recommendations

**Priority order for Gate 2 planning:**
1. Fast Lane items (BUG-329, BUG-331, BUG-332, BUG-333, BUG-334, CR-149) — quick wins
2. API-ready CRs: CR-160 + CR-161 (backend done, just build the screens)
3. CR-158 (GST/VAT validate button — clean code, unblocked)
4. CR-155 (Addon/Variation Stock move — code exists, relocation only)
5. P1 blocked items — raise backend briefs in parallel

---

## Environment State
- **Frontend:** RUNNING — `webpack compiled with 1 warning` (pre-existing)
- **Branch:** `main`
- **Preview URL:** `https://react-front-end.preview.emergentagent.com`
- **Registry:** 540 items total
