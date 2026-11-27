# BUG-486 — Sales Excel: "By Payment Method" shows "Other" instead of Dine-In / District labels

**ID:** BUG-486
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Investigation agent (session 2026-10-05)
**Status:** GATE_1_INTAKE — BACKEND-BLOCKED
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Severity:** P2

---

## Description

When downloading the Sales report Excel from `/reports-module/sales` (→ "By Payment Method" tab), payment methods that should appear with specific names (e.g. **Dine-In**, **District**) are instead grouped and shown as **"Other"**. Screenshot confirms: Excel shows `Cash | Other | Partial` with no sub-breakdown.

These specific labels (Dine-In, District) are TAB/credit settlement types where the payment source is a specific order channel. The backend groups all such non-cash/card/UPI methods into a single `"Other"` bucket in the `payments[]` array of the `insights-sales` endpoint.

---

## Duplicate Check

- Registry search: "Other payment", "payment label", "District", "Dine-In payment" — no existing entry
- No prior BUG on `SalesMockup.jsx` touching `analytics.payments` label mapping
- **Duplicate check: DISTINCT**

---

## Code Reality

**NONE** — no label expansion or payment method sub-label mapping exists in the FE.

Live curl probe on `POST /api/v2/vendoremployee/report/insights-sales`:
```json
"payments": [
  {"method": "Cash",    "orders": 22, "revenue": 4055},
  {"method": "Other",   "orders": 1,  "revenue": 260},
  {"method": "Partial", "orders": 1,  "revenue": 0}
]
```

FE data path (SalesMockup.jsx line 186):
```javascript
const payments = (salesData.payments || []).map(p => ({
  method: p.method,  // ← raw API value, no label mapping
  ...
}));
```

The `Other` value comes from the **backend** — the API groups TAB (Dine-In TAB, District, etc.) into a single `"Other"` bucket. The `tab_settlements[]` field exists in the response but is **empty** for this vendor — on the UAT restaurant with Dine-In/District TAB orders, this would be the source of the sub-breakdown.

**Code Reality: NONE** (no FE transform to fix; blocked on backend providing the breakdown)

---

## Severity

**P2 — MEDIUM**
- Report download is functional but the "By Payment Method" tab shows misleading aggregated labels
- Cashier/owner cannot see actual split by TAB channel in the export
- Workaround: none (label comes directly from API)
- Affects reporting accuracy, not live order flow

---

## Risk Classification

**MEDIUM** — reporting display
- No API write, no financial mutation, no order flow change
- Backend change required first; FE change secondary (label expansion from `tab_settlements`)
- Files: `SalesMockup.jsx` (FE secondary), `insights-sales` endpoint (backend primary)

---

## Evidence

- Screenshot: provided by owner — Excel "By Payment Method" tab shows Cash/Other/Partial
- Investigation report: `investigations/INV_DASHBOARD_DOWNLOAD_PAYMENT_LABELS_2026_10_05.md`
- Curl probe confirmed: `insights-sales` returns `method: "Other"` for all non-Cash/Partial methods
- `tab_settlements[]` is empty on this vendor (no TAB orders); UAT vendor has Dine-In/District TAB orders appearing as "Other"
- Confidence: CONFIRMED (curl-verified API response)

---

## Blast Radius

| Owner | File | Scope |
|-------|------|-------|
| Backend | `insights-sales` + `insights-dashboard` endpoints | Break down `Other` → per-channel sub-methods, OR populate `tab_settlements[]` with per-channel breakdown |
| FE (secondary) | `SalesMockup.jsx` | Add label expansion from `tab_settlements[]` if backend provides it |

- **Blast radius: SMALL (1 FE file, backend-blocked)**

---

## Backend Brief Required

`backend_briefs/BACKEND_BRIEF_BUG486_PAYMENT_METHOD_OTHER_2026_10_05.md`

Ask: expand `payments[]` array in `insights-sales` / `insights-dashboard` to show per-channel breakdown for TAB/credit methods (Dine-In TAB, District, etc.) instead of grouping as `"Other"`. Alternatively, populate `tab_settlements[]` with `{channel, orders, revenue}` rows so FE can merge.

---

## Open Questions

- OD-486-01: Should "Dine-In TAB" and "District TAB" appear as separate rows in the By Payment Method sheet, or as sub-rows under a "TAB" parent?
- OD-486-02: Is the fix purely backend (expand the `payments[]` API response), or should FE also add a `tab_settlements` expansion table as a new sheet?

---

## Next

File backend brief → await backend fix → FE label expansion (secondary) → Planning Gate 2
