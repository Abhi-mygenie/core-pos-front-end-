# Session Handover — 2026-11-16 — Batch 2: BUG-677 + BUG-678 + CR-545

**For:** PLANNING + IMPLEMENTATION agent (second batch, after Batch 1 items are coded)
**From:** Intake/Investigation agent (2026-11-16 session)
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · commit `cf59ef3`
**App:** `/app/frontend` (React 19 + CRACO + Tailwind + Radix/shadcn) · backend at `preprod.mygenie.online`
**Prerequisite:** Complete Batch 1 items first (CR-493 B5, CR-521, BUG-639, CR-526 Part 1+2, BUG-647) — see `handover/SESSION_HANDOVER_2026_11_16_FULL.md`

---

## 1. Why these are AFTER Batch 1

Batch 1 items (5 items) touch core order flow files: `orderTransform.js`, `OrderEntry.jsx`, `CancelOrderModal.jsx`, `CancelFoodModal.jsx`. BUG-678 and BUG-647 both modify `OrderEntry.jsx`. Coding them in sequence avoids merge conflicts and ensures line numbers in plans stay accurate.

**Execution order within this batch:**
```
1. BUG-678    (CRITICAL, 2-line fix, quick win, same OrderEntry.jsx as BUG-647)
2. BUG-677    (HIGH, 7 fixes across socket layer, independent files)
3. CR-545     (HIGH, Phase 1 only — Phase 2 backend-blocked)
```

---

## 2. Item Details

### Item 1: BUG-678 — Service Charge in Payload Despite UI Toggle OFF (Prepaid)

**Priority:** P0 | **Risk:** CRITICAL (money) | **Assignee:** Abhishek
**Intake:** `change_requests/BUG-678_SC_PREPAID_PAYLOAD_INTAKE.md`
**Investigation:** `investigations/INV-SC-PREPAID-2026-11-16.md`
**Evidence:** `evidence/INV-SC-PREPAID-2026-11-16/code_flow_trace.md`

**Problem:** When cashier toggles service charge OFF in Collect Payment panel, UI shows ₹0 SC correctly. But the API payload still sends `service_tax: 23.81` + `order_amount: 275` (should be ₹250). Books don't match cash collected.

**Root cause:** BUG-662 regression. `OrderEntry.jsx` L1708-1709 and L2492-2493:
```javascript
const scApplicable = (orderType === 'dineIn' || ...)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```
When `autoServiceCharge=true`, the `||` short-circuits — `scApplicable` is ALWAYS true. The cashier's toggle-OFF (`serviceCharge = 0`) is never evaluated.

**Fix:** Remove `!!restaurant?.autoServiceCharge ||` from both locations. Trust `paymentData.serviceCharge > 0` alone.

**Exact edits (2 lines, 1 file):**

| # | File | Line | Current | New |
|---|---|---|---|---|
| 1 | `OrderEntry.jsx` | L1708-1709 | `&& (!!restaurant?.autoServiceCharge \|\| paymentData?.serviceCharge > 0)` | `&& (paymentData?.serviceCharge > 0)` |
| 2 | `OrderEntry.jsx` | L2492-2493 | Same pattern | Same fix |

**CRITICAL: Verify line numbers at HEAD before coding.** BUG-647 (Batch 1) also modifies OrderEntry.jsx — line numbers may shift. Re-read L1700-1720 and L2485-2500 at HEAD.

**Paths NOT affected (from investigation):**
- `collectBillExisting` — reads ₹ amount directly, not percentage. ✅ Safe.
- `placeOrder` / `updateOrder` — no payment toggle exists. ✅ Safe.

**Verification:**
1. Create dine-in order on restaurant with `autoServiceCharge=Yes`
2. Open Collect Payment → toggle SC OFF → UI shows ₹0 SC
3. Pay → capture Network payload → `service_tax: 0`, `order_amount` = subtotal only
4. Same test with SC ON → `service_tax: X`, `order_amount` includes SC

**Risk:** OrderEntry.jsx is R5 hotspot + financial logic. Full gate flow. Regression: test normal dine-in with SC ON still works, prepaid with SC ON, postpaid with SC OFF.

---

### Item 2: BUG-677 — Socket Disconnection in PWA

**Priority:** P0 | **Risk:** HIGH | **Assignee:** Abhishek
**Intake:** `change_requests/BUG-677_SOCKET_PWA_DISCONNECT_INTAKE.md`
**Investigation:** `investigations/INV-SOCKET-PWA-2026-11-16.md`
**Evidence:** `evidence/INV-SOCKET-PWA-2026-11-16/` (3 probe files)

**Problem:** PWA sockets stop working after background. Staff must force refresh. Aggregator orders silently missed.

**Root cause (multi-factor):**
1. `RECONNECTION_ATTEMPTS: 10` exhausts during PWA background suspension
2. Server pingTimeout=60s → after 85s silence, server disconnects → Socket.IO treats as intentional, no auto-reconnect
3. `joined_restaurant` ACK defined but never listened to — silent room-join failure
4. No aggregator order polling fallback

**7 proposed fixes (from investigation):**

| # | Fix | Priority | Files | Lines |
|---|---|---|---|---|
| **F1** | `RECONNECTION_ATTEMPTS: Infinity` | P0 | `socketEvents.js` L14 | 1 line |
| **F2** | Periodic heartbeat health check (30s when visible) | P0 | `SocketContext.jsx` | ~15 lines |
| **F3** | Explicit `disconnect()` before new `connect()` | P1 | `socketService.js` | ~5 lines |
| **F4** | Aggregator order polling reconciliation | P1 | New hook or extend existing | ~40 lines |
| **F5** | Auto-retry on `reconnect_failed` with backoff | P1 | `socketService.js` | ~10 lines |
| **F6** | Listen for `joined_restaurant` ACK, re-emit on timeout | P1 | `socketService.js` + `useSocketEvents.js` | ~20 lines |
| **F7** | Service Worker health ping on PWA resume | P2 | `NotificationContext.jsx` + SW | ~20 lines |

**Planning agent must:**
1. Read the full investigation (`INV-SOCKET-PWA-2026-11-16.md`) — it has the architecture map, all 5 socket layers, and exact line numbers
2. Verify line numbers at HEAD for each fix
3. Decide execution order: F1 first (1-line, eliminates the main symptom), then F2, etc.
4. Write implementation plan with exact edits per fix
5. F4 (aggregator polling) is the largest — may need a separate plan

**Files involved:**
- `utils/socketEvents.js` — constants (F1)
- `contexts/SocketContext.jsx` — connect/disconnect lifecycle (F2, F3)
- `services/socketService.js` — singleton, room join, status (F3, F5, F6)
- `hooks/useSocketEvents.js` — event subscriptions (F6)
- `contexts/NotificationContext.jsx` — push/SW (F7)
- `hooks/useOrderPollingReconciliation.js` — existing POS polling (F4 extends this)

**Risk:** HIGH — socket layer is fragile. Test on PWA + browser. Regression: verify order capture, aggregator popups, table engage/free, menu updates all still work.

---

### Item 3: CR-545 — APS (₹1) Web Order: Tag + Cancel + Price Edit

**Priority:** P1 | **Risk:** HIGH | **Assignee:** Abhishek
**Intake:** `change_requests/CR-545_APS_WEB_ORDER_PRICE_ENTRY_INTAKE.md` (renamed from CR-543)
**Investigation:** `investigations/INV-APS-WEB-ORDER-2026-11-16.md` + `investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md`
**Evidence:** `evidence/INV-APS-WEB-ORDER-2026-11-16/` (code trace + screenshots)
**Backend brief:** `backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md`

**Problem:** ₹1 (APS/market-price) items arrive via web order. No way to identify them, cancel them in the popup, or edit their price after accepting.

**Phase 1 (FE-only, ~40 lines) — can code now:**

| Feature | File | Change |
|---|---|---|
| APS "₹1" tag on items in ScanOrderPopOut | `ScanOrderPopOut.jsx` | Badge next to price when `price === 1` |
| Item-level cancel in popup | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` | X button per item → `onCancelItem` prop → opens CancelFoodModal |

**Phase 2 (backend-blocked, ~135 lines) — CANNOT code yet:**

| Feature | Blocker |
|---|---|
| Price edit in CartPanel for placed ₹1 items | Backend B3/B4: `update-food-price` endpoint needed |
| Price edit in ScanOrderPopOut before accept | Same backend dependency |

**Blockers for Phase 1:**
- **B1:** Does `cancel-food-item` work on YTC (fOS=7) orders? Backend to verify.
- **Anti-rule lift:** ScanOrderPopOut has 5 strict rules (L22-36) forbidding direct API calls. Item cancel delegates via props (within spirit) but owner must approve adding a new action path.

**Planning agent must:**
1. Read the Phase 1+2 investigation for exact code locations
2. Verify B1 answer from backend before planning item-cancel
3. If B1 = yes → plan the APS tag + cancel button
4. If B1 = no → plan APS tag only (visual), defer cancel to Phase 2
5. `ScanOrderPopOut.jsx` has anti-rules — respect them in the plan

---

## 3. Credentials

| Account | RID | Use |
|---|---|---|
| `owner@cafe103.com` / `Qplazm@10` | 644 | General testing |
| `owner@ruby.com` / `Qplazm@10` | 672 | Socket probes, APS testing |
| Login endpoint | — | `POST /api/v1/auth/vendoremployee/login` |

---

## 4. Files to read (boot sequence)

| Priority | File | Why |
|---|---|---|
| 1 | `control/AGENT_PROMPT_ALPHA.md` | Role system, gate flow |
| 2 | This handover | Scope + exact edits |
| 3 | `investigations/INV-SC-PREPAID-2026-11-16.md` | BUG-678 full trace |
| 4 | `investigations/INV-SOCKET-PWA-2026-11-16.md` | BUG-677 architecture + all fixes |
| 5 | `investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md` | CR-545 phase plan |
| 6 | `control/FILE_OWNERSHIP.md` | Conflict check |
| 7 | `handover/SESSION_HANDOVER_2026_11_16_FULL.md` | Batch 1 context (what was coded before this batch) |

---

## 5. What NOT to do

- **Do not start this batch before Batch 1 is complete** — OrderEntry.jsx line numbers will shift
- **Do not code CR-545 Phase 2** — backend endpoint doesn't exist yet
- **Do not modify socket constants without testing on PWA** — browser testing alone is insufficient
- **Do not bypass ScanOrderPopOut anti-rules** without owner approval
- **Do not code BUG-678 without verifying line numbers at HEAD** — Batch 1 BUG-647 touches the same file

---

## 6. Environment

- Frontend: port 3000, supervisor-managed, hot reload
- Backend: port 8001, FastAPI stub (not the real Laravel backend)
- Real backend: `preprod.mygenie.online`
- Git remote: `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `main`)
- PAT token: in `backend/.env` as `GITHUB_PAT_TOKEN`

---

*End of Batch 2 handover. Ref: Emergent session 2026-11-16.*
