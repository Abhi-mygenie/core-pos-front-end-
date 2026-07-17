# CR-060 — Screen Freeze Document

**ID:** CR-060
**Gate:** 2.5 (Screen Freeze)
**Date:** 2026-07-06
**Status:** FROZEN
**Approver:** Owner (verbal approval during design review session)

---

## Screen Freeze Protocol

These screen designs are **FROZEN** as the implementation contract. Any deviation requires owner approval.

---

## Error Handling Pattern (MUST be consistent — owner mandate)

All CR-060 screens MUST follow the exact error patterns established in BulkEditor.jsx and MenuManagementPanel.jsx:

### 1. Toast Notifications (shadcn toast)
```javascript
// API errors → destructive toast
toast({ title: "Error", description: err.readableMessage, variant: "destructive" });

// Validation errors → destructive toast with summary
toast({ title: "Validation Error", description: "X items have issues", variant: "destructive" });

// Success → default toast
toast({ title: "Saved", description: "Table added successfully" });

// Delete success → default toast
toast({ title: "Deleted", description: 'Table "T001" removed.' });
```

### 2. Inline Row States (Bulk Editor — per BulkEditor.jsx)
```
Row states (priority order):
  1. Validation error  → bg-red-50/40 + border-l-4 border-l-red-500
  2. Save error        → bg-red-50/60 + border-l-4 border-l-red-400
  3. New row           → bg-green-50/40
  4. Saved success     → bg-green-50/60
  5. Dirty (edited)    → bg-amber-50/40
  6. Normal            → hover:bg-gray-50/50
```

### 3. Inline Cell States (Bulk Editor)
```
Cell states:
  - Validation error field → bg-red-100/60
  - Dirty field           → bg-amber-100/60
  - Normal                → transparent
```

### 4. Row Status Indicators (# column)
```
  - Saving   → Loader2 spinner (amber)
  - Saved    → Check icon (green)
  - Error    → AlertCircle icon (red) with tooltip showing error message
  - New row  → "+" text
  - Normal   → row number
```

### 5. Delete Confirmation Pattern (from existing TableManagementView.jsx)
```
Inline confirmation below item:
  - Red-tinted background: rgba(239,68,68,0.05)
  - Red border: rgba(239,68,68,0.2)
  - Text: Delete "T001"?
  - Buttons: [No] [Yes] (Yes = red bg)
```

### 6. Loading States
```
  - Full panel loader: bg-white/60 backdrop-blur-sm + centered spinner
  - Spinner: Loader2 animate-spin in primaryOrange
  - Status text: "Loading tables…" / "Importing…" / "Exporting…"
```

### 7. Empty States
```
  - No tables: Centered message with muted text + "Add your first table" CTA
  - No tables in section: "No tables in [Section Name]" with "Add Table" link
```

---

## Screen 1: Normal View — Settings → Table Management

**Mockup URL:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/228be11b546933e9024f3e3b221018c4452fcf42122a48ba46f595d95127144b.png

### Layout: Master-Detail (within Settings panel container)

```
┌──────────────────────────────────────────────────────────────┐
│ Settings Panel Container                                      │
│                                                                │
│  ┌─ Sections (25%) ─┬─ Tables (75%) ──────────────────────┐  │
│  │                   │                                     │  │
│  │ + Add Section     │ [Main Hall · 8 Tables & Rooms]      │  │
│  │                   │         [BulkEdit] [Export] [Import] │  │
│  │ ▶ Main Hall (8)  │         [+ Add Table/Room]           │  │
│  │   Garden (5)      │                                     │  │
│  │   Rooftop (3)     │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │  │
│  │   VIP (2)         │  │T001  │ │T002  │ │T003  │ │R001│ │  │
│  │                   │  │TABLE │ │TABLE │ │TABLE │ │ROOM│ │  │
│  │                   │  │Capt. │ │Mgr.  │ │Meet  │ │Sal.│ │  │
│  │                   │  │✏ 🗑  │ │✏ 🗑  │ │✏ 🗑  │ │✏ 🗑│ │  │
│  │                   │  └──────┘ └──────┘ └──────┘ └────┘ │  │
│  └───────────────────┴─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Component Specs

| Component | Spec | Token |
|-----------|------|-------|
| Left panel | w-1/4, right border, scrollable | `#FFFFFF` bg, `#E5E5E5` right border |
| Section item (selected) | Orange left border + light tint | `border-l-4 #F26B33`, `rgba(242,107,51,0.08)` bg |
| Section item (normal) | Transparent left border | `border-l-4 transparent`, hover: `gray-50` |
| Section count badge | Small pill | `#E5E5E5` bg, `#666666` text |
| Section actions | Edit/delete on hover | `opacity-0 group-hover:opacity-100` |
| Right panel toolbar | Flex row, justify-between | `#1A1A1A` heading, buttons right |
| Bulk Edit toggle (OFF) | Gray outline button with grid icon | `#E5E5E5` border, `#1A1A1A` text |
| Export/Import buttons | Gray outline | Same as Bulk Edit |
| Add Table/Room button | Primary filled | `#F26B33` bg, white text |
| Card grid | Responsive: 2→3→4 cols | `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4` |
| Table card | White, rounded-xl, border, hover lift | `#FFFFFF` bg, `#E5E5E5` border, `hover:-translate-y-1 hover:shadow-md` |
| TYPE badge (Table) | Small pill | `gray-100` bg, `gray-700` text, 10px bold uppercase |
| TYPE badge (Room) | Small pill amber | `amber-100` bg, `amber-800` text, 10px bold uppercase |
| Waiter name | Small text with user icon | `#666666`, `User` lucide icon |
| Card actions | Edit/delete at bottom | `#E5E5E5` top border separator, pencil + trash icons |

### Interactions

| Action | Behavior | Error Handling |
|--------|----------|----------------|
| Click section | Filters right panel | — |
| Click + Add Section | Inline input in left panel | Required validation: name can't be empty |
| Click + Add Table/Room | Opens Add Dialog (Screen 2) | — |
| Click card edit | Opens Edit Dialog (pre-filled) | — |
| Click card delete | Inline confirmation below card | Toast on success/failure |
| Click Bulk Edit toggle | Switches to Bulk Editor (Screen 3) | — |
| Click Export | Downloads Excel via `/export-list` | Destructive toast on error, "No tables" toast if empty |
| Click Import | File picker → uploads via `/import` | Destructive toast on error, success toast with count |

---

## Screen 2: Add/Edit Table Dialog

**Mockup URL:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/27baefd59b31292e5ae94d2af3d3e801a0fb445605633b5492537cd4d68069dd.png

### Layout: Shadcn Dialog (centered modal)

```
┌─────────────────────────────────┐
│ Add Table / Room            [X] │
│                                 │
│ Type                            │
│ ┌──────────┬──────────┐         │
│ │  Table   │   Room   │         │
│ └──────────┴──────────┘         │
│                                 │
│ Table / Room Number *           │
│ ┌─────────────────────┐         │
│ │ e.g. T001 or R001   │         │
│ └─────────────────────┘         │
│                                 │
│ Area / Section                  │
│ ┌─────────────────────┐         │
│ │ Select or type new▼ │         │
│ └─────────────────────┘         │
│                                 │
│ Assign Waiter                   │
│ ┌─────────────────────┐         │
│ │ Select waiter... ▼  │         │
│ └─────────────────────┘         │
│                                 │
│      [Cancel]  [Add Table]      │
└─────────────────────────────────┘
```

### Component Specs

| Component | Spec | Token |
|-----------|------|-------|
| Dialog overlay | Dimmed backdrop | `bg-black/40 backdrop-blur-sm` |
| Dialog content | White, rounded-xl, max-w-md | `#FFFFFF` bg, `#E5E5E5` border, `p-6` |
| Type selector | Pill toggle in gray container | `bg-gray-100 p-1 rounded-lg` container |
| Type active | White bg with shadow | `bg-white shadow text-[#1A1A1A]` |
| Type inactive | Gray text | `text-gray-500 hover:text-gray-700` |
| Number input | Required, text | Standard shadcn input, `focus:ring-2 focus:ring-[#F26B33]/50` |
| Area dropdown | Combobox (select existing or type new) | Standard shadcn select |
| Waiter dropdown | Select from waiter-list | Standard shadcn select |
| Cancel button | Gray outline | `#E5E5E5` border |
| Add/Save button | Primary filled | `#F26B33` bg, white text |

### Validation & Error Handling

| Field | Validation | Error Display |
|-------|-----------|---------------|
| Table/Room Number | Required, non-empty | Red border on input + "Number is required" text below |
| Type | Required (default: Table) | Always has a value — no error state |
| Area | Optional | — |
| Waiter | Optional | — |
| API error on save | Network/server error | Destructive toast: "Error: [message]" |
| Success | Saved | Close dialog + success toast + refresh list |

---

## Screen 3: Bulk Editor Mode

**Mockup URL:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/8176a06f915d656917c57217b526f398b60c597c41a67b86e9742310298b7ecd.png

### Layout: Full-width spreadsheet (replaces master-detail when toggled ON)

```
┌──────────────────────────────────────────────────────────────┐
│ 🔶 Bulk Editor  [18 items]   [🔍 Search] [Columns]          │
│                               [⬇ Export][⬆ Import]          │
│                               [+ Add Item][Save X Changes][X]│
│──────────────────────────────────────────────────────────────│
│ # │ Type     │ Table/Room No. │ Area/Section  │ Waiter │ 🗑 │
│───┼──────────┼────────────────┼───────────────┼────────┼────│
│ 1 │ [Table▼] │ [T001        ] │ [Main Hall ▼] │ [Capt▼]│ 🗑 │
│ 2 │ [Table▼] │ [T002        ] │ [Main Hall ▼] │ [Mgr ▼]│ 🗑 │
│ 3 │ [Room ▼] │ [R001        ] │ [VIP Lnge  ▼] │ [Sal ▼]│ 🗑 │
│ + │ [Table▼] │ [            ] │ [          ▼] │ [    ▼]│ 🗑 │ ← new (green)
│───┼──────────┼────────────────┼───────────────┼────────┼────│
└──────────────────────────────────────────────────────────────┘
```

### Component Specs — MUST match BulkEditor.jsx patterns exactly

| Component | Spec | Token |
|-----------|------|-------|
| Toolbar | `px-5 py-3 border-b flex-shrink-0` | `#E5E5E5` border |
| Title | Orange icon + "Bulk Editor" + count badge | `Table2` icon `#F26B33`, badge `#F7F7F7` bg |
| Search | Input with Search icon | Same as BulkEditor.jsx L667 |
| Add Item button | Green filled, top-right | `#329937` bg, white text, `Plus` icon |
| Save button | Orange filled, dynamic label | `#F26B33` bg (active), `#666666` bg (no changes) |
| Close button | X icon | `#666666` |
| Grid | Full-width table, border-collapse | Same as BulkEditor.jsx L772 |
| Column headers | Light gray bg, uppercase 11px | `#F9FAFB` bg, `#666666` text |
| Type column | Dropdown: Table / Room | Standard select, width 100px |
| Number column | Text input | width 160px |
| Area column | Dropdown (existing areas + type new) | width 160px |
| Waiter column | Dropdown from waiter-list | width 140px |
| Trash column | Trash2 icon (red on new rows only) | width 48px |

### Row States — IDENTICAL to BulkEditor.jsx

| State | Background | Left Border | # Column |
|-------|-----------|-------------|----------|
| Validation error | `bg-red-50/40` | `border-l-4 border-l-red-500` | AlertCircle red |
| Save error | `bg-red-50/60` | `border-l-4 border-l-red-400` | AlertCircle red + tooltip |
| New row | `bg-green-50/40` | — | "+" text |
| Saved | `bg-green-50/60` | — | Check green |
| Dirty (edited) | `bg-amber-50/40` | — | row number |
| Normal | `hover:bg-gray-50/50` | — | row number |

### Cell States — IDENTICAL to BulkEditor.jsx

| State | Background |
|-------|-----------|
| Validation error | `bg-red-100/60` |
| Dirty | `bg-amber-100/60` |
| Normal | transparent |

### Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| Table/Room Number | Required, non-empty | Cell red + row red border |
| Type | Required (default: Table) | Always has value |
| Duplicate number | Same table_no in same area | Row validation error |

---

## Design Tokens (NO changes to app theme)

| Token | Value | Source |
|-------|-------|--------|
| Font | Poppins | Already loaded in App.css |
| Primary | `#F26B33` | `COLORS.primaryOrange` |
| CTA/Success | `#329937` | `COLORS.primaryGreen` |
| Accent | `#F4A11A` | `COLORS.amber` |
| Background | `#FFFFFF` | `COLORS.lightBg` |
| Surface | `#F7F7F7` | `COLORS.sectionBg` |
| Text primary | `#1A1A1A` | `COLORS.darkText` |
| Text secondary | `#666666` | `COLORS.grayText` |
| Border | `#E5E5E5` | `COLORS.borderGray` |
| Destructive | `#EF4444` | Hardcoded (same as BulkEditor) |

## Icon Mapping

| Concept | Icon | Library |
|---------|------|---------|
| Table type | `Square` | lucide-react |
| Room type | `Armchair` | lucide-react |
| Waiter | `User` | lucide-react |
| Add | `Plus` | lucide-react |
| Edit | `Pencil` | lucide-react |
| Delete | `Trash2` | lucide-react |
| Import | `Upload` | lucide-react |
| Export | `Download` | lucide-react |
| Template | `FileSpreadsheet` | lucide-react |
| Search | `Search` | lucide-react |
| Save | `Save` | lucide-react |
| Loading | `Loader2` | lucide-react |
| Error | `AlertCircle` | lucide-react |
| Success | `Check` | lucide-react |
| Close | `X` | lucide-react |
| Grid toggle | `Table2` / `LayoutGrid` | lucide-react |

---

## Phase 1 vs Phase 2

| Feature | Phase |
|---------|-------|
| Normal view (sections + card grid) | **Phase 1** |
| Add/Edit Dialog (Type, Number, Area, Waiter) | **Phase 1** |
| Delete confirmation | **Phase 1** |
| Bulk Editor (spreadsheet, Add Item, Save) | **Phase 1** |
| Excel Import/Export/Template | **Phase 1** |
| Error handling (toasts, row states, validation) | **Phase 1** |
| QR Code display/dialog | **Phase 2** |
| Waiter access permissions (A/B/C types) | **Phase 2** |

---

## Freeze Attestation

```
SCREEN FREEZE — CR-060 Phase 1
Screens: Normal View, Add/Edit Dialog, Bulk Editor
Design: Owner verbal approval 2026-07-06
Brand: Uses existing POS palette (Poppins + COLORS constants). NO new fonts/colors.
Error handling: MUST match BulkEditor.jsx patterns (row states, cell states, toasts, loaders)
Mockups: 3 AI-generated reference images + component specs above
Status: FROZEN — implementation must match these specs
Deviation: Requires owner approval
```
