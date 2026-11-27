# CR-479 — International Phone Number Support (POS Frontend)

**ID:** CR-479  **Type:** CR  **Registered:** 2026-10-31  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** CRM contract delivery (CRM CR-124 LIVE on preview, 2026-10-30)
**Related:** CRM CR-124 (backend), CR-085 (canonical phone foundation)

## Description
CRM now accepts international phone numbers with any valid country code (+44 UK, +1 US, +971 UAE, etc.). POS frontend needs to add country code selection UI and send `country_code` on customer create/update and order payloads. Primary use case: hotels serving international guests.

CRM changes are **LIVE on preview** — zero breaking changes. All existing Indian payloads work identically. POS just needs to start sending `country_code` to unlock international support.

## Evidence
- CRM contract: `evidence/CR-124-INTL-PHONE/CRM_TO_POS_CR124_INTL_PHONE_LIVE_2026_10_30.md`
- Source: CRM team delivery
- Confidence: CONFIRMED (contract reviewed, endpoints verified)
- `libphonenumber-js` and `react-phone-number-input` already installed in `package.json`

## Duplicate Check
**DISTINCT.** CR-085 was canonical phone foundation (Indian only). CRM's CR-124 is their side. This is the POS frontend side — no existing CR covers it.

## Code Reality
**PARTIAL:**
- `createCustomer` transform already accepts `countryCode` param and sends `country_code` ✅
- `updateCustomer` transform does NOT send `country_code` ❌
- Order payloads send `cust_mobile` (raw digits only), no `country_code` ❌
- No UI for country code selection in any modal ❌
- `libphonenumber-js` + `react-phone-number-input` installed but unused ❌
- `RoomCheckInModal` hardcodes `+91` prefix ❌

## 6 Gaps Identified

| # | File | Gap | Effort |
|---|---|---|---|
| G1 | `CustomerModal.jsx` | No country code picker UI — user can't enter +44 or select UK | MEDIUM |
| G2 | `customerTransform.js` — `updateCustomer` | Does NOT send `country_code` | LOW (1 line) |
| G3 | `orderTransform.js` — placeOrder/updateOrder/collectBill (4 payloads) | No `country_code` field in order payload. CRM recommends explicit field (Option B) | LOW (4 lines) |
| G4 | `RoomCheckInModal.jsx` L944-959 | Hardcoded `+91`, plain 10-digit input — international guests blocked | MEDIUM |
| G5 | `CheckInPage.jsx` / `CheckInForm.jsx` | Same as G4 — new check-in flow also hardcoded +91 | MEDIUM |
| G6 | Phone validation | No per-country validation — `libphonenumber-js` installed but unused | LOW |

## CRM Contract Alignment

| CRM Route | POS Sends Today | Contract Met? |
|---|---|---|
| `POST /pos/customers` | phone + country_code (if provided) | Partial — transform ready, no UI |
| `PUT /pos/customers/{id}` | phone only | NO — country_code missing |
| `POST /pos/customer-lookup` | phone only | OK — CRM matches on stored digits |
| `POST /pos/orders` (cust_mobile) | Raw digits only | Partial — CRM auto-detects but recommends explicit country_code |
| `GET /pos/customers/search` | Search query | OK |

## CRM Recommendation (from contract §6)
- Send `country_code` as a separate field on create and update
- For orders: **Option B preferred** — explicit `country_code` field rather than E.164 prefix auto-detection

## Blast Radius
**MEDIUM** — 5-6 files touched across customer modal, PMS check-in, transforms, and order payloads. No financial logic. UI changes are additive (country picker alongside existing phone input).

## Open Decisions
- **OD-479-01:** Country code picker UI — dropdown with flag icons (react-phone-number-input) or simple +XX text input?
- **OD-479-02:** Default country code — `+91` (India) or detect from restaurant settings?
- **OD-479-03:** Phase 1 scope — all 6 gaps, or CustomerModal + RoomCheckIn first (hotel priority)?
- **OD-479-04:** Validation strictness — use libphonenumber full validation or just digit-count per CRM rules (India: 10 digits, international: 6-15)?

---

## Owner Decisions (LOCKED 2026-10-31)

| OD | Question | Answer |
|---|---|---|
| **OD-479-01** | Country code picker UI style | **A — Flag dropdown with search** (react-phone-number-input) |
| **OD-479-02** | Default country code | **A — Always +91 (India)** for all restaurants |
| **OD-479-03** | Phase 1 scope | **A — All 6 gaps at once** (CustomerModal + RoomCheckIn + CheckInPage + transforms + order payloads + validation) |
| **OD-479-04** | Validation strictness | **B — Simple CRM rules** (India: 10 digits starts 6-9, International: 6-15 digits) |
