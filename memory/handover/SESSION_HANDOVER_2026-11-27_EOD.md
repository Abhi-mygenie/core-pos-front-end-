# Session Handover — 2026-11-27 (Deployment + Ad Screens + QA Triage)

```
Role for next agent : Boot AGENT_PROMPT_ALPHA (Step -1 / Step -1.5) → then follow phases below
Date written        : 2026-11-27
Written by          : E1 (Emergent agent)
Primary doc         : /app/memory/control/AGENT_PROMPT_ALPHA.md
Sprint              : nov_cr_batch (closing)
Branch (pushed)     : main (force-pushed 2026-11-27, same as 20261127_114306)
```

---

## 0. BOOT SEQUENCE (MANDATORY)

```
1. READ this file in full
2. READ /app/memory/control/AGENT_PROMPT_ALPHA.md
3. PRESENT to owner:
   "Last session (2026-11-27): Deployed latest branch, synced memory, produced Round 4 ad
   screen assets, reviewed all 5 blocked QA items. BUG-682 confirmed FAIL. 3 items now
   unblocked (CR-515, BUG-711, CR-492). 1 item still blocked (BUG-749). BUG-682 needs
   Fast Lane fix before re-QA. Owner decisions still pending."
4. ASK owner which phase to start
```

---

## 1. ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-preview-32--7s7xeuwn.preview.emergentagent.com` |
| App URL (prod deploy) | `https://pos-core-app--6gve4gt4.preview.emergentagent.com` |
| Backend | `https://preprod.mygenie.online` |
| Branch (remote) | `main` (force-pushed 2026-11-27) + `20261127_114306` (same commit) |
| Frontend | Running port 3000, supervisor-managed |
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` (v0.7) |

---

## 2. WHAT WAS DONE THIS SESSION (2026-11-27)

### Phase 1 — Deployment
- Deployed branch `20261127_072659` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` into `/app/frontend`
- Synced full `/app/memory` from branch `20261127_080555` (76 files — this branch had the design handover)
- Collected 4 missing secrets via secure card: `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_VAPID_KEY`, `REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_CRM_API_KEYS`
- App compiled clean (webpack 0 errors, 1 pre-existing lint warning)

### Phase 2 — Round 4 Ad Screens (Planning + Implementation)
- Read `DESIGN_HANDOVER_ROUND4_AD_SCREENS_2026_11_27.md`
- Took **Planning role (Gate 2.5)** per AGENT_PROMPT_ALPHA
- Called design agent → produced `design_guidelines.json` (10 screen specs)
- Built 10 HTML mockup files in `frontend/public/mockups/`
- Generated 20 PNG files in `memory/evidence/ad_screens_reference/Round4_Delivery/`
- Created `Round4_AdScreens.zip` and `Round4_Screenshot_Brief.pdf` (download links at preview URL)
- **User feedback:** HTML mockups don't look like real app → investigated real app layout
- Investigated `owner@cafe103.com` and `owner@fivestar.com` accounts on preprod
- Confirmed: phone screens use native mobile app layout (not web); desktop/tablet use web app
- Produced **PDF screenshot brief** for team to take real app screenshots manually
- Brief at: `/app/frontend/public/mockups/Round4_Screenshot_Brief.pdf`

### Phase 3 — QA Triage (5 blocked items)
Owner shared test data screenshots + credential `testwait@thepalmhouse.com`. Reviewed all 5 blocked items:

| Item | Was Blocked By | New Status | Action Needed |
|------|---------------|------------|---------------|
| **CR-515** | testwait needed `report` permission | ✅ UNBLOCKED | QA now — testwait confirmed in Orders Beta |
| **BUG-711** | Same as CR-515 | ✅ UNBLOCKED | QA now — same session as CR-515 |
| **CR-492** | testwait loads slowly in Playwright | ✅ UNBLOCKED | Manual browser QA — comp icon in Order Entry |
| **BUG-682** | Cafe103 too slow in Playwright | ❌ **QA FAIL** | Fast Lane fix needed — see below |
| **BUG-749** | Needs real browser + FCM permission | ❌ Still blocked | Needs real browser on pms@macha (RID 69) |

### BUG-682 QA Result — FAIL ❌
- **Confirmed by owner manual test:** `cancel_note_mandatory = Yes` in Cafe103 settings
- Cancel Order modal still shows **"Notes (Optional)"** — mandatory NOT enforced
- Root cause: `cancelNoteMandatory` mapped to wrong sub-object in `profileTransform.js`
- Fix = Fast Lane: 4 files, ~4 lines (owner approval needed)
- Docs updated: intake status → `GATE_5A_QA_FAILED`, QA handover appended with FAIL result

### Phase 4 — Git
- Branch `20261127_083001` pushed (deployment + memory sync)
- Branch `20261127_114306` pushed (all Round 4 work)
- **main** force-pushed to `c404b851` (same as `20261127_114306`)

---

## 3. BLOCKED QA ITEMS — CURRENT STATUS

### ✅ UNBLOCKED — QA READY NOW (3 items)

#### CR-515 + BUG-711 — Staff Permission Gating in Orders Beta
**What to test:**
- `testwait@thepalmhouse.com / Qplazm@10` now HAS `report` permission (confirmed by screenshot)
- `testwait` LACKS: `print_icon`, `update_payment`, `order_cancel`, `order_unpaid`
- Login as testwait → go to Orders Beta `/reports-module/order-report-beta`

| Test | Expected |
|------|----------|
| **BUG-711:** Reprint button on settled order rows | **ABSENT** (lacks `print_icon`) |
| **CR-515:** PayLater Collect button on Hold/TAB rows | **ABSENT** (lacks `clear_payment`... wait — testwait HAS `clear_payment`) → should be VISIBLE |
| **CR-515:** Change Payment button | **ABSENT** (lacks `update_payment`) |
| **CR-515:** Mark Unpaid button | **ABSENT** (lacks `order_unpaid`) |
| Login as owner → same page | All buttons VISIBLE |

**QA handover:** `memory/handover/QA_HANDOVER_CR-515_2026_11_16.md`

---

#### CR-492 — Complementary Food Permission Gate
**What to test:**
- Login as `testwait@thepalmhouse.com` (HAS `complementary_food`)
- Navigate to any table → Order Entry → add any item to cart
- **PASS:** Comp/gift icon visible on cart item row
- **FAIL:** No comp icon

**QA handover:** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` (CR-492 section)

---

### ❌ NEEDS FIX FIRST — BUG-682

**QA result:** FAIL (2026-11-27 owner test)
**What broke:** `cancelNoteMandatory` not in `cancellation` object — always `false`
**Fix (Fast Lane):**
1. `profileTransform.js:231` — add `cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes'`
2. `AllOrdersReportPage.jsx:1129` — add `cancelNoteMandatory={cancellation.cancelNoteMandatory}` prop
3. `OrderReportBetaPage.jsx:899` — same prop
4. `DashboardPage.jsx:2266` — same prop

**After fix:** Re-test on `owner@cafe103.com / Qplazm@10` (cancel_note_mandatory=Yes confirmed)
**QA handover:** `memory/handover/QA_HANDOVER_BUG682_2026-11-25.md` (FAIL result appended)

---

### ❌ STILL BLOCKED — BUG-749 (FCM token on reload)
**Needs:** Real Chrome browser (not headless), `pms@macha / Qplazm@10` (RID 69), notification permission = Allow
**Test:** Hard-reload → `POST /api/v1/vendoremployee/device-token` must fire within 5s in Network tab
**Cannot be automated — real device required**
**QA handover:** `memory/handover/QA_HANDOVER_NOV_SPRINT_BATCH_2026-11-18.md` (BUG-749 section)

---

## 4. PENDING OWNER DECISIONS (collect before Phase 2 implementation)

| OD ID | Bug | Question | Unblocks |
|-------|-----|----------|---------|
| **OD-753-01** | BUG-753 | Collect Bill block: disable-button with tooltip OR toast on click? | BUG-753 planning |
| **OD-754-01** | BUG-754 | Tax label when VAT off: show "VAT" / show "—" / keep "GST"? | BUG-754 Fast Lane |
| **OD-692-01** | BUG-692 | "New version" banner: dismiss-once OR always show? | BUG-692 planning |
| **OD-694-01** | BUG-694 | Acceptable max boot time? (Current: 10–15s) | BUG-694 investigation scope |
| **OD-689-01** | BUG-689 | Auto-email domain format? | BUG-689 implementation |
| **Gate 4 GO** | BUG-705 | PayLater Collect fix plan ready — approve coding? | BUG-705 implementation |
| **Fast Lane GO** | BUG-682 | 4-file cancelNoteMandatory fix — approve Fast Lane? | BUG-682 fix + re-QA |

---

## 5. IMPLEMENTATION QUEUE — READY TO CODE (once Gate 4 GO given)

| ID | Pri | Description | Files | Risk |
|----|-----|-------------|-------|------|
| **BUG-682** | P0 | cancelNoteMandatory Fast Lane fix | 4 files, ~4 lines | LOW |
| **BUG-705** | P0 | PayLater Collect: add Split/Credit/Room options | `CollectBillPanelDrawer.jsx` ~2 edits | MEDIUM |
| **BUG-754** | P3 | Tax label fallback when VAT off | `OrderReportBetaPage.jsx` L273, 1 line | LOW |
| **BUG-753** | P2 | Collect Bill block feedback (after OD-753-01) | `OrderEntry.jsx` (R5 hotspot — full gate) | HIGH |
| **BUG-699** | P3 | Stale KPIs on Audit error — clear rawData | `AuditLogMockup.jsx` ~2 lines | LOW |
| **BUG-689** | P2 | Auto-email double `.com` (after OD-689-01) | Plan ready | LOW |

---

## 6. BACKEND BLOCKED — DO NOT TOUCH

| ID | Pri | Issue | Brief |
|----|-----|-------|-------|
| **BUG-719** | P0 | Insights dashboard 50-day timeout (~65s) | `backend_briefs/BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md` |
| **BUG-722** | P0 | Insights dashboard 30D/LM/FY timeout | Same brief |
| **BUG-696** | P1 | Same root — partial backend fix only fixed 30D | Same brief |
| **BUG-709** | P0 | Audit Log — Make Unpaid event missing after cancel | Backend brief filed |
| **BUG-712** | P0 | Customer name blank after Quick Link save | Backend brief filed |
| **BUG-598 V1** | — | V1 order-logs endpoint — awaiting 4 Gyan answers | `contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md` |

---

## 7. RECOMMENDED NEXT SESSION FLOW

```
Step 1  → Owner: approve BUG-682 Fast Lane
          → Agent: fix 4 lines (profileTransform + 3 prop wires)
          → Agent: re-QA BUG-682 on Cafe103 → PASS expected → GATE_5B

Step 2  → Agent: QA CR-515 + BUG-711 on testwait@thepalmhouse.com
          → Agent: QA CR-492 on testwait (comp icon in Order Entry)

Step 3  → Owner: manual BUG-749 on real browser (pms@macha, RID 69, FCM Allow)

Step 4  → Owner: answer OD-753-01, OD-754-01, OD-692-01, OD-689-01, OD-694-01
          → Owner: Gate 4 GO for BUG-705

Step 5  → Agent: implement BUG-705 (plan ready)
          → Fast Lane BUG-754 (1 line, after OD answer)
          → Implement BUG-753, BUG-699, BUG-689 (after ODs + Gate 4 GOs)

Step 6  → Push all changes to new timestamp branch + main
```

---

## 8. TEST CREDENTIALS

| Alias | Email | Password | RID | Used For |
|-------|-------|----------|-----|---------|
| OWNER_PALMHOUSE | owner@palmhouse.com | Qplazm@10 | 541 | Most QA flows |
| TESTWAIT | testwait@thepalmhouse.com | Qplazm@10 | 541 | CR-515, BUG-711, CR-492 ← NOW UNBLOCKED |
| OWNER_CAFE103 | owner@cafe103.com | Qplazm@10 | 644 | BUG-682 re-QA (cancel_note_mandatory=Yes) |
| OWNER_TGK | owner@thegoankitchen.com | Qplazm@10 | 69 | Web orders, APS, prepaid |
| OWNER_BEANMEUP | owner@beanmeup.com | Qplazm@10 | 742 | VAT testing |
| PMS_MACHA | pms@macha (RID 69) | Qplazm@10 | 69 | BUG-749 FCM (real browser only) |
| OWNER_FIVESTAR | owner@fivestar.com | Qplazm@10 | — | Ad screen testing (4 running orders) |

---

## 9. AD SCREENS — OUTSTANDING

Round 4 creatives:
- **Priority 1 (Nov 30):** TB1 (tablet billing) + DT1 (desktop dashboard) — team to take real screenshots
- **Priority 2 (Dec 3):** DT2, DT3, ML1 (desktop/tablet), DL1, TK1, RP1, LV1
- Brief PDF: `frontend/public/mockups/Round4_Screenshot_Brief.pdf`
- Download: `https://core-pos-preview-32--7s7xeuwn.preview.emergentagent.com/mockups/Round4_Screenshot_Brief.pdf`
- HTML mockups (reference): `frontend/public/mockups/` (10 HTML files, each has `?hl=1` for highlight)

---

## 10. FILE PATHS QUICK REFERENCE

| Artifact | Path |
|----------|------|
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |
| Registry | `/app/memory/control/registry.json` |
| BUG Tracker | `/app/memory/control/BUG_TRACKER.md` |
| BUG-682 intake | `/app/memory/change_requests/BUG-682_CR493B5_CANCEL_NOTE_WRONG_OBJECT_INTAKE.md` |
| BUG-682 QA handover | `/app/memory/handover/QA_HANDOVER_BUG682_2026-11-25.md` |
| CR-515 QA handover | `/app/memory/handover/QA_HANDOVER_CR-515_2026_11_16.md` |
| Sprint closure handover | `/app/memory/handover/SESSION_HANDOVER_2026-11-26_SPRINT_CLOSURE.md` |
| BUG-598 V1 contract | `/app/memory/contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md` |
| BUG-705 plan | `/app/memory/plans/` (search BUG-705) |
| Ad screens brief PDF | `/app/frontend/public/mockups/Round4_Screenshot_Brief.pdf` |
| Ad screens HTMLs | `/app/frontend/public/mockups/` |
| Ad screens PNGs | `/app/memory/evidence/ad_screens_reference/Round4_Delivery/` |
