# CR-106 Wave 2 — Consolidated Impact Analysis (Gate 2)

**Document:** `impact/CR106_WAVE2_CONSOLIDATED_IMPACT_ANALYSIS.md`
**Created:** 2026-07-26
**Role:** PLANNING (Gate 2)
**Items:** BUG-250, BUG-251, BUG-252, BUG-253, BUG-254, BUG-255, CR-107, CR-108, CR-109, CR-110
**Status:** IMPACT ANALYSIS COMPLETE

---

## Owner Decisions (Locked 2026-07-26)

| # | Decision | Owner Answer |
|---|----------|-------------|
| OD-W2-1 | BUG-250: Approach A (skip aggregator in polling removal) vs B (re-fetch aggregator on every poll) | **A — Simple skip.** Socket handles real-time updates; polling re-fetch not needed. |
| OD-W2-2 | BUG-254: Success toast on aggregator actions? | **No success toast.** Error toast only. Sound notification for success is a separate CR. |
| OD-W2-3 | CR-110: Badge design for MyGenie own delivery orders | **Use MyGenie mascot icon** (the green genie character from `GENIE_LOGO_URL`). Mini circular image badge, same size as S/Z letter badges. |
| OD-W2-4 | Batch 1 path | **Full Gate 3 (Implementation Plan) required.** No fast lane. |
| OD-W2-5 | CR-109 timing | **Wait.** Not parallel with Batch 1. |

---

## Late Finding: Aggregator Completion Flow Gap

**Discovered during OD session:** `handleAggregatorOrderUpdate` (socketHandlers.js:945-965) calls `updateOrder()` for ALL status changes, but does NOT call `removeOrder()` for terminal statuses (f_order_status=3 cancelled, f_order_status=6 completed).

Regular handlers (L339, L426, L511) check `isTerminal` and call `removeOrder()`. The aggregator handler does not.

**Impact:** After rider completes delivery (status→6), order lingers on dashboard as an "Available"-looking card (status 'paid' → tableStatus 'available'). Same for cancelled aggregator orders (status→3).

**Resolution:** Added to **BUG-250 scope** (same file: socketHandlers.js). The fix adds terminal-status removal to `handleAggregatorOrderUpdate`.

---

## Batch Strategy — Dependency Analysis

### File Conflict Matrix

| File | BUG-250 | BUG-251 | BUG-252 | BUG-253 | BUG-254 | BUG-255 | CR-107 | CR-108 | CR-109 | CR-110 |
|------|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:------:|:------:|:------:|:------:|
| `useOrderPollingReconciliation.js` | **✏️ L201** | | | | | | | | | |
| `useSocketEvents.js` | **✏️ L95-105** | | | | | | | | | |
| `OrderCard.jsx` | | **✏️ L966,979** | | | | **✏️ L401,623** | | | | ✏️ badge |
| `TableCard.jsx` | | | **✏️ body** | | | | | | | ✏️ badge |
| `PlatformDropdown.jsx` | | | | **✏️ L28** | | | | | | |
| `DashboardPage.jsx` | | | | **✏️ L854** | **✏️ L1336-95** | | ✏️ new flow | ✏️ accept | | |
| `AggregatorOrderPopOut.jsx` | | | | | | | ✏️ auto-skip | | **✏️ pills** | |

### Dependency Graph

```
BUG-250 ←── BUG-252 depends (orders must persist to see enhancement)
  │
  └──── CR-107 depends (auto-accept needs stable order lifecycle)
           │
           ├── CR-108 depends (auto-KOT fires after accept)
           └── CR-109 feeds into (dynamic prep time used by auto-accept)

BUG-251, BUG-253, BUG-254, BUG-255: FULLY INDEPENDENT (no cross-deps)
CR-110: FULLY INDEPENDENT
CR-109: INDEPENDENT (can be done standalone for manual popup too)
```

### Recommended Batches

| Batch | Items | Gate | Parallel-safe? | Rationale |
|-------|-------|------|:--------------:|-----------|
| **BATCH 1** | BUG-250, BUG-251, BUG-253, BUG-254, BUG-255 | **Direct Bug Fix** (owner approve) | ✅ YES | All ≤10 lines, different files/lines, no inter-deps. Fix critical polling P0 + 4 P1 guards/UX |
| **BATCH 2** | BUG-252, CR-110 | **Gate 3 → 4 → Impl** | ✅ YES (both TableCard+OrderCard, non-overlapping sections) | After Batch 1 stabilizes. TableCard body enhancement + MyGenie badge. |
| **BATCH 3** | CR-109 | **Gate 3 → 4 → Impl** | ✅ standalone | Dynamic prep time in popup. No dependency on Batch 1/2. |
| **BATCH 4** | CR-107, CR-108 | **Gate 3 → 4 → Impl** | ❌ sequential (107 → 108) | Auto-accept (HIGH risk) then auto-KOT wiring. Needs Batch 1 BUG-250 fixed first. |

---

## BATCH 1 — Direct Bug Fixes (Impact Analysis)

### BUG-250: Polling Removes Aggregator Orders (P0 CRITICAL)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW — `useOrderPollingReconciliation.js` last modified by polling CR (May-2026), no in-flight items.
**Risk:** HIGH — touches order lifecycle safety net

**Data Flow Trace:**
```
pollOnce() → getRunningOrders() → reconcile(serverOrders)
  → removal loop (L182-226):
      for each localOrder NOT in serverMap:
        if engaged → skip ✅
        if fOrderStatus=9 (Hold) → skip ✅
        if isAggregator → ❌ NO SKIP (BUG!)
        → missCount++ → if ≥ 1 → removeOrder() 💀
```

**Fix — 2 edits:**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `useOrderPollingReconciliation.js` | After L201 (after PayLater check, before L203 `const prevMisses`) | No aggregator check | `if (l.isAggregator === true) { continue; } // BUG-250: aggregator orders from separate API` |
| 2 | `useSocketEvents.js` | L97-101 (reconnect merge) | `mergeRunningOrders(freshOrders)` replaces ALL | Preserve aggregator orders during merge: extract agg orders from current state, append to freshOrders before merging |

**Late addition (completion flow gap):**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 3 | `socketHandlers.js` | L945-965 (`handleAggregatorOrderUpdate`) | Always calls `updateOrder()` | Add terminal-status check: if `fOrderStatus === 3 (cancelled) \|\| fOrderStatus === 6 (completed)` → call `removeOrder()` instead of `updateOrder()` |

**Verification:** Login → wait 90s → aggregator orders still in Delivery channel (not removed). Also: when backend fires status=6 via socket → order card disappears from dashboard.

---

### BUG-251: OrderCard Cancel + WhatsApp for Aggregator (P1)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW — OrderCard last modified by CR-106 (this sprint)
**Risk:** LOW — 2 guard additions

**Fix — 2 edits:**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `OrderCard.jsx` | L966 | `{isOrderCancelAllowed && (` | `{!isAggregator && isOrderCancelAllowed && (` |
| 2 | `OrderCard.jsx` | L979 | `{showWhatsAppPayment && (` | `{!isAggregator && showWhatsAppPayment && (` |

**Verification:** Login → list view → aggregator order → no Cancel(X) or WhatsApp button visible.

---

### BUG-253: Platform Dropdown Missing Aggregator (P1)

**Code Reality:** NONE (planned in comments)
**Conflict Pre-Check:** LOW — PlatformDropdown untouched since POS2-002 Phase 3
**Risk:** LOW — additive option + predicate

**Fix — 2 edits:**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `PlatformDropdown.jsx` | L28-31 (PLATFORM_OPTIONS) | 3 options: All, POS, Web/Scan | Add 4th: `{ value: 'aggregator', label: 'Aggregator' }` |
| 2 | `DashboardPage.jsx` | L854-858 (platformMatches) | `web ? isWebOrigin : !isWebOrigin` | Add: `if (platform === 'aggregator') return item.order?.isAggregator === true \|\| item.isAggregator === true;` before the web/pos check |

**Verification:** Login → Platform dropdown → 4 options visible → select "Aggregator" → only S/Z cards shown.

---

### BUG-254: Aggregator Handlers Silent Failure (P1)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW — handlers added by CR-106, no other in-flight items
**Risk:** LOW — add toast calls

**Fix — 4 edits (one per handler):**

| # | Handler | Line | Change |
|---|---------|------|--------|
| 1 | `handleAggregatorAccept` | L1336-1355 | Add `toast.success('Order accepted')` after API call; `toast.error('Accept failed — please retry')` in catch |
| 2 | `handleAggregatorReject` | L1356-1371 | Add success + error toast |
| 3 | `handleAggregatorReady` | L1373-1384 | Add success + error toast |
| 4 | `handleAggregatorDispatch` | L1386-1402 | Add success + error toast |

**Dependency:** Import `toast` from sonner (may already be imported — check).

**Verification:** Click Ready on stale order → see error toast "Failed to mark ready" → click on fresh order → see success toast.

---

### BUG-255: Item-Level Status for Aggregator (P1)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW — item status code untouched by CR-106
**Risk:** LOW — additive guard

**Fix — 2 edits:**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `OrderCard.jsx` | L401 | `if (onItemStatusChange) {` | `if (onItemStatusChange && !isAggregator) {` |
| 2 | `OrderCard.jsx` | L623 (item action dot rendering) | Shows clickable dot for all items | Add: hide dot / make non-interactive when `isAggregator` |

**Verification:** Login → list view → aggregator order → item dots not clickable / not shown.

---

## BATCH 2 — TableCard Enhancement + MyGenie Badge

### BUG-252: TableCard Items/Customer/Rider (P2)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW — TableCard modified by CR-106 (S/Z badge), no other in-flight
**Risk:** MEDIUM — UI enhancement in compact grid view
**Depends on:** BUG-250 (orders must persist to see enhancement)

**Affected section:** `TableCard.jsx` "Active content" block (L362-400+)

**Design mockup (Section 3) requires for aggregator cards:**
1. **Items list** (condensed): `● 1× Paneer Butter Masala` — first 2 items, "+N more" if overflow
2. **Customer info**: `SWIGGY · +919999999992` — from `table.order.customerName` + `table.order.phone`
3. **Rider status**: `🧑 Awaiting Runner` — from `table.order.riderInfo` or default "Awaiting Runner" when null

**Change scope:** Add aggregator-specific body section inside `{isActive && (` block, gated by `isAggregator`. ~35 lines.

**Files WILL change:** `TableCard.jsx`
**Files WILL NOT touch:** `OrderCard.jsx` (already has items/customer/rider)

---

### CR-110: MyGenie Brand Badge (P2)

**Code Reality:** NONE
**Conflict Pre-Check:** LOW
**Risk:** LOW — same pattern as S/Z badge

**Owner Decision (LOCKED):** Use the **MyGenie mascot icon** (green genie character) from existing `GENIE_LOGO_URL` constant (`constants/colors.js:22`). Render as a mini circular `<img>` badge at the same size (w-5 h-5) as the S/Z letter badges.

**Existing asset:** `GENIE_LOGO_URL` = `https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg` — already imported in Sidebar, LoginPage, LoadingPage.

**Change scope:**
- `TableCard.jsx`: For non-aggregator delivery orders (`orderType === 'delivery' && !isAggregator`), render mini MyGenie logo badge
- `OrderCard.jsx`: Same pattern at `renderLogo()` (L349-371) — add MyGenie case for own delivery orders
- Import `GENIE_LOGO_URL` from constants in both files

---

## BATCH 3 — Dynamic Prep Time (CR-109)

**Code Reality:** NONE
**Risk:** LOW — additive computation in popup

**Data flow:**
```
Restaurant settings → default_prep_time + prep_time_count_method + prep_time_bonus_config
  ↓
AggregatorOrderPopOut receives order items
  ↓
computePrepTime(items, settings) → dynamic prep time value
  ↓
Pre-select matching pill OR show computed value in manual input
```

**Change scope:** 
- New util: `utils/aggregatorPrepTime.js` (~15 lines) — pure computation function
- `AggregatorOrderPopOut.jsx`: Read settings, call util, pre-select pill (~10 lines)

---

## BATCH 4 — Auto-Accept + Auto-KOT (CR-107, CR-108)

**Deferred to separate Gate 2-3 cycle.** HIGH risk, large scope, depends on Batch 1 (BUG-250).

**Placeholder scope estimate:**
- CR-107: ~100 lines across 3+ files (new auto-accept hook, DashboardPage wiring, AggregatorOrderPopOut bypass)
- CR-108: ~15 lines in accept handler (trigger KOT print after successful accept when setting enabled)

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: all items → status: IMPLEMENTED
- [ ] BUG_TRACKER.md / CR_REGISTRY.md: rows updated
- [ ] FILE_OWNERSHIP.md: all modified files listed
- [ ] Code markers: // BUG-250, // BUG-251, etc. in every modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## Handover

```
IMPACT ANALYSIS COMPLETE + DECISIONS LOCKED for CR-106 Wave 2 (10 items).

Owner decisions locked (2026-07-26):
  OD-W2-1: BUG-250 Approach A (simple skip). Socket handles real-time.
  OD-W2-2: BUG-254 Error toast only. No success toast.
  OD-W2-3: CR-110 MyGenie mascot icon badge (from GENIE_LOGO_URL).
  OD-W2-4: Full Gate 3 required for Batch 1 (no fast lane).
  OD-W2-5: CR-109 waits, not parallel.

Late finding: handleAggregatorOrderUpdate missing removeOrder() for terminal statuses (3=cancelled, 6=completed). Added to BUG-250 scope (edit 3).

BATCH 1 (5 bugs): BUG-250 scope now 3 edits (polling skip + reconnect preserve + terminal removal). 
BATCH 2 (BUG-252 + CR-110): CR-110 OQs resolved — MyGenie mascot badge. Unblocked.
BATCH 3 (CR-109): Wait.
BATCH 4 (CR-107 + CR-108): Deferred.

Next: Gate 3 (Implementation Plan) for Batch 1.
```
