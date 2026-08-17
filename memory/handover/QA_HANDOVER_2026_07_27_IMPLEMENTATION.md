# QA Handover — 2026-07-27 Implementation (BUG-258, BUG-261, BUG-262, CR-114, CR-115)

## 1. Inherited from Plan (Verification Matrix results)

### Batch B — BUG-262 ("Coming Soon" Removal)
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| 1 | InventoryIntelligencePanel.jsx | WastagePlaceholder removed (lines 61-73 + 315-316) | PASS — compile clean |
| 2 | InventorySetupPanel.jsx | `title="Coming soon"` removed (line 269) | PASS — compile clean |
| 3 | LoginPage.jsx | Forgot Password toast changed + handleRequestDemo removed | PASS — compile clean |

### Batch A — BUG-258 + BUG-261 (P&L + Consumption Date Bar)
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| 1 | PLReportPage.jsx | Preset state (appliedFrom/To, activePreset) + handlers added | PASS |
| 2 | PLReportPage.jsx | Header rewritten with CalendarIcon, pills, Apply (green when dirty) | PASS |
| 3 | ConsumptionReportPage.jsx | Preset state added, fetchReport uses appliedFrom/To | PASS |
| 4 | ConsumptionReportPage.jsx | Header rewritten with pills + category/ingredient filters preserved | PASS |

### Batch C — CR-114 + CR-115 (Smart Purchase UX)
| Edit | File | Verification | Self-Test |
|------|------|-------------|:---:|
| 1 | purchasePlanner.js | categoryName field added via catLookup from stockInventory | PASS |
| 2 | SmartPurchasePanel.jsx | selectedForPurchase, searchQuery, categoryFilter state added | PASS |
| 3a | AutoShoppingList.jsx | Two-section layout: "Purchase List" + "All Ingredients" | PASS |
| 3b | AutoShoppingList.jsx | Search filter on Available section | PASS |
| 3c | AutoShoppingList.jsx | Category dropdown on Available section | PASS |
| 3d | AutoShoppingList.jsx | Category headers in Available section (sorted A→Z) | PASS |
| 3e | AutoShoppingList.jsx | [+ Add] button moves item to Purchase List | PASS |

## 2. Test Cases

### BUG-262 — "Coming Soon" Removal
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | No wastage placeholders | Login → Navigate to Inventory Intelligence → scroll to bottom | No "Coming soon" cards visible. 6 widgets, not 8. |
| T2 | No import tooltip | Login → Navigate to Inventory Setup → hover Import button | No tooltip. Button remains disabled. |
| T3 | Forgot Password toast | Login page → click "Forgot Password?" | Toast shows "Reset Password" / "Please contact your administrator..." (NOT "Coming Soon") |
| T4 | No Demo button | Login page → inspect page | No "Request Demo" button visible |

### BUG-258 + BUG-261 — P&L + Consumption Date Bar
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T5 | P&L preset pills visible | Login → Daily Reports → P&L Report | [Today] [7D] [30D] [MTD] pills visible. 7D is active by default. |
| T6 | P&L click Today preset | Click [Today] pill | From/To dates both set to today. Data loads for today. |
| T7 | P&L Apply button | Change From date manually → Apply turns green | Click Apply → data reloads for new dates. Apply turns gray. |
| T8 | P&L max date | Try to select a future date | Calendar blocks future dates (max=today). |
| T9 | Consumption preset pills | Login → Daily Reports → Consumption Report | [Today] [7D] [30D] [MTD] pills visible. MTD is active by default. |
| T10 | Consumption click 7D | Click [7D] pill | From = 6 days ago, To = today. Data loads. Category/ingredient filters still work. |
| T11 | Consumption Apply | Change From date → Apply green | Click Apply → data loads. Apply turns gray. |

### CR-114 + CR-115 — Smart Purchase UX
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T12 | Two sections visible | Login → Smart Purchase | "Purchase List" section (empty) + "All Ingredients" section (populated) visible |
| T13 | Add item to purchase | Click [+ Add] on an ingredient in All Ingredients | Item moves to Purchase List section with editable Rate/Qty/Vendor fields |
| T14 | Remove from purchase | Click X on a Purchase List item | Item returns to All Ingredients |
| T15 | Search filter | Type ingredient name in search | All Ingredients filters in real-time |
| T16 | Category dropdown | Select a category from dropdown | Only items in that category shown in All Ingredients |
| T17 | Category headers | Look at All Ingredients section | Items grouped under category name headers (sorted A→Z) |
| T18 | Submit with selected | Add 2 items → enter rate/qty/vendor → Submit | Only selected items included in purchase submission |

## 3. Regression Tests
| # | What to Verify | Why |
|---|----------------|-----|
| R1 | ExpenseReport still works | Same preset pattern — verify no shared-state bleed |
| R2 | Smart Purchase existing features: horizon picker, vendor suggestion, grouped preview | Modified parent/child — verify no regressions |

## 4. Registry Sync Confirmation
Registry synced: YES
Items: BUG-258, BUG-261, BUG-262, CR-114, CR-115
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED

## 5. Credentials + Environment
Account: owner@kunafamahal.com / ***
URL: https://82f5bdd7-d42a-496c-b1bb-078f8586fd2d.preview.emergentagent.com
