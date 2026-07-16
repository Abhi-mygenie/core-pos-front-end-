# Implementation Plan — LINE-BY-LINE ADDENDUM
# OrderCard Cluster (BUG-146 · BUG-149 · CR-055)

**Companion to:** `ORDERCARD_CLUSTER_IMPLEMENTATION_PLAN_2026_07_04.md`
**Purpose:** Exact `current → new` diffs for every edit — enables copy-paste implementation with zero interpretation.
**Line refs:** All line numbers pinned to `OrderCard.jsx` at commit-of-record 2026-07-04. Implementation agent MUST re-verify entry state per Gate 3 Step 0 before applying.

---

## EDIT E1 — Imports (Line 2)

**BEFORE (line 2, entire line):**
```jsx
import { User, X, ChevronDown, ChevronUp, MapPin, Clock, Printer, ShoppingBag, Bike, Utensils, DoorOpen, Circle, CheckCircle2, Check, FileText, GitMerge, ArrowLeftRight, CornerRightUp, Loader2 } from "lucide-react";
```

**AFTER (line 2):**
```jsx
import { User, X, MapPin, Clock, Printer, ShoppingBag, Bike, Utensils, DoorOpen, Circle, CheckCircle2, Check, FileText, GitMerge, ArrowLeftRight, CornerRightUp, Loader2 } from "lucide-react";
```

**Insert new import on line 5 (immediately after `import OrderTimeline from "./OrderTimeline";` at line 4):**
```jsx
import ItemTimeline from "./ItemTimeline"; // BUG-146: per-item mini timeline
```

**Removed symbols:** `ChevronDown`, `ChevronUp` (no longer used — toggles removed).
**Added imports:** `ItemTimeline` (new component created in this cluster).

---

## EDIT E2 — Delete toggle state (Lines 54–55)

**BEFORE (lines 54–55):**
```jsx
  const [showServed, setShowServed] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
```

**AFTER:** *(both lines deleted — nothing replaces them)*

**Rationale:** Served + Cancelled sections become always-visible per CR-055. No toggle state needed.

---

## EDIT E3 — BUG-149 diagnostic log (insert after line 98)

**AFTER line 98 (which currently reads `const items = order.items || [];`), insert this block on new lines 99–113:**

```jsx

  // BUG-149 diagnostic (2026-07-04) — INVESTIGATION ONLY, no fix.
  // Owner ruling: capture socket payloads where orderNumber is missing on
  // scan/web-origin orders to identify the intermittent socket path that
  // drops restaurant_order_id. Enabled per-restaurant via localStorage flag:
  //   localStorage.setItem('mygenie_bug149_debug', 'true')
  // Silent when flag is absent. See repro protocol doc for owner steps.
  if (typeof window !== 'undefined' && window.localStorage?.getItem('mygenie_bug149_debug') === 'true') {
    // eslint-disable-next-line no-console
    console.log('[BUG-149]', {
      orderId,
      orderNumber,
      orderFrom: order.orderFrom,
      isWebOrder: order.isWebOrder,
      fOrderStatus,
      source: order.source,
      chipVisible: !!orderNumber && !isRoom && !isDineIn,
    });
  }
```

**Note:** `orderNumber`, `isRoom`, `isDineIn`, `orderId`, `fOrderStatus` all already declared above (lines 81, 84, 92, 96, 97). The log is a pure read.

---

## EDIT E4 — Active-item row: add ItemTimeline (lines 626–687)

**BEFORE (lines 626–688, the full return-block of `activeItems.map`):**

Currently the active-item row renders as:
```jsx
            return (
              <div key={item.id} className={isDineIn ? "py-1" : "py-0.5"}>
                {/* Main item row */}
                <div className="flex items-center gap-2">
                  {/* Food Transfer icon on LEFT - Dine-In only, permission-gated */}
                  {isDineIn && !isYetToConfirm && canFoodTransfer && (
                    <button /* ...food-transfer button... */ />
                  )}
                  {/* Item name + qty + details inline - SMALLER, SECONDARY */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px]" style={{ color: COLORS.grayText }}>
                      {item.name} ({item.qty})
                    </span>
                    {/* Variants/Addons inline - Gray italic (subtle) */}
                    {detailsStr && ( /* ...variants... */ )}
                    {/* Item note inline */}
                    {itemNote && ( /* ...note... */ )}
                  </div>
                  {/* Status label + action icon - ONLY for Dine-In - MORE PROMINENT */}
                  {showItemAction && (
                    <button /* ...action button... */ />
                  )}
                </div>
              </div>
            );
```

**AFTER — one surgical insertion between the `<div className="flex-1 min-w-0">…</div>` (ends at line 664) and the `{showItemAction && …}` block (starts at line 665):**

Insert on line 665 (a new line, before the existing "Status label + action icon" comment):
```jsx
                  {/* BUG-146: Per-item mini timeline — active row */}
                  <ItemTimeline
                    createdAt={item.createdAt}
                    readyAt={item.readyAt}
                    serveAt={item.serveAt}
                    cancelAt={item.cancelAt}
                    status={item.status}
                    testIdSuffix={item.id}
                  />
```

**Net effect:** +8 lines inserted between the item-name column and the status-action button. No other lines in E4 change.

---

## EDIT E5 — Served items block (Lines 697–736)

**BEFORE (lines 697–736, entire block):**
```jsx
      {/* ── SERVED ITEMS COLLAPSED (44px touch target for toggle) ── */}
      {servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`served-toggle-${orderId}`}
            className="w-full px-3 min-h-[40px] flex items-center justify-between text-xs hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={(e) => {
              e.stopPropagation();
              setShowServed(!showServed);
            }}
          >
            <span>▼ Served ({servedItems.length})</span>
            {showServed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showServed && (
            <div className="px-3 pb-2">
              {servedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS.primaryGreen }}
                  />
                  <span className="flex-1 text-xs" style={{ color: COLORS.grayText }}>
                    {item.name} ({item.qty})
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
```

**AFTER (replaces the entire block above with):**
```jsx
      {/* ── SERVED ITEMS — CR-055 (2026-07-04): always visible, no toggle. ── */}
      {servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          {/* Section label (non-interactive) */}
          <div
            data-testid={`served-label-${orderId}`}
            className="w-full px-3 py-1.5 text-xs"
            style={{ color: COLORS.grayText }}
          >
            Served ({servedItems.length})
          </div>
          <div className="px-3 pb-2">
            {servedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS.primaryGreen }}
                />
                <span className="flex-1 text-xs" style={{ color: COLORS.grayText }}>
                  {item.name} ({item.qty})
                </span>
                {/* BUG-146: Per-item mini timeline — served row */}
                <ItemTimeline
                  createdAt={item.createdAt}
                  readyAt={item.readyAt}
                  serveAt={item.serveAt}
                  cancelAt={item.cancelAt}
                  status={item.status}
                  testIdSuffix={item.id}
                />
                <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                  Served
                </span>
                {/* Served checkmark (no action) */}
                <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
                  <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

**Delta:** −40 lines (old block) → +34 lines (new block) = **net −6 lines**. Removed `<button>`/`setShowServed`/chevron. Added `<div data-testid="served-label-…">` and `<ItemTimeline>` per row.

---

## EDIT E6 — Cancelled items block (Lines 738–779)

**BEFORE (lines 738–779, entire block):**
```jsx
      {/* ── BUG-025: CANCELLED ITEMS COLLAPSED — separate dropdown, mirrors Served block ── */}
      {cancelledItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`cancelled-toggle-${orderId}`}
            className="w-full px-3 min-h-[40px] flex items-center justify-between text-xs hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={(e) => {
              e.stopPropagation();
              setShowCancelled(!showCancelled);
            }}
          >
            <span>▼ Cancelled ({cancelledItems.length})</span>
            {showCancelled ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCancelled && (
            <div className="px-3 pb-2">
              {cancelledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#9CA3AF' }}
                  />
                  <span
                    data-testid={`cancelled-item-${item.id}`}
                    className="flex-1 text-xs line-through"
                    style={{ color: '#9CA3AF' }}
                  >
                    {item.name} ({item.qty})
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                    (Cancelled)
                  </span>
                  {/* Spacer to align with Served block's checkmark column */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
```

**AFTER (replaces the entire block above with):**
```jsx
      {/* ── CANCELLED ITEMS — CR-055 (2026-07-04): always visible, no toggle.
             SUPERSEDES BUG-025 collapse behavior (owner ruling 2026-07-04). ── */}
      {cancelledItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          {/* Section label (non-interactive) */}
          <div
            data-testid={`cancelled-label-${orderId}`}
            className="w-full px-3 py-1.5 text-xs"
            style={{ color: '#9CA3AF' }}
          >
            Cancelled ({cancelledItems.length})
          </div>
          <div className="px-3 pb-2">
            {cancelledItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#9CA3AF' }}
                />
                <span
                  data-testid={`cancelled-item-${item.id}`}
                  className="flex-1 text-xs line-through"
                  style={{ color: '#9CA3AF' }}
                >
                  {item.name} ({item.qty})
                </span>
                {/* BUG-146: Per-item mini timeline — cancelled row */}
                <ItemTimeline
                  createdAt={item.createdAt}
                  readyAt={item.readyAt}
                  serveAt={item.serveAt}
                  cancelAt={item.cancelAt}
                  status={item.status}
                  testIdSuffix={item.id}
                />
                <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                  (Cancelled)
                </span>
                {/* Spacer to align with Served block's checkmark column */}
                <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />
              </div>
            ))}
          </div>
        </div>
      )}
```

**Delta:** −42 lines (old block) → +37 lines (new block) = **net −5 lines**. Same pattern as E5.

---

## NEW FILE — `/app/frontend/src/components/cards/ItemTimeline.jsx`

Full file content (55 lines, verbatim — no interpretation):

```jsx
// BUG-146: Per-item mini timeline — mirrors OrderTimeline visual language,
// scaled down for use inside a card item row.
//
// States rendered:
//   preparing → ● ── Xm ── ○
//   ready     → ● ── Xm ── ● ── Ym ── ○
//   served    → ● ── Xm ── ● ── Ym ── ●
//   cancelled → ● ── Xm ── ✗
//
// Data source (already present on the transformed item shape — see
// orderTransform.js L137-140): item.createdAt, item.readyAt,
// item.serveAt, item.cancelAt.
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
    <div
      className="flex items-center gap-0.5 flex-shrink-0"
      data-testid={`item-timeline-${testIdSuffix}`}
    >
      {/* Dot 1: placed (always filled green) */}
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: COLORS.primaryGreen }}
        title="Added"
      />
      {/* Duration 1 */}
      <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
      <span className="px-0.5" style={{ color: COLORS.grayText, fontSize: "9px" }}>{t.stage1}</span>
      <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
      {/* Dot 2: ready OR cancelled marker */}
      {t.isCancelled ? (
        <XIcon className="w-2 h-2" style={{ color: COLORS.errorText }} strokeWidth={2.5} />
      ) : (
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={dotStyle(t.isReady)}
          title="Ready"
        />
      )}
      {/* Duration 2 + Dot 3: only if ready and NOT cancelled */}
      {!t.isCancelled && t.isReady && (
        <>
          <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
          <span className="px-0.5" style={{ color: COLORS.grayText, fontSize: "9px" }}>{t.stage2}</span>
          <div className="w-1.5 h-px" style={{ backgroundColor: COLORS.borderGray }} />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={dotStyle(t.isServed)}
            title="Served"
          />
        </>
      )}
    </div>
  );
};

export default ItemTimeline;
```

---

## NEW FILE — `/app/frontend/src/components/cards/index.js` — 1-line append

**BEFORE (existing 4 lines):**
```jsx
export { default as DineInCard } from './DineInCard';
export { default as DeliveryCard } from './DeliveryCard';
export { default as TableCard } from './TableCard';
export { default as OrderCard } from './OrderCard';
```

**AFTER (5 lines — append 1):**
```jsx
export { default as DineInCard } from './DineInCard';
export { default as DeliveryCard } from './DeliveryCard';
export { default as TableCard } from './TableCard';
export { default as OrderCard } from './OrderCard';
export { default as ItemTimeline } from './ItemTimeline'; // BUG-146
```

---

## NEW FILE — `/app/frontend/src/__tests__/components/cards/ItemTimeline.test.jsx`

Full file (~85 lines) — covers V1–V5 from Verification Matrix.

```jsx
// BUG-146: Unit tests for the per-item mini timeline component.
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemTimeline from '../../../components/cards/ItemTimeline';

// Fixed "now" so relative durations are deterministic.
const NOW = new Date('2026-07-04T12:10:00.000Z').getTime();
beforeAll(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => NOW);
  jest.useFakeTimers().setSystemTime(new Date(NOW));
});
afterAll(() => {
  jest.useRealTimers();
});

describe('ItemTimeline (BUG-146)', () => {
  test('V1 preparing: renders 2 dots + duration (waiting for ready)', () => {
    render(
      <ItemTimeline
        createdAt="2026-07-04T12:08:00.000Z"
        readyAt={null}
        serveAt={null}
        cancelAt={null}
        status="preparing"
        testIdSuffix="p1"
      />
    );
    const tl = screen.getByTestId('item-timeline-p1');
    expect(tl).toBeInTheDocument();
    expect(tl.textContent).toContain('2m');
  });

  test('V2 ready: renders 3 dots + 2 durations (waiting for serve)', () => {
    render(
      <ItemTimeline
        createdAt="2026-07-04T12:05:00.000Z"
        readyAt="2026-07-04T12:08:00.000Z"
        serveAt={null}
        cancelAt={null}
        status="ready"
        testIdSuffix="r1"
      />
    );
    const tl = screen.getByTestId('item-timeline-r1');
    expect(tl.textContent).toContain('3m'); // placed→ready
    expect(tl.textContent).toContain('2m'); // ready→now
  });

  test('V3 served: renders 3 dots + 2 durations (both filled)', () => {
    render(
      <ItemTimeline
        createdAt="2026-07-04T12:04:00.000Z"
        readyAt="2026-07-04T12:07:00.000Z"
        serveAt="2026-07-04T12:09:00.000Z"
        cancelAt={null}
        status="served"
        testIdSuffix="s1"
      />
    );
    const tl = screen.getByTestId('item-timeline-s1');
    expect(tl.textContent).toContain('3m');
    expect(tl.textContent).toContain('2m');
  });

  test('V4 cancelled: renders dot + duration + red X, no third dot', () => {
    const { container } = render(
      <ItemTimeline
        createdAt="2026-07-04T12:07:00.000Z"
        readyAt={null}
        serveAt={null}
        cancelAt="2026-07-04T12:09:00.000Z"
        status="cancelled"
        testIdSuffix="c1"
      />
    );
    const tl = screen.getByTestId('item-timeline-c1');
    expect(tl.textContent).toContain('2m');
    // Red X (lucide-react X icon) present — assert on the SVG count > 0
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  test('V5 returns null if createdAt missing', () => {
    const { container } = render(
      <ItemTimeline
        createdAt={null}
        readyAt={null}
        serveAt={null}
        cancelAt={null}
        status="preparing"
        testIdSuffix="null1"
      />
    );
    expect(container.querySelector('[data-testid^="item-timeline-"]')).toBeNull();
  });
});
```

---

## NEW FILE — `/app/frontend/src/__tests__/components/cards/OrderCard.cr055.test.jsx`

Full file (~110 lines) — covers V8–V12 from Verification Matrix.

```jsx
// CR-055 + BUG-149: Unit tests for OrderCard toggle removal + diagnostic log.
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import OrderCard from '../../../components/cards/OrderCard';

// Mock contexts + services used inside OrderCard.
jest.mock('../../../contexts', () => ({
  useMenu: () => ({ getProductById: () => null }),
  useOrders: () => ({ updateOrder: jest.fn() }),
  useRestaurant: () => ({ restaurant: {}, printerAgents: [] }),
  useAuth: () => ({ user: { roleName: 'Manager' } }),
}));
jest.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('../../../api/services/orderService', () => ({
  printOrder: jest.fn(),
  completePrepaidOrder: jest.fn(),
}));
jest.mock('../../../api/services/deliveryService', () => ({
  dispatchOrder: jest.fn(),
}));
jest.mock('../../../api/services/stationService', () => ({
  getStationsFromOrderItems: () => [],
}));

const baseOrder = {
  orderId: 'o1',
  id: 'o1',
  orderNumber: '002364',
  amount: 450,
  fOrderStatus: 1,
  source: 'own',
  orderFrom: 'web',
  isWebOrder: true,
  items: [
    { id: 'i1', name: 'Zone',   qty: 1, status: 'preparing', createdAt: '2026-07-04T12:08:00.000Z' },
    { id: 'i2', name: 'CD 20',  qty: 1, status: 'served',    createdAt: '2026-07-04T12:04:00.000Z', readyAt: '2026-07-04T12:06:00.000Z', serveAt: '2026-07-04T12:09:00.000Z' },
    { id: 'i3', name: 'CD 20',  qty: 1, status: 'cancelled', createdAt: '2026-07-04T12:05:00.000Z', cancelAt: '2026-07-04T12:07:00.000Z' },
  ],
};

const renderCard = (overrides = {}) =>
  render(
    <MemoryRouter>
      <OrderCard order={{ ...baseOrder, ...overrides }} orderType="delivery" />
    </MemoryRouter>
  );

describe('OrderCard — CR-055 collapse removal', () => {
  test('V8 no served-toggle button in DOM', () => {
    renderCard();
    expect(screen.queryByTestId('served-toggle-o1')).toBeNull();
  });

  test('V9 no cancelled-toggle button in DOM', () => {
    renderCard();
    expect(screen.queryByTestId('cancelled-toggle-o1')).toBeNull();
  });

  test('V10 served + cancelled items visible without clicking', () => {
    renderCard();
    // Served label present
    expect(screen.getByTestId('served-label-o1')).toBeInTheDocument();
    expect(screen.getByTestId('served-label-o1').textContent).toContain('Served (1)');
    // Cancelled label present
    expect(screen.getByTestId('cancelled-label-o1')).toBeInTheDocument();
    expect(screen.getByTestId('cancelled-label-o1').textContent).toContain('Cancelled (1)');
    // Cancelled item body visible
    expect(screen.getByTestId('cancelled-item-i3')).toBeInTheDocument();
  });
});

describe('OrderCard — BUG-149 diagnostic log', () => {
  let logSpy;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('mygenie_bug149_debug');
  });

  test('V11 no log when flag absent', () => {
    renderCard();
    const bug149Calls = logSpy.mock.calls.filter(args => args[0] === '[BUG-149]');
    expect(bug149Calls.length).toBe(0);
  });

  test('V12 emits one log object when flag set to true', () => {
    localStorage.setItem('mygenie_bug149_debug', 'true');
    renderCard();
    const bug149Calls = logSpy.mock.calls.filter(args => args[0] === '[BUG-149]');
    expect(bug149Calls.length).toBeGreaterThanOrEqual(1);
    const payload = bug149Calls[0][1];
    expect(payload).toEqual(expect.objectContaining({
      orderId: 'o1',
      orderNumber: '002364',
      orderFrom: 'web',
      isWebOrder: true,
    }));
    expect(payload).toHaveProperty('chipVisible');
    expect(payload).toHaveProperty('fOrderStatus');
    expect(payload).toHaveProperty('source');
  });
});
```

---

## NEW FILE — `/app/memory/handover/BUG_149_REPRO_PROTOCOL_2026_07_04.md`

Owner-facing 5-step protocol (~30 lines). Content locked to what's referenced in the log comment (E3):

```markdown
# BUG-149 — Repro Protocol for Owner
**Item:** BUG-149 (Order ID intermittent miss on scan orders)
**Purpose:** Capture one concrete socket event that shows the missing orderNumber, so the follow-up fix can target the exact code path.
**Created:** 2026-07-04

## Steps
1. On the suspect restaurant device, open the POS dashboard.
2. Open DevTools console (F12 → Console tab).
3. Enable the diagnostic:
   `localStorage.setItem('mygenie_bug149_debug', 'true')`
   Press Enter, then reload the page.
4. Continue normal operations. When you next see a scan order without its ID chip:
   - Do NOT close the browser or refresh.
   - Copy every console line that begins with `[BUG-149]` (right-click → Save as, or select-copy).
   - Attach the copy to this document or share with the team.
5. Disable the diagnostic when done:
   `localStorage.removeItem('mygenie_bug149_debug')`

## What each log line means
Each `[BUG-149]` entry has: `orderId`, `orderNumber`, `orderFrom`, `isWebOrder`, `fOrderStatus`, `source`, `chipVisible`.
- If `orderNumber` is `""` (empty) while `chipVisible` is `false` on a scan card → confirms the socket dropped the field.
- If `orderNumber` is populated but `chipVisible` is `false` → different root cause (unlikely).

## What happens next
Once at least one log line is captured, a follow-up bug (BUG-149-FU-01) will be filed with the evidence and the actual fix (fallback or socket path patch) planned. Until then, no code fix is deployed per owner ruling 2026-07-04.
```

---

## Summary — total line delta

| File | Lines before | Lines after | Delta |
|---|---:|---:|---:|
| `OrderCard.jsx` | 1110 | ≈ 1088 | **−22** |
| `ItemTimeline.jsx` (new) | 0 | 89 | +89 |
| `cards/index.js` | 4 | 5 | +1 |
| `__tests__/…/ItemTimeline.test.jsx` (new) | 0 | 85 | +85 |
| `__tests__/…/OrderCard.cr055.test.jsx` (new) | 0 | 110 | +110 |
| `BUG_149_REPRO_PROTOCOL.md` (new) | 0 | 30 | +30 |
| **TOTAL** | — | — | **+293 net** |

Application code delta on the single edited file: **−22 lines** (the toggle blocks compress into simpler always-render blocks).

---

## Implementation-agent entry checklist (Gate 3 Step 0)

Before applying any edit, re-view the target file and confirm:
- [ ] Line 2 currently matches the E1 BEFORE snippet exactly.
- [ ] Lines 54–55 currently match the E2 BEFORE snippet.
- [ ] Line 98 currently reads `const items = order.items || [];` (E3 insertion anchor).
- [ ] Line 665 currently begins the `{showItemAction && (` block (E4 insertion anchor).
- [ ] Lines 697–736 currently contain the entire Served block per E5 BEFORE snippet.
- [ ] Lines 738–779 currently contain the entire Cancelled block per E6 BEFORE snippet.

If ANY line-anchor drifts from the above, STOP and return to Planning per Gate-3 Step 0.

---

**End of Line-By-Line Addendum — 2026-07-04**
