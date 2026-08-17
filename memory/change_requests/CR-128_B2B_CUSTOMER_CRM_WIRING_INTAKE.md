# CR-128 — B2B Customer CRM Wiring (Read + Write + Auto-Populate)

**ID:** CR-128
**Type:** CR
**Created:** 2026-08-04
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Customer Transform, Customer Service, RoomCheckInModal, CollectPaymentPanel
**Duplicate Check:** RELATED — CR-116 (B2B GST Capture in Collect Bill print, QA PASS), BUG-065 (Corporate Room Check-in, CLOSED), BUG-281 (custGST forwarding, QA PASS). DISTINCT scope: none wire B2B data **to CRM**.
**Code Reality:** NONE — `customerTransform.js` does not parse B2B fields from CRM; `toAPI.updateCustomer` does not send B2B fields to CRM.
**Source:** OWNER-REPORTED (with CRM API contract v2 FINAL)
**Confidence:** CONFIRMED (CRM endpoints validated live on `preprod-crm-deploy.preview.emergentagent.com`)
**Blast Radius:** MEDIUM (~4-5 files, ~60-100 lines)

---

## Description

CRM v2 contract (CR-071/CR-072 CRM-side) is live and validated. POS FE needs to:

1. **Read B2B fields** from CRM `customer-lookup` response (`customer_type`, `gst_name`, `gst_number`, `is_b2b`, `documents`)
2. **Write B2B fields** to CRM via `updateCustomer()` when Corporate check-in happens
3. **Auto-populate** B2B fields from CRM lookup into RoomCheckInModal and OrderEntry forms
4. **Auto-silent CRM sync** on Corporate room check-in (no user prompt)

Document capture (CR-072 CRM doc upload/retrieve) is tracked as a **separate CR** (owner decision Q7=B).

Order-flow GST wiring to CRM is **backend responsibility** — backend pulls from customer record (owner decision Q6=B, pending recheck).

## CRM Contract Validation Summary

All CRM endpoints validated live on `preprod-crm-deploy.preview.emergentagent.com`:

| Endpoint | Status | Notes |
|----------|:---:|-------|
| `POST /pos/customer-lookup` — B2B fields in response | ✅ | `customer_type`, `gst_name`, `gst_number`, `is_b2b`, `documents` all present |
| `PUT /pos/customers/{id}` — accepts `is_b2b`, `gst_name`, `gst_number` | ✅ | Fields persist + `customer_type` auto-derives to `"corporate"` |
| `GET /pos/customers?search=` — B2B fields in search | ✅ | `customer_type`, `is_b2b`, `gst_name`, `gst_number` present |
| `POST /pos/customers/{id}/documents` — upload | ✅ | Separate CR |
| `GET /pos/customers/{id}/documents` — retrieve | ✅ | Separate CR |

## Owner Decisions (Locked)

| # | Question | Decision | Date |
|---|----------|----------|------|
| Q5 | Room check-in Corporate → CRM update: auto or explicit? | **A — Auto-silent** | 2026-08-04 |
| Q6 | FE pass `gst_name`/`gst_number` in order payload? | **B — Backend pulls from customer record** (pending recheck) | 2026-08-04 |
| Q7 | Doc capture — same CR or separate? | **B — Separate CR** | 2026-08-04 |
| Q8 | Auto-populate B2B fields from CRM lookup? | **A — Auto-populate** | 2026-08-04 |
| Q9 | Doc update for field mapping? | **B — Not needed** | 2026-08-04 |

## Gap Breakdown (POS FE Changes)

| # | Gap | Files | Description |
|---|-----|-------|-------------|
| G1 | **Read B2B from CRM** | `customerTransform.js` | Parse `customer_type`, `gst_name`, `gst_number`, `is_b2b` from `customerLookup` + `searchResult` responses |
| G2 | **Write B2B to CRM** | `customerTransform.js` | Add `gst_name`, `gst_number`, `is_b2b` to `toAPI.updateCustomer()` |
| G3 | **Room Check-In → CRM sync** | `RoomCheckInModal.jsx` + `customerService.js` | When `bookingFor === 'Corporate'`, call CRM `updateCustomer` with `is_b2b: true` + `gst_name: firmName` + `gst_number: firmGst` (auto-silent) |
| G4 | **Auto-populate from CRM lookup** | `RoomCheckInModal.jsx` | When customer lookup returns `is_b2b: true`, pre-fill `bookingFor → "Corporate"` + `firmName → gst_name` + `firmGst → gst_number` |

## Evidence

- CRM Contract: `CR_071_CR_072_POS_API_CONTRACT_v2_FINAL.md` (uploaded by owner)
- Live validation: 12 curl probes on `preprod-crm-deploy.preview.emergentagent.com` — all PASS
- Code: `customerTransform.js` — `fromAPI.customerLookup` missing B2B fields, `toAPI.updateCustomer` missing B2B fields
- Code: `RoomCheckInModal.jsx:593-607` — CRM lookup/create exists, no B2B sync

## Scope

**Files WILL change:**
- `customerTransform.js` — G1 (read) + G2 (write)
- `RoomCheckInModal.jsx` — G3 (CRM sync) + G4 (auto-populate)

**Files WILL NOT touch:**
- `orderTransform.js` (Q6=B, backend handles)
- `CollectPaymentPanel.jsx` (CR-116 already handles print GST)
- CRM endpoints (already live)
- Document upload UI (separate CR)

---

```
Intake complete: CR-128
Classification: CR, Severity: P1, Risk: HIGH
Duplicate check: RELATED (CR-116, BUG-065, BUG-281) — DISTINCT scope
Evidence: captured (CRM contract validated live — 12 probes all PASS)
Blast radius: MEDIUM (~4 files, ~60-100 lines)
Docs updated: change_requests/CR-128_B2B_CUSTOMER_CRM_WIRING_INTAKE.md
Next: Planning Gate 2
```
