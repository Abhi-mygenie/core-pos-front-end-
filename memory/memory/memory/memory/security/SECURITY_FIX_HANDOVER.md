# Security Fix Handover — MyGenie POS Frontend

**Date:** 2026-07-XX  
**Source:** Security Audit Report (`SECURITY_AUDIT_REPORT.md`)  
**Purpose:** Prioritized fix plan for all security findings  
**Code Changes Made:** NONE — this is planning only

---

## Fix Priority Matrix

### Priority 1 — Production Blockers (Must fix before ANY production traffic)

| Finding ID | Title | Owner | Fix Type | Estimated Effort |
|---|---|---|---|---|
| SEC-001 | Credentials in repository | Security + DevOps | Credential rotation + git history purge | 2-4 hours |
| SEC-003 | Socket connection unauthenticated | Backend + Frontend | Code change (socket auth) | 1-2 days |
| SEC-002 | CRM API keys in client bundle | Backend + Frontend | Architecture change (proxy) | 2-3 days |

### Priority 2 — Pre-Production (Must confirm/fix before production)

| Finding ID | Title | Owner | Fix Type | Estimated Effort |
|---|---|---|---|---|
| SEC-007 | Production diagnostic logging | Frontend | Code removal | 2-4 hours |
| SEC-004 | Payment amount frontend manipulation | Backend (confirm) | Backend validation | Confirmation only, or 1-2 days if not implemented |
| SEC-008 | Frontend-only permission checks | Backend (confirm) | Backend enforcement | Confirmation only, or 2-3 days if not implemented |
| SEC-011 | Hardcoded mock coupons | Frontend + Backend | Code removal + backend validation | 1 hour (FE) + confirmation (BE) |

### Priority 3 — Deployment Configuration

| Finding ID | Title | Owner | Fix Type | Estimated Effort |
|---|---|---|---|---|
| SEC-006 | .env in git history | DevOps | Git history purge | 1-2 hours |
| SEC-016 | Source maps in production | DevOps | Build config | 30 min |
| SEC-018 | Security headers missing | DevOps | Reverse proxy config | 1-2 hours |

### Priority 4 — Hardening (Post-launch acceptable)

| Finding ID | Title | Owner | Fix Type | Estimated Effort |
|---|---|---|---|---|
| SEC-005 | No CSRF protection | Backend | Low risk (Bearer-only mitigates) | Optional |
| SEC-009 | Token in localStorage | Backend + Frontend | Architecture change | 1-2 days if pursued |
| SEC-010 | Debug mode via localStorage | Frontend | Code change | 30 min |
| SEC-012 | Firebase SW URL params | Frontend | Code change | 1 hour |
| SEC-013 | No input validation on financial fields | Frontend + Backend | Code change | 4-8 hours |
| SEC-014 | No rate limiting | Backend + DevOps | Infrastructure | 2-4 hours |
| SEC-017 | No token refresh | Backend + Frontend | Code change | 1-2 days |
| SEC-019 | Logout doesn't invalidate server session | Backend | API + code change | 4-8 hours |
| SEC-020 | Dependency audit | DevOps | CI pipeline | 2-4 hours |

---

## Detailed Fix Instructions

### SEC-001 — Credential Rotation & History Purge

**Immediate (within hours):**
1. Rotate ALL exposed passwords:
   - `owner@welcomeresort.com` — change from `Qplazm@10`
   - `owner@18march.com` — change from `Qplazm@10`
   - `owner@mantri.com` — change from `Qplazm#10`
2. Verify no other service uses these passwords (shared credentials risk)

**Short-term (within days):**
3. Purge git history using BFG Repo Cleaner:
   ```bash
   # Clone a fresh bare repo
   git clone --mirror https://github.com/Abhi-mygenie/core-pos-front-end-.git
   # Run BFG to remove password patterns
   bfg --replace-text passwords.txt core-pos-front-end-.git
   # Force push
   cd core-pos-front-end-.git && git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```
4. Add pre-commit hook (e.g., `git-secrets` or `detect-secrets`) to prevent future commits

**Files to clean:**
- All files in `memory/handover/` containing `Qplazm`
- All files in `memory/change_requests/` containing credentials
- All files in `archived/` containing credentials

**Owner:** Security Team + DevOps  
**QA Required:** Verify no service breaks after password rotation  
**Doc Update Needed:** Yes — remove credentials from all documentation files

---

### SEC-002 — CRM API Key Backend Proxy

**Architecture Change Required:**

Current (INSECURE):
```
Frontend → CRM API (X-API-Key from bundle)
```

Target (SECURE):
```
Frontend → Backend /api/crm/* → CRM API (X-API-Key from server env)
```

**Frontend Changes:**
1. Change `crmAxios.js` to point to `REACT_APP_API_BASE_URL/api/crm/` instead of `REACT_APP_CRM_BASE_URL`
2. Remove `REACT_APP_CRM_API_KEYS` from frontend env
3. Remove `REACT_APP_CRM_BASE_URL` from frontend env
4. Use standard Bearer auth (existing axios interceptor) instead of X-API-Key

**Backend Changes:**
1. Create proxy endpoints: `POST /api/crm/customer-lookup`, `GET /api/crm/customers`, etc.
2. Store CRM API keys server-side (env vars or vault)
3. Resolve correct key from authenticated user's restaurant_id
4. Forward requests to CRM with appropriate X-API-Key
5. Return response to frontend

**Owner:** Backend (primary) + Frontend  
**QA Required:** Full CRM flow regression test  
**Blocks Production:** YES  
**Doc Update Needed:** Yes — update API_USAGE_MAP and architecture docs

---

### SEC-003 — Socket Authentication

**Frontend Change:**
```javascript
// In socketService.js connect():
const connectionOptions = {
  // ... existing options
  auth: {
    token: localStorage.getItem('auth_token'),
  },
};
this.socket = io(SOCKET_CONFIG.URL, connectionOptions);
```

**Backend (Socket Server) Changes:**
1. Add middleware to validate JWT on connection handshake
2. Extract `restaurant_id` from token claims
3. Auto-join the client to only their restaurant's channels
4. Reject connections with invalid/expired tokens
5. Disconnect clients when token expires
6. Validate that clients cannot subscribe to channels outside their restaurant scope

**Owner:** Backend (socket server) + Frontend  
**QA Required:** Socket connectivity test, multi-terminal test, reconnection test  
**Blocks Production:** YES

---

### SEC-007 — Remove Production Logging

**Files to modify:**
1. `src/api/services/reportService.js`:
   - Remove lines 946-968 (`[CR-001 DIAG]` block) — NOT dev-gated
   - Remove lines 973-1022 (`WATCH_ORDER_IDS` + per-order diagnostic) — NOT dev-gated
   - Remove lines 1027-1048 (`[CR-001 G5 DIAG]` block) — NOT dev-gated
   
2. `src/components/order-entry/CollectPaymentPanel.jsx`:
   - Remove line 61 (`[CollectPaymentPanel] Payment Debug` log) — NOT dev-gated

3. `src/api/services/orderService.js`:
   - Remove line 114 (`[SplitOrder] payload` log) — NOT dev-gated
   - Remove line 148 (`[PrintOrder] payload` log) — NOT dev-gated

4. `src/api/crmAxios.js`:
   - Gate line 32 behind `NODE_ENV === 'development'`

5. `src/config/firebase.js`:
   - Gate line 91 (FCM token log) behind `NODE_ENV === 'development'`

**Owner:** Frontend  
**QA Required:** Verify no runtime errors after removal  
**Blocks Production:** Recommended before prod (information disclosure)

---

### SEC-004 — Payment Amount Backend Validation (Confirmation Request)

**Question for Backend Team:**
Does the backend recalculate the following from order items and restaurant settings, or does it trust the frontend values?
- `payment_amount` / `grand_amount`
- `gst_tax` / `vat_tax`
- `service_tax` (service charge)
- `discount_value` / `self_discount` / `coupon_discount`
- `tip_amount`
- `round_up`

**If NOT validated server-side, backend must add:**
1. Recalculate total from order items at time of bill collection
2. Validate discount against allowed discount types/rules for the restaurant
3. Validate service charge matches restaurant settings
4. Reject payment if `payment_amount` < server-calculated total (allow tolerance for rounding)

**Owner:** Backend  
**Blocks Production:** YES if not already validated

---

### SEC-011 — Remove Hardcoded Coupons

**File:** `src/components/order-entry/CollectPaymentPanel.jsx` (lines 418-421)

**Change:**
```javascript
// REMOVE this:
const generalCoupons = [
  { code: "FLAT50", description: "₹50 off", discount: 50, minOrder: 500, type: "flat" },
  { code: "SAVE10", description: "10% off (max ₹100)", discount: 10, type: "percent", maxDiscount: 100 },
];

// REPLACE with:
const generalCoupons = []; // Coupons must come from validated API source only
```

**Owner:** Frontend  
**QA Required:** Verify coupon flow still works with customer-level coupons

---

## Risk If Not Fixed (Pre-Production)

| Finding | Risk If Unfixed |
|---|---|
| SEC-001 | Active credential exposure; any repo contributor/viewer can access restaurant data |
| SEC-002 | Cross-tenant customer data breach via exposed API keys |
| SEC-003 | Real-time surveillance of any restaurant's operations; potential state corruption |
| SEC-004 | Direct financial loss from manipulated payment amounts (if BE doesn't validate) |
| SEC-007 | Business data leakage to any user opening DevTools |
| SEC-008 | Privilege escalation from low-privilege to high-privilege operations (if BE doesn't enforce) |

---

## Validation Requirements

| Fix | Validation Method |
|---|---|
| SEC-001 | Attempt login with old credentials (must fail) |
| SEC-002 | Inspect production bundle for CRM keys (must not exist) |
| SEC-003 | Attempt unauthenticated socket connection (must be rejected) |
| SEC-004 | Send manipulated payment amount via Postman (must be rejected) |
| SEC-007 | Open DevTools on production site (no diagnostic logs visible) |
| SEC-008 | Call owner-only endpoint with waiter token (must return 403) |

---

## Documentation Updates Required

The following baseline documents need updating after fixes are applied:

1. **ARCHITECTURE_DECISIONS_FINAL.md** — Add security architecture decisions (socket auth, CRM proxy, token handling)
2. **MODULE_DECISIONS_FINAL.md** — Update Authentication module with server-side invalidation, CRM module with proxy pattern
3. All `memory/handover/` files — Remove credentials (or mark as redacted)
4. New doc: Security practices guide for future developers

**Owner:** Documentation Update Agent (after fixes are implemented)
