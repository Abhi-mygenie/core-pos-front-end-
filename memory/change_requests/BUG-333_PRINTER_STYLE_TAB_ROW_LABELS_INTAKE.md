# BUG-333 — Printer Style Tab: Row Labels Show "Row 1/Row 2" Instead of Field Names

**ID:** BUG-333  
**Type:** BUG  
**Severity:** P2 — LOW  
**Risk:** LOW (UI label only — no logic change, no API change)  
**Area:** Settings → Printer Settings → Print Style Tab  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** OWNER-REPORTED (screenshot provided)  
**Duplicate check:** DISTINCT  

---

## Description

In Printer Settings → Print Style tab, the **Bill Information** and **Item Table** sections show generic labels:
- "Row 1", "Row 2", "Row 3", "Row 4" (Bill Information)
- "Table Header" etc. (Item Table)

These should show **meaningful field names** — e.g. "Restaurant Name", "Address", "FSSAI Number", "Phone", "Item Name", "Price", etc.

Screenshot: Bill Information section shows "Row 1 / Row 2 / Row 3 / Row 4" with 58mm / 80mm / Bold controls.

## Root Cause

`PrintStyleTab.jsx:7`: `const humanize = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())`

The API returns keys like `row_1`, `row_2`, `row_3`, `row_4`, `table_header` etc. The `humanize` function simply converts snake_case → Title Case: `row_1` → "Row 1".

There is no label-mapping dictionary that converts these internal API keys to meaningful display names.

## Evidence

- `PrintStyleTab.jsx:7`: `humanize` function — snake_case only, no semantic mapping
- `PrintStyleTab.jsx:53`: `{humanize(rowKey)}` — rendered as-is from API key
- Screenshot: "Row 1", "Row 2", "Row 3", "Row 4", "Item Table" → generic
- Source: OWNER-REPORTED
- Confidence: HIGH

## Blast Radius

- **1 file only**: `PrintStyleTab.jsx` — add a `LABEL_MAP` object above `humanize()`
- No API change, no state change, no logic change
- `humanize` remains as fallback for any unmapped keys
- Estimated scope: SMALL (1 file, ~10-20 lines for label map)

## Owner Input Required

Owner said: **"if needed will provide mapping"**

We need the label mapping from API keys → display names.

**OQ-1: Please provide the mapping for Bill Information rows:**
- `row_1` → ?  (e.g. "Restaurant Name")
- `row_2` → ?  (e.g. "Address")
- `row_3` → ?  (e.g. "FSSAI Number")
- `row_4` → ?  (e.g. "Phone on Bill")
- Any other rows in Bill Information section?

**OQ-2: Please provide the mapping for Item Table rows:**
- `table_header` → ?
- Any other row keys in this section?

**OQ-3: Are there other sections (KOT style, etc.) that also need mapping?**

Once owner provides the mapping, this is:
- 1 file, LOW risk, ≤20 lines → **Fast Lane eligible (pending owner GO)**

## Planning Skip / Fast Lane

- 1 file only: YES
- ≤10 changed lines: YES (if mapping fits, otherwise up to 20)
- No API/state/logic/localStorage change: YES
- Not financial/order/report/print logic: BORDERLINE (print style labels — cosmetic only)
- **Fast Lane eligible pending owner mapping input + owner GO**

## Next: Owner provides mapping (OQ-1/2/3) → Fast Lane implementation
