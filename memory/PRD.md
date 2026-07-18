# POS 5.0 · Product Requirements & Status
_Updated 2026-07-18 (evening close) after Inventory Planning cycle · Wave-2 Gate 2 CLOSED · INTAKE Wave-2 registered_

## Application
MyGenie POS 5.0 — React frontend (this repo · `/app/frontend`). Backend at `preprod.mygenie.online` (external). Multi-tenant restaurant management with orders · inventory · menu · staff · reports.

## Core Personas
- **Owner** — full POS access (Kunafa Mahal · Palm India · Central Kitchen 813)
- **Manager** — operational subset
- **Staff** — order-entry only

## Current Active Focus (as of 2026-07-18 · session close)
Inventory Wave-2 — CR-072 shipped Phase 1 · Wave-2 (CR-075-A/B · CR-077 · CR-078 · CR-079 · CR-080) intake + IA complete for 4 of 5 CRs · Gate 3 pending owner Q&A.

## What's Been Implemented (this repo, running now)
- Full CR-072 Phase 1 (Inventory Management migration) — 5 screens · 37 endpoints wired
- Expense module (CR-059 · CR-061 · CR-066 · CR-067 · CR-074 + 19 QA-passed bugs) — awaiting owner smoke
- Recipes / Ingredients / Vendors / Wastage Reasons setup screens
- Deployment: yarn dev · port 3000 · supervisor-managed · env populated with real values

## Gate 2 CLOSED · Ready for Gate 3
- **CR-075-A** Stock/Purchase UX polish (~285 lines) — ship-ready pending Gate 3 plan
- **CR-078** Smart Purchase (item-first planner + velocity + vendor ranking) — IA CLOSED · 8 owner Qs (B1-B8) pending
- **CR-079** Inventory IA restructure (Dashboard=Intelligence · Current Stock · Smart Purchase · Stock Audit) — IA CLOSED · absorbs CR-075-B · 6 owner Qs (B9-B14) pending
- **CR-075-B** Physical Count → Stock Audit rename — ABSORBED-BY-CR-079 · ships in bundle
- **BUG-201-Ph1** Cascade-warning dialog — awaiting backend brief ETA

## Gate 2 CLOSED · Parked
- **CR-076** S3 File Upload — env + backend contract needed
- **BUG-201-Ph2** Role gating — deferred to CR-071

## INTAKE done · Needs Gate 2 (fresh session)
- **CR-077** Hierarchy Stock Transfer (Receive/Reject/Return/Dispute) — 9 endpoints live-verified · full Receive mock in v5 · needs master-outlet creds (#813) for Dispatch/Approval IA · 8 open questions

## INTAKE done · Deferred (Phase 2)
- **CR-080** Transfer-First Smart Purchase (franchise cross-flow) — do NOT design/plan until CR-077 + CR-078 ship

## Backlog
- **CR-08X** Inventory Reports — widget drill-downs (per FB-8 owner note)
- Role-based landing (deferred cross-module CR — post CR-078/CR-079)
- ~24 items in QA-passed / owner-smoke queue (Expense module)

## Backend Briefs Awaiting Team ETA
1. `/app/memory/backend_briefs/BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html` (P1)
2. `/app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html` (P1)
3. `/app/memory/backend_briefs/BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html` (P2)

Public: `https://react-pos-frontend-4.preview.emergentagent.com/backend-briefs/`

## Locked Design Artifact (SINGLE SOURCE OF TRUTH)
**Mock v5** — the reference for CR-075-A · CR-077 (Receive) · CR-078 · CR-079 · recipe bulk editor:
`/app/frontend/public/cr072-inventory-mockup-v5-full.html`
Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html`

_Note:_ standalone `/__dev/recipe_bulk_editor_mockup.html` is **SUPERSEDED** — merged into v5 as `#screen-recipes` per owner ruling 2026-07-18.

## Latest Handover
**Canonical:** `/app/memory/handover/SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING_CLOSE.md` (revised · supersedes the AM handover)

## Test Credentials (POS backend)
See `/app/memory/control/test_credentials.md` for full list. Inventory-relevant:
- `owner@kunafamahal.com` / `Qplazm@10` — Kunafa Mahal (normal outlet)
- `owner@palmindia.com` / `Qplazm@10` — Palm India (franchise · parent 813)
- Central Kitchen (#813) master creds — **STILL NEEDED** for CR-077 Dispatch flow validation
Tokens expire quickly; re-login before each curl session.

## Repo Provenance
Git remote: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · commit `cfe1cd3`
Deployed via full wipe-and-clone (2026-07-18) preserving `.emergent/` and `.env` placeholders.
