# POS 5.0 · Product Requirements & Status
_Updated 2026-07-18 after Inventory Planning cycle · Gate 2 CLOSED_

## Application
MyGenie POS 5.0 — React frontend (this repo · `/app/frontend`). Backend at `preprod.mygenie.online` (external). Multi-tenant restaurant management with orders · inventory · menu · staff · reports.

## Core Personas
- **Owner** — full POS access (Kunafa Mahal · Palm India · Central Kitchen 813)
- **Manager** — operational subset
- **Staff** — order-entry only

## Current Active CR Focus (as of 2026-07-18)
Inventory Module — CR-072 shipped Phase 1 · Gate 2 just CLOSED for a 5-CR follow-up wave.

## What's Been Implemented (this repo, running now)
- Full CR-072 Phase 1 (Inventory Management migration) — 5 screens · 37 endpoints wired
- Expense module (CR-059 · CR-061 · CR-066 · CR-067 · CR-074 + 19 QA-passed bugs) — awaiting owner smoke
- Recipes / Ingredients / Vendors / Wastage Reasons setup screens (v2 mock live)
- Deployment: yarn dev · port 3000 · supervisor-managed · env populated with real values

## Gate 2 CLOSED · Ready for Gate 3
- **CR-075-A** Stock/Purchase UX polish (~285 lines) — ship-ready pending Gate 3 plan
- **CR-075-B** Physical Count → Stock Audit rename (~55 lines) — ship-ready
- **BUG-201-Ph1** Cascade-warning dialog — awaiting backend brief ETA

## Gate 2 CLOSED · Parked
- **CR-076** S3 File Upload — env + backend contract needed
- **BUG-201-Ph2** Role gating — deferred to CR-071

## Needs INTAKE (fresh session)
- **CR-077** Hierarchy Stock Transfer (Receive/Reject/Return/Dispute) — full mock preview in v5
- **CR-078** Smart Purchase — item-first planner with velocity + vendor intelligence — full mock in v5
- **CR-079** Inventory IA restructure — Dashboard/Current Stock/Smart Purchase/Stock Audit — full mock in v5

## Backlog
- **CR-08X** Inventory Reports — widget drill-downs (per FB-8 owner note)
- ~24 items in QA-passed / owner-smoke queue (Expense module)

## Backend Briefs Awaiting Team ETA
1. `/app/memory/backend_briefs/BACKEND_BRIEF_WASTAGE_REPORT_2026_07_18.html` (P1)
2. `/app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_ITEM_IMPACT_2026_07_18.html` (P1)
3. `/app/memory/backend_briefs/BACKEND_BRIEF_MULTI_VENDOR_PURCHASE_2026_07_18.html` (P2)

Public: `https://react-pos-frontend-4.preview.emergentagent.com/backend-briefs/`

## Locked Design Artifact
**Mock v5** — the reference for all 5 upcoming CRs:
`/app/frontend/public/cr072-inventory-mockup-v5-full.html`
Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html`

## Latest Handover
`/app/memory/handover/SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING.md`

## Test Credentials (POS backend)
- `owner@kunafamahal.com` / `Qplazm@10` — Kunafa Mahal (normal outlet)
- `owner@palmindia.com` / `Qplazm@10` — Palm India (franchise · parent 813)
Tokens expire quickly; re-login before each curl session.

## Repo Provenance
Git remote: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main`
Deployed via full wipe-and-clone (2026-07-18) preserving `.emergent/` and `.env` placeholders.
