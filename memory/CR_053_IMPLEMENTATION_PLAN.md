# CR-053 — Implementation Plan: Phase 1 (Gate 3)

**Item:** CR-053 — MyGenie Training Academy
**Gate:** 3 (Implementation Plan)
**Date:** 2026-06-18
**Phase:** 1 — Core Engine + Menu Management Course
**Risk:** HIGH (new module) | **Regression Risk:** NONE (zero POS code modification except 2 lines in index.html)
**Prerequisite:** Gate 2 Impact Analysis ✅ + Design Review ✅ + Brand Correction ✅

---

## SCOPE LOCK — Phase 1

### WILL BUILD:
1. **Training SDK** — standalone JS/React bundle (overlay engine + dashboards)
2. **Training Backend** — FastAPI server with MongoDB (catalog + progress + manager APIs)
3. **Menu Management Course** — 12 missions, ~70 steps, full interactive walkthrough
4. **POS Integration** — 2 lines in `index.html`

### WILL NOT BUILD (Phase 2+):
- Admin panel (separate React app)
- Practice mode interceptor
- Gamification / badges
- Push notifications
- Additional courses (Order Taking, Billing, etc.)
- Content versioning pipeline

### WILL NOT TOUCH:
- Any POS source code (`/app/frontend/src/*`)
- Any POS dependency (`package.json`)
- Any POS config (`.env`, `craco.config.js`)
- Any POS backend (`server.py`)

---

## 1. DIRECTORY STRUCTURE — What Gets Created

```
/app/
├── frontend/
│   └── public/
│       └── index.html                    ← +2 lines (ONLY POS change)
│
├── training-sdk/                          ← NEW: Standalone React app → builds to single JS
│   ├── package.json
│   ├── webpack.config.js
│   ├── .env
│   ├── src/
│   │   ├── index.js                       ← Bootstrap: mount to #training-root
│   │   ├── TrainingApp.jsx                ← Root with error boundary
│   │   ├── TrainingProvider.jsx           ← Context: auth, state, API client
│   │   │
│   │   ├── overlay/                        ← Mission execution UI
│   │   │   ├── MissionExecutor.jsx        ← Orchestrates step sequence
│   │   │   ├── Spotlight.jsx              ← Box-shadow cutout
│   │   │   ├── PulseRing.jsx             ← Green glow animation
│   │   │   ├── InstructionTooltip.jsx    ← Floating instruction card
│   │   │   ├── TrainingTopBar.jsx         ← Progress header
│   │   │   ├── StepIndicator.jsx         ← Bottom dots
│   │   │   ├── CompletionScreen.jsx      ← Mission complete
│   │   │   └── tooltipPositioner.js      ← Smart placement algorithm
│   │   │
│   │   ├── validator/                      ← Step validation engine
│   │   │   ├── StepValidator.js           ← Core: watches DOM
│   │   │   └── validators/
│   │   │       ├── urlContains.js
│   │   │       ├── elementVisible.js
│   │   │       ├── clickTarget.js
│   │   │       ├── inputNotEmpty.js
│   │   │       ├── toastAppeared.js
│   │   │       └── waitSeconds.js
│   │   │
│   │   ├── dashboards/                     ← Training views
│   │   │   ├── TrainingLauncher.jsx       ← Floating 🎓 button
│   │   │   ├── TrainingHome.jsx           ← "My Training" dashboard
│   │   │   ├── CourseCard.jsx
│   │   │   ├── MissionList.jsx
│   │   │   ├── StaffDashboard.jsx         ← Manager view
│   │   │   ├── StaffTable.jsx
│   │   │   ├── EmployeeDetail.jsx
│   │   │   └── ProgressBar.jsx
│   │   │
│   │   ├── api/
│   │   │   └── trainingApi.js             ← Axios client → training backend
│   │   │
│   │   ├── hooks/
│   │   │   ├── usePosAuth.js             ← Reads localStorage auth_token
│   │   │   ├── useTrainingProgress.js
│   │   │   └── useMissionPlayer.js
│   │   │
│   │   ├── state/
│   │   │   └── missionStateMachine.js    ← IDLE→LOADING→STEP_ACTIVE→DONE
│   │   │
│   │   └── styles/
│   │       └── training.css               ← All scoped to #training-root
│   │
│   └── dist/
│       └── training-sdk.js                ← Build output (~150-200KB)
│
├── training-backend/                       ← NEW: FastAPI training server
│   ├── server.py                          ← FastAPI app + CORS + route includes
│   ├── requirements.txt
│   ├── .env                               ← MONGO_URL, POS_API_URL, ADMIN_SECRET
│   │
│   ├── models/
│   │   ├── base.py                        ← PyObjectId, BaseDocument
│   │   ├── course.py
│   │   ├── mission.py
│   │   ├── progress.py
│   │   ├── assignment.py
│   │   └── activity.py
│   │
│   ├── routes/
│   │   ├── catalog.py                     ← GET /courses, /courses/:id/missions
│   │   ├── progress.py                    ← POST /start, /step-complete, /skip, GET /me
│   │   └── manager.py                     ← GET /overview, /employee/:id, POST /assign
│   │
│   ├── middleware/
│   │   └── pos_auth.py                    ← Validates POS Bearer token
│   │
│   ├── services/
│   │   └── pos_api.py                     ← Calls preprod to validate tokens
│   │
│   └── seed/
│       └── seed_menu_management.py       ← Menu Management: 12 missions, ~70 steps
│
└── memory/
    └── change_requests/
        └── CR_053_TRAINING_ACADEMY.md    ← Updated
```

**Total new files: ~40 | Total new directories: ~15 | POS files modified: 1 (index.html, +2 lines)**

---

## 2. EXECUTION SEQUENCE — Build Order

```
PHASE 1 EXECUTION (13 work items):

Step 1:  Training Backend — Models + DB setup
Step 2:  Training Backend — Auth middleware (POS token validation)
Step 3:  Training Backend — Catalog API (GET courses, GET missions)
Step 4:  Training Backend — Progress API (start, step-complete, skip, me)
Step 5:  Training Backend — Manager API (overview, employee detail, assign)
Step 6:  Seed Script — Menu Management course (12 missions, ~70 steps)
Step 7:  Training SDK — Bootstrap + TrainingProvider + API client
Step 8:  Training SDK — Overlay engine (Spotlight, Tooltip, PulseRing, Validator)
Step 9:  Training SDK — Mission state machine + MissionExecutor
Step 10: Training SDK — TrainingHome dashboard (course cards, progress bars)
Step 11: Training SDK — StaffDashboard (manager view, employee table, drill-down)
Step 12: Training SDK — TrainingLauncher (floating button) + CompletionScreen
Step 13: POS Integration — 2 lines in index.html + build + deploy SDK bundle

Dependencies:
  Steps 1-6: Backend (can run in parallel with 7-12 after step 3)
  Steps 7-12: SDK (needs step 3 API running for data)
  Step 13: Needs steps 1-12 complete
```

---

## 3. MENU MANAGEMENT COURSE — Full Mission Breakdown

### Course Metadata
```json
{
  "course_id": "menu-management",
  "title": "Menu Management",
  "description": "Master your restaurant menu — from adding items to bulk operations",
  "icon": "UtensilsCrossed",
  "cover_color": "#329937",
  "target_roles": ["owner", "manager"],
  "difficulty": "beginner",
  "estimated_time_minutes": 45,
  "mission_count": 12
}
```

### 12 Missions with Target Selectors

| # | Mission ID | Title | Steps | Key Selectors Used |
|---|-----------|-------|:-----:|-------------------|
| 1 | `menu-navigate` | Navigate to Menu Management | 3 | `[data-testid="sidebar-menu-management"]` → `[data-testid="menu-management-page"]` |
| 2 | `menu-browse-categories` | Browse Categories | 4 | `[data-testid="category-list"]`, `[data-testid="category-search"]`, `[data-testid^="category-"]` |
| 3 | `menu-view-items` | View Menu Items | 3 | `[data-testid^="product-card-"]`, `[data-testid="menu-type-selector"]` |
| 4 | `menu-add-item` | Add a New Menu Item | 8 | `[data-testid="product-form"]`, `[data-testid="product-form-save"]`, `[data-testid="image-upload-btn"]` |
| 5 | `menu-edit-item` | Edit an Existing Item | 6 | `[data-testid^="full-edit-"]`, `[data-testid="product-form"]`, `[data-testid="product-form-save"]` |
| 6 | `menu-quick-edit` | Quick Edit (Price & Name) | 5 | `[data-testid^="quick-edit-"]`, `[data-testid="quick-edit-save"]` |
| 7 | `menu-food-type` | Set Food Type (Veg/Non-Veg/Egg) | 4 | `[data-testid^="section-"]`, food type selector in ProductForm |
| 8 | `menu-toggle-availability` | Toggle Item Availability | 3 | `[data-testid^="status-toggle-"]` |
| 9 | `menu-delete-item` | Delete a Menu Item | 5 | `[data-testid^="delete-"]`, `[data-testid^="delete-reason-"]`, `[data-testid^="confirm-delete-"]` |
| 10 | `menu-add-variation` | Add Item Variations | 7 | `[data-testid="add-variation-btn"]`, `[data-testid^="variation-name-"]`, `[data-testid^="add-option-btn-"]` |
| 11 | `menu-bulk-editor` | Use Bulk Editor | 10 | `[data-testid="bulk-edit-toggle-btn"]`, `[data-testid="bulk-editor-panel"]`, `[data-testid="add-row-btn"]`, `[data-testid="save-changes-btn"]` |
| 12 | `menu-add-category` | Create a New Category | 5 | `[data-testid="new-category-input"]`, `[data-testid="new-category-station"]` |

### Mission 1 Detail: Navigate to Menu Management

```json
{
  "mission_id": "menu-navigate",
  "course_id": "menu-management",
  "title": "Navigate to Menu Management",
  "description": "Find and open the Menu Management section from the sidebar",
  "display_order": 1,
  "difficulty": "beginner",
  "estimated_time_minutes": 1,
  "prerequisite_mission": null,
  "allows_skip": true,
  "practice_mode": false,
  "steps": [
    {
      "step_id": "s1",
      "order": 1,
      "instruction": "Click the Menu icon in the sidebar",
      "detail": "Menu Management is where you control all your restaurant's food items, categories, pricing, and availability.",
      "target": "[data-testid='sidebar-menu-management']",
      "action": "click",
      "validate": { "type": "url_contains", "value": "/menu-management" },
      "hint": "Look for the utensils icon in the left sidebar",
      "highlight_style": "spotlight"
    },
    {
      "step_id": "s2",
      "order": 2,
      "instruction": "This is your Menu Management page",
      "detail": "On the left you'll see your categories. On the right, the items in each category. You can switch between list view and bulk editor.",
      "target": "[data-testid='menu-management-panel']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='menu-management-panel']" },
      "auto_advance_seconds": 6,
      "highlight_style": "spotlight"
    },
    {
      "step_id": "s3",
      "order": 3,
      "instruction": "Notice the categories list on the left",
      "detail": "These are your menu categories like Starters, Main Course, Beverages. Click any category to see its items. You can also search categories.",
      "target": "[data-testid='category-list']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='category-list']" },
      "auto_advance_seconds": 5,
      "highlight_style": "spotlight"
    }
  ]
}
```

### Mission 4 Detail: Add a New Menu Item (Most Complex Beginner Mission)

```json
{
  "mission_id": "menu-add-item",
  "course_id": "menu-management",
  "title": "Add a New Menu Item",
  "description": "Learn to add a new food item with name, price, category, and image",
  "display_order": 4,
  "difficulty": "beginner",
  "estimated_time_minutes": 5,
  "prerequisite_mission": "menu-view-items",
  "allows_skip": true,
  "practice_mode": true,
  "steps": [
    {
      "step_id": "s1",
      "order": 1,
      "instruction": "Make sure you're on the Menu Management page",
      "target": "[data-testid='menu-management-panel']",
      "action": "observe",
      "validate": { "type": "url_contains", "value": "/menu-management" },
      "auto_advance_seconds": 3
    },
    {
      "step_id": "s2",
      "order": 2,
      "instruction": "Select a category where you want to add the item",
      "detail": "Choose any category from the left panel. Items belong to categories like Starters, Main Course, etc.",
      "target": "[data-testid='category-list']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid^='category-']" },
      "hint": "Click any category name in the left sidebar"
    },
    {
      "step_id": "s3",
      "order": 3,
      "instruction": "The item form will appear on the right. Enter a name for your item.",
      "detail": "Type any name — for example 'Training Burger'. This is what will appear on your POS menu.",
      "target": "[data-testid='product-form'] input[name='name']",
      "action": "input",
      "validate": { "type": "input_not_empty", "value": "[data-testid='product-form'] input[name='name']" },
      "hint": "Type any item name in the Name field"
    },
    {
      "step_id": "s4",
      "order": 4,
      "instruction": "Set the price",
      "detail": "Enter the selling price. This is the price before tax. Tax will be calculated automatically based on your restaurant settings.",
      "target": "[data-testid='product-form'] input[name='price']",
      "action": "input",
      "validate": { "type": "input_not_empty", "value": "[data-testid='product-form'] input[name='price']" },
      "hint": "Enter any price amount"
    },
    {
      "step_id": "s5",
      "order": 5,
      "instruction": "Optionally, upload an item image",
      "detail": "A good photo helps staff identify items quickly. You can skip this step — images are optional.",
      "target": "[data-testid='image-upload-btn']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='image-upload-btn']" },
      "auto_advance_seconds": 5,
      "hint": "Click the upload area to add a photo, or wait to skip"
    },
    {
      "step_id": "s6",
      "order": 6,
      "instruction": "Review the food type section",
      "detail": "Set whether this item is Vegetarian, Non-Vegetarian, or contains Egg. This shows a colored indicator on the menu.",
      "target": "[data-testid='section-food-type']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='section-food-type']" },
      "auto_advance_seconds": 5
    },
    {
      "step_id": "s7",
      "order": 7,
      "instruction": "Scroll down and review all sections, then click Save",
      "detail": "You can configure variations, add-ons, and more. For now, let's save the basic item.",
      "target": "[data-testid='product-form-save']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='product-form-save']" },
      "hint": "Scroll to the bottom and click the Save button"
    },
    {
      "step_id": "s8",
      "order": 8,
      "instruction": "Your new item has been saved!",
      "detail": "The item now appears in your menu. You can edit it anytime by clicking on it. In the next mission, you'll learn how to edit existing items.",
      "target": null,
      "action": "observe",
      "validate": { "type": "wait_seconds", "value": 4 },
      "auto_advance_seconds": 4
    }
  ]
}
```

### Mission 11 Detail: Use Bulk Editor (Advanced)

```json
{
  "mission_id": "menu-bulk-editor",
  "course_id": "menu-management",
  "title": "Use the Bulk Editor",
  "description": "Edit multiple items at once with the spreadsheet-style bulk editor",
  "display_order": 11,
  "difficulty": "advanced",
  "estimated_time_minutes": 8,
  "prerequisite_mission": "menu-edit-item",
  "allows_skip": true,
  "practice_mode": true,
  "steps": [
    {
      "step_id": "s1",
      "order": 1,
      "instruction": "Click the Bulk Edit button to switch to spreadsheet mode",
      "detail": "The Bulk Editor lets you edit many items at once — like a spreadsheet. Great for updating prices across your entire menu.",
      "target": "[data-testid='bulk-edit-toggle-btn']",
      "action": "click",
      "validate": { "type": "element_visible", "value": "[data-testid='bulk-editor-panel']" },
      "hint": "It's the button at the top right of the menu panel"
    },
    {
      "step_id": "s2",
      "order": 2,
      "instruction": "This is the Bulk Editor. Notice the spreadsheet layout.",
      "detail": "Each row is a menu item. Columns show name, price, tax, food type, and more. Items are grouped by category.",
      "target": "[data-testid='bulk-editor-grid']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='bulk-editor-grid']" },
      "auto_advance_seconds": 6
    },
    {
      "step_id": "s3",
      "order": 3,
      "instruction": "Use the search bar to find a specific item",
      "detail": "Type any item name to filter the list. Useful when you have hundreds of items.",
      "target": "[data-testid='bulk-editor-search']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='bulk-editor-search']" },
      "hint": "Click the search field and type any item name"
    },
    {
      "step_id": "s4",
      "order": 4,
      "instruction": "Click on any price cell to edit it directly",
      "detail": "Just click and type — like editing a spreadsheet. Changed cells are highlighted.",
      "target": "[data-testid^='cell-price-']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid^='cell-price-']" },
      "hint": "Click on any number in the Price column"
    },
    {
      "step_id": "s5",
      "order": 5,
      "instruction": "Customize visible columns with the Column Picker",
      "detail": "You can show or hide columns to focus on what you need. For example, show only Name and Price for a quick price update.",
      "target": "[data-testid='column-picker-btn']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='column-picker-btn']" },
      "hint": "Click the column icon next to the search bar"
    },
    {
      "step_id": "s6",
      "order": 6,
      "instruction": "Toggle a column on or off",
      "detail": "Check or uncheck columns to control what's visible in the spreadsheet.",
      "target": "[data-testid^='col-toggle-']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid^='col-toggle-']" }
    },
    {
      "step_id": "s7",
      "order": 7,
      "instruction": "Add a new item using the + button",
      "detail": "You can add new menu items directly in the bulk editor. A new empty row will appear at the top.",
      "target": "[data-testid='add-row-btn']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='add-row-btn']" },
      "hint": "Click the green + button in the toolbar"
    },
    {
      "step_id": "s8",
      "order": 8,
      "instruction": "Export your menu to Excel",
      "detail": "Download your entire menu as an Excel file. Useful for offline review or sharing with your team.",
      "target": "[data-testid='download-excel-btn']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='download-excel-btn']" }
    },
    {
      "step_id": "s9",
      "order": 9,
      "instruction": "Notice the Save Changes button shows unsaved edits",
      "detail": "When you make changes, the Save button shows how many items are modified. Always save before leaving!",
      "target": "[data-testid='save-changes-btn']",
      "action": "observe",
      "validate": { "type": "element_visible", "value": "[data-testid='save-changes-btn']" },
      "auto_advance_seconds": 5
    },
    {
      "step_id": "s10",
      "order": 10,
      "instruction": "Close the Bulk Editor to return to normal view",
      "detail": "You've mastered the Bulk Editor! This is the fastest way to manage large menus.",
      "target": "[data-testid='bulk-editor-close-btn']",
      "action": "click",
      "validate": { "type": "click_target", "value": "[data-testid='bulk-editor-close-btn']" }
    }
  ]
}
```

---

## 4. VERIFICATION MATRIX

| # | Component | What to Verify | How | Auto? |
|---|-----------|---------------|-----|:-----:|
| V1 | Training Backend boots | `curl /api/training/health` → 200 | curl | YES |
| V2 | POS auth validation | `curl -H "Authorization: Bearer <pos_token>" /api/training/courses` → 200 | curl | YES |
| V3 | Courses seeded | `GET /api/training/courses` returns menu-management with 12 missions | curl | YES |
| V4 | Mission steps returned | `GET /api/training/courses/menu-management/missions` returns steps with selectors | curl | YES |
| V5 | Progress start | `POST /api/training/progress/start` creates progress doc | curl | YES |
| V6 | Step complete | `POST /api/training/progress/step-complete` advances step | curl | YES |
| V7 | Progress aggregation | `GET /api/training/progress/me` returns correct %, current step | curl | YES |
| V8 | Manager overview | `GET /api/training/manager/overview` returns employee list + progress | curl | YES |
| V9 | SDK loads in POS | Page load → `#training-root` exists → launcher button visible | Browser | NO |
| V10 | Launcher opens dashboard | Click 🎓 → training home shows courses | Browser | NO |
| V11 | Course card shows progress | Menu Management card → progress bar + mission count | Browser | NO |
| V12 | Mission starts | Click "Start" → overlay activates → spotlight on sidebar menu icon | Browser | NO |
| V13 | Step validation works | Click correct element → green checkmark → next step | Browser | NO |
| V14 | Wrong click handling | Click wrong element → gentle nudge tooltip | Browser | NO |
| V15 | Mission completion | Complete all steps → celebration screen → progress updates | Browser | NO |
| V16 | Skip mission | Click "Skip" → mission marked skipped → next available | Browser | NO |
| V17 | Resume mission | Partial progress → reopen → resumes from last step | Browser | NO |
| V18 | Manager table | Manager login → staff dashboard → employee rows with progress bars | Browser | NO |
| V19 | Employee drill-down | Click employee row → mission-level detail + timeline | Browser | NO |
| V20 | SDK doesn't break POS | SDK error boundary → POS continues working | Browser | NO |

---

## 5. POST-CODE REGISTRY CHECKLIST

```
- [ ] registry.json: CR-053 → status: IMPLEMENTED (PHASE 1), sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-053 row updated
- [ ] FILE_OWNERSHIP.md: all new files + index.html listed under CR-053
- [ ] Code markers: // CR-053 in every new file header + index.html change
- [ ] COMPILE CHECK: POS webpack still compiles (1 pre-existing warning only)
- [ ] Training Backend: starts without errors
- [ ] SDK bundle: builds successfully
- [ ] Seed: Menu Management course seeded (12 missions, ~70 steps)
```

---

## 6. RISK REGISTER

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | SDK build tooling (webpack config) adds complexity | MEDIUM | Use simple webpack config — single entry, single output, minimal plugins |
| R2 | POS data-testid selectors may not match exactly | MEDIUM | Verified against actual codebase grep — all 12 missions use confirmed selectors |
| R3 | POS auth token validation against preprod API may be slow | LOW | Cache validation result for 15 minutes per token |
| R4 | SDK styles leak into POS | LOW | All styles scoped via `#training-root` prefix + CSS isolation |
| R5 | Manager API: no employee list endpoint confirmed on POS API | MEDIUM | Fallback: derive employee list from progress docs (employees appear as they use the system) |
| R6 | SDK bundle size too large | LOW | Budget 200KB. Lazy-load dashboards. Overlay engine is lightweight (~30KB). |

---

## 7. SCOPE LOCK DECLARATION

### Files WILL change:

| # | Path | Action | Est. Lines |
|---|------|--------|:---:|
| 1 | `/app/frontend/public/index.html` | +2 lines (`<div>` + `<script>`) | +2 |
| 2 | `/app/training-sdk/**` (entire new directory) | CREATE ~25 new files | ~2500 |
| 3 | `/app/training-backend/**` (entire new directory) | CREATE ~15 new files | ~1500 |

### Files WILL NOT touch:

- `/app/frontend/src/**` — ALL POS source code
- `/app/frontend/package.json` — POS dependencies
- `/app/frontend/.env` — POS environment
- `/app/backend/**` — POS backend

---

*CR-053 Gate 3 COMPLETE. Phase 1: SDK overlay engine + Training Backend + Menu Management course (12 missions, ~70 steps). 1 POS file touched (+2 lines). ~40 new files across 2 new directories. 20 verification checks. Ready for Gate 4 GO.*
