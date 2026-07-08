# MyGenie POS — Working PRD (session-updated)

## Origin
Clone of `Abhi-mygenie/core-pos-front-end-` branch `6-july` — full MyGenie POS frontend (React 19 + CRACO + Tailwind + Radix). Backend API lives at `https://preprod.mygenie.online` (Laravel).

## Session log

### 2026-07-08 — Deployment + fresh pull + BUG-168 investigation & partial fix

**Deployment:**
- Fresh clone of `6-july` into `/app` (preserved `/app/.git`, `/app/.emergent`).
- `yarn install` (802 pkgs, React 19, craco 7, Tailwind, Radix, Zustand).
- Configured `/app/frontend/.env` with:
  - `REACT_APP_BACKEND_URL` (Emergent preview)
  - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`
  - `REACT_APP_SOCKET_URL=https://presocket.mygenie.online`
  - `REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api`
  - Full Firebase config for `mygenie-restaurant`.
- Supervisor frontend service RUNNING on port 3000, HTTP 200, MyGenie POS login page verified.

**BUG-168 v2 applied (single-file edit):**
- `frontend/src/api/transforms/orderTransform.js` L1808-1826 — replaced prior no-op patch with add_ons[] traversal mirroring `CollectPaymentPanel.getItemLinePrice:212-224`.
- Verified working for addon case on 2 live orders (#002384 → 219 ✅, #002386 → 292 ✅).

**Owner clarification (session close):**
- Investigation direction inverted per owner: **Collect Bill auto-print (B3/B4/B5) is WRONG; dashboard/card/order-entry Bill-Print button (B1/B2/B6/B7) is CORRECT** — opposite of the model this session used.
- Investigation reopened for next session (see handover doc).

**Intake candidates filed (not yet approved):**
- BUG-169 — Double-SC in `finalOrderSubtotal` fallback (order #002386).
- BUG-170 — Variation upcharge missing from fallback subtotal loop (order #000334).
- BUG-171 — Receipt Total ≠ Item Total + taxes (order #000334, ₹9.80 gap).

## Environment (stable)
- Frontend: `http://localhost:3000` (supervisor) or Emergent preview URL for browser test.
- Backend API: `https://preprod.mygenie.online`.
- Socket: `https://presocket.mygenie.online`.
- Node 20+, yarn 1.x.
- Hot reload enabled — restart only on `.env` or dependency changes.

## Active hotspot files (per Alpha R5)
`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx`, `LoadingPage.jsx`, `socketHandlers.js`.

## What's implemented (this session)
- Environment stood up, fresh pull from remote.
- BUG-168 v2 fix at `orderTransform.js:1808-1826` (addon case for backend-sourced print paths).

## Backlog (prioritised)
- **P0** — Resolve BUG-168 path-divergence per owner clarification (Collect Bill auto-print vs Bill-Print button). Handover: `/app/memory/handover/SESSION_HANDOVER_2026_07_08_BUG168_PRINT_INVESTIGATION.md`.
- **P1** — BUG-169 subtotal double-SC (pending owner approval + path clarification).
- **P1** — BUG-170 variation upcharge in fallback (pending owner approval + path clarification).
- **P2** — BUG-171 receipt Total tax-cascade rounding gap.

## Next action item (P0)
Owner to place ONE test order with both addons AND a variation-upcharge item, then:
1. Print via Collect Bill auto-print → capture `/order-temp-store` request body from browser DevTools.
2. WITHOUT collecting again, print via Order-Card / Order-Entry "Bill Print" button → capture same.
3. Share both JSON payloads.
4. Next agent diffs and traces the divergent code path.
