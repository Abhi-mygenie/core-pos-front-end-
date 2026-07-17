# POS3.0 Bucket A — BUG-100 Code Diff Preview — 2026-05-18

## 1. Purpose

Exact code-change preview for BUG-100 (duplicate toast removal + toast unification). Owner approved approach A: unify toast position/styling to match FCM banners, then remove confirmed duplicates.

---

## 2. Change 1 — Unify toast position to top (match FCM banners)

### File
`/app/frontend/src/components/ui/toast.jsx`

### Current Code (L10-18)

```jsx
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props} />
))
```

### Proposed Code

```jsx
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px]",
      className
    )}
    {...props} />
))
```

### What changed
- Removed `sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col` — toasts no longer jump to bottom-right on desktop
- Added `right-0` — toasts anchor to top-right on all screen sizes
- Changed `flex-col-reverse` to `flex-col` — newest toast on top (matches banner stacking)
- **Net effect:** Toasts now appear at top-right on all devices, same region as FCM banners

---

## 3. Change 2 — Unify toast slide animation direction

### File
`/app/frontend/src/components/ui/toast.jsx`

### Current Code (L22)

```jsx
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
```

### Proposed Code

```jsx
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
```

### What changed
- Removed `data-[state=open]:sm:slide-in-from-bottom-full` — toasts always slide in from top (matching banner animation direction)

---

## 4. Change 3 — Remove 11 confirmed duplicate success toasts

These success toasts fire after API calls where FCM/socket also notifies. Removing them eliminates the double-notification. All error toasts (`variant: "destructive"`) are kept.

### File: `OrderCard.jsx`

| Line | Current | Action |
|---|---|---|
| L176 | `toast({ title: "KOT request sent", description: ... })` | **REMOVE** |
| L205 | `toast({ title: "Bill request sent", description: ... })` | **REMOVE** |
| L225 | `toast({ title: "Order settled", description: ... })` | **REMOVE** |

### File: `TableCard.jsx`

| Line | Current | Action |
|---|---|---|
| L163-166 | `toast({ title: "KOT request sent", description: ... })` | **REMOVE** |
| L196 | `toast({ title: "Bill request sent", description: ... })` | **REMOVE** |
| L215 | `toast({ title: "Order settled", description: ... })` | **REMOVE** |

### File: `OrderEntry.jsx`

| Line | Current | Action |
|---|---|---|
| L1468 | `toast({ title: "Transferred to Room", description: ... })` | **REMOVE** |
| L1562 | `toast({ title: "Payment Collected", description: ... })` | **REMOVE** |
| L1631 | `toast({ title: "Payment Collected", description: ... })` | **REMOVE** |

### File: `RePrintButton.jsx`

| Line | Current | Action |
|---|---|---|
| L53 | `toast({ title: "KOT request sent", description: ... })` | **REMOVE** |
| L117 | `toast({ title: "Bill request sent", description: ... })` | **REMOVE** |

---

## 5. Toasts KEPT (not removed)

All error/destructive toasts remain:
- `OrderCard.jsx:154` — "No KOT stations" (destructive)
- `OrderCard.jsx:179` — "Failed to send KOT request" (destructive)
- `OrderCard.jsx:208` — "Failed to send Bill request" (destructive)
- `OrderCard.jsx:230` — "Failed to settle order" (destructive)
- `TableCard.jsx:169` — "Failed to send KOT request" (destructive)
- `TableCard.jsx:199` — "Failed to send Bill request" (destructive)
- `TableCard.jsx:220` — "Failed to settle order" (destructive)
- `RePrintButton.jsx:31` — "No KOT stations" (destructive)
- `RePrintButton.jsx:56` — "Failed to send KOT request" (destructive)
- `RePrintButton.jsx:120` — "Failed to send Bill request" (destructive)
- All `OrderEntry.jsx` error/validation toasts — kept
- All other files' toasts — kept (LoginPage, LoadingPage, StatusConfigPage, AllOrdersReportPage, RoomCheckInModal, SplitBillModal, Sidebar, CustomerModal, CategoryList, ProductList, etc.)

---

## 6. Summary

| File | Changes | Lines Removed | Lines Added |
|---|---|---|---|
| `toast.jsx` L14 | Viewport position → top-right always | 0 | 0 (modified in place) |
| `toast.jsx` L22 | Animation → slide-in-from-top only | 0 | 0 (modified in place) |
| `OrderCard.jsx` | Remove 3 success toasts | 3 | 0 |
| `TableCard.jsx` | Remove 3 success toasts | 4 (multi-line) | 0 |
| `OrderEntry.jsx` | Remove 3 success toasts | 3 | 0 |
| `RePrintButton.jsx` | Remove 2 success toasts | 2 | 0 |

**Total: 5 files, ~12 lines removed, 2 lines modified.**

---

*— End of BUG-100 Code Diff Preview —*
