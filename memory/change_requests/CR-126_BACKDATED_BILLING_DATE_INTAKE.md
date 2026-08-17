# CR-126 — Backdated Billing Date on Order Punch
**Type:** Change Request — New Feature  
**Status:** INTAKE  
**Priority:** P1  
**Risk:** MEDIUM  
**Date:** 2026-08-02  
**Raised by:** Owner

---

## Problem Statement

When punching an order, staff should be able to set a custom **billing date** for that order — including a **past/backdate**. This is driven by a **backend configuration flag** (feature is OFF by default; restaurants that need it get it enabled from the backend).

Use cases cited:
- Owner wants to record a sale that happened yesterday but was entered today
- Late billing / reconciliation scenarios
- Multi-outlet or delayed entry workflows

---

## What Was Said (verbatim)

> "there will be a back-end configuration dynamic date. So basically, while punching the order, user can put the billing date, and it can be backdate."

---

## Scope (As Understood — To Be Confirmed)

| # | Question | Status |
|---|---|---|
| Q1 | Where exactly does the user set the date? On the Place Order screen? Or Collect Bill? | **OPEN** |
| Q2 | Is it a date-only picker (YYYY-MM-DD) or date + time? | **OPEN** |
| Q3 | What is the backend config key that controls feature availability? (e.g. `allow_backdate_billing: true` in restaurant profile) | **OPEN** |
| Q4 | What API field carries the billing date to the backend? (e.g. `billing_date`, `order_date`, `created_at` override?) | **OPEN — backend confirmation needed** |
| Q5 | Is future-dating allowed, or backdate only? | **OPEN** |
| Q6 | Can the date be changed after order is placed (i.e. on Edit Order)? Or only at place time? | **OPEN** |
| Q7 | Should the billing date show anywhere in the UI after it is set? (order card, audit report, print) | **OPEN** |
| Q8 | Is there a max backdate limit? (e.g. 30 days back only) | **OPEN** |

---

## Preliminary Impact Areas (FE — subject to answers above)

| Area | File | Impact |
|---|---|---|
| Place Order form | `OrderEntry.jsx` / `CartPanel.jsx` | Add date picker — conditional on config flag |
| Place Order payload | `orderTransform.js` — `toAPI.placeOrder()` | Add `billing_date` field |
| Update Order payload | `orderTransform.js` — `toAPI.updateOrder()` | May need same field |
| Config flag read | `SettingsContext.jsx` or `restaurantProfile` in `AuthContext` | Read backend config flag |
| Display on OrderCard | `OrderCard.jsx` | Show billing date if set |
| Print payload | `orderTransform.js` — bill print | Pass to backend |

---

## Classification

- **Type:** `FEATURE_REQUEST` — new UI control + payload field, config-gated
- **Risk:** MEDIUM — touches place-order payload (high-traffic path), date handling
- **Backend dependency:** HIGH — needs API field name, config key, and validation contract
- **Fast Lane eligible:** NO — multi-file, requires Impact Analysis + Plan gate

---

## Next Steps

1. Owner confirms answers to Q1–Q8 above
2. Backend team confirms: config key name, API field name, validation rules (max backdate, future-date allowed)
3. Agent runs Impact Analysis (Gate 2)
4. Implementation Plan (Gate 3) → Owner GO → Implementation → QA

---

## Gate Status

```
Gate 0 (Registration)     ✅ CR-126 registered in registry.json
Gate 1 (Intake)           ✅ This document
Gate 2 (Impact Analysis)  ⏳ Blocked on Q1–Q8 + backend contract
Gate 3 (Plan)             ⏳ Not started
Gate 4 (Owner GO)         ⏳ Not started
Gate 5 (Implementation)   ⏳ Not started
Gate 6 (QA)               ⏳ Not started
```
