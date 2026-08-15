# CR-057 — Intake Document (Gate 0 + Gate 1)

**Status:** REGISTERED · **Priority:** P1 · **Risk:** CRITICAL · **Sprint:** POS 5.0 · **Date:** 2026-07-04
**Source:** OWNER-REPORTED (batch intake 2026-07-04)
**Type:** CR (business rule + config) — Frontend (Menu Management → Tax + Restaurant Settings + downstream bill/print)
**Duplicate check:** DISTINCT
**Financial flag:** R6 — TAX / VAT / GST. **CRITICAL risk.** Owner approval required before Gate 3. Full E2E money regression required.
**Business-rule question (R3):** Owner is asking for the tax model to be documented AND for a new "No Tax" option to be added. Both parts need owner ruling.

---

## 1. Requirement (two parts)

### Part A — Documentation ask (must precede Part B)
Owner wants clarity on the current tax model: how GST / VAT / "No Tax" are supposed to compose, at what level (restaurant / category / item), and how the bill total is computed. Deliverable: a short tax-model note in `/app/memory/` referenced by CR-057 impact analysis.

### Part B — New feature
Add a **"No Tax"** option to the Menu Management → Tax dropdown. Currently only GST and VAT appear as options.

Owner phrasing (verbatim in intake): "Need to understand what is rules on tax, currently no tax option not coming in drop down in menu management, only gst and vat is coming."

## 2. Code Reality
- Restaurant-level tax toggles exist: `pages/RestaurantSettingsPage.jsx` L431 (`gstEnabled`), L439 (`vatEnabled`); GST mode (`gstMode`) at L435 with options `category` (Item Level) / `flat` (Restaurant Level).
- Item-level tax code path in Menu Management — Planning must locate the exact dropdown component (likely inside `components/panels/menu/ProductForm.jsx` or `BulkEditor.jsx` tax columns).
- Backend payload field for "no tax" — UNKNOWN. Curl-probe required (R11).

## 3. Blast Radius
**LARGE (6+ files):** Menu form + Bulk Editor tax column + settings transform + orderTransform tax computation + bill/print template + reports (tax-slab report exists at `pages/reports-module/TaxSlabsMockup.jsx`). Hotspots: `orderTransform.js` (R5), print/bill layer.

## 4. Evidence
- Owner verbal report only. Confidence: REPORTED.
- Screenshot of current dropdown: NOT PROVIDED — request from owner.

## 5. Open Questions (for Planning — owner rulings required)
1. **Semantics of "No Tax":** does it mean (a) skip tax computation entirely for the item and show ₹0 tax rows, (b) exempt at bill total, or (c) something else? — R3, requires owner ruling before code.
2. Interaction with `gstMode` (restaurant-flat vs item-category): does "No Tax" override both restaurant-flat and item-category GST?
3. Does "No Tax" apply per-item, per-category, or both?
4. Compatibility with the existing item-level GST code path (item.gst_code) and VAT code path.
5. Reporting impact: how does a No-Tax item roll up in Tax Slabs report / Sales report / audit engine?
6. Backward compatibility for existing menus once the option is added.

## 6. Next
Planning Gate 2 — Impact Analysis + tax-model documentation FIRST (Part A); owner ruling on all 6 questions; then Gate 3 with full E2E money regression per R6.
