# CR-089 — PDF Export for Standard, Sub, and Addon Recipes

**ID:** CR-089
**Type:** CR
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Inventory — Recipe Management (RecipeBulkEditor / RecipeManagementPanel)
**Duplicate Check:** NONE — no PDF export exists for recipes currently.
**Code Reality:** NONE — `RecipeBulkEditor.jsx` has Excel export only (and only for standard recipes). No PDF export button or service function exists.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (feature gap verified)

---

## Description

Owner wants to **export recipes as a PDF** — a printable document that kitchen staff can use. The export should cover all three recipe types: Standard, Sub, and Addon.

### Expected Output
- PDF with recipe name, type, linked food/addon item, serving size, ingredients list (qty + unit per row), preparation time, serve time
- Separate sections per recipe type OR combined with type header
- Accessible from: a "Download PDF" button in `RecipeBulkEditor` or in `RecipeManagementPanel`

---

## Evidence

- Code: `RecipeBulkEditor.jsx:95` — only Excel export, only for standard recipes
- No `exportRecipesPDF()` or `toPDF()` function in `recipeService.js`
- Needs: backend check — is there `GET /recipe/export-pdf` endpoint? Or client-side PDF generation needed?

---

## Blast Radius

- 2-3 files: `RecipeManagementPanel.jsx` or `RecipeBulkEditor.jsx`, `recipeService.js`
- If client-side PDF: needs PDF library (e.g., `jspdf` + `jspdf-autotable`) — dependency addition
- If backend PDF: just wire endpoint
- Scope: MEDIUM

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Check backend for PDF export endpoint
2. If backend: add service function + button → download
3. If client-side: add `jspdf` + `jspdf-autotable`, generate from recipe data array
4. Placement: "Download PDF" button in RecipeManagementPanel toolbar (visible across all tabs)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
