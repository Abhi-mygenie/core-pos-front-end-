# CR-059 Phase 1 — Screen Freeze Document

**ID:** CR-059
**Gate:** 2.5 (Screen Freeze)
**Date:** 2026-07-06
**Status:** FROZEN
**Approver:** Owner (verbal confirmation during discovery session)

---

## Screen Freeze Protocol

Per CR-011 Screen Freeze Protocol, these screen designs are **FROZEN** as the implementation contract. Any deviation requires owner approval.

---

## Screen 1: `/expenses` — Daily Expense Entry

**Mockup URL:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/3ce641af4736a98ea844a1f1851a524b5b7248fdc0232aea062216d341a03368.png

### Layout: Vertical Stack

```
┌─────────────────────────────────────────────────────────────────┐
│ [Collapsed Sidebar]  │  Page Header: "Expenses"         [Date] │
│                      │                                          │
│                      │  KPI STRIP (5 cards, horizontal)         │
│                      │  ┌────────┬────────┬────┬──────┬───────┐ │
│                      │  │Today's │ Cash   │UPI │Bank  │Cash   │ │
│                      │  │Total   │        │    │Xfer  │Draw   │ │
│                      │  │₹4,230  │₹2,800  │₹430│₹0    │₹1,000│ │
│                      │  └────────┴────────┴────┴──────┴───────┘ │
│                      │                                          │
│                      │  QUICK-ADD FORM (inline, single row)     │
│                      │  [Category▼] [Item Search▼] [₹ Amount]  │
│                      │  [Payment▼]        [+ More] [Save ████] │
│                      │                                          │
│                      │  TODAY'S LOG TABLE                       │
│                      │  Time | Item | Category | ₹ | Pay | Act │
│                      │  ─────┼──────┼──────────┼───┼─────┼──── │
│                      │  rows...                                 │
│                      │  ─────────────────────── TOTAL: ₹4,230  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Specifications

| Component | Spec | Brand Token |
|-----------|------|-------------|
| Page header | "Expenses" + date picker right-aligned | `#1A1A1A` text, Poppins 600 |
| KPI cards | 5 horizontal, white bg, 1px border, value + label | `#FFFFFF` bg, `#E5E5E5` border, `#1A1A1A` value, `#666666` label |
| KPI "Today's Total" | Slightly larger/bolder than others | `#F26B33` accent on value |
| Category dropdown | shadcn Select, searchable | Standard shadcn |
| Item dropdown | shadcn Combobox with search, filtered by category | Standard shadcn |
| Amount input | shadcn Input, ₹ prefix, numeric | Auto-fill from unit price if available |
| Payment dropdown | shadcn Select: Cash, UPI, Bank Transfer, Cash Draw | Standard shadcn |
| "More fields" | Collapsible: Qty (number) + Unit (dropdown) | Collapsed by default. Expand icon/link |
| "+ Add Another Line" | Text link, adds row to form | `#329937` green text |
| "Save Expense" button | Primary CTA | `#329937` bg, white text, Poppins 600 |
| "Reset" button | Secondary | White bg, `#E5E5E5` border |
| Table | Dense, alternating rows, sticky header | `#FFFFFF` / `#F7F7F7` alternating |
| Table actions | Edit (pencil icon), Delete (trash icon) | Inline, on hover or always visible |
| Running total | Bottom row, bold | `#1A1A1A` bold |
| Export button | Small, in table header area | Icon button, subtle |

### Interactions

| Action | Behavior |
|--------|----------|
| Select category | Filters item dropdown to show only items in that category |
| Select item with unit price | Auto-fills amount = qty × unit_price |
| Click "+ Add Another Line" | Adds new row of inputs (Category, Item, Amount, Payment) below current |
| Click "Save Expense" | POST `/store-expense-details` with `details[]` array. On success: toast, clear form, refresh table + KPIs |
| Click edit icon on row | Row becomes inline-editable (fields become inputs). Save/Cancel appear |
| Click delete icon on row | Confirmation dialog → DELETE → refresh table + KPIs |
| Change date | Reloads table with expenses for selected date. KPIs update |

---

## Screen 2: `/expense-setup` — Expense Master Setup

**Mockup URL:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/173b35c94332c4928070be25038ffa466d6d0c7f9884acd4129521b8ba327999.png

### Layout: Two-Column Master-Detail

```
┌─────────────────────────────────────────────────────────────────┐
│ [Collapsed Sidebar]  │  Page Header: "Expense Setup"  [⬇][⬆]  │
│                      │                            Export Import  │
│                      │                                          │
│                      │  ┌─ Categories ──┬─ Items ─────────────┐ │
│                      │  │               │                     │ │
│                      │  │ + Add Category│ [Search___] [Bulk⚡]│ │
│                      │  │               │                     │ │
│                      │  │ ▶ Pulses (12) │ Name  │ ₹/U │ Unit │ │
│                      │  │   Dairy (8)   │───────┼─────┼──────│ │
│                      │  │   Kitchen (15)│ Dal   │ 120 │ kg   │ │
│                      │  │   Salary (3)  │ Rajma │  —  │ kg   │ │
│                      │  │   Pkg (5)     │ Soy   │  85 │ kg   │ │
│                      │  │   Misc (45)   │ Moong │  —  │ kg   │ │
│                      │  │               │               │     │ │
│                      │  │ [✏] [🗑]      │ + Add Item    │     │ │
│                      │  └───────────────┴───────────────┴─────┘ │
│                      │                                          │
│                      │  ── Bulk Editor Mode (when toggled) ──   │
│                      │  Spreadsheet grid: Name | Category▼ |   │
│                      │  Unit Price | Unit▼ | [Save All]         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Specifications

| Component | Spec | Brand Token |
|-----------|------|-------------|
| Page header | "Expense Setup" + Export/Import icons right-aligned | `#1A1A1A` text, Poppins 600 |
| Export icon | Download arrow icon | `#666666`, hover: `#1A1A1A` |
| Import icon | Upload arrow icon | `#666666`, hover: `#1A1A1A` |
| Left panel | ~25% width (md:col-span-3), scrollable | `#FFFFFF` bg, `#E5E5E5` right border |
| "+ Add Category" | Text button at top of left panel | `#329937` green text |
| Category item | Name + count badge, click to select | `#F7F7F7` bg, hover: `#F0F0F0` |
| Category selected | Green left border + subtle highlight | `#329937` left border (3px), `#F0FFF0` bg |
| Category count badge | Small pill showing item count | `#E5E5E5` bg, `#666666` text |
| Category edit/delete | Icons, shown on hover | Pencil + trash, `#666666` |
| Right panel | ~75% width (md:col-span-9) | `#FFFFFF` bg |
| Search bar | shadcn Input with search icon | Standard, placeholder: "Search items..." |
| Bulk Edit toggle | Switch or button toggle | Off: secondary style. On: `#329937` active |
| Items table | Dense, columns: Name, Unit Price, Unit, Actions | Same styling as expense entry table |
| Unit Price cell | Click empty "—" to set price inline | `#666666` for "—", `#1A1A1A` when set |
| "+ Add Item" | Text link at bottom of table | `#329937` green text |
| Bulk Editor | Spreadsheet grid when toggle ON | Dense cells, visible borders, editable dropdowns |
| Bulk Editor Save | "Save All" button + "Cancel" | `#329937` CTA + white secondary |

### Interactions

| Action | Behavior |
|--------|----------|
| Click category | Filters right panel to show items in that category |
| Click "+ Add Category" | Inline input appears at top of list. Enter name + confirm |
| Click category edit | Category name becomes editable inline |
| Click category delete | Confirmation → DELETE → items move to "Uncategorized" or block if non-empty |
| Click "+ Add Item" | Inline row appears in table: Name input + Category (pre-filled) + Unit dropdown |
| Click "—" on Unit Price | Inline price input appears. Enter price + blur/enter to save |
| Click item edit | Row becomes editable inline |
| Click item delete | Confirmation → DELETE `/expenses/{id}` |
| Toggle Bulk Edit ON | Table transforms to spreadsheet grid with editable cells |
| Bulk Edit "Save All" | Batch save all dirty rows |
| Click Export | POST `/bulk-export-expense` → download Excel |
| Click Import | File picker → POST `/bulk-import-expense` (multipart) → refresh table |

---

## Sidebar Integration

```
sidebarMenuItems[] addition (after "day-closure" entry):

{
  id: "expenses",
  label: "Expenses",
  icon: Receipt,
  children: [
    { id: "add-expenses", label: "Add Expenses", path: "/expenses" },
    { id: "expense-setup", label: "Expense Setup", path: "/expense-setup" },
  ],
}
```

### Position in Sidebar

```
Dashboard        (HomeIcon)       → /dashboard
Day Closure      (Banknote)       → /day-closure
Expenses         (Receipt)        → NEW
  ├── Add Expenses               → /expenses
  └── Expense Setup              → /expense-setup
Menu Management  (UtensilsCrossed)→ /menu
Credit Mgmt      (Wallet)         → /credit
Daily Report     (BarChart3)      → /reports/*
Settings         (Settings)       → /settings/*
Insights         (LineChart)      → /reports-module/*
```

---

## Design Tokens (matching existing POS — NO changes to app theme)

| Token | Value | Usage |
|-------|-------|-------|
| Font | Poppins (already loaded in App.css) | All text |
| Primary brand | `#F26B33` (Orange) | Page accents, header highlights |
| CTA / Success | `#329937` (Green) | Save/Submit buttons, active states, "+" links |
| Accent | `#F4A11A` (Amber) | Warnings, highlights |
| Background | `#FFFFFF` | Cards, panels, inputs |
| Surface | `#F7F7F7` | Page background, alternating rows |
| Text primary | `#1A1A1A` | Headings, values |
| Text secondary | `#666666` | Labels, descriptions, muted text |
| Border | `#E5E5E5` | Card borders, table borders, dividers |
| Destructive | `#EF4444` | Delete buttons, error states |
| Info / Links | `#3B82F6` | Links, info states |

---

## Freeze Attestation

```
SCREEN FREEZE — CR-059 Phase 1
Screens: /expenses, /expense-setup
Design: Verbal approval during discovery session 2026-07-06
Brand: Uses existing POS palette (Poppins + Orange/Green/Amber). NO new fonts or colors.
Mockups: 2 AI-generated reference images + component specs above
Status: FROZEN — implementation must match these specs
Deviation: Requires owner approval
```
