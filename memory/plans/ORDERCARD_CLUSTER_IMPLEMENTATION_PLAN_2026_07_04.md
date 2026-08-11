# Implementation Plan — OrderCard Cluster (BUG-146 · BUG-149 · CR-055)

**Document:** ORDERCARD_CLUSTER_IMPLEMENTATION_PLAN_2026_07_04.md
**Gate:** 3 (Implementation Plan — code not yet written)
**Author:** PLANNING agent (session 2026-07-04)
**Depends on:** `impact/ORDERCARD_CLUSTER_IMPACT_ANALYSIS_2026_07_04.md` (Gate 2)
**Owner approvals recorded this session:**
- CR-055 UX mockup: **APPROVED 2026-07-04** (remove both toggles, order Active → Served → Cancelled, section labels)
- BUG-146 scope: **APPROVED 2026-07-04** (per-item mini timeline on all 3 states, relative format)
- BUG-149: **NO CODE FIX** — diagnostic console log only + repro protocol doc. No `orderId` fallback. Actual fix will be a follow-up item filed once evidence is captured.
- BUG-025 collapse pattern (Cancelled block behind toggle, 2026-05-11): **SUPERSEDED** by CR-055 as of 2026-07-04 (recorded in this plan; historic row in registry is CLOSED-SUBSUMED, not touched).

**Risk (final aggregate):** LOW · **Sprint:** POS 5.0

---

## 1. Scope Lock

### Files WILL change

| # | Path | Nature | Reason |
|---|---|---|---|
| 1 | `frontend/src/components/cards/OrderCard.jsx` | Modify | Remove Served + Cancelled toggles; render per-item timeline; add section labels; add BUG-149 diagnostic log |
| 2 | `frontend/src/components/cards/ItemTimeline.jsx` | **CREATE** | New ~55-line component — mini variant of `OrderTimeline.jsx` for per-item timing |
| 3 | `frontend/src/components/cards/index.js` | Modify | Export `ItemTimeline` alongside existing card exports |

### Files WILL NOT touch

- `orderTransform.js` — per-item timestamps already mapped (verified L137-140 of transform).
- `OrderTimeline.jsx` — order-level component unchanged.
- `DashboardPage.jsx`, `ChannelColumn.jsx`, `ScanOrderPopOut.jsx` — consumers untouched.
- `DineInCard.jsx`, `DeliveryCard.jsx`, `TableCard.jsx` — out of scope.
- Any financial / transform / socket / print / auth code.
- Test files not owned by this cluster.

If reality forces scope expansion during coding, STOP per R14 and re-declare to owner.

---

## 2. New File — `ItemTimeline.jsx`

**Path:** `/app/frontend/src/components/cards/ItemTimeline.jsx`
**Est. lines:** ~55
**Model:** exact same visual language as `OrderTimeline.jsx` but scaled to `w-1.5 h-1.5` dots and `9px` font. Includes a "cancelled" mini-state (2 dots + red X).

```jsx
// BUG-146: Per-item timeline mirrors OrderTimeline but scaled for item rows.
// States: preparing (● ○ ─), ready (● ─── ● ○), served (● ─── ● ─── ●),
//         cancelled (● ─── ✗)
import { useMemo } from "react";
import { X as XIcon } from "lucide-react";
import { COLORS } from "../../constants";

const computeDuration = (startTime, endTime) => {
  if (!startTime) return "";
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  if (diffMs < 0) return "0m";
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

/**
 * ItemTimeline — compact per-item dot timeline for the OrderCard item row.
 * Renders 2-3 dots + duration labels; falls back to null if no createdAt.
 *
 * @param {string}  createdAt   Item added timestamp
 * @param {string?} readyAt     Item marked ready
 * @param {string?} serveAt     Item marked served
 * @param {string?} cancelAt    Item cancelled
 * @param {string}  status      "preparing" | "ready" | "served" | "cancelled"
 */
const ItemTimeline = ({ createdAt, readyAt, serveAt, cancelAt, status, testIdSuffix = "" }) => {
  const t = useMemo(() => ({
    stage1: computeDuration(createdAt, readyAt || cancelAt || null),
    stage2: readyAt ? computeDuration(readyAt, serveAt || null) : "",
    isReady: !!readyAt,
    isServed: !!serveAt,
    isCancelled: status === "cancelled",
  }), [createdAt, readyAt, serveAt, cancelAt, status]);

  if (!createdAt) return null;

  const dotStyle = (filled) => ({
    backgroundColor: filled ? COLORS.primaryGreen : "transparent",
    border: filled ? "none" : `1.5px solid ${COLORS.borderGray}`,
  });

  return (
    <div className="flex items-center gap-0.5" data-testid={`item-timeline-${testIdSuffix}`}>
      {/* Dot 1: placed (always filled) */}
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primaryGreen }} title="Added" />
      {/* Duration 1 */}
      <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
      <span className="px-0.5" style={{ color: COLORS.grayText, fontSize: "9px" }}>{t.stage1}</span>
      <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
      {/* Dot 2: ready OR cancelled */}
      {t.isCancelled ? (
        <XIcon className="w-2 h-2" style={{ color: COLORS.errorText }} strokeWidth={2.5} />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full" style={dotStyle(t.isReady)} title="Ready" />
      )}
      {/* Duration 2 + Dot 3: only if ready (not cancelled path) */}
      {!t.isCancelled && t.isReady && (
        <>
          <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
          <span className="px-0.5" style={{ color: COLORS.grayText, fontSize: "9px" }}>{t.stage2}</span>
          <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
          <div className="w-1.5 h-1.5 rounded-full" style={dotStyle(t.isServed)} title="Served" />
        </>
      )}
    </div>
  );
};

export default ItemTimeline;
```

**Verification:**
- Import `ItemTimeline` in OrderCard.jsx and render for one preparing item → renders `● ─ 2m ─ ○` (green dot + duration + empty circle).
- Render for a served item → renders `● ─ 2m ─ ● ─ 3m ─ ●` (three green dots).
- Render for a cancelled item → renders `● ─ 2m ─ ✗` (dot + duration + red X).

---

## 3. Edit Table — `OrderCard.jsx`

Current file has 1110 lines. All edits are localised; total delta ≈ **+15 / −55 lines** (net −40 lines because two toggle blocks compress into simple always-render blocks).

| # | Line(s) today | Change | Reason | Item |
|---|---|---|---|---|
| E1 | L2 (imports) | Remove `ChevronDown, ChevronUp` from lucide-react import; add `ItemTimeline` import from `./ItemTimeline` | Toggles gone → chevrons unused; new component needed | CR-055 + BUG-146 |
| E2 | L54–55 | Delete `const [showServed, setShowServed] = useState(false);` and `const [showCancelled, setShowCancelled] = useState(false);` | Toggles removed | CR-055 |
| E3 | L92 (after `orderId = order.orderId \|\| order.id`) | Add diagnostic log gated by env var (see §4). One-liner. | BUG-149 investigation | BUG-149 |
| E4 | L644–664 (active-item row inner) | After the item name/qty/details block, insert `<ItemTimeline createdAt={item.createdAt} readyAt={item.readyAt} serveAt={item.serveAt} cancelAt={item.cancelAt} status={item.status} testIdSuffix={item.id} />` positioned right-aligned before the status/action button | Show per-item timeline on active rows | BUG-146 |
| E5 | L697–736 (served block) | Replace entire `{servedItems.length > 0 && (…)}` block with an always-visible block: a small "Served" label header (no button), and the item rows rendered directly (no `showServed` gate). Add `ItemTimeline` to each served row. | Remove toggle + add per-item timeline | CR-055 + BUG-146 |
| E6 | L738–779 (cancelled block) | Same treatment as E5 for cancelled items: replace collapsed block with always-visible block + "Cancelled" label. Add `ItemTimeline` to each cancelled row (2-dot + X variant handled inside ItemTimeline). | Remove toggle + add per-item timeline | CR-055 + BUG-146 |

**Data-testid preservation policy:**
- Existing `served-toggle-${orderId}` and `cancelled-toggle-${orderId}` testids will be **removed** (buttons gone). Any test that looks them up will fail — this is expected and will be recorded as a "test drift" note in the QA handover.
- New testid `item-timeline-${item.id}` added by the new component.

---

## 4. BUG-149 Diagnostic Log (E3 detail)

**Non-invasive, disable-able, one-liner:**

```jsx
// BUG-149 diagnostic (2026-07-04): capture socket payloads where orderNumber is
// missing on scan/web-origin orders. Auto-disabled unless localStorage flag set.
// Owner will flip flag on suspect restaurant, wait for next occurrence,
// then copy console output back to intake. Log will be removed via follow-up.
if (typeof window !== 'undefined' && window.localStorage?.getItem('mygenie_bug149_debug') === 'true') {
  // eslint-disable-next-line no-console
  console.log('[BUG-149]', {
    orderId,
    orderNumber,
    orderFrom: order.orderFrom,
    isWebOrder: order.isWebOrder,
    fOrderStatus,
    hasChip: !!orderNumber && !isRoom && !isDineIn,
    source: order.source,
  });
}
```

Placement: immediately after L98 (`const items = order.items || [];`) so the values referenced are already declared.

**Repro protocol for owner** (separate doc — see §7):
1. Open browser DevTools console on the dashboard on the suspect restaurant.
2. Run: `localStorage.setItem('mygenie_bug149_debug', 'true')` then refresh page.
3. Continue normal operations; wait for a scan order where the ID chip disappears.
4. Copy every `[BUG-149]` line from console → paste into intake doc / share with team.
5. Disable with: `localStorage.removeItem('mygenie_bug149_debug')` when done.

**Why localStorage-gated:** doesn't pollute production console; safe to leave shipped; owner turns it on only when needed. Zero cost in normal operation.

---

## 5. Verification Matrix

To be inherited by Implementation agent (self-test) and QA agent (test cases).

| # | Item | File / Component | Verification | Automated? |
|---|---|---|---|---|
| V1 | BUG-146 | `ItemTimeline.jsx` | Unit: renders `● ─ 2m ─ ○` for `status="preparing"` + `createdAt` set only | YES (new test file) |
| V2 | BUG-146 | `ItemTimeline.jsx` | Unit: renders `● ─ 2m ─ ● ─ 3m ─ ○` for `status="ready"` + `readyAt` set | YES |
| V3 | BUG-146 | `ItemTimeline.jsx` | Unit: renders `● ─ 2m ─ ● ─ 3m ─ ●` for `status="served"` + all timestamps set | YES |
| V4 | BUG-146 | `ItemTimeline.jsx` | Unit: renders `● ─ 2m ─ ✗` for `status="cancelled"` + `cancelAt` | YES |
| V5 | BUG-146 | `ItemTimeline.jsx` | Unit: returns null if `createdAt` is missing/null | YES |
| V6 | CR-055 | `OrderCard.jsx` | Browser: card with mixed items renders active → served label + rows → cancelled label + rows top-to-bottom with all items visible | NO — screenshot + visual check |
| V7 | CR-055 | `OrderCard.jsx` | Browser: no `▼ Served` and no `▼ Cancelled` toggle buttons visible; no click required | NO — screenshot |
| V8 | CR-055 | `OrderCard.jsx` | Unit: element with testid `served-toggle-${orderId}` is NOT in the DOM (was present pre-change) | YES |
| V9 | CR-055 | `OrderCard.jsx` | Unit: element with testid `cancelled-toggle-${orderId}` is NOT in the DOM | YES |
| V10 | CR-055 | `OrderCard.jsx` | Unit: given order with served + cancelled items, both sections are queryable directly (no `.click()` on toggle needed) | YES |
| V11 | BUG-149 | `OrderCard.jsx` | Unit: with `localStorage.mygenie_bug149_debug !== 'true'`, no `[BUG-149]` console output emitted | YES (spy on console.log) |
| V12 | BUG-149 | `OrderCard.jsx` | Unit: with the flag `= 'true'`, one `[BUG-149]` object logged per render with `orderId`/`orderNumber`/`orderFrom`/`isWebOrder`/`fOrderStatus`/`hasChip`/`source` fields | YES |
| V13 | Cluster | `OrderCard.jsx` | Compile: `yarn build` completes with zero NEW warnings | YES (build script) |
| V14 | Cluster | `OrderCard.jsx` | Regression: manual bill / KOT / cancel / ready / serve / merge / shift / whatsapp buttons still trigger correctly (spot-check 3 buttons) | NO |
| V15 | Cluster | `OrderCard.jsx` | Regression: OrderTimeline (order-level) still renders in header row 2 with no visual change | NO |
| V16 | Cluster | Dashboard | Density: at 1920×800 viewport, 4-cards-per-row layout still fits comfortably with taller cards (served+cancelled always visible) | NO |
| V17 | Cluster | Dashboard | Regression: existing tests under `__tests__/components/cards/` still pass (excluding intentionally-invalidated toggle tests) | YES (test suite) |

**Total: 17 checks. 10 automated, 7 manual (browser-driven).**

---

## 6. Post-Code Registry Checklist (mandatory before writing handover)

Implementation agent MUST execute this after coding, before session handover.

```
□ registry.json: BUG-146 → status: IMPLEMENTED, sprint_key: pos_5_0
□ registry.json: BUG-149 → status: IMPLEMENTED (diagnostic only — see notes), sprint_key: pos_5_0
□ registry.json: CR-055  → status: IMPLEMENTED, sprint_key: pos_5_0
□ BUG_TRACKER.md: BUG-146 and BUG-149 rows updated to "IMPLEMENTED — awaiting QA"
□ CR_REGISTRY.md: CR-055 row updated to "IMPLEMENTED — awaiting QA"
□ FILE_OWNERSHIP.md: add
    | components/cards/OrderCard.jsx | remove toggles + per-item timeline + BUG-149 log | CR-055/BUG-146/BUG-149 |
    | components/cards/ItemTimeline.jsx | NEW component — per-item mini timeline | BUG-146 |
    | components/cards/index.js | export ItemTimeline | BUG-146 |
□ Code markers: every touched file has // CR-055 or // BUG-146 or // BUG-149 comment(s)
□ CR_055 intake doc footer: add "BUG-025 collapse pattern SUPERSEDED by CR-055 owner ruling 2026-07-04"
□ webpack compiles with zero NEW warnings
```

---

## 7. Deliverable Documents (Implementation agent output list)

| # | Path | Content |
|---|---|---|
| D1 | `/app/frontend/src/components/cards/ItemTimeline.jsx` | New component (~55 lines) |
| D2 | `/app/frontend/src/components/cards/OrderCard.jsx` | Modified (net −40 lines) |
| D3 | `/app/frontend/src/components/cards/index.js` | +1 line export |
| D4 | `/app/frontend/src/__tests__/components/cards/ItemTimeline.test.jsx` | New unit test file (~60 lines, covers V1–V5) |
| D5 | `/app/frontend/src/__tests__/components/cards/OrderCard.cr055.test.jsx` | New unit test file (~80 lines, covers V8–V12) |
| D6 | `/app/memory/handover/QA_HANDOVER_2026_07_04_ORDERCARD_CLUSTER.md` | QA handover with verification matrix + test scenarios |
| D7 | `/app/memory/handover/BUG_149_REPRO_PROTOCOL_2026_07_04.md` | Owner-facing 5-step protocol to capture the intermittent scan-order case |
| D8 | `/app/memory/handover/SESSION_HANDOVER_2026_07_04_IMPL.md` | Session handover |

---

## 8. Execution Sequence (for Implementation agent)

1. Create `ItemTimeline.jsx` (D1) — small, isolated, easiest to test first.
2. Export from `index.js` (D3).
3. Write unit tests `ItemTimeline.test.jsx` (D4) — run → 5/5 pass.
4. Modify `OrderCard.jsx` (D2) — apply E1–E6 edits in order.
5. Write unit tests `OrderCard.cr055.test.jsx` (D5) — run → 5/5 pass.
6. `yarn build` — confirm zero new warnings.
7. Manual browser check on preview URL: load dashboard with a test order (served + cancelled items) → screenshot → confirm mockup match.
8. Registry checklist §6.
9. Write handover docs D6, D7, D8.
10. Hand off to QA.

---

## 9. Rollback Plan

Every edit is a targeted deletion or additive component. Rollback = git-revert of the specific file OR:
- **CR-055 revert:** re-add the two `useState` lines, restore the two toggle blocks (kept in git history).
- **BUG-146 revert:** delete `ItemTimeline.jsx`, remove the JSX usage in OrderCard.jsx (single import + 3 usages).
- **BUG-149 revert:** delete the localStorage-gated `console.log` block.

No data migration, no persisted state, no localStorage keys created. Zero rollback risk.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cards get taller and break dashboard density at small viewports | LOW | MEDIUM | V16 manual check; owner smoke on production-typical resolutions |
| Existing test suite has hard-coded selectors on the served/cancelled toggle buttons | MEDIUM | LOW | V17 runs full suite; failures listed in QA handover as expected-breakages, not regressions |
| `computeDuration` produces "0m" for very recent items and looks empty | LOW | LOW | Acceptable — "0m" is meaningful; can iterate to "just now" post-smoke if owner complains |
| Per-item timeline width overflows on narrow cards (280px min) | LOW | LOW | V6 visual check; timeline is `~48px` wide (2 dots + 2 dashes + short duration) — fits |
| BUG-149 log floods console on restaurants left with the flag enabled | LOW | LOW | Log only when explicitly enabled via localStorage; documented cleanup in repro protocol |
| Owner later decides Cancelled should be collapsed again | LOW | LOW | Toggle can be re-introduced in a 10-line change; historical BUG-025 code preserved in git |

---

## 11. Handover — Next Step

```
Plan ready at /app/memory/plans/ORDERCARD_CLUSTER_IMPLEMENTATION_PLAN_2026_07_04.md
Files WILL change: OrderCard.jsx + index.js + NEW ItemTimeline.jsx
Files will NOT touch: orderTransform.js, OrderTimeline.jsx, DashboardPage.jsx, ChannelColumn.jsx, ScanOrderPopOut.jsx, other cards
Owner approvals recorded: CR-055 mockup, BUG-146 scope, BUG-149 investigation-only + no fallback, BUG-025 SUPERSEDED
Verification matrix: 17 checks (10 automated, 7 manual)
Awaiting Gate 4 GO.
```

---

**End of Implementation Plan — 2026-07-04**
