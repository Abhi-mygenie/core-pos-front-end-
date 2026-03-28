# Change Log

> All notable changes to the Core POS Frontend are documented here.
> Format: [Date] [Change ID] [Type] - [Summary]

---

## Change Types
- **FEATURE** - New functionality
- **FIX** - Bug fix
- **REFACTOR** - Code restructure without behavior change
- **STYLE** - UI/UX changes
- **DOCS** - Documentation only
- **CONFIG** - Configuration/environment changes

---

## [2026-03-24]

### CHG-001 | CONFIG | Initial Setup
**Summary:** Cloned Core POS Frontend from GitHub and configured API endpoint

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/.env` | Modified | Added `REACT_APP_API_BASE_URL=https://preprod.mygenie.online` |
| `/app/frontend/package.json` | Replaced | Copied from cloned repo |
| `/app/frontend/src/*` | Replaced | Copied entire src from cloned repo |

**Before:** Default Emergent template
**After:** Core POS Frontend running with preprod API

---

### CHG-002 | STYLE | Transfer Food Modal Redesign
**Summary:** Updated Transfer Food Modal to match Shift/Merge Table modal design

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/TransferFoodModal.jsx` | Modified | Complete rewrite - wider modal, filters, area sections |

**Key Changes:**
- Changed data source from `availableTables` (flat list) to `mockTables` (with areas)
- Added status filter (Occupied, Bill Ready only)
- Added area filter dropdown
- Added grid/list view toggle
- Added collapsible area sections
- Table cards now show: ID, capacity, status dot, order amount
- Kept "Switch Notes" checkbox (unique to food transfer)
- Updated header to "Transfer {item.name} → Select Table"

**Before:** Simple 3x3 grid modal with basic table names
**After:** Unified design matching Shift/Merge modals with filters and area sections

**Related:** Matches `ShiftTableModal.jsx` and `MergeTableModal.jsx` design pattern

---

### CHG-003 | FEATURE | Cancel Food Modal - Quantity Selector
**Summary:** Redesigned Cancel Food Modal with quantity selector for partial cancellation

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/CancelFoodModal.jsx` | Modified | Added qty selector, wider modal, preview text |

**Code Changes:**
```diff
+ const [cancelQty, setCancelQty] = useState(1);
+ const itemQty = item?.qty || 1;
+ const showQtySelector = itemQty > 1;
```

**Key Changes:**
- Wider modal (`max-w-2xl`) matching other modals
- Quantity selector with +/- buttons when `item.qty > 1`
- Footer preview: "Cancelling: X of Y {item.name}"
- Shows remaining quantity if partial cancel
- Red cancel button (more appropriate for destructive action)
- Button disabled until reason selected

**Output Payload Updated:**
```js
{
  item,
  reason,
  notes,
  cancelQuantity: number,    // NEW
  remainingQuantity: number  // NEW
}
```

**Before:** Cancels entire item, no quantity selection
**After:** User can select how many to cancel when qty > 1

---

### CHG-004 | FIX | Customize Link in Cart Panel
**Summary:** Wired up non-functional Customize button in cart panel

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | Modified | Added `onCustomize` prop, wired onClick handler |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Modified | Pass `onCustomize` callback to CartPanel |

**Code Changes:**
```diff
// CartPanel.jsx - NewItemRow component props
- const NewItemRow = ({ item, cartIndex, setCancelItem, updateQuantity, onAddNote }) => (
+ const NewItemRow = ({ item, cartIndex, setCancelItem, updateQuantity, onAddNote, onCustomize }) => (

// CartPanel.jsx - Customize button (Line ~99)
- <button className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" style={{ color: COLORS.primaryGreen }}>Customize</button>
+ <button 
+   onClick={() => onCustomize && onCustomize(item)}
+   className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
+   style={{ color: COLORS.primaryGreen }}
+   data-testid={`customize-btn-${item.id}`}
+ >
+   Customize
+ </button>

// CartPanel.jsx - Component props
+ onCustomize,

// CartPanel.jsx - NewItemRow usage
+ onCustomize={onCustomize}

// OrderEntry.jsx - CartPanel props (Line ~537)
+ onCustomize={(item) => setCustomizationItem(item)}
```

**Before:** "Customize" link in cart panel was non-functional (no onClick)
**After:** Clicking "Customize" opens ItemCustomizationModal for that item

**Behavior Note:** Currently adds new customized item to cart (Option A). Full edit support (Option B - update existing item) deferred to backlog.

---

### CHG-005 | FIX | Browser Back Button - Loading Loop
**Summary:** Fixed issue where browser back button triggered loading screen again

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/app/frontend/src/pages/LoginPage.jsx` | Modified | Redirect authenticated users to `/dashboard` instead of `/loading` |
| `/app/frontend/src/pages/LoadingPage.jsx` | Modified | Use `replace: true` in navigation to dashboard |

**Code Changes:**
```diff
// LoginPage.jsx - Line 28-30 (auth check redirect)
- // If already authenticated, redirect to loading
- if (authService.isAuthenticated()) {
-   navigate("/loading");
- }
+ // If already authenticated, redirect to dashboard directly
+ if (authService.isAuthenticated()) {
+   navigate("/dashboard", { replace: true });
+ }

// LoginPage.jsx - Line 52 (after successful login)
- navigate("/loading");
+ navigate("/loading", { replace: true });

// LoadingPage.jsx - Line 78 (after loading complete)
- navigate("/dashboard");
+ navigate("/dashboard", { replace: true });
```

**Before:** 
- Back from Dashboard → Loading page → Full data reload
- Poor UX, unnecessary API calls

**After:**
- Back button effectively disabled (no history entries to go back to)
- Loading page is transient, not in browser history
- Already authenticated users go directly to Dashboard

**Navigation Flow:**
```
Fresh Login:    Login → Loading → Dashboard (Loading replaced)
Back Button:    Dashboard → (nothing, history empty)
Auth Check:     Login → Dashboard (if already logged in)
```

---

## Template for New Entry

```markdown
### CHG-XXX | TYPE | Short Title
**Summary:** One-line description

**Files Changed:**
| File | Action | Description |
|------|--------|-------------|
| `/path/to/file` | Created/Modified/Deleted | What changed |

**Code Changes:** (if applicable)
\`\`\`diff
- old code
+ new code
\`\`\`

**Before:** Previous behavior
**After:** New behavior

**Related Issues:** (if any)
**Testing:** How to verify the change
```
