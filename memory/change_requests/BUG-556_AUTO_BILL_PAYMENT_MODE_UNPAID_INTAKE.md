# BUG-556 — Intake (Gate 1)
## Auto Bill: payment mode printed as "Unpaid" even though payment is completed

**ID:** BUG-556
**Type:** BUG
**Date:** 2026-10-16
**Severity:** P1 — HIGH
**Risk:** MEDIUM
**Sprint:** oct_cr_batch
**Area:** Printing / Printer Agent
**Duplicate check:** DISTINCT — BUG-318 is aggregator auto-bill stage options (different). No existing fix for payment_mode on auto-print.
**Source:** OWNER-REPORTED (Gate 6 smoke 2026-10-15)

---

## 1. Description

When **Auto Bill** is configured and triggers automatically on order completion, the printed bill shows the **payment mode as "Unpaid"** even though the customer has paid.

**Owner confirmation:**
- Happens **always** (not intermittent — consistent behaviour)
- Confirmed on **in-house** auto-bill
- Aggregator auto-bill: to be verified during impact analysis

**Root cause hypothesis:** `buildBillPrintPayload()` in `orderTransform.js` is the manual print path. Auto-bill likely calls a variant of this that doesn't pass the resolved `payment_mode` — possibly using a stale order snapshot taken at the moment the order completes, before the payment record is written, OR the auto-print path doesn't call `buildBillPrintPayload()` at all and uses a simpler payload that lacks `payment_mode`.

---

## 2. Code Reality

**PARTIAL** — Auto-bill infrastructure exists:
- `profileTransform.js:373` — `autoBill: toBoolean(apiSettings.billing_auto_bill_print)`
- `printerAgentConfigTransform.js:205` — `autoPrintBill: toBool(ap.auto_print_bill)`
- `orderTransform.js:1643` — `payment_mode: splitPayments?.length > 0 ? 'partial' : method` (in collect-bill path)

The auto-print trigger location and its payload construction need tracing in impact analysis.

---

## 3. Evidence
- **Source:** Owner-reported, Gate 6 smoke test
- **Device:** iPad (owner's device)
- **Confidence:** CONFIRMED (owner reproduced consistently)
- **Screenshot:** Not provided (physical printed bill)

---

## 4. Blast Radius
- **Files suspected:** `orderTransform.js` (auto-bill payload path) · possibly `socketHandlers.js` (auto-bill trigger) · `printerAgentConfigTransform.js`
- **Scope:** MEDIUM (touches print path, financial-adjacent — payment mode display)

---

## 5. Open Decisions
**OD-556-01:** Does the aggregator auto-bill path also show "Unpaid"? → verify during Gate 2 IA
