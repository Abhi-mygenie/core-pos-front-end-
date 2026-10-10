# PRD — core-pos-front-end (Mygenie POS)

## Latest Deployment Record — 2026-10-09 (Emergent E1 Session 3)

### Source
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: 5oct-1
- Deployed to: /app/frontend

### Architecture
- Frontend-only React app (no backend/database in this deployment)
- Build tool: CRACO + React 19
- Package manager: yarn
- Start command: `yarn start` → `craco start` → port 3000
- External backend: `https://preprod.mygenie.online`
- External socket: `https://presocket.mygenie.online`

---

## What's Been Implemented (this session, 2026-10-09)

### BUG-525-FIX — Room split legs must equal balance (both over AND under blocked)
- `FolioCheckoutPanel.jsx`: added `effectiveRoomBalance` useMemo; `roomSplitOverBalance` checks `!== effectiveRoomBalance`
- Directional alert messages (over vs under)
- handlePaid guard + dep array updated
- **Tested:** iteration_1.json 6/6 PASS

### BUG-519-FIX — CPP Pay button was clipped (layout bug)
- `frontdesk.css`: `.frontdesk-bill` gets `display:flex; flex-direction:column`
- `FolioCheckoutPanel.jsx`: Suspense/CPP wrapped in `flex-1 min-h-0 overflow-hidden`
- **Tested:** checkout button confirmed visible in testing

### BUG-526 — Folio CPP split gray (GATE_3_PLAN_COMPLETE)
- 1 file: `FolioCheckoutPanel.jsx:413`
- Condition: `(roomSplitEnabled && !roomSplitOverBalance && effectiveRoomBalance > 0) ? 0 : Math.max(0, ...)`
- Awaiting Gate 4 GO

### BUG-527 — Dashboard CPP check-in discount missing + split gray (GATE_3_PLAN_COMPLETE)
- 2 files: `CollectPaymentPanel.jsx` (R5) + `PmsCheckoutDrawer.jsx`
- E1: subtract `discountAmount` from `roomBalance` → shows ₹600 not ₹1,600
- E2: add "Check-in Discount −₹1,000" line to Room section
- E3: split check threshold = `effectiveTotal - roomBalance` (food-only)
- E4: PmsDrawer BUG-425 formula subtract `discountAmount`
- Awaiting Gate 4 GO

---

## All GATE_5A Items (awaiting QA Gate 5B)

| ID | Title |
|---|---|
| BUG-516..519 | Folio VAT/GST label, discount formulas, Both cap, RoomDiscountControls placement |
| BUG-522 | Room discount independent of food |
| BUG-523 | profileTransform payment_types (neutral no-op) |
| BUG-524 | Room discount alert clamped |
| FU-385-D | Split button re-enabled (D88 CSS reversal) |
| BUG-525 | Room split legs cap (over + under) |

---

## Open Backlog (P0/P1)

| ID | Status | Priority |
|---|---|---|
| BUG-526 | GATE_3_PLAN_COMPLETE | P1 — Gate 4 GO |
| BUG-527 | GATE_3_PLAN_COMPLETE | P1 — Gate 4 GO (R5) |
| Balance ₹827 vs ₹848 | BACKEND_ASK | P2 — backend brief filed |
| BUG-516..519+522..525, FU-385-D | GATE_5A | P1 — QA Gate 5B |

---

## Test Credentials

| Account | Email | Password |
|---|---|---|
| Owner (RID 69, The Goan Kitchen) | owner@thegoankitchen.com | Qplazm@10 |

**Test booking:** bonk · MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D · room r4 · order #000361
- booking_charge=₹3,000 · check-in discount=₹1,000 · advance=₹1,500 · baseBalance=₹600 · maxCheckoutDiscount=₹525

---

## Environment Variables Set
- REACT_APP_BACKEND_URL (platform URL)
- WDS_SOCKET_PORT=443
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- REACT_APP_FIREBASE_* (8 keys)
- REACT_APP_CRM_BASE_URL / REACT_APP_CRM_API_KEYS
- REACT_APP_GOOGLE_MAPS_KEY
- CORS_ORIGINS=* / REACT_APP_SHOW_AUDIT_TAB=true

**Note:** REACT_APP_CRM_API_KEYS vendor "509" value was truncated in original problem statement — placeholder used.
