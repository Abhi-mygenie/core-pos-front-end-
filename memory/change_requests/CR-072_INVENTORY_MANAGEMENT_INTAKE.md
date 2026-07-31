# CR-072: Inventory Management — Migration from Old POS to New POS

**Type:** CR (Feature Migration)
**Priority:** P1 (High)
**Risk:** HIGH (complex module, touches stock/money-adjacent logic, multi-surface, R6-adjacent)
**Status:** INTAKE
**Registered:** 2026-07-15
**Sprint:** POS 5.0

---

## Summary

Migrate the full Inventory Management module from the old MyGenie POS to the new React POS. Inventory is identified by the owner as the "toughest thing to manage" — **user experience ease is the #1 priority** when designing the new interface.

---

## Owner Context

- Owner will supply **curl commands** (old POS API probes) + **old POS design screenshots** as reference during impact analysis
- Exact scope (raw materials, stock-in/out, recipes/BOM, purchase orders, alerts, vendor management, wastage) to be determined from the curl + old POS reference material
- Design phase should come **after impact analysis, before implementation planning** — UX ease is the guiding principle

---

## Code Reality Check

**Code Reality: NONE** — no dedicated inventory management module exists in the new POS.

Tangential inventory touches in existing code:
- `is_inventory` field on menu items (BUG-120-D, CLOSED — field wired in ProductForm/BulkEditor)
- `stock_out` field on menu items (ProductForm)
- Restaurant Settings Step 5 label: "Inventory & Extras"
- Expense Module (CR-059) manages expense stock items + unit prices — **potential overlap to investigate**

---

## Duplicate Check

- **Classification: DISTINCT**
- No existing CR for inventory management as a module
- CR-059 (Expense Module) has adjacent stock-item concepts but distinct scope (expenses, not inventory)

---

## Blast Radius (preliminary — refine at impact analysis)

- Estimated scope: **LARGE** (likely 8+ new files, touches to Sidebar, App.js, constants.js, possibly menu/order surfaces)
- Hotspot files: **TBD** — depends on whether inventory links to order flow (stock-out blocking) or stays standalone
- Fast Lane eligible: **NO**

---

## Evidence

- Screenshots: **pending** — owner to share old POS design reference
- Curl output: **pending** — owner to share API probes during impact analysis
- Source: OWNER-REPORTED
- Confidence: REPORTED (scope unverified until curl + design shared)

---

## Open Questions (deferred to Impact Analysis)

| # | Question | Status |
|---|----------|--------|
| OQ-1 | What sub-modules does old POS inventory cover? (raw materials, stock-in/out, recipes/BOM, purchase orders, alerts, vendor management, wastage) | PENDING — curl will answer |
| OQ-2 | Which backend APIs exist on preprod for inventory? Endpoints, response shapes? | PENDING — curl will answer |
| OQ-3 | Phase plan — single delivery or multi-phase? | PENDING — owner to decide after impact analysis |
| OQ-4 | Does inventory interact with order flow? (e.g., stock-out blocks ordering) | PENDING |
| OQ-5 | Relationship to CR-059 Expense Module stock items? Shared or separate? | PENDING |
| OQ-6 | Role/permission gating for inventory actions? (ties to CR-071 deferred permission wiring) | PENDING |

---

## Design Note

Owner directive: **design phase comes after impact analysis, before implementation planning.** UX ease is the #1 priority — inventory is operationally complex and the interface must make it simple for restaurant staff.

---

## Next

**Impact Analysis (Gate 2)** — blocked on owner sharing curl commands + old POS design reference.
