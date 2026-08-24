# BUG-297 — Category Created from Web POS Has restaurant_printer_id = NULL

**ID:** BUG-297  
**Type:** BUG  
**Priority:** P1 — HIGH  
**Risk:** HIGH (station not mapped → KOT printing broken → default order status not updated)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

When a category is created from the Web POS (new POS), `restaurant_printer_id` is sent as `NULL`. This means:
1. No station is mapped to food items under this category
2. KOT printing does not work for items in this category
3. Default order status is not updated for these items

The old POS correctly sent `restaurant_printer_id: 12` (or relevant printer ID) when creating a category.

## Evidence
- Screenshot: PROVIDED — DevTools Network tab showing `add-categories` payload with fields: `name, cat_type, vendor_type, station_name: KDS, restaurant_printer_id: 12, cat_order: 12` (from UAT/old POS). Web POS sends NULL for this field.
- Steps to reproduce: Web POS → Menu Management → Add Category → fill name/station → Save → inspect network payload
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (screenshot evidence)

## Area
Menu Management → Add Category form

## Code Reality Check
- `menuManagementService.js:92` — sends `restaurant_printer_id: String(printerId)` ✓ (field IS sent)
- `menuManagementService.js:107` — `restaurant_printer_id: data.printerId || 0` (fallback to 0)
- `menuManagementTransform.js:182` — reads `c.restaurant_printer_id || ''` on GET
- **Root cause hypothesis:** The Add Category form/dialog does NOT expose a printer selector UI — `printerId` is never set by the user → defaults to empty/0/null.
- **Code Reality: PARTIAL — service sends the field, but no printer selector UI exists in the Add Category form.**

## Duplicate Check
- DISTINCT — no prior bug for category printer_id being null
- RELATED: CR-014 (Menu Management API migration), CR-019 (Restaurant Settings), BUG-197 (inventory post-delivery)

## Blast Radius
- `MenuManagementPanel.jsx` — Add Category dialog/form (need printer selector UI)
- `menuManagementService.js` — possibly tweak default handling
- ~1-2 files, SMALL blast radius
- Hotspot files: NO

## Severity Rubric
P1 — Feature broken (KOT printing silent failure for newly created categories, no workaround)

## Risk Classification
- **Risk: HIGH**
- Trigger: Printing, order flow, station mapping — silent failure
- Fast Lane eligible: NO

## Open Questions
- OQ-1: Should the Add Category form show a printer dropdown (like old POS) or auto-derive from `station_name`?
- OQ-2: Should existing categories with NULL printer_id be fixable via Edit Category?

## Next Step
INVESTIGATION recommended — confirm exact Add Category form UI, check if printer list API is already called, then PLANNING.
