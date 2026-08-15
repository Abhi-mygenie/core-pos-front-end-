# BUG-316 — Intake: Printer Config — Font Dropdown Empty (available_fonts null from API)

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (curl + code trace)  
**Confidence:** CONFIRMED  
**Duplicate check:** DISTINCT

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P1 — HIGH (Font selection completely non-functional) |
| Risk | LOW |
| Fast Lane eligible | YES (1 file, 3 lines, non-hotspot, non-financial) — owner approval required |

---

## Description

The Font Family dropdown in the **Print Style → Global Typography** section shows no options — user cannot select any font.

**Root cause:** API returns `global_settings.available_fonts = null`. The transform maps this as `fonts: [...(null || [])] = []`. The SelectInput renders with empty options array.

**Owner-specified valid font list:**
```
['Montserrat','Roboto','Poppins','Ubuntu','Open Sans','Lato','Oswald',
 'Helvetica (Sans Serif)','Times New Roman','Courier','Gujarati']
```

---

## Fix Summary

`printerAgentConfigTransform.js:253` — add fallback to hardcoded list when `gs.available_fonts` is null/empty.

---

## Owner Decisions Needed

None — owner has provided the exact font list.
