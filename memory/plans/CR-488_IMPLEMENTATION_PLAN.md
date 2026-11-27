# CR-488 — Implementation Plan
## Credit Management — Print Bill button in OrderDetailSheet header

**ID:** CR-488
**Gate:** 3 — Implementation Plan
**Date:** 2026-11-05
**IA doc:** `impact/CR-488_IMPACT_ANALYSIS.md`
**Risk:** HIGH
**Code Reality:** NONE
**Mockup:** `/cr488-reprint-placement-mockup.html`

---

## Scope Lock

**Files WILL change:** `src/components/reports/OrderDetailSheet.jsx` (1 file)
**Files WILL NOT touch:** `orderTransform.js` (R5), `orderService.js`, `CreditCustomerDetailSheet.jsx`, `CreditManagementPage.jsx`, `reportService.js`, `constants.js`, `AllOrdersReportPage.jsx`, `OrderLedgerMockup.jsx`, `FoodCourtMockup.jsx`

---

## Edits

All edits in **`src/components/reports/OrderDetailSheet.jsx`** (913 lines at HEAD).

### E-1: Add imports (L4, L6-9, L11)

**Current (L4):**
```js
import { useState, useEffect } from 'react';
```

**New (L4):**
```js
import { useState, useEffect, useCallback } from 'react';
```

**Current (L6-9):**
```js
import { 
  X, User, Phone, MapPin, Clock, CreditCard, 
  AlertTriangle, Bike, ChefHat, CheckCircle2,
  Circle, Utensils
} from 'lucide-react';
```

**New (L6-9):**
```js
import { 
  X, User, Phone, MapPin, Clock, CreditCard, 
  AlertTriangle, Bike, ChefHat, CheckCircle2,
  Circle, Utensils, Printer, Loader2
} from 'lucide-react';
```

**After L11** (`import { getSingleOrderNew } from ...`), add:
```js
// CR-488: Reprint bill via Printer Agent
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../api/constants';
import { fromAPI as orderFromAPI } from '../../api/transforms/orderTransform';
import { printOrder } from '../../api/services/orderService';
import { useRestaurant } from '../../contexts';
```

---

### E-2: Add state + handler (after L479)

**Current (L475-479):**
```js
const OrderDetailSheet = ({ isOpen, onClose, order, tabId }) => {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
```

**After L479** (after `const [error, setError] = useState(null);`), insert:

```js
  // CR-488: Reprint bill
  const [isPrinting, setIsPrinting] = useState(false);
  const { printerAgents } = useRestaurant();

  // CR-488: Print bill handler — mirrors OrderReportBetaPage.handleReprint (L329-361)
  const handlePrintBill = useCallback(async () => {
    const orderId = order?.id;
    if (!orderId || isPrinting) return;
    setIsPrinting(true);
    try {
      const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: orderId });
      const ordersArr = response?.data?.orders;
      const raw =
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
        response?.data?.order_details_order ||
        (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
        (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
        response?.data || null;
      if (!raw || Array.isArray(raw)) return;
      const transformed = orderFromAPI.order(raw);
      if (!transformed?.rawOrderDetails?.length) return;
      await printOrder(orderId, 'bill', null, transformed, 0, {}, printerAgents || []);
    } catch (err) {
      console.error('[CR-488] Print bill failed:', err);
    } finally {
      setIsPrinting(false);
    }
  }, [order?.id, isPrinting, printerAgents]);
```

**Why this exact code?** It is a direct copy of `OrderReportBetaPage.handleReprint` (L330-361). Same endpoint, same response parsing (including BUG-368 guard for empty arrays), same `orderFromAPI.order()` transform, same `printOrder()` call. Zero deviation from the proven pattern.

---

### E-3: Add Print Bill button in header (L586-592)

**Current (L586-592):**
```jsx
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            data-testid="sheet-close"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
```

**New (replace L586-592):**
```jsx
          <div className="flex items-center gap-2">
            {/* CR-488: Print Bill — header action, left of close */}
            {!isMissing && !isLoading && details && !displayData.isCancelled && !effectiveIsMerged && (
              <button
                onClick={handlePrintBill}
                disabled={isPrinting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="ss3-print-bill-btn"
                title="Print bill via Printer Agent"
              >
                {isPrinting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Printer className="w-3.5 h-3.5" />}
                {isPrinting ? 'Printing...' : 'Print Bill'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="sheet-close"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
```

**Visibility conditions:**
- `!isMissing` — no button for missing/not-found orders
- `!isLoading` — no button while fetching details
- `details` — data must be loaded
- `!displayData.isCancelled` — no button for cancelled orders
- `!effectiveIsMerged` — no button for merged orders

**Button style:** Orange outline, matches `OrderReportBetaPage` reprint button (L688-697). Spinner via `Loader2` while printing.

---

## Verification Matrix

| # | Edit | File:Line | How to Verify | Automated? |
|---|---|---|---|---|
| V-1 | E-1 imports | OrderDetailSheet.jsx L4-17 | `grep -n 'useCallback\|Printer\|Loader2\|orderFromAPI\|printOrder\|useRestaurant' OrderDetailSheet.jsx` — all 6 present | YES (grep) |
| V-2 | E-2 handler | OrderDetailSheet.jsx ~L480-509 | `grep -n 'handlePrintBill\|isPrinting\|CR-488' OrderDetailSheet.jsx` — handler exists | YES (grep) |
| V-3 | E-3 button | OrderDetailSheet.jsx ~L586-608 | `grep -n 'ss3-print-bill-btn\|Print Bill' OrderDetailSheet.jsx` — button + testid present | YES (grep) |
| V-4 | Compile | webpack | `tail -5 /var/log/supervisor/frontend.out.log` — "Compiled successfully" or 0 new warnings | YES |
| V-5 | Button visible | Browser — Credit → customer → View → SS3 header | Print Bill button appears next to close button | NO (browser) |
| V-6 | Button hidden (cancelled) | Browser — open a cancelled order in any SS3 consumer | No Print Bill button in header | NO (browser) |
| V-7 | Print fires | Browser — click Print Bill → Network tab → `order-temp-store` POST | Request sent to Printer Agent endpoint | NO (browser) |
| V-8 | Spinner during print | Browser — click Print Bill → button shows "Printing..." with spinner | Disabled + spinner while request in-flight | NO (browser) |
| V-9 | No regression in other SS3 consumers | Browser — Audit report → drill order → SS3 opens normally, button also available | Sheet works as before + button present | NO (browser) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-488 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add src/components/reports/OrderDetailSheet.jsx — CR-488 IMPL date
- [ ] Code markers: // CR-488 comment in OrderDetailSheet.jsx (at least 3: imports, handler, button)
```

---

## Execution Sequence

1. E-1: Add imports (`useCallback`, `Printer`, `Loader2`, `api`, `API_ENDPOINTS`, `orderFromAPI`, `printOrder`, `useRestaurant`)
2. E-2: Add `isPrinting` state + `useRestaurant` destructure + `handlePrintBill` callback
3. E-3: Wrap close button in flex div, add Print Bill button before it
4. Verify: webpack compiles
5. Self-test: V-1 through V-4 (grep + compile)
6. Registry sync: checklist above

**Total changed lines:** ~35 additive lines. Zero deletions except replacing the bare close button with a wrapped `<div>` containing both buttons.
