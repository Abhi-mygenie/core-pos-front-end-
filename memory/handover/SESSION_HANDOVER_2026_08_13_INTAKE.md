# Session Handover — 2026-08-13 (Intake Session)

**Session type:** INTAKE (Role 1) — formal registration of BUG-314→BUG-319 + new BUG-320  
**Branch:** `main`  
**Environment:** RUNNING · webpack compiled clean · port 3000  
**Date closed:** 2026-08-13

---

## Last Session Summary

(Same day, prior) Investigation session: BUG-314→BUG-319 investigated, intake docs written, evidence collected. BUG-320 newly reported this session.

---

## This Session

**Role:** INTAKE AGENT  
**Boot reading:** AGENT_PROMPT_ALPHA.md (in context from prior session), BUG_TRACKER.md (checked duplicate), registry.json (confirmed 313 was max before this session)

---

## Items Formally Registered

| ID | Title | P | Risk | Gate | Duplicate Check |
|---|---|---|---|---|---|
| **BUG-314** | Inventory Setup — Promise.all fail → CATEGORIES(0) + unit dropdown empty | P1 | MEDIUM | 1 ✅ | DISTINCT |
| **BUG-315** | Printer Config — Numeric inputs can't be cleared (controlled snap-back) | P2 | LOW | 1 ✅ | RELATED to CR-133-GAP G4 |
| **BUG-316** | Printer Config — Font dropdown empty (available_fonts null, no fallback) | P1 | LOW | 1 ✅ | DISTINCT |
| **BUG-317** | Printer Config — Android size max=8 blocks values >8 | P2 | LOW | 1 ✅ | RELATED to CR-133-GAP OD-D (override) |
| **BUG-318** | Aggregator auto-print keys missing from printer UI + wrong API | P1 | MEDIUM | 1 ✅ | RELATED to CR-133 OD-B (override) |
| **BUG-319** | Footer text hardcoded in print agent firmware | P2 | LOW | 1 ✅ BACKEND-BLOCKED | DISTINCT |
| **BUG-320** | Sub-Recipe Stock — physical_qty extra key in payload (always mirrors quantity) | P2 | LOW | 1 ✅ | DISTINCT |

**Total items in registry.json:** 496 (was 489 before this session)

---

## BUG-320 Code Reality Check (new this session)

| File | Line | Code | Status |
|---|---|---|---|
| `inventoryTransform.js` | 232 | `physical_qty: data.physicalQty ?? 0` | Confirmed — should be removed |
| `SubRecipeStockPanel.jsx` | 94 | `physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered` | Confirmed — should be removed |

**Root cause:** During CR-139/BUG-308 implementation, `physicalQty` was included as a pass-through in `addSubRecipeStock`. The comment "V4: physicalQty always equals quantity entered" confirms it was always mirroring `quantity` — a leftover from the StockAuditPanel pattern where `physical_qty` IS semantically correct (physical shelf count vs. system count). For sub-recipe stock (produced quantities), this distinction doesn't exist.

---

## Artifacts Created This Session

```
/app/memory/change_requests/BUG-320_SUBRECIPE_STOCK_PHYSICAL_QTY_EXTRA_KEY_INTAKE.md
```

Previously created (Investigation session, same day):
```
/app/memory/change_requests/BUG-314_INV_SETUP_CATEGORIES_UNITS_NOT_LOADING_INTAKE.md
/app/memory/change_requests/BUG-315_PRINTER_NUMERIC_INPUT_CLEAR_BROKEN_INTAKE.md
/app/memory/change_requests/BUG-316_PRINTER_FONT_DROPDOWN_EMPTY_INTAKE.md
/app/memory/change_requests/BUG-317_PRINTER_ANDROID_SIZE_MAX_CONSTRAINT_INTAKE.md
/app/memory/change_requests/BUG-318_AGGREGATOR_AUTOPRINT_KEYS_MISSING_PRINTER_UI_INTAKE.md
/app/memory/change_requests/BUG-319_PRINTER_FOOTER_HARDCODED_BACKEND_INTAKE.md
/app/memory/BUG-314_INV_SETUP_DROPDOWN_INVESTIGATION_REPORT.md
/app/memory/BUG-315-319_PRINTER_CR_GAPS_INVESTIGATION_REPORT.md
```

---

## Owner Decisions Needed Before PLANNING

| ID | Decision |
|---|---|
| BUG-314 | Fast-lane approved? (1 file, Promise.allSettled) |
| BUG-315 | Fast-lane approved? (2 files, local display state) |
| BUG-316 | Fast-lane approved? Confirm 11-font list is correct |
| BUG-317 | Fast-lane approved? (OD-D already overridden in owner session) |
| **BUG-318** | Q1: Remove from AggregatorSetup/OperationalTab too, or keep in both? Q2: Hardcode `["Acknowledged","Food Ready"]` for stage options? |
| BUG-319 | Hide Footer Text field from FE until backend fixes? |
| **BUG-320** | Confirm: remove physical_qty completely? Does backend use this for audit trail on sub-recipe endpoint? |

---

## Recommended Batching for Planning

**Fast-lane batch (owner approval → direct implementation):**
- BUG-316 (1 file, 3 lines — font fallback)
- BUG-317 (1 file, 5 lines — remove android max)

**Gate 2-3 batch A (small, same files):**
- BUG-314 (Promise.allSettled)
- BUG-315 (numeric input local state)
- BUG-320 (remove physical_qty — 2 lines)

**Gate 2-3 batch B (design decision pending):**
- BUG-318 (aggregator fields in printer UI — needs owner Q1 answer first)

**Backend brief:**
- BUG-319 (no FE change until backend fix)
- BUG-314 secondary ask (get-inventory-master → 200+[] not 404)

---

## Next Agent

Priority queue (in order):
1. BUG-309, BUG-310, BUG-311 — PLANNING Gates 2-3 (from prior session, still pending)
2. BUG-314 fast-lane / Gate 2-3 (inventory setup critical path — blocks new restaurant setup)
3. BUG-316 fast-lane (1 file, trivial)
4. BUG-317 fast-lane (1 file, trivial)
5. BUG-318 Gate 2-3 (awaiting owner Q1 answer)
6. BUG-320 Gate 2-3 (with BUG-314 batch)
