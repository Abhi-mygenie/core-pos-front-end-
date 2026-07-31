# CR-011 — Loading & Interaction Spec (cross-screen contract)

**CR:** CR-011 — Complete Reports Module
**Created:** 2026-06-01
**Author:** Main agent (E1)
**Status:** SPEC — **REVISED 2026-06-02** (primitives already built; Apply button pattern added; 2-month max range; FY preset disabled; data mapping addendum)
**Owner sign-off:** 2026-06-01 (initial scope), 2026-06-02 (Apply button, 2-month max, FY disabled, S0 freeze)

---

## 0. Why this spec exists

During CR-011 Phase 1 visual-DNA freeze (S0–S4), every mockup is being wired to live preprod APIs purely for **owner data validation**. Mockups do not yet implement production-grade loading behavior. The owner has explicitly flagged loading as the #1 pain point:

> *"One main issue we are facing is a loading issue. So I want a loader to have all the things are not loaded. It should be disabled to do any filter or anything till the data is not loaded. Also when the page is loaded for the first time, it should show a loader till the data is not loaded on the screen."*  
> — owner, 2026-06-01

This spec is the binding contract every Insights report screen (S2 today, S3–S41 later) must satisfy at Code Gate. It is **not** to be implemented during the visual-DNA / API-wiring phase — it is implemented once, as part of the post-Phase-4 production refactor, then retrofitted to every previously-frozen screen.

---

## 1. Behavior contract (mandatory)

### 1.1 First-load (no data yet)
- Page chrome (sidebar, breadcrumb, title) renders immediately.
- A centered **"Loading report…"** splash occupies the main panel area until the first successful data response lands or an error fires.
- **No interactive control inside the main panel is operable** during first-load (date pickers, presets, attribution toggle, tabs, search, filter dropdowns, sort headers, export buttons, row clicks).
- On success → splash dismisses, full page reveals with data.
- On error → centered error state with retry CTA.

### 1.2 Re-fetch (preset / Apply button / tab / toggle change)
- A **thin animated progress bar** appears flush at the top of the main panel.
- Existing rows + summary stay visible at **~60% opacity**, frozen, not interactive — i.e. previous data is "ghosted" while new data is fetched. This avoids the jarring "skeleton → flash → data" loop the owner complained about.
- **Every interactive control in the report area is disabled** (see §2) for the entire fetch duration.
- On success → opacity restores, new data swaps in.
- On error → ghosted data stays + inline error banner above the table with retry CTA.

**Date change behavior (owner-mandated 2026-06-02):** Changing the From/To date inputs does **NOT** trigger a fetch. The user must click the **Apply** button to commit the new date range. Preset pills (Today, 7D, 30D, MTD) set both dates AND apply immediately (no Apply click needed). This prevents unwanted intermediate fetches when the user is editing both dates.

### 1.3 In-flight request cancellation
- If the user changes any dependency (Apply click, preset, sortBy, tab) while a request is in flight, the in-flight request **MUST** be aborted (AbortController) before the new one fires.
- No "last response wins" race conditions. Stale data must never overwrite fresh data.

### 1.5 Date range constraints (owner-mandated 2026-06-02)
- **Maximum range: 2 months (62 days).** Backend times out on larger ranges (verified: 3-month query = 32s, 6-month = timeout).
- When draft range exceeds 62 days: date picker border turns red, "Max 2 months" label appears, Apply button stays disabled.
- Calendar inputs enforce `min`/`max` attributes to soft-limit selection.
- **FY preset** is visible in the UI but **disabled** (greyed out, `cursor-not-allowed`, tooltip "Coming soon — max range is 2 months"). It remains for future enablement when backend pagination is added.

### 1.4 Empty result (success, zero rows)
- Distinct from loading. Page is fully interactive. Center-empty illustration + "no data in this range" message + suggested next action (Try Last 7 Days / Reset Filters).

---

## 2. Controls that MUST be disabled during fetch

For every report screen in the Insights module:

| Control | Element | Disabled behavior |
|---|---|---|
| Date From | `<input type="date">` | `disabled` attribute + dim. Also has `min` attr (= To − 62 days) |
| Date To | `<input type="date">` | `disabled` + dim. Also has `max` attr (= From + 62 days) |
| **Apply button** | `<button>` | `disabled` when: (a) dates unchanged from applied, (b) draft range invalid, (c) draft range > 62 days, (d) fetch in-flight. Green when actionable, grey when disabled. |
| Preset pills (Today / 7D / 30D / MTD / FY) | `<button>` | `disabled` + dim during fetch. **FY permanently disabled** (greyed, tooltip). Presets set both dates + apply immediately. |
| Date-attribution toggle (Paid / Punched / Cancelled) | `<button>` | `disabled` + dim |
| Tab pills (All / Top / Slow / Cancelled / Comp / …) | `<button>` | `disabled` + dim — but the **selected** tab remains visually selected |
| Search input | `<input>` | `disabled` |
| Filter dropdowns (Station / Category / Veg / channel / cashier / station etc.) | `<select>` | `disabled` |
| Column sort headers | `<th onClick>` | `pointer-events: none` + cursor reset |
| Active filter chip clear buttons | `<button>` | `disabled` |
| Clear-All filters CTA | `<button>` | `disabled` |
| Export PDF | `<button>` | `disabled` + tooltip "Available after data loads" |
| Export Excel | `<button>` | same |
| Table row click → drill sheet | `<tr onClick>` | `pointer-events: none` + cursor reset |
| Drill-sheet "Try Last 7 Days" CTA | `<button>` | `disabled` |
| Refresh / Reload CTA (if any) | `<button>` | `disabled` (you're already refreshing) |

**Implementation note:** the canonical mechanism is a `<ReportLoadingShield>` wrapper (see §3) that pointer-events-none's the entire children when `isLoading=true`. Per-control `disabled` props are added in addition (defense in depth + screen-reader support).

---

## 3. Reusable primitives (BUILT — live in `/app/frontend/src/components/reports/`)

### 3.1 `<ReportLoadingShield isLoading hasLoadedOnce error onRetry>`
Wraps the entire main panel of any Insights report. Responsibilities:
- Renders a 2px animated progress bar fixed at the top of the panel when `isLoading=true`.
- Renders a centered "Loading report…" splash when `isLoading && !hasLoadedOnce`.
- When `isLoading && hasLoadedOnce` → applies `opacity-60 pointer-events-none` to children + leaves them visible (ghosting pattern).
- When `error` truthy → renders inline error banner with retry CTA above children.
- `data-testid="reports-loading-shield"` for QA.
- **File:** `/app/frontend/src/components/reports/ReportLoadingShield.jsx`

Pseudocode contract:
```jsx
<ReportLoadingShield
  isLoading={isLoading}
  hasLoadedOnce={hasLoadedOnce}
  error={error}
  onRetry={refetch}
>
  {/* entire report body — header, filters, tabs, table, drill sheet */}
</ReportLoadingShield>
```

### 3.2 `useReportFetch(fetchFn, deps, { enabled })` hook
Canonical fetch lifecycle for every report screen. Returns:
```ts
{
  data,            // last successful result (kept across re-fetches for ghosting)
  isLoading,       // true while in-flight
  error,           // null | Error
  hasLoadedOnce,   // becomes true after first successful response
  refetch,         // manual trigger (used by retry CTA)
}
```
Internal behavior:
- AbortController per call; aborts on dep change.
- Debounce 300ms to coalesce rapid dep changes.
- `enabled` flag gates fetch execution (used for date validation).
- Surfaces fetch errors with the existing axios error envelope (`error.readableMessage`).
- Never overwrites `data` on error — old data ghosts through.
- **File:** `/app/frontend/src/components/reports/useReportFetch.js`

### 3.3 Conventions every report screen must follow
```jsx
// Draft dates (user editing) vs applied dates (trigger fetch)
const [fromDate, setFromDate] = useState(fmt(today));
const [toDate, setToDate] = useState(fmt(today));
const [appliedFrom, setAppliedFrom] = useState(fmt(today));
const [appliedTo, setAppliedTo] = useState(fmt(today));

const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;

const { data, isLoading, error, hasLoadedOnce, refetch } =
  useReportFetch(() => getXxxReport(appliedFrom, appliedTo, sortBy), [appliedFrom, appliedTo, sortBy], { enabled: datesValid });

// Presets apply immediately:
const handlePreset = (p) => { setFromDate(f); setToDate(t); setAppliedFrom(f); setAppliedTo(t); };

// Apply button commits draft → applied:
const handleApply = () => { setAppliedFrom(fromDate); setAppliedTo(toDate); };

return (
  <ReportLoadingShield {...{ isLoading, hasLoadedOnce, error, onRetry: refetch }}>
    {/* render data */}
  </ReportLoadingShield>
);
```

Every interactive control in the report body MUST receive `disabled={isLoading}` in addition to the shield (belt-and-braces).

---

## 4. Visual treatment

| State | Treatment |
|---|---|
| First-load splash | Centered, vertically + horizontally. Spinner + "Loading report…" text. Light gray. No noise. |
| Re-fetch ghost | Body content at `opacity-60`, `pointer-events-none`, `cursor-wait` on body. Top progress bar in primary brand color, 2px tall, indeterminate animation. |
| Error inline | Red-50 background banner, AlertTriangle icon, message text, Retry button. Sits above the table. |
| Empty result | Centered illustration + heading + helper text + primary CTA. Distinct from loading. |

Animation: top progress bar uses CSS keyframes — no JS-driven RAF loops. 1.2s duration, ease-in-out, alternating direction.

---

## 5. Acceptance checklist (per-screen, at Code Gate)

A report screen passes Code Gate review on loading behavior only if **all** below are true:

- [ ] Uses `useReportFetch` (no ad-hoc useState/useEffect fetch wiring)
- [ ] Wrapped in `<ReportLoadingShield>`
- [ ] Every interactive control listed in §2 has `disabled={isLoading}`
- [ ] First-load shows "Loading report…" splash (no flash of empty state)
- [ ] Re-fetch ghosts old data + shows top progress bar
- [ ] Rapid dep changes (test: spam-click date presets) only fire one request, others aborted
- [ ] Error state shows retry CTA that actually re-triggers the fetch
- [ ] Empty result is visually distinct from loading
- [ ] No console warnings or unhandled promise rejections during fetch lifecycle
- [ ] Screen-reader: `aria-busy="true"` on the panel while loading
- [ ] **Apply button present** — date input changes do NOT auto-fetch; Apply commits draft → applied dates
- [ ] **Apply button disabled** when: dates unchanged, range invalid, range > 62 days, or fetch in-flight
- [ ] **Date picker border turns orange** when draft differs from applied (visual cue to click Apply)
- [ ] **Date picker border turns red + "Max 2 months" label** when draft range exceeds 62 days
- [ ] **Presets auto-apply** (Today / 7D / 30D / MTD set both draft + applied, trigger fetch immediately)
- [ ] **FY preset visible but permanently disabled** (greyed out, tooltip)
- [ ] **Calendar inputs have min/max** constraints (From min = To − 62d, To max = From + 62d)

---

## 6. Out of scope for this spec
- Backend latency optimizations (separate BE coordination)
- Caching / SWR-style stale-while-revalidate (future enhancement, post-CR-011)
- Offline / connection-loss UX (separate concern)
- Per-row inline loading (e.g. drill-sheet lazy load) — drill-sheet has its own loading contract, defined in S3 mockup

---

## 7. Implementation timing

- **Primitives (`ReportLoadingShield` + `useReportFetch`) are ALREADY BUILT** (shipped during S0/S2 API wiring, pre-Code-Gate). They live at `/app/frontend/src/components/reports/`.
- **S0 and S2 already use both primitives.** S1/S3/S4 need retrofit at Code Gate 1.
- **After each Phase exits** (all screens in that phase FROZEN), a **Phase-scoped Code Gate** is opened:
  - **Code Gate 1** (Phase 1 / S0–S4 FROZEN ✅ 2026-06-02): Retrofit S1/S3/S4 to the spec (S0+S2 already compliant). Verify §5 checklist on all 5 screens. Ship Phase-1 sub-CR.
  - **Code Gate 2** (after Phase 2 / S5–S10 FROZEN): apply primitives to S5–S10. Ship Phase-2 sub-CR.
  - **Code Gate 3** (after Phase 3 / S11–S38 FROZEN): apply primitives to all 28 mechanical screens. Ship Phase-3 sub-CR(s).
  - **Code Gate 4** (after Phase 4 / S39–S41 FROZEN): apply primitives to hardening screens + final audit pass.
- **Acceptance checklist (§5)** is gating for every per-phase Code Gate. No screen ships without it.
- Primitives, once built, are reused unchanged across Phases 2–4 unless owner formally amends this spec.

---

## 8. Cross-references

- `/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md` — references this spec at Gate 4.
- `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` — every FROZEN screen must satisfy §5 at Code Gate.
- `/app/memory/memory/change_requests/impact_analysis/CR_011_IMPACT_ANALYSIS_2026_06_01.md` — high-level impact (this spec implements the UX loading row).

---

*Edits to this spec require explicit owner instruction.*

---

## 9. Data Mapping Addendum (added 2026-06-02)

Field mappings discovered and owner-confirmed during S0 API wiring. These are binding for all dashboard tiles and should be carried forward to any report that uses these fields.

### 9.1 Discount & Offers fields

| Metric | Source | Notes |
|---|---|---|
| Direct Discount | `orders_table.restaurant_discount_amount` | Sum across non-cancelled orders |
| Coupon Discount | `orders_table.coupon_discount_amount` | Also has `coupon_code`, `coupon_info` |
| Loyalty Discount | `orders_table.loyalty_info` → parse JSON → `loyalty_discount` | Field is JSON string: `{"loyalty_discount": 1106, "loyalty_points_used": 1106, ...}`. Default: `{"enabled": false}` |
| Comp Item Value | `order_details_table[].complementary_price` | **Not** `unit_price` or `food_details.price` (both are 0 for comp items). `complementary_price` holds the original menu rate |

### 9.2 Audit / Post-Settle fields

| Metric | Source | Notes |
|---|---|---|
| Made Unpaid | `operations[]` where `operation === 'make_unpaid'` | Order was paid then reversed. `vendor_employee_name` = who did it. |
| Payment Changed | `operations[]` where `operation === 'payment_method_change'` | Payment method altered post-settle. `vendor_employee_name` = who did it. `previous_payment_method` → `current_payment_method` = what changed. |
| NOT available | `reprint`, `edit`, `modify` — these operation strings do not exist in the data | Owner confirmed: don't show re-prints or post-pay edits |
| Note | `operations[]` is empty for many outlets/date ranges. Palm House April 2026 = 0 operations. Pav & Pages May 2026 = 1 make_unpaid (by Sunita). | Data availability varies. |

### 9.3 TAB Settlement

| Metric | Source | Notes |
|---|---|---|
| Unsettled TAB | `payment_method === 'tab'` AND `f_order_status !== '6'` | **Do NOT use `payment_status`** — it is NULL from the list endpoint even for paid orders (known landmine) |

### 9.4 Cancellations

| Metric | Source | Notes |
|---|---|---|
| Order-level | `orders_table.f_order_status === '3'` | Full order cancelled. Date attributed by item-level `cancel_at` (order-level `cancel_at` is always NULL in API). |
| Item-level | `order_details_table[].food_status === '3'` **within non-cancelled orders only** | Individual items cancelled within non-cancelled orders. Excludes items from order-level cancels to avoid double-counting. |
| Cancel reason | `line.reason_type` → lookup via `/cancellation-reasons` | **Not** `cancel_reason_text` (that's staff notes) |
| Dashboard attribution | **cancel_at** via Option A (separate `created_at` fetch, filter by `cancel_at` in range) | Cancellation tile makes a second API call with `created_at` sort to capture cancelled orders (which have no `collect_bill`). Item-level filters by `line.cancel_at` in date range. |
| Item Sales Cancelled tab | Uses `cancel_at` mode (same logic) | Numbers will differ from Dashboard because: (a) Dashboard counts individual lines, Item Sales groups by food_id; (b) Dashboard item-level excludes cancelled-order items, Item Sales includes all. |
| Double-count guard | Item-level cancels in Dashboard **MUST exclude** items where parent order `f_order_status === '3'` | Owner-confirmed 2026-06-02. Without this, items from cancelled orders are counted in both order-level (via `orderAmount`) and item-level (via `line.price`). |

### 9.5 Customer identification

| Metric | Source | Notes |
|---|---|---|
| Identified customer | `orders_table.user_id` (non-null) | Primary key for grouping |
| Walk-in | `user_id` is null | `cust_mobile` unreliable (string "None" from backend) |
| Repeat | `user_id` appears in >1 order within date range | Within-range repeat, not lifetime |
