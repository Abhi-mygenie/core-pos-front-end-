# BUG-300 — Customer Name/Phone Search Stops Working After Long Login Session

**ID:** BUG-300  
**Type:** BUG  
**Priority:** P1 — HIGH  
**Risk:** HIGH (CRM data fetch, customer flow, auth/session management)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

After a user has been logged in for a long time, customer name/phone number search stops fetching data. Re-login fixes the problem immediately. This suggests a session token expiry issue (CRM token, not POS token).

**Symptom:** Customer search field — no results, no error visible. Relogin → works again.

## Evidence
- Screenshot: not provided
- Steps to reproduce: Login to POS → wait for extended period (exact duration unknown) → go to Order Entry → search customer by name or phone → no results returned
- Curl output: not yet captured
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner reproduced, relogin fixes it)

## Area
Order Entry → Customer Search / CRM lookup

## Code Reality Check
- `crmAxios.js:17` — `currentCrmToken = sessionStorage.getItem('crm_token') || null`
- `authService.js:26` — `sessionStorage.setItem('crm_token', authData.crmToken)` — set ONCE on login
- `axios.js:47` — on POS 401 logout: `sessionStorage.removeItem('crm_token')` (clears but doesn't refresh)
- **Root cause hypothesis: CRM token is set once on login and stored in `sessionStorage`. If the CRM token has its own expiry (shorter than the POS session), CRM API calls silently fail. No token refresh mechanism exists in `crmAxios.js`.**
- **Code Reality: FULL — CRM auth flow fully implemented. Token refresh is the gap.**

## Duplicate Check
- DISTINCT — no prior bug for CRM token expiry during long session
- RELATED: BUG-098 (CRM token setup), BUG-190 (CRM sync), BUG-123 (POS 401 redirect)

## Blast Radius
- `crmAxios.js` — add token refresh / re-auth interceptor
- `authService.js` — possibly expose re-login CRM token refresh
- ~1-2 files, SMALL blast radius
- Hotspot files: NO

## Severity Rubric
P1 — Customer lookup broken for long-running sessions; staff must restart session to fix

## Risk Classification
- **Risk: HIGH**
- Trigger: Auth/session management, customer data, real-time failure
- Fast Lane eligible: NO (auth flow)

## Open Questions
- OQ-1: What is the CRM token expiry duration? (need to ask backend/CRM team)
- OQ-2: Does the CRM API return a 401 when token expires, or silent failure (empty results)?
- OQ-3: Is there a CRM token refresh endpoint? Or requires full re-login?

## Next Step
INVESTIGATION recommended — curl CRM endpoint with an expired session token to identify error shape, then PLANNING.
