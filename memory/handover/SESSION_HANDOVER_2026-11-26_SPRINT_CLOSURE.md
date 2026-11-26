# Session Handover — 2026-11-26 Sprint Closure (QA → Implementation)

```
Role for next agent : Boot AGENT_PROMPT_ALPHA (Step -1 / Step -1.5) → then follow phases below
Date written        : 2026-11-26
Written by          : E1 (Emergent agent)
Primary doc         : /app/memory/control/AGENT_PROMPT_ALPHA.md
Sprint              : nov_cr_batch
Sprint closure HTML : https://core-pos-3--04y1cpk6.preview.emergentagent.com/sprint-closure-tracker.html
```

---

## 0. BOOT SEQUENCE (MANDATORY — do this before anything else)

```
1. READ this file in full
2. READ /app/memory/control/AGENT_PROMPT_ALPHA.md (your operating rules)
3. PRESENT to owner: "Last session (2026-11-26): QA complete on 56 items. 
   5 QA items blocked on owner action. 5 items not coded yet. 
   Recommend: Phase 1 = close blocked QA, Phase 2 = implement."
4. ASK owner which phase to start, or confirm full plan
```

---

## 1. ENVIRONMENT

| Item | Value |
|---|---|
| App URL (preview) | `https://core-pos-3--04y1cpk6.preview.emergentagent.com` |
| App URL (prod deploy) | `https://pos-core-app--6gve4gt4.preview.emergentagent.com` |
| Backend | `https://preprod.mygenie.online` |
| Branch | `20261126-022137` (remote) · local tracking same |
| Frontend | Running on port 3000, supervisor-managed, `webpack compiled successfully` |
| NODE_OPTIONS | `--max-old-space-size=4096` already in `frontend/.env` |
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` (v0.7) |
| Sprint closure tracker | `/app/memory/handover/SPRINT_CLOSURE_TRACKER_NOV_2026.html` |

### Preprod API — CRITICAL PERFORMANCE NOTE
- `restaurant-product` API: 10–13s in Playwright (normal: 4–5s)
- `restaurant-info` API: 8–13s
- **After login: always wait ≥ 20 seconds before clicking anything**
- **For Audit Log / Reports: wait 30s for data to load**
- Navigate by DIRECT URL (`page.goto(url)`) — NOT sidebar clicks — for reliability

---

## 2. REGISTRY SNAPSHOT

| Gate | Count | Notes |
|---|---|---|
| `GATE_5B_QA_PASSED` | **56** | Nov sprint + pre-Nov batch. Done. |
| `GATE_5A_QA_BLOCKED` | **5** | Coded, cannot QA without owner action |
| `GATE_5A_PENDING_QA` | 136 | Older sprints — out of scope this sprint |
| `GATE_3_PLAN_COMPLETE` | 2 | Plans written, not coded: **BUG-705**, **BUG-689** |
| `GATE_2_IA_COMPLETE` | 8 | IA done, not planned/coded |
| `GATE_1_INTAKE` | 70 | Not planned at all |
| Closed / Verified | 874 | Done |

---

## 3. CREDENTIALS (all accounts tested and confirmed working)

| Alias | Email | Password | RID | Used For |
|---|---|---|---|---|
| OWNER_PALMHOUSE | owner@palmhouse.com | Qplazm@10 | 541 | Most QA flows |
| OWNER_TGK | owner@thegoankitchen.com | Qplazm@10 | 69 | Web orders, APS, prepaid |
| OWNER_BEANMEUP | owner@beanmeup.com | Qplazm@10 | 742 | VAT testing |
| OWNER_CAFE103 | owner@cafe103.com | Qplazm@10 | 644 | cancel_note_mandatory |
| TESTWAIT_PALMHOUSE | testwait@thepalmhouse.com | Qplazm@10 | 541 | Staff — HAS: clear_payment, complementary_food — LACKS: report, print_icon, update_payment, order_cancel, order_unpaid |
| PMS_MACHA | pms@macha (RID 69) | Qplazm@10 | 69 | FCM/Firebase (needs real browser) |

**Login endpoints:**
- Owner: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login`  
- Staff: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login` + header `X-localization: en`

---

## 4. PHASE 1 — CLOSE ALL BLOCKED QA (do this first)

Work through these in priority order. All items are `GATE_5A_IMPLEMENTED` with code compiled. QA role only — no code changes unless a failure is found.

### 4A — CR-515 + BUG-711 (P0 P0) — BLOCKED: needs account fix

**What to test:**
- **CR-515**: Staff with `report` but NOT `print_icon` → opens Order Beta → Reprint button is NOT visible → Pay-Later Collect button is NOT visible
- **BUG-711**: Same staff → Reprint button in Order Beta row is hidden (not just disabled — fully absent)

**How to unblock (owner action — this is NOT a code change):**
1. Owner logs into Palmhouse admin/settings
2. Find employee `testwait@thepalmhouse.com`
3. Grant the `report` permission
4. Confirm `print_icon` is NOT granted (it currently isn't — just add `report`)
5. That single change unblocks both CR-515 and BUG-711

**Test account after fix:** `testwait@thepalmhouse.com / Qplazm@10`

**QA handover:** `memory/handover/QA_HANDOVER_CR-515_2026_11_16.md`

---

### 4B — BUG-682 (P0) — BLOCKED: manual test needed (Cafe103 too slow in Playwright)

**What to test:** When `cancel_note_mandatory=Yes` in Cafe103 settings, cancelling an order should require a reason note. Bug was the transform reading wrong key (`cancelNoteMandatory`).

**Why it's blocked:** Cafe103 preprod menu consistently times out in Playwright (15–20s vs 8s limit). Menu never loads → cannot place order to cancel.

**How to test (5-min manual test):**
1. Open real Chrome browser → `https://core-pos-3--04y1cpk6.preview.emergentagent.com`
2. Login as `owner@cafe103.com / Qplazm@10`
3. Wait 30s for menu to load
4. Open any table → add any item → Place Order
5. Try to cancel the order without entering a note
6. **PASS:** Cancel is blocked / note field is required. **FAIL:** Cancel goes through without note.

**QA handover:** `memory/handover/QA_HANDOVER_BUG682_2026-11-25.md`

---

### 4C — BUG-749 (P0) — BLOCKED: needs real browser with granted FCM permission

**What to test:** After browser reload, the app auto-registers the FCM token with backend (`POST /api/v1/vendoremployee/device-token`). Previously token was only sent at login; reload = no push notifications.

**Why it's blocked:** Playwright (headless) cannot grant/persist native browser notification permissions.

**How to test (real browser required):**
1. Open Chrome on a real device (NOT headless) on `https://pos-core-app--6gve4gt4.preview.emergentagent.com`
2. Login as `pms@macha / Qplazm@10` (RID 69)
3. When prompted for notification permission → click **Allow**
4. Hard-reload the page (Ctrl+Shift+R)
5. Open DevTools → Network → look for `POST /api/v1/vendoremployee/device-token` within 5s
6. **PASS:** Token request fires on reload. **FAIL:** No request fired.

**QA handover:** `memory/handover/QA_HANDOVER_NOV_SPRINT_BATCH_2026-11-18.md` (BUG-749 section)

---

### 4D — CR-492 (P1) — BLOCKED: testwait loads slowly in Playwright

**What to test:** Only staff with `complementary_food` permission can mark items complimentary. `testwait` HAS this permission — the comp button should appear.

**Why it's blocked:** `testwait@thepalmhouse.com` loads very slowly in Playwright (menu + permissions = 20–25s timeout).

**How to test (real browser recommended):**
1. Login as `testwait@thepalmhouse.com / Qplazm@10`
2. Navigate to any table in Order Entry
3. Add any menu item to cart
4. Look for a complimentary/gift icon on the cart item
5. **PASS:** Comp icon visible (permission granted). **FAIL:** No icon (permission not wired).

**QA handover:** Included in `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md`

---

### 4E — After ALL QA is closed

Update registry for each passed item → `GATE_5B_QA_PASSED`.
Write QA report appending to: `memory/test_reports/QA_REPORT_NOV_SPRINT_CLOSE_2026-11-26.md`

---

## 5. PHASE 2 — IMPLEMENTATION (after all QA closed)

Work through these in strict priority order. ALL require owner approval before coding starts (Gate 4 GO). Follow AGENT_PROMPT_ALPHA Role 3 (Implementation) for each.

### 5A — BUG-705 (P0) — HIGHEST PRIORITY — Plan ready, needs Gate 4 GO

**Issue:** Order Beta PayLater Collect panel shows only Cash/UPI/Card — Split, Credit and Room options are missing. Staff cannot collect PayLater orders using Credit or Split payment.

**Files to change:** `CollectBillPanelDrawer.jsx` (~2 edits, MEDIUM risk)

**Plan:** `memory/plans/` — search for BUG-705 implementation plan

**How to start:** Tell owner: *"BUG-705 PayLater Collect fix is planned. Gate 4 GO?"* → on YES, implement from plan → QA → GATE_5B.

**Gate:** GATE_3_PLAN_COMPLETE → needs Gate 4 GO → IMPLEMENTATION

---

### 5B — BUG-753 (P2) — INTAKE, needs owner decision OD-753-01 first

**Issue:** Collect Bill button silently does nothing when web-edit order has unconfirmed APS items. No modal, no disabled state, no toast. Zero operator feedback.

**File:** `OrderEntry.jsx` (R5 hotspot — full Gate 2/3 required after OD answer)

**Owner decision needed:**
> **OD-753-01:** When Collect Bill is clicked and there are unconfirmed APS items:  
> **Option A:** Disable the button with tooltip "Confirm all item prices before billing"  
> **Option B:** Keep button enabled, show toast on click "Please confirm [item name] price first"

**After owner decides:** Planning → Implementation → QA

---

### 5C — BUG-754 (P3) — FAST LANE eligible — needs owner OD-754-01

**Issue:** Order Beta tax label shows "GST" when VAT restaurant has VAT toggled OFF. File: `OrderReportBetaPage.jsx` L273. 1 file, 1 line.

**Owner decision needed:**
> **OD-754-01:** When a VAT restaurant has VAT turned OFF, the Tax column label should show:  
> **Option A:** "VAT" (keep restaurant type, ignore toggle)  
> **Option B:** Empty / "—" (no tax applies)  
> **Option C:** "GST" (current fallback, working-as-designed → close)

**After owner decides:** Fast Lane GO → code 1 line → self-test → GATE_5B (no full QA needed).

---

### 5D — BUG-699 (P3) — IA done, needs Gate 3 plan

**Issue:** Audit Report — stale KPIs stay visible under error shield after timeout. Download button also stays enabled, letting staff export stale data.

**IA:** `memory/impact/` — search BUG-699

**Fix scope:** `AuditLogMockup.jsx` — clear `rawData` on error. 1 file, ~2 lines.

**Note:** This partially overlaps BUG-722 FE-slice (already fixed). Just the stale-data-on-error behaviour remains.

**OD-699-01 open:** Show blank state vs "Previous range" label on error? Ask owner before coding.

---

### 5E — BUG-692 (P3) — IA done, needs owner OD-692-01

**Issue:** "New version available" banner shows on every page navigation even after dismissal.

**Owner decision needed:**
> **OD-692-01:** Should the banner:  
> **Option A:** Dismiss permanently when user clicks "Later" (until next deploy)  
> **Option B:** Always show — this is intentional (close as working-as-designed)

---

### 5F — BUG-689 (P2) — Plan ready, needs Gate 4 GO + OD-689-01

**Issue:** Auto-generated employee email gets extra `.com` appended (e.g. `john.mygenie.com.com`).

**OD-689-01 open (must answer before coding):** What domain for auto-emails?  
- `name@restaurantslug.mygenie.online` OR  
- `name@customdomain.com` (if restaurant has one) OR  
- Leave blank (no suggestion)

**Plan:** `memory/plans/` — search BUG-689

---

### 5G — BUG-694 (P2) — Routed to Investigation

**Issue:** Direct URL after fresh login routes through `/loading` for >10s before reaching the target page.

**Status:** IA complete, routed to Investigation agent (boot chain has sequential awaits). Do NOT code this directly — run Investigation Role 6 first to map the safest parallelisation.

**OD-694-01 open:** What is the acceptable max boot time? (Current: 10–15s. Target?)

---

## 6. BACKEND BLOCKED — DO NOT TOUCH (waiting on Gyan)

These are `FE_CORRECT`. Backend brief filed. FE agent should NOT code anything here.

| ID | Pri | Issue | Brief |
|---|---|---|---|
| **BUG-719** | P0 | Audit 50-day range → ~78s timeout | `backend_briefs/BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md` |
| **BUG-722** | P0 | Audit 30D/LM/FY → 65–77s timeout (same root) | Same brief |
| **BUG-696** | P1 | Audit 30D/FY → ~43s timeout (same root) | Same brief |
| **BUG-709** | P0 | Audit Log — Make Unpaid event missing after cancel | Backend brief filed 2026-11-25 |
| **BUG-712** | P0 | Customer name blanked after Quick Link save | Backend brief filed 2026-11-25 |

**Assigned to:** Gyan (backend team). No FE action until backend ships the fix.

---

## 7. P0 ITEMS IN INTAKE — Plan when owner prioritises

11 P0 bugs and CRs registered but not yet planned. DO NOT start these until Phase 1 and Phase 2 are closed. Present to owner as a batch for the NEXT sprint.

| ID | Title |
|---|---|
| BUG-720 | Low-rights user can deep-link to /settings, /menu, /employees |
| BUG-721 | Dashboard TableCard Print KOT + YTC Cancel visible without permission |
| BUG-730 | Audit Card-1 drill-down shows High Risk badge on every row |
| BUG-732 | Cart edit — edited row jumps to bottom of cart |
| BUG-734 | Credit Management remove dialog shows [null] item names |
| BUG-736 | "Update now" toast overlaps Order Entry on mobile |
| BUG-738 | Channel/amount mismatch — order_in=RM for a scan order |
| CR-533 | Scan Order Popup: Minimize to YTC Tab |
| CR-548 | Store bill print timestamps (Reprint History Log) — backend-only |
| CR-549 | Dashboard Widget Redesign — 12 Tiles 4×3 |
| BUG-668 | UPI ID update not reflecting until Printer Agent refresh |

---

## 8. OPEN OWNER DECISIONS SUMMARY

Collect all these from owner in one conversation before starting Phase 2:

| OD ID | Bug | Question | Unblocks |
|---|---|---|---|
| **OD-753-01** | BUG-753 | Collect Bill block: disable-button OR toast-on-click? | BUG-753 planning |
| **OD-754-01** | BUG-754 | Tax label when VAT off: "VAT" / "—" / keep "GST"? | BUG-754 Fast Lane |
| **OD-692-01** | BUG-692 | "New version" banner: dismiss-once OR always show? | BUG-692 Gate 3 |
| **OD-694-01** | BUG-694 | Acceptable max boot time? (Current: 10–15s) | BUG-694 investigation scope |
| **OD-689-01** | BUG-689 | Auto-email domain format? | BUG-689 implementation |
| **Gate 4 GO** | BUG-705 | PayLater Collect fix — plan is ready, approve coding? | BUG-705 implementation |

---

## 9. WHAT WAS DONE IN THIS SESSION (2026-11-26)

### QA completed
- **56 items → GATE_5B_QA_PASSED** (Nov sprint 47 + pre-Nov batch 9)
- Nov sprint items: CR-523, BUG-702, BUG-672, BUG-579, BUG-707–718, BUG-726, BUG-729, BUG-735, BUG-737, BUG-739, BUG-741, CR-503, CR-523, CR-526, CR-527, CR-543–545, CR-552, CR-554–557, CR-559, CR-561, BUG-671–703 batch, BUG-683, BUG-706
- Pre-Nov batch (coded 2026-11-18): BUG-685, BUG-686, BUG-688, BUG-690, BUG-691, BUG-695, BUG-697, BUG-698, BUG-700

### Bug fixed during QA
| ID | File | Fix |
|---|---|---|
| BUG-698 | `frontend/src/utils/datePresets.js` L52 | `fyEndYear → fyStartYear` — FY preset now returns Apr 2026–Mar 2027 (was Apr 2025–Mar 2026) |

### Registry and docs updated
- registry.json: all 56 QA items → `GATE_5B_QA_PASSED`
- 5 parked items → `GATE_5A_QA_BLOCKED` with exact blocker reason
- BUG_TRACKER.md: 8 stale rows updated from GATE_1/GATE_2 → GATE_5A_IMPLEMENTED
- Sprint closure HTML tracker: `public/sprint-closure-tracker.html`
- QA reports: `QA_REPORT_CONTINUATION_2026-11-25.md` + `QA_REPORT_NOV_SPRINT_PRE_BATCH_2026-11-26.md`

### Remote branch
- Code is on branch `20261126-022137`
- Last commit: `intake: BUG-753 (Collect Bill silent block) + BUG-754 (taxLabel GST fallback)`
- **BUG-698 fix is local only — not yet pushed to remote**

---

## 10. IMMEDIATE NEXT ACTIONS (ordered)

```
Step 1  → Owner: grant testwait@thepalmhouse.com the 'report' permission
          → Agent: QA CR-515 + BUG-711 (5 min)

Step 2  → Owner: manual test BUG-682 on real browser (5 min, Cafe103)

Step 3  → Owner: manual test BUG-749 on real browser with FCM granted (pms@macha)

Step 4  → Owner: answer OD-753-01, OD-754-01, OD-692-01, OD-689-01, OD-694-01
          Approve Gate 4 GO for BUG-705

Step 5  → Agent: implement BUG-705 (plan is ready)
          → Fast Lane BUG-754 (1 line, after OD-754-01)
          → Implement BUG-753, BUG-699, BUG-689 (after ODs + Gate 4 GOs)

Step 6  → Push all changes to new timestamp branch on GitHub (need PAT)
          → Push BUG-698 fix that's currently local-only

Step 7  → Gate 6 Owner Smoke across all 56+ QA-passed items
```

---

## 11. FILE PATHS QUICK REFERENCE

| Artifact | Path |
|---|---|
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |
| Registry | `/app/memory/control/registry.json` |
| BUG Tracker | `/app/memory/control/BUG_TRACKER.md` |
| Sprint closure HTML | `/app/frontend/public/sprint-closure-tracker.html` |
| Nov QA handover (6-batch) | `/app/memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` |
| Nov sprint QA plan | `/app/memory/handover/QA_PLAN_NOV_SPRINT_POST_NOV14_2026-11-25.md` |
| Pre-Nov batch QA handover | `/app/memory/handover/QA_HANDOVER_NOV_SPRINT_BATCH_2026-11-18.md` |
| CR-515 QA handover | `/app/memory/handover/QA_HANDOVER_CR-515_2026_11_16.md` |
| BUG-682 QA handover | `/app/memory/handover/QA_HANDOVER_BUG682_2026-11-25.md` |
| Nov sprint QA report | `/app/memory/test_reports/QA_REPORT_NOV_SPRINT_POST_NOV14_*.md` |
| Pre-batch QA report | `/app/memory/test_reports/QA_REPORT_NOV_SPRINT_PRE_BATCH_2026-11-26.md` |
| BUG-705 plan | `/app/memory/plans/` (search BUG-705) |
| Backend briefs | `/app/memory/backend_briefs/BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md` |
| Test credentials | `/app/memory/test_credentials.md` |

---

## 12. SELF-ASSESSMENT (this session)

| Dimension | Status |
|---|---|
| Registry synced | ✅ All 56 QA-passed items at GATE_5B + 5 blocked at GATE_5A_QA_BLOCKED |
| QA reports written | ✅ 2 reports covering full Nov sprint + pre-Nov batch |
| BUG_TRACKER updated | ✅ 8 stale rows corrected |
| Bug fixed (BUG-698) | ✅ Compiled, re-tested, PASS |
| Sprint closure tracker | ✅ Live at preview URL |
| Handover written | ✅ This document |
| BUG-698 pushed to remote | ❌ Local only — push in next session |
| Owner decisions pending | ⚠️ 6 ODs outstanding (see §8) |
