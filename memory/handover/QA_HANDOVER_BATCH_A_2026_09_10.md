# QA Handover — Batch A
## BUG-390 + CR-373 + BUG-392 + CR-374

**Date:** 2026-09-10
**Implemented by:** Implementation Agent (Role 3 — AGENT_PROMPT_ALPHA v0.7)
**Self-test:** 20/20 code markers present, 12/12 onWheel instances, webpack compiled successfully

---

## § 1 — Verification Matrix Results

### BUG-390 — Normal Menu Image Upload
| Edit | File | Change | Self-test |
|---|---|---|---|
| E1-E2 | ProductForm.jsx:339 | Comment updated, Aggregator gate removed | ✅ grep confirms `BUG-390` at line 339, no gate at 337 |
| E3 | ProductForm.jsx:341 | Label → "Item Image" | ✅ confirmed |
| E4 | ProductForm.jsx | Closing `)}` removed | ✅ no orphan gate |

### CR-373 — Swiggy Toggle
| Edit | File | Change | Self-test |
|---|---|---|---|
| E1 | ProductForm.jsx:208 | `useItemImageForSwiggy` state | ✅ line 208 confirmed |
| E2 | ProductForm.jsx:270,291 | Init defaults in edit+new branches | ✅ both branches confirmed |
| E3 | ProductForm.jsx:362 | Toggle UI + conditional upload | ✅ data-testid `swiggy-use-item-image` present |
| E4-E6 | ProductForm.jsx:614,618,625 | `effectiveSwiggyFile` in save | ✅ both service calls use effectiveSwiggyFile |

### BUG-392 — Scroll Wheel
| Edit | File | Line | Self-test |
|---|---|---|---|
| E1 | ProductForm.jsx | InputField | ✅ onWheel after `{...props}` |
| E2-E4 | ProductForm.jsx | 169,174,555 | ✅ 3 raw inputs |
| E5-E6 | ProductCard.jsx | Price + Tax% | ✅ 2 inputs |
| E7 | BulkEditor.jsx | renderCell | ✅ line confirmed |
| E8-E11 | AddonManagementPanel.jsx | 4 inputs | ✅ 4 confirmed |
| E12 | VariationExpandPanel.jsx | var price | ✅ confirmed |

### CR-374 — BulkEditor Filter Panel
| Edit | File | Change | Self-test |
|---|---|---|---|
| E1 | BulkEditor.jsx:244+ | 3 filter states | ✅ grep 3 useState found |
| E2 | BulkEditor.jsx:428+ | Filter passes in groupedRows | ✅ filterStatus/Type/CategoryId passes present |
| E2b | BulkEditor.jsx | useMemo deps updated | ✅ deps include all 3 filter states |
| E3 | BulkEditor.jsx:~975 | Filter strip JSX | ✅ data-testid `bulk-filter-strip` present |
| E4 | BulkEditor.jsx:280+ | menuType reset useEffect | ✅ confirmed |

---

## § 2 — Test Cases for QA Agent

### BUG-390
| # | Steps | Expected | testid |
|---|---|---|---|
| T1 | Login → Menu Mgmt → Normal → Add Item | Image upload section visible with label "Item Image" | `image-upload-btn` |
| T2 | Login → Menu Mgmt → Aggregator → Add Item | Image upload section still visible | `image-upload-btn` |
| T3 | Normal menu item - label text | Shows "Item Image" not "Zomato Image" | — |

### CR-373
| # | Steps | Expected | testid |
|---|---|---|---|
| T4 | Aggregator → Add Item → image section | "Use same as Item Image" / "Upload different image" toggle visible | `swiggy-use-item-image` |
| T5 | New Aggregator item | Toggle pre-selected "Use same as Item Image" | `swiggy-use-item-image` |
| T6 | Aggregator → Edit item with existing Swiggy image | Toggle pre-selected "Upload different image" | `swiggy-upload-different` |
| T7 | Click "Upload different image" | Upload section appears | `swiggy-image-upload-btn` |
| T8 | Click "Use same as Item Image" | Upload section hidden | — |
| T9 | Normal menu → Add Item | NO Swiggy toggle visible | — |

### BUG-392
| # | Steps | Expected |
|---|---|---|
| T10 | Focus price field in ProductForm → scroll mouse wheel | Value unchanged |
| T11 | Click BulkEditor price cell → scroll grid | Price unchanged |
| T12 | Focus price in ProductCard quick-edit → scroll | Value unchanged |
| T13 | Focus addon add-form price → scroll | Value unchanged |
| T14 | Focus variation price → scroll | Value unchanged |
| T15 | Focus any number field → press keyboard ↑ | Value still increments (keyboard not broken) |

### CR-374
| # | Steps | Expected | testid |
|---|---|---|---|
| T16 | Menu Mgmt → Bulk Edit → filter strip | Status/Type/Category strip visible between toolbar and column chips | `bulk-filter-strip` |
| T17 | Click "Active" pill | Only active items shown in grid | `filter-status-active` |
| T18 | Click "Inactive" pill | Only inactive items shown | `filter-status-inactive` |
| T19 | Click "Veg" pill | Only Veg items shown | `filter-type-veg` |
| T20 | Select category from dropdown | Only that category shown | `filter-category-select` |
| T21 | Set Active + Veg filter | Active Veg items only | — |
| T22 | Click "Select All" with Inactive filter active | Only visible inactive rows selected | — |
| T23 | Click "Clear Filters" | All rows visible, button disappears | `filter-clear-btn` |
| T24 | Switch Normal → Aggregator menu | Filters reset to All | — |
| T25 | Add new row while filter active | New row always visible regardless of filter | — |

---

## § 3 — Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Save Normal menu item works (no regression from BUG-390) | Gate removal could affect form state |
| R2 | Save Aggregator item with both image fields (no regression from CR-373) | effectiveSwiggyFile path |
| R3 | BulkEditor Save N Changes still works after CR-374 | Filter is UI-only, save unaffected |
| R4 | BulkEditor Bulk Delete still works | Select All + filter interaction |

---

## § 4 — Registry Sync Confirmation

| Field | Value |
|---|---|
| Registry synced | YES |
| Items | BUG-390, CR-373, BUG-392, CR-374 |
| Gate | 5 (IMPLEMENTED — QA PENDING) |
| Sprint | pos_7_0 |
| EXIT GATE | 5/5 PASS |

---

## § 5 — Credentials

- Preprod: `https://preprod.mygenie.online`
- Account: `owner@cafe103.com` / `***`
- Relevant routes: `/menu` → Menu Management → Bulk Edit
