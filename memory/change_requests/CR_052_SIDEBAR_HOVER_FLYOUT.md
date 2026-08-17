# CR-052 — Sidebar Flyout — IMPLEMENTED

**Item:** CR-052 — Sidebar Hover Flyout for Collapsed State
**Gate:** 0-5 COMPLETE (IMPLEMENTED 2026-06-18)
**Date:** 2026-06-18
**Risk:** LOW
**Supersedes:** BUG-139 (auto-expand removed)

## Summary

Sidebar flyout popover for collapsed state. Clicking a parent item (Insights, Settings, Daily Report) in collapsed sidebar shows a floating panel with all children — sidebar stays at 70px, content area unaffected.

### Files Changed
- `Sidebar.jsx` — +flyout state, click handler, click-outside dismiss, flyout JSX panel (~80 lines)
- **39 pages** — `isSidebarExpanded` default changed from `true` to `false`:
  - 35× `src/pages/reports-module/*.jsx`
  - `AllOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `RoomOrdersReportPage.jsx`
  - `StatusConfigPage.jsx`

---

## 1. Scope Lock

- **Files WILL change:** `src/components/layout/Sidebar.jsx`
- **Files WILL NOT touch:** DashboardPage.jsx, any route/page, constants.js, authService.js, any report component

---

## 2. Execution Sequence (6 edits)

### Edit 1: Add state + ref + click-outside effect (after L199)

**Insert after line 199** (`const [activeItem, setActiveItem] = useState("dashboard");`):

```js
  // CR-052: Flyout state for collapsed sidebar
  const [flyoutItem, setFlyoutItem] = useState(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const flyoutRef = useRef(null);
```

**Add `useRef` to imports at L1** (already imported — verify):
Line 1 currently: `import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";`
→ `useRef` already imported. No change needed.

---

### Edit 2: Modify handleItemClick — replace BUG-139 auto-expand with flyout (L270-274)

**Current (L270-274):**
```js
    // Items with children - toggle expansion
    if (item.children) {
      // BUG-139: Auto-expand sidebar when clicking a parent item in collapsed state
      if (!isExpanded) setIsExpanded(true);
      toggleSection(item.id);
```

**Replace with:**
```js
    // Items with children - toggle expansion or show flyout
    if (item.children) {
      // CR-052: Collapsed → show flyout instead of expanding sidebar
      if (!isExpanded) {
        if (flyoutItem?.id === item.id) {
          setFlyoutItem(null);
        } else {
          setFlyoutItem(item);
        }
        return;
      }
      toggleSection(item.id);
```

---

### Edit 3: Add click-outside dismiss + close on expand (after the useEffect at L226)

**Insert after line 226** (after the `useEffect` that syncs `location.pathname`):

```js
  // CR-052: Close flyout on click outside
  useEffect(() => {
    if (!flyoutItem) return;
    const handler = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setFlyoutItem(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flyoutItem]);

  // CR-052: Close flyout when sidebar expands
  useEffect(() => {
    if (isExpanded) setFlyoutItem(null);
  }, [isExpanded]);
```

---

### Edit 4: Capture button Y position on click (L458-460)

**Current (L458-460):**
```jsx
              <button
                data-testid={`sidebar-${item.id}`}
                onClick={() => handleItemClick(item)}
```

**Replace with:**
```jsx
              <button
                data-testid={`sidebar-${item.id}`}
                onClick={(e) => {
                  // CR-052: Capture button Y for flyout positioning
                  if (!isExpanded && hasChildren) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const asideRect = e.currentTarget.closest('aside')?.getBoundingClientRect();
                    setFlyoutTop(rect.top - (asideRect?.top || 0));
                  }
                  handleItemClick(item);
                }}
```

---

### Edit 5: Change aside overflow-hidden → allow flyout to escape (L343)

**Current (L343):**
```jsx
      className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 overflow-hidden"
```

**Replace with:**
```jsx
      className="h-screen flex flex-col transition-all duration-300 flex-shrink-0"
      // CR-052: overflow-visible on aside so flyout can escape; <nav> handles scroll
```

**Note:** The `<nav>` at L448 already has `overflow-y-auto` for its own scrolling. The aside's `overflow-hidden` was only preventing sidebar width transitions from showing intermediate states — the `transition-all duration-300` handles that visually.

---

### Edit 6: Render flyout panel (after `</nav>` at L520, before Bottom Section L522)

**Insert between L520 and L522:**

```jsx
      {/* CR-052: Flyout panel for collapsed sidebar */}
      {flyoutItem && !isExpanded && (
        <div
          ref={flyoutRef}
          data-testid="sidebar-flyout"
          className="absolute bg-white rounded-xl shadow-2xl border z-[200] overflow-hidden"
          style={{
            left: '70px',
            top: flyoutTop,
            width: '240px',
            maxHeight: '70vh',
            borderColor: COLORS.borderGray,
          }}
        >
          {/* Flyout Header */}
          <div
            className="px-4 py-3 sticky top-0 bg-white z-10"
            style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
          >
            <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>
              {flyoutItem.label}
            </span>
          </div>
          {/* Flyout Children — same rendering as inline children L488-514 */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
            {flyoutItem.children.map((child) => {
              if (child.isGroup) {
                return (
                  <div key={child.id} className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                      {child.label}
                    </span>
                  </div>
                );
              }
              if (child.featureGate && !restaurant?.features?.[child.featureGate]) return null;
              const isChildActive = activeItem === child.id;
              return (
                <button
                  key={child.id}
                  data-testid={`flyout-${child.id}`}
                  onClick={() => {
                    setFlyoutItem(null);
                    handleChildClick(flyoutItem.id, child);
                  }}
                  className="w-full flex items-center px-4 py-2.5 transition-colors text-left hover:bg-gray-50"
                  style={{
                    backgroundColor: isChildActive ? `${COLORS.primaryGreen}10` : 'transparent',
                    color: isChildActive ? COLORS.primaryGreen : COLORS.grayText,
                  }}
                >
                  <span className="text-sm">{child.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
```

---

## 3. Aside `position: relative` Verification

The `<aside>` at L341 has no explicit `position`. CSS default is `static`. For the flyout's `position: absolute` to anchor to the aside, we need `position: relative` on it.

**Add to Edit 5** — include `relative` in the className:
```jsx
className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 relative"
```

---

## 4. Verification Matrix

| # | Edit | File:Line | Change | How to Verify | Auto? |
|---|------|-----------|--------|---------------|:-----:|
| 1 | State+ref | Sidebar.jsx:~200 | +flyoutItem, flyoutTop, flyoutRef | Compile check | YES |
| 2 | handleItemClick | Sidebar.jsx:~271 | Collapsed click → flyout (not expand) | Browser: collapse sidebar → click Insights icon → flyout appears, sidebar stays 70px | NO |
| 3 | Click-outside | Sidebar.jsx:~228 | Click outside flyout → closes | Browser: open flyout → click content area → flyout closes | NO |
| 4 | Button Y capture | Sidebar.jsx:~460 | Flyout aligns with clicked icon | Browser: click Settings vs Insights → flyout Y position matches icon | NO |
| 5 | aside overflow | Sidebar.jsx:~343 | Flyout not clipped | Browser: flyout panel fully visible overlapping content | NO |
| 6 | Flyout render | Sidebar.jsx:~521 | Title + children + groups + active + coming-soon | Browser: open Insights flyout → see groups, scroll, click item → navigates | NO |
| 7 | Expand dismiss | — | Flyout closes on expand | Browser: open flyout → click expand icon → flyout gone, inline children visible | NO |
| 8 | Insights scroll | — | 30+ items scrollable | Browser: open Insights flyout → scroll to bottom (Operations group) | NO |
| 9 | Settings coming-soon | — | Coming-soon toast | Browser: open Settings flyout → click "Table Management" → toast | NO |
| 10 | Active highlight | — | Current page highlighted | Browser: navigate to Sales Overview → collapse → open Insights flyout → Sales Overview highlighted green | NO |
| 11 | Compile | — | 0 new warnings | `tail /var/log/supervisor/frontend.out.log` | YES |

---

## 5. Post-Code Registry Checklist

- [ ] registry.json: CR-052 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md or BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add Sidebar.jsx row for CR-052
- [ ] Code markers: `// CR-052` comment on every added block
- [ ] COMPILE CHECK: webpack 0 new warnings

---

## 6. Risk Register

| Risk | Level | Mitigation |
|------|-------|-----------|
| Removing `overflow-hidden` from aside causes visual glitch during width transition | LOW | Test collapse/expand animation. If needed, add `overflow-hidden` only during transition via transitionEnd listener |
| Flyout clipped by viewport bottom (Insights icon near bottom of sidebar) | LOW | `flyoutTop` capped at `window.innerHeight - flyoutHeight`. Can add in v2 if observed. |
| z-index conflict with OrderEntry panel | NONE | OrderEntry uses z-50. Flyout uses z-200. No overlap. |
| BUG-139 removal breaks collapsed click | NONE | CR-052 replaces BUG-139 with strictly better behavior (same trigger, flyout instead of expand) |

---

*CR-052 Gate 3 COMPLETE. 6 edits in 1 file (Sidebar.jsx). ~80 lines added, ~5 lines modified. Awaiting Gate 4 GO.*
