# MyGenie POS — PRD

## Original Problem Statement
Deployment and maintenance of MyGenie POS frontend (React 19, CRACO, Tailwind CSS, Radix UI, shadcn). 
Source repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: `6-july`)

## What's Been Implemented

### Session 1-2 (2026-07-07 / 2026-07-08)
- Cloned repo, installed dependencies, configured env, fresh pull

### Session 3 (2026-07-12) — BUG FIXES + INVESTIGATION

**BUG-166 — addon_amount × qty (KEPT ✅)**
- L704 (buildCartItem): `addonAmount * (item.qty || 1)` — sends total price
- L1493 (collectBillExisting): `addonAmount * qty` — sends total price

**BUG-168 — add_on_qtys (REVERTED ❌ → back to per-unit)**
- L698: REVERTED back to `addonQtys` (per-unit). Backend multiplies qty on its side.

**BUG-168 Display fixes (KEPT ✅)**
- CartPanel.jsx: getAddonText helper + socket fallback — shows `a.qty × item.qty`
- CollectPaymentPanel.jsx: 4 paths — shows total addon qty
- These work correctly now because backend returns per-unit qty, display × item.qty = correct total

**BUG-VQTY — variation_amount × qty (KEPT ✅, no issues)**
- L703, L1492: sends total variation price. No round-trip double-count issue.

### Final state of orderTransform.js buildCartItem (L696-704):
```
add_on_qtys:      addonQtys                              ← per-unit (reverted)
variation_amount: variationAmount * (item.qty || 1)      ← total price (kept)
addon_amount:     addonAmount * (item.qty || 1)          ← total price (kept)
```

### Backend contract (confirmed via Order #940260):
- `add_on_qtys`: expects per-unit → backend multiplies by qty
- `addon_amount`: expects total price
- `variation_amount`: expects total price

## Investigation Docs
- `/app/memory/change_requests/BUG_166_168_ADDON_REVERT_PLAN.md` — full revert plan (superseded by partial revert)
- `/app/memory/change_requests/BUG_168_PHASE2_FRONTEND_ADAPTATION_PLAN.md` — new contract adaptation plan
- `/app/memory/change_requests/BUG_166_ADDON_AMOUNT_QTY_INTAKE.md` — original intake

## Prioritized Backlog
- P1: CR-061 V2, OrderCard cluster, CR-051, CR-060
- Blocked: CR-065 (needs backend PUT endpoint)

## Test Credentials
- owner@cafe103.com / Qplazm@10
- owner@mantri.com / Qplazm@10
- manager@hogwarts.com / Qplazm@10
