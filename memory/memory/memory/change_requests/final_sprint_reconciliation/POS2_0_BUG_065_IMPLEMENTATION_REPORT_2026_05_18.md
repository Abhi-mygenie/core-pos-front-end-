# POS2.0 Wave 7+ — BUG-065 Implementation Report — 2026-05-18

## 1. Status
**COMPLETE** — CRM customer lookup on Room Check-In + Order Screen customer data fixes.

---

## 2. What Was Done

### A. RoomCheckInModal — CRM Customer Search (New)
- Added `searchCustomers` integration on **both name (2+ chars) and phone (3+ digits)** fields
- Dropdown suggestions appear below each field — same pattern as CartPanel in OrderEntry
- Selecting a customer auto-fills name + phone + email
- `isCustomerSelected` tracking prevents re-searching after selection
- Outside-click closes dropdowns

**File:** `RoomCheckInModal.jsx`

### B. OrderEntry — Customer Data for Room Orders (Fix)
- **Phone strip**: `+917505242126` → `7505242126` (stripped `+91` prefix for CartPanel CRM compatibility)
- **Name fallback**: Uses `orderData.roomInfo.guestName` when `customerName` is empty (backend stores check-in name in room_info, not in user object)

**File:** `OrderEntry.jsx` (L292-308, L335-345)

### C. CartPanel — Pre-populated Customer Handling (Fix)
- **Dropdown suppression**: `isCustomerSelected` now set to `true` when both name + phone are present (not just when CRM `id` exists). Prevents auto-search dropdown on Order Screen open.
- **Read-only for rooms**: Name + phone fields are `readOnly` with grey background when `isRoom === true`. Guest data locked to check-in entry.

**File:** `CartPanel.jsx` (L345, L490-505, L534-550)

### D. RoomCheckInModal — Phone format on CRM select
- Sets raw 10-digit number (no `+91` prefix) — PhoneInput with `defaultCountry="IN"` handles display

---

## 3. Backend Action Items (Next Phase)

1. **CRM customer_id on room orders**: During check-in, if CRM match found, send `customer_id` to backend → store on room order → OrderEntry gets proper CRM `id` back (eliminates need for FE `isCustomerSelected` workaround)
2. **CRM duplicate entries**: Same phone number appearing multiple times in search results — CRM API dedup issue
3. **Phone format contract**: Clarify whether backend expects phone with or without `+91` prefix from check-in

---

## 4. Files Modified

| File | Change |
|---|---|
| `RoomCheckInModal.jsx` | CRM search on name + phone fields with dropdown |
| `OrderEntry.jsx` | Strip `+91` from phone; `roomInfo.guestName` fallback for name |
| `CartPanel.jsx` | `isCustomerSelected` for pre-populated data; read-only fields for room orders |

---

*— End of BUG-065 Implementation Report — 2026-05-18 —*
