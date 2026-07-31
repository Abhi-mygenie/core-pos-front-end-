# CR-014 Phase 2 — Intake Document

**Status:** REGISTERED (continuation of CR-014)
**Priority:** P1
**Sprint:** POS 4.0
**Date:** 2026-06-08
**Reporter:** Owner

---

## 1. Problem Statement (Owner Verbatim)

> "Instead of having an Excel upload, can we give them Excel kind of interface there where user can choose the columns which you want to edit, and for rest of the column, the default values goes? Or he can see the default value which is going, right? And then submit it. So that will be a nice way to handle, like there's no need to download the Excel and assemble template and et cetera, right?"

---

## 2. Summary

| Aspect | Detail |
|---|---|
| **Current state** | Phase 1 shipped (20 API endpoints wired). Phase 2 had 3 bulk ops APIs (import/export/template) deferred. |
| **Problem** | Excel upload/download workflow is clunky — requires download template, fill offline, re-upload |
| **Target** | In-browser spreadsheet-style grid pre-loaded with existing menu items. User picks columns to edit, sees defaults for rest, edits inline, submits changes. |
| **UI change** | New `BulkEditor` component accessible from Menu Management Panel |
| **API change** | None — uses existing `getFoodsList` (read) + `editFood` (write per row) + `addFood` (new rows) |

---

## 3. Scope

### In Scope
- Spreadsheet grid pre-loaded from `foods-list` API
- Column picker (user selects which Tier 1 fields to show/edit)
- **Editable columns (Tier 1):** Name, Price, Category (dropdown), Status (toggle), Item Type (dropdown), Tax %, Tax Type (dropdown), Description
- Read-only display: Variations (chip), Addons (chip), Image (thumbnail)
- Dirty-cell highlighting (changed vs original)
- Batch submit — only sends changed rows via existing `editFood` API
- Add new row → `addFood` API
- Per-row success/fail feedback on submit
- Search/filter within the grid

### Out of Scope
- Variation editing (complex nested UI — keep in full ProductForm)
- Addon editing (keep in full ProductForm)
- Image upload (keep in full ProductForm)
- Bulk delete (use existing individual delete flow)
- Excel export/import (replaced by this feature entirely)

---

## 4. Dependencies

- CR-014 Phase 1 must be functional (✅ already shipped, Gate 5 QA 100%)
- Existing APIs: `getFoodsList`, `editFood`, `addFood`, `getCategories`, `getMenuMaster` — all already wired
- No new backend APIs needed

---

## 5. Gate Flow

Gate 1 (Intake) → Gate 2 (Impact Analysis) → **Mock UI** → Gate 3 (Impl Plan) → Gate 4 (Code Gate) → Gate 5 (Impl + QA) → Gate 6 (Owner Smoke)
