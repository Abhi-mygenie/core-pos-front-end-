# BUG-298 Code Trace Evidence

## File: OrderEntry.jsx
- L789: `toggleItemComplimentary()` function exists
- L1746: `onToggleComplimentary={toggleItemComplimentary}` passed to **CollectPaymentPanel** ONLY
- NOT passed to any cart item row component in pre-place view

## File: CollectPaymentPanel.jsx
### Room Service path (L1832-1843) — room orders only:
```jsx
<input type="checkbox" ... onChange={() => onToggleComplimentary(item.id)} />
```
### DEFAULT path (L2185-2197) — ALL order types:
```jsx
<input
  type="checkbox"
  checked={isComp}
  disabled={isCatalogLocked || !onToggleComplimentary || isCancelled}
  onChange={() => onToggleComplimentary && onToggleComplimentary(item.id)}
  title="Mark as complimentary"  // ← title only, NO visible label
/>
```

## Finding:
- Checkbox IS present in Collect Bill for all order types (DEFAULT path)
- BUT: no visible text label — only `title` tooltip (not visible without hover)
- Owner says 'provision is not there' → UX discoverability issue
- Also: complementary can ONLY be set at Collect Bill (post-place), not pre-place cart view
