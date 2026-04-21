## BUG-011 — Scan & Order Confirm Fails with HTTP 500 (Backend BadMethodCallException)

**Module:** Dashboard / Scan & Order / Order Confirmation  
**Status:** Open (Backend bug)  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
Orders placed via Scan & Order should be confirmable from the new POS dashboard using the Accept button. The API call should succeed and the order should transition from `yetToConfirm` to the next status.

### Actual Behavior
When staff clicks Accept on a Scan & Order delivery order, the API returns HTTP 500 with `BadMethodCallException` from Laravel backend: `Method App\Http\Controllers\Api\V2\Vendoremployee\OrderController... not found`. The order remains in `yetToConfirm` status. No user-visible error feedback (only `console.error`).

### Business Impact
- Staff cannot confirm delivery orders from Scan & Order.
- Orders pile up in "Yet to Confirm" status with no way to process them.
- No error toast means staff doesn't even know the action failed.

### Root Cause
Confirmed via runtime: The frontend uses endpoint `waiter-dinein-order-status-update` (`constants.js` line 27) for ALL order types. The backend Laravel `OrderController` has the method for dine-in orders but NOT for delivery/non-dine-in types — hence `BadMethodCallException`. Same endpoint works correctly for dine-in confirm.

### Scope
Dashboard → Yet to Confirm orders (from Scan & Order) → Accept button.

### Dependencies
- **Backend fix required**: Laravel `OrderController` needs the method for non-dine-in order types on `waiter-dinein-order-status-update` endpoint, OR a separate endpoint for Scan & Order confirmation.
- Frontend code path is correct — no frontend fix needed.

### Runtime Evidence (Apr-2026)
- Error: `AxiosError: Request failed with status code 500` at `orderService.js:76:1`
- Backend response: `{"exception": "BadMethodCallException", "file": "/var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Controller.php", "line": 68, "message": "Method App\\Http\\Controllers\\Api\\V2\\Vendoremployee\\OrderController..."}`
- Socket `order-engage` event fires correctly BEFORE the confirm API call fails.

### Reference Docs
- `app/memory/BUG_TEMPLATE.md` (BUG-011 full QA section)

### Candidate Files (frontend — no change needed)
- `frontend/src/pages/DashboardPage.jsx` (`handleConfirmOrder`, lines 892-905)
- `frontend/src/api/services/orderService.js` (`confirmOrder`, lines 74-78)
- `frontend/src/api/constants.js` (`CONFIRM_ORDER`, line 27)
- `frontend/src/components/cards/OrderCard.jsx` (Accept button, lines 592-599)

### Fix Plan
Backend team action required:
1. Add the missing method in `OrderController` for non-dine-in order types.
2. OR provide a separate endpoint for Scan & Order confirmation and update `constants.js`.

### Frontend UX Improvement (optional, deferred)
- Add error toast in `handleConfirmOrder` catch block.
- Add loading/disabled state on Accept button during async call.
