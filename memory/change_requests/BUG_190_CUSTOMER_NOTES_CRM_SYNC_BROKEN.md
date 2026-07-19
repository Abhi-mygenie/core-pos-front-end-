# BUG-190: Customer Notes Not Syncing with CRM / Historical Notes Not Showing

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete — API verified)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT (related: BUG-106)
**Risk:** MEDIUM
**Severity:** P1
**Classification:** CRM_TOKEN_AUTH_FAILURE + possible WRITE_PATH_MISSING

## Description
Order Notes modal shows "No order-level notes found" for repeat customers despite previous orders having custom notes.

## Investigation Findings

**The CRM READ pipeline is FULLY wired:**
1. Login → `crm_token` stored via `setCrmToken()` in `crmAxios.js`
2. `crmAxios.js` → axios instance at `REACT_APP_CRM_BASE_URL` with `X-API-Key` header
3. `customerIntelService.js` → `POST /pos/customers/order-suggestions` with `crm_customer_id`
4. `customerIntelTransform.js:55-110` → maps `customer_notes[]` with text, usedCount, lastUsedAt, source
5. `useCustomerIntel.js` hook → fetches + transforms + provides to components
6. `OrderNotesModal.jsx` → displays `customerIntel.customerNotes` as "CUSTOMER HISTORY"
7. `ItemNotesModal.jsx` → displays `customerIntel.itemNotesByItemId[item.id]` for item-level notes

**API verification (cafe103):**
```
curl POST https://crm.mygenie.online/api/pos/customers/order-suggestions
X-API-Key: dp_live_K6BLlYxuOXJqhQLlwVu-P9OoUStw_8_EnWHL4lOn95A
Response: {"detail": "Invalid API key"}
```

**Root cause:** The `crm_token` from login is being **rejected by the CRM server**. This means ALL CRM features are broken — not just notes, but customer intelligence, cross-sell, customer value bands, everything.

**Secondary concern:** Even if token auth is fixed, need to verify the WRITE path — does the Laravel backend sync order notes TO the CRM database after order placement/settlement?

## Fix Required
- **CRM TEAM** — fix token authentication (`crm_token` from login should be valid at CRM API)
- **BACKEND TEAM** — verify if Laravel syncs order notes to CRM after order placement
- **Zero FE changes needed** — pipeline is fully wired

## Files
- FE correct: `crmAxios.js`, `customerIntelService.js`, `customerIntelTransform.js`, `useCustomerIntel.js`, `OrderNotesModal.jsx`, `ItemNotesModal.jsx`
