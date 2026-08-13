# CR-095 — Waiter-to-Waiter Transfer: Unlock Backend-Blocked Settlement Feature

**ID:** CR-095
**Type:** CR (Feature Unblock)
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH (R6 — touches settlement/money flow)
**Module:** Settlement / Day Closure
**Related:** CR-015 (Settlement Module — CLOSED, transfer was backend-blocked placeholder)
**Duplicate Check:** RELATED to CR-015 (transfer feature was explicitly deferred as backend-blocked)
**Code Reality:** PARTIAL — Transfer modal UI exists in `SettlementPage.jsx:518-560` (button, "To" dropdown, amount input) but ALL inputs are `disabled`, button reads "Transfer (API Pending)", and a yellow warning banner says "Awaiting backend API."
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (endpoint curl-verified 2026-07-22)

---

## Description

The waiter-to-waiter cash transfer feature in the Settlement/Day Closure module was originally shipped as a **backend-blocked placeholder** under CR-015. The backend endpoint is NOW LIVE:

```
POST /api/v1/vendoremployee/waiter/transfer-collection
```

**Curl-verified payload:**
```json
{
  "from_waiter_id": 1478,
  "to_waiter_id": 1481,
  "date": "2026-07-21",
  "transfer_type": "partial",
  "amount": 500,
  "remark": "Waiter left mid shift, table transferred"
}
```

**Curl-verified response (with valid auth, invalid waiter IDs for test restaurant):**
```json
{
  "success": false,
  "message": "Invalid waiter id."
}
```
→ Endpoint IS LIVE. Returns validation error because test waiter IDs (1478/1481) don't belong to cafe103 (waiters: 3061-3092). Will succeed with correct restaurant waiters.

### What Needs to Change

1. **Remove "Backend-Blocked" warning banner** (yellow AlertTriangle box at L533-538)
2. **Enable the "Transfer To" dropdown** (currently `disabled` at L542)
3. **Enable the amount input** (currently `disabled` at L549)
4. **Add transfer type selector** (full/partial — per API contract)
5. **Add remark/reason text input** (per API contract)
6. **Wire the "Transfer" button** to call the new endpoint via `settlementService.js`
7. **Add `transferCollection` function** to `settlementService.js`
8. **Add endpoint constant** to `constants.js` or keep inline in service (BASE + '/transfer-collection')
9. **Handle success/error responses** — toast + refresh settlement data
10. **Remove `cursor-not-allowed` + `opacity-50`** from transfer button

### Existing UI Elements (keep)
- Transfer button per waiter row (L317-319, `data-testid="transfer-btn-${w.waiterId}"`)
- Modal shell (L520, `data-testid="transfer-modal"`)
- "From" waiter display (L528)
- "To" waiter dropdown (L542-547 — just enable it)
- Amount input with ₹ prefix (L549-551 — just enable it)
- Cancel button (L558)

---

## API Contract

| Field | Type | Required | Notes |
|---|---|---|---|
| `from_waiter_id` | int | YES | Source waiter — from `transferModal.waiterId` |
| `to_waiter_id` | int | YES | Destination waiter — from dropdown selection |
| `date` | string | YES | Settlement date (YYYY-MM-DD format) |
| `transfer_type` | string | YES | `"full"` or `"partial"` |
| `amount` | number | YES (if partial) | Amount to transfer — required for partial |
| `remark` | string | NO | Reason/note for transfer |

### Success Response (expected)
```json
{
  "success": true,
  "message": "Collection transferred successfully."
}
```

### Error Responses (verified)
```json
{ "success": false, "message": "Invalid waiter id." }
```

---

## Evidence

- Endpoint verified via curl: `POST https://preprod.mygenie.online/api/v1/vendoremployee/waiter/transfer-collection`
- Auth: Bearer token from `/api/v1/auth/vendoremployee/login` (owner@cafe103.com)
- Waiter IDs for cafe103: 3061 (Manager), 3062 (Captain), 3063 (Owner), 3081-3092 (staff)
- Screenshot: owner-provided reference for transfer modal UI
- Code: `SettlementPage.jsx:518-560` — complete modal shell, inputs disabled

---

## Blast Radius

- ~3 files: `SettlementPage.jsx` (modify modal ~40 lines), `settlementService.js` (+1 function ~8 lines), optionally `constants.js`
- Hotspot: NO (SettlementPage not in R5 list)
- Blast radius: **SMALL** (self-contained modal, no downstream consumers)

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Does `transfer_type: "full"` auto-compute amount or still require `amount` field? | OPEN — needs backend clarification or test |
| 2 | Should the Transfer button remain visible for ALL waiters or only those with balance > 0? | OPEN — owner decision |
| 3 | After successful transfer, should the modal close and refresh data, or show a confirmation? | OPEN — owner decision (recommend: close + refresh + success toast) |

---

## Next
Planning Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan)
