# BUG-299 Code Trace Evidence

## File: CartPanel.jsx
- grep for 'complementary': 0 results
- grep for 'isComplementaryRuntime': 0 results
- grep for 'comp': 0 results

## Confirmed: CartPanel has ZERO complementary support.

## Compare: OrderEntry.jsx (dine-in)
- Has `toggleItemComplimentary()` at L789
- Has `onToggleComplimentary` prop drilling to CollectPaymentPanel
- CollectPaymentPanel handles rendering the checkbox

## QSR path:
- Uses CartPanel.jsx (separate code path from dine-in)
- QSR billing section in CartPanel → no comp flag passed to orderTransform QSR path
- `orderTransform.js` QSR place-order path does not check `isComplementaryRuntime`
