# Gate 2 Batch Plan — Impact Analysis
**Date:** 2026-08-18  
**Role:** PLANNING  
**Total INTAKE items:** 63 (deduped)  
**Active batches:** 16 (43 items)  
**Blocked:** 11 items  
**Parked:** 9 items  

---

## ACTIVE BATCHES (16 batches — present to owner one at a time)

### BATCH-01 — P0: GST Gating
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-336 | GST Applied on Bills Even When Disabled in Restaurant Settings | P0 | CRITICAL |
| BUG-338 | Room GST Applied Even When roomGstApplicable = false | P1 | HIGH |
Rationale: Both P0/P1, both GST gating from settings — likely touch `profileTransform.js` + `orderTransform.js`. Highest priority. Separate batch because CRITICAL risk.
File conflict: `orderTransform.js` (hotspot) — Gate 4 must be sequential.

---

### BATCH-02 — Settings Not Gated (today's investigation)
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-330 | Cancel After Serve Not Gated (allowPostServeCancel unused) | P1 | HIGH |
| BUG-331 | Schedule Order Not Gated (schedule_order not in profileTransform) | P1 | MEDIUM |
| BUG-332 | Search By Setting Not Consumed in FE (searchOptions unmapped) | P2 | MEDIUM |
Rationale: All from INV-AUG18-2026. All read `profileTransform.js` + settings context. BUG-330 is planning-skip eligible.
File conflict: `profileTransform.js`, `CartPanel.jsx` — Gate 4 must be sequential within batch.

---

### BATCH-03 — Profile / Settings Page State
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-337 | Profile Not Refreshed After Restaurant Settings Save | P1 | HIGH |
| BUG-339 | Restaurant Type Select Missing 'Food Court' Option | P1 | LOW |
Rationale: Both touch `RestaurantSettingsPage.jsx` / profile context. Small scope, sequential-safe.

---

### BATCH-04 — Order Entry Core Bugs
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-334 | Pre-Place Table Switch Clears Food Cart | P1 | MEDIUM |
| BUG-335 | PG Payment Method Triggers Immediate OrderEntry Close | P1 | HIGH |
| BUG-170 | Variation Upcharge Missing from Fallback Subtotal Loop | P1 | MEDIUM |
Rationale: All P1, order entry. BUG-335 touches `CollectPaymentPanel.jsx` (hotspot). Gate 4 must be sequential.
File conflict: BUG-335 → `CollectPaymentPanel.jsx` (hotspot); BUG-170 → `orderTransform.js` (hotspot).

---

### BATCH-05 — Daily Reports
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-183 | Daily Report — Phone/Name Missing in Credit Tab | P1 | MEDIUM |
| BUG-184 | Daily Report — CRE-Credit Payment Type Not Reflected | P1 | MEDIUM |
| BUG-303 | P&L Report — Paid Revenue KPI Always Shows ₹0 | P2 | LOW |
Rationale: All reports module, no hotspot files. Safe to batch and implement together.

---

### BATCH-06 — Discount, Bill Accuracy, Weight Labels
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-329 | Discount Report: Discount Reason/Type Missing | P2 | MEDIUM |
| BUG-171 | Receipt Total ≠ Item Total + CGST + SGST + VAT | P2 | LOW |
| BUG-209 | Weight Item — Bill Summary Missing Unit Labels | P2 | MEDIUM |
Rationale: All P2, display/calculation accuracy. BUG-329 depends on backend `by_reason` endpoint.
Note: BUG-171 touches order totals — confirm risk at Gate 2 (may escalate to HIGH).

---

### BATCH-07 — Menu Management Critical
| ID | Title | P | Risk |
|---|---|---|---|
| CR-057 | Menu Management — Add "No Tax" Option + Tax Rules Doc | P1 | CRITICAL |
| CR-158 | GST/VAT Validate Button in Menu Management | P1 | HIGH |
Rationale: Both CRITICAL/HIGH, both MenuManagement, tax logic. Kept together but CRITICAL gate rules apply.
Note: CR-057 requires full owner approval before Gate 4 (financial logic).

---

### BATCH-08 — Menu Management Operations
| ID | Title | P | Risk |
|---|---|---|---|
| CR-159 | Bulk Delete in Menu Management | P1 | HIGH |
| CR-155 | Move Addon/Variation Stock to Menu Management | P1 | MEDIUM |
| BUG-118 | Nth-Item Coupon / BOGO Coupon Not Working | P1 | — |
Rationale: Menu management operational features. Separate from BATCH-07 (different risk level, no tax logic).

---

### BATCH-09 — Printer / Station Management
| ID | Title | P | Risk |
|---|---|---|---|
| CR-160 | Printer Mapping Screen — Employee to Printer Assignment (KOT / Bill) | P1 | HIGH |
| CR-161 | Station Management Screen — CRUD + Restaurant-Level Printing Mode | P1 | HIGH |
| CR-167 | Printer Add/Edit Wizard → Single-Step Inline Form (UX) | P2 | LOW |
Rationale: All printer/station area, all live inside Printer Agent Config settings. CR-160 + CR-161 are new screens (multi-file). CR-167 is 1-file UX rewrite. Safe to plan together, must implement sequentially (all touch PrinterAgentConfigView.jsx tabs).
OQs deferred to Gate 2: CR-160 (OQ-1/2/3), CR-161 (OQ-1/2/3/4 + B-1/B-2), CR-167 (OQ-1/2/3).
Intake docs:
  CR-160 → /app/memory/change_requests/CR-160_PRINTER_MAPPING_EMPLOYEE_SCREEN_INTAKE.md
  CR-161 → /app/memory/change_requests/CR-161_STATION_MANAGEMENT_PRINTING_MODE_INTAKE.md
  CR-167 → /app/memory/change_requests/CR-167_PRINTER_ADD_WIZARD_TO_SINGLE_FORM_INTAKE.md

---

### BATCH-10 — New Inventory / Insights Reports
| ID | Title | P | Risk |
|---|---|---|---|
| CR-150 | Purchase Report in New POS | P1 | HIGH |
| CR-153 | Wastage Report / Top Wasted Items | P1 | HIGH |
| CR-154 | Settings Flags for Central Inventory | P1 | HIGH |
| CR-156 | Table Number in Cancellation Reports | P2 | MEDIUM |
Rationale: All inventory/reports area, no hotspot conflicts. 4 items — split Gate 4 if needed.

---

### BATCH-11 — Room Module
| ID | Title | P | Risk |
|---|---|---|---|
| CR-162 | Mid-Stay Partial Payment for Room Orders | P1 | HIGH |
| CR-163 | Move Food Items from Room Order to Table | P1 | HIGH |
Rationale: Both room module, both HIGH. `RoomCheckInModal.jsx` recently touched — check conflict at Gate 2.

---

### BATCH-12 — Franchise Login (CRITICAL — standalone)
| ID | Title | P | Risk |
|---|---|---|---|
| CR-166 | Franchise Multi-Restaurant Login + Restaurant Picker | P1 | CRITICAL |
Rationale: CRITICAL auth change. Standalone batch mandatory. `integration_playbook_expert_v2` required before Gate 4.

---

### BATCH-13 — Role / Cancel Gating
| ID | Title | P | Risk |
|---|---|---|---|
| CR-068 | Cancellation Role-Gating — Make Cancellation Rights Role-Based | P1 | HIGH |
| CR-058 | Order-Level "Mark Order Complimentary" + Mandatory Note | P1 | HIGH |
Rationale: Both order flow permissions. Both HIGH. `OrderEntry.jsx` likely touched — sequential Gate 4.
Note: BUG-330 (cancel after serve) should complete before this batch (shared OrderEntry area).

---

### BATCH-14 — Medium-Priority CRs
| ID | Title | P | Risk |
|---|---|---|---|
| CR-121 | Dashboard Quick-Start: Single-Click Order | P2 | MEDIUM |
| CR-126 | Backdated Billing Date | P1 | MEDIUM |
| CR-148 | Popular Food Category | P2 | MEDIUM |
| CR-164 | Send Payment Link from Daily Reports | P1 | LOW-MEDIUM |
Rationale: Mixed medium CRs, no hotspot conflicts expected.

---

### BATCH-15 — Small / Low-Risk Items
| ID | Title | P | Risk |
|---|---|---|---|
| BUG-177 | Expense Entry: Notes Field Missing from Form | P2 | LOW |
| BUG-191 | Customer Intelligence — Phone Number Missing | P2 | LOW |
| CR-091 | Purchase — Transaction ID for Bank Transfer | P2 | LOW |
| CR-104 | Item-Level Complementary Reason (Mandatory Note) | P2 | MEDIUM |
| CR-138 | Dual Excel Download — Backend Excel Endpoint | P2 | LOW |
| CR-149 | Remove Coming-Soon Settings Tiles | P2 | LOW |
Rationale: All P2/LOW. Can fast-lane several after Gate 2. Safe batch.

---

### BATCH-16 — Delivery CR
| ID | Title | P | Risk |
|---|---|---|---|
| CR-147 | Online Delivery Charge Config with Distance Calculation | P1 | HIGH |
Rationale: Delivery charge calculation — standalone due to HIGH risk + financial logic.

---

## BLOCKED (11 items — cannot start Gate 2)

| ID | Title | Reason |
|---|---|---|
| BUG-243 | Stock Not Credited After add-purchase | Backend blocked |
| BUG-124 | food_update socket payload missing fields | Backend blocked |
| BUG-328 | Phone on Bill Wrong Number | Backend brief sent — no FE work |
| BUG-333 | Printer Style Tab Row Labels | Waiting for owner label mapping (OQ-1/2/3) |
| CR-146 | Multiple Menu FE UI | Owner decision needed (OQ-1/2/3) |
| CR-157 | Food Court Report | Backend contract pending |
| BUG-189 | Delivery Accept Order Missing | Needs investigation first |
| BUG-190 | Customer Notes CRM Sync Broken | Needs investigation first |
| BUG-192 | Prep & Serve Time Showing 0 | Needs investigation first |
| BUG-193 | Room Transfer Trail Wrong | Needs investigation first |
| CR-071 | App-Wide Role Gating (Phase 3) | DEFERRED — owner directive |

---

## PARKED (9 items — long-term / low urgency)

| ID | Title | Reason |
|---|---|---|
| BUG-040 | Audit Report Excel Format | P3, no urgency |
| BUG-041 | Audit Report PDF Format | P3, no urgency |
| CR-012 | Menu Management API Migration | Old item, may be subsumed |
| CR-050 | Quarterly Comparison View | P3, no urgency |
| CR-054 | Training Sandbox Mode | Long-term, complex |
| CR-108 | Auto-KOT on Aggregator Accept | Parked (owner directive) |
| CR-151 | Sub Recipe Excel Upload | Backlog |
| CR-152 | Test Connection LAN Printer | Low urgency |
| CR-165 | Razorpay Cancel & Refund | Needs dedicated auth session |

---

## Suggested Sequence

Process batches in this order:
1. BATCH-01 (P0 — GST critical)
2. BATCH-02 (today's settings gates — BUG-330 fast-lane eligible)
3. BATCH-03 (profile state)
4. BATCH-04 (order entry P1)
5. BATCH-05 (daily reports P1)
6. BATCH-12 (franchise login — CRITICAL, standalone)
7. BATCH-07 (menu critical)
8. BATCH-09 (printer/station — new screens)
9. BATCH-11 (room module)
10. BATCH-13 (role/cancel gating — AFTER BATCH-02 completes)
11. BATCH-08, BATCH-10, BATCH-16 (parallel tracks)
12. BATCH-06, BATCH-14, BATCH-15 (P2/medium)
