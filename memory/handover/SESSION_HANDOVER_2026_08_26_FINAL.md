# Session Handover — 2026-08-26

**Status:** CLOSED — QA deferred to next session
**App:** MyGenie POS React Frontend
**URL:** https://core-frontend-dev.preview.emergentagent.com
**Branch:** `room` (origin/room), deployed from `/app/frontend`

---

## Session Summary

Full session covering: deployment → investigation → intake (12 items) → planning (Gates 2+3) → implementation (10 items) → QA batch plan (deferred). Agent prompts followed throughout via AGENT_PROMPT_ALPHA.md v0.7.

---

## What Was Done

### Deployment
- Cloned `core-pos-front-end-` (branch: main) into `/app/frontend`, npm install, .env written, frontend running on port 3000

### Docs Pulled (from origin/room)
- `/app/memory/backend_briefs/BACKEND_BRIEF_ROOM_ORDERS_AGGREGATION_2026_08_26.md`
- `/app/memory/evidence/BATCH-INV-2026-08-26/INVESTIGATION_REPORT_BATCH_2026_08_26.md`
- All control docs synced: CONTROL_DASHBOARD.md, CR_REGISTRY.md, BUG_TRACKER.md, FILE_OWNERSHIP.md, registry.json (574 → 576 items)

### Bugs Fixed Early (before formal registration)
| Fix | Files |
|---|---|
| Smart Purchase split payment: `subtotal = sum(r.rate)` not `qty × rate` | SmartPurchasePanel.jsx |
| Smart Purchase paymentType: sends `'Cash'`/`'UPI'` not `'paid'` | SmartPurchasePanel.jsx |

### Implemented Items (Gate 5) — All code done, QA pending

| ID | Title | Files |
|---|---|---|
| **BUG-351** | Room check-in: CRM doc upload skipped for verified guests | RoomCheckInModal.jsx |
| **BUG-352** | Amount column `w-24` → `w-32` in order table | OrderTable.jsx |
| **BUG-357** | Advance > room price FE-only guard removed | RoomCheckInModal.jsx |
| **BUG-358** | Sidebar persistence — DashboardPage (Phase 1) | DashboardPage.jsx |
| **BUG-359** | Settings tax cleanup: removed GST Mode + GST Tax% + Tax% (dead fields). Removed Inclusive from ProductForm + BulkEditor | RestaurantSettingsPage.jsx + ProductForm.jsx + BulkEditor.jsx |
| **BUG-360** | Room checkout reads live `remainingRoomBalance` (not stale `balancePayment`). RoomBillingCard updated too | CollectPaymentPanel.jsx + RoomRowCard.jsx |
| **BUG-361** | Sidebar persistence Phase 2 — 68 remaining pages (Python script sweep) | 68 files in pages/ + pages/reports-module/ |
| **CR-348** | Custom item GST % + Tax Calc field wired | AddCustomItemModal.jsx + orderTransform.js + OrderEntry.jsx |
| **CR-349** | Change/Unpaid/Reprint wired on Beta Report Settled tab | OrderReportBetaPage.jsx |
| **CR-350** | ID upload mandatory toggle (localStorage, StatusConfigPage, Phase 1) | StatusConfigPage.jsx + RoomCheckInModal.jsx |

### Investigations Completed
- **BUG-359**: Confirmed restaurant-level `gstTax`/`gstMode`/`tax` fields are dead (never read in order calculations). Order tax always from item catalog. Settings cleanup scope identified.
- **BUG-360**: Room advance/deposit lifecycle traced. `balance_payment` static vs `remaining_room_balance` live. Mid-stay double-collection root cause confirmed.

### Gate 2+3 Plans Written (implementation complete)
All 10 items above went through full gate flow. Plans at `/app/memory/plans/` and impact analyses at `/app/memory/impact/`.

### Registry State
- New items registered: BUG-351 → BUG-361, CR-348 → CR-350 (13 items total)
- BUG-355: PARKED (owner decision — legacy 'paid' records accepted as-is)
- BUG-353, BUG-354, BUG-356: Still INTAKE (see pending section below)

---

## Still Pending (next session)

### QA — All 10 implemented items awaiting testing agent
**QA Batch Plan** was drafted but deferred. Three batches identified:

| Batch | Items | Needs credentials? |
|---|---|---|
| A — Room Module | BUG-351, BUG-357, CR-350, BUG-360 | Yes |
| B — Order Entry | CR-348 | Yes (GST restaurant) |
| C — Beta Report | CR-349 | Yes (settled orders) |
| D — Settings | BUG-359 | Partial |
| E — UI/UX | BUG-352, BUG-358, BUG-361 | Partial |

**QA handover docs:**
- `/app/memory/handover/QA_HANDOVER_2026_08_26_CR348_CR350_BUG358_BUG360.md`
- `/app/memory/handover/QA_HANDOVER_2026_08_26_CR349.md`
- `/app/memory/handover/QA_HANDOVER_2026_08_26_BUG359.md`

**To start QA next session:**
1. Add credentials to `/app/memory/test_credentials.md`
2. Choose Option A (code review), B (full live), or C (split approach)
3. Call testing_agent with full context from this handover

### Open INTAKE items (not yet implemented)
| ID | Title | Blocker |
|---|---|---|
| BUG-353 | Beta Report date range capped at 1 month | Backend must confirm/lift server-side cap |
| BUG-354 | Beta Report status column null for some order types | Live test needed — find which fOrderStatus breaks deriveStatus() |
| BUG-356 | Customer name/phone not saved on order | Live test — BUG-183 fix may resolve it; needs Network tab verification |

### Open Owner Decisions (for next session)
| ID | OD | Decision needed |
|---|---|---|
| CR-349 | Q1 resolved (PaymentMethodPicker used) | No open ODs |
| BUG-356 | — | Live test first, then assess |
| BUG-354 | — | Live test first |

---

## Key Learnings This Session

1. **r.rate = total price** (Smart Purchase): always `sum(r.rate)`, never `qty × r.rate`
2. **payment_type = method name**: sends `'Cash'`/`'UPI'`, not lifecycle word `'paid'`
3. **Restaurant-level GST settings are dead**: order tax always from item catalog `item.tax.percentage` — `gstTax`/`gstMode` go nowhere in FE order flow
4. **Static vs live room balance**: `balance_payment` = check-in snapshot; `remaining_room_balance` = live. Only live field reflects mid-stay payments
5. **Math.max(0,…) hides financial truth**: clamp is correct behaviour, but must feed it the right input
6. **BUG-351 dual fix**: both UI render condition AND validation need the same `crmDocuments.length === 0` guard
7. **Sidebar persistence**: Phase 1 (Dashboard) + Phase 2 (68 pages) both done. Key: `mygenie_sidebar_expanded`

---

## Files Modified This Session

| Area | Files |
|---|---|
| Room check-in | RoomCheckInModal.jsx |
| Order table | OrderTable.jsx |
| Checkout | CollectPaymentPanel.jsx, RoomRowCard.jsx |
| Smart Purchase | SmartPurchasePanel.jsx |
| Order entry | AddCustomItemModal.jsx, OrderEntry.jsx |
| Transforms | orderTransform.js |
| Settings | RestaurantSettingsPage.jsx, StatusConfigPage.jsx |
| Menu management | ProductForm.jsx, BulkEditor.jsx |
| Dashboard | DashboardPage.jsx |
| Beta report | OrderReportBetaPage.jsx |
| 68 pages | All pages/ + pages/reports-module/ (sidebar sweep) |

---

## Environment

```
Frontend: RUNNING (pid 280, webpack compiled with 1 pre-existing warning)
Backend:  Not used (frontend-only app connecting to preprod.mygenie.online)
URL:      https://core-frontend-dev.preview.emergentagent.com
Key:      mygenie_sidebar_expanded (localStorage, all 69 pages)
```

---

## Next Session Starting Point

1. **First:** Read this handover + last 3 QA handover docs
2. **Add credentials** to `/app/memory/test_credentials.md`
3. **Run QA** for all 10 implemented items (choose batch option A/B/C)
4. **After QA passes:** Gate 6 Owner Smoke on all items
5. **Then:** Plan BUG-354 live test + BUG-356 Network tab verification
