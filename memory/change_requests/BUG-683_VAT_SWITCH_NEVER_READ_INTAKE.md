# BUG-683 — VAT Still Charged When VAT Switch Is OFF (App Never Reads VAT Switch)

**Registered:** 2026-11-18
**Classification:** BUG
**Severity:** P0 — CRITICAL (money: VAT charged even when restaurant has VAT disabled; settlement/reports show wrong amounts)
**Risk:** CRITICAL (tax, billing, settlement — R5+R6)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** nov_cr_batch

---

## Description

GST and VAT are **two separate switches**. When a restaurant has VAT disabled, VAT should be zero in both UI display and API payloads. However, the POS frontend **never reads the VAT switch** from the profile boot API — the field is simply missing from `profileTransform.js`.

**Root cause chain:**
1. The profile API returns `vat_info.status` at the top level (confirmed on Mantri's profile).
2. `profileTransform.js` extracts `gstStatus` from `api.gst_status` (L187) but has **ZERO** VAT equivalent — no `vatStatus`, `vatEnabled`, `vat_info`, or `vat_status` extraction.
3. `restaurant.settings.vatEnabled` is therefore always `undefined`.
4. All consumer sites use `restaurant?.settings?.vatEnabled !== false` — but `undefined !== false` is `true` → **VAT is ALWAYS treated as enabled regardless of the restaurant's actual VAT switch.**
5. `restaurantSettingsTransform.js` L126 does have `vatEnabled: (basic.vat?.status ?? 0) === 1` — but that only populates the **Settings page form**, NOT the profile boot data used by order/payment flows.

**Result:** Every restaurant with VAT-type food items will have VAT computed and sent in API payloads, even if their VAT switch is OFF. The cashier may see correct UI (if the display-side is hidden) but backend receives inflated amounts.

**Owner clarification:** The test payload provided uses GST-type items, so `vat_amount: "0.00"` is expected for those items and proves nothing about VAT handling. A restaurant with VAT-type items and VAT switch OFF would expose the actual financial discrepancy.

---

## Evidence

- **Source:** OWNER-REPORTED (code reading) + AGENT-CONFIRMED (code trace)
- **Confidence:** CONFIRMED (code-traced — zero VAT extraction in profileTransform.js)
- **API field discovered:** Mantri's profile API returns `vat_info.status` (currently `true`) at the top level. This is very likely the missing VAT switch field.
- **Test account:** owner@mantri.com (RID with VAT info available). Credentials on file.
- **Sample payload reference:** restaurant_order_id 001449, RID 675, table 6086. Payload shows `vat_tax: 0` and per-item `vat_amount: "0.00"` — expected because items are GST-type, not VAT-type. Does not disprove the bug.
- **Code evidence:**
  - `profileTransform.js`: 0 references to `vatEnabled`, `vatStatus`, `vat_info`, or `vat_status`
  - `profileTransform.js L187`: `gstStatus: api.gst_status === true` (GST equivalent exists, VAT does NOT)
  - `restaurantSettingsTransform.js L126`: `vatEnabled: (basic.vat?.status ?? 0) === 1` (Settings page only)
  - `OrderEntry.jsx`: 8 sites reference `restaurant?.settings?.vatEnabled` (always undefined)
  - `CartPanel.jsx L434+L455`: reference `restaurant?.settings?.vatEnabled` (always undefined)
  - `CollectPaymentPanel.jsx L337`: NO VAT skip check (GST skip exists at L321)
- **Investigation ref:** `investigations/INV-BUG647-BUG678-REINVESTIGATION-2026-11-18.md` (VAT findings in §2 H1-H3, §3)
- **Steps to reproduce (theoretical — not live-tested):**
  1. Log in to a restaurant with VAT disabled but VAT-type food items configured
  2. Add VAT-type food items to cart
  3. Place order
  4. Inspect network payload → `vat_tax` will be non-zero, per-item `vat_amount` will be non-zero
  5. `order_amount` will include VAT even though restaurant has VAT OFF

---

## Duplicate Check

**RELATED to BUG-647.** DISTINCT bug.

- **BUG-647** ("GST OFF — API Payload Still Sends gst_tax and Inflated order_amount"): Originally filed for GST. VAT issues were discovered during BUG-647 re-investigation (2026-11-18). BUG-647 fixes targeted GST path; VAT path was identified as broken but NOT fixed.
- **BUG-683** covers the **VAT-specific path** that BUG-647 did not address. GST and VAT are separate switches and warrant separate tracking.
- **BUG-336** ("GST Applied on Bills Even When Disabled"): Fixed UI display side only (CPP L287). No VAT coverage.

Record: `Duplicate check: RELATED to BUG-647 (GST path). DISTINCT for VAT path.`

---

## Blast Radius

- **Files affected:** 5 files, ~15 reference sites
- **Hotspot files touched:** YES — OrderEntry.jsx (R5), CartPanel.jsx, CollectPaymentPanel.jsx (R5), orderTransform.js (R5)
- **Estimated scope:** LARGE (5 files)

| # | File | References | What's Wrong |
|---|------|-----------|-------------|
| 1 | `src/api/transforms/profileTransform.js` | L187 area (tax block) | Missing: no `vatStatus` extraction from `vat_info.status` |
| 2 | `src/components/order-entry/OrderEntry.jsx` | L1152, L1167, L1339, L1402, L1736, L1886, L2515, L2619 | 8 sites use `restaurant?.settings?.vatEnabled` — always undefined → always true |
| 3 | `src/components/order-entry/CartPanel.jsx` | L434, L455 | Uses `restaurant?.settings?.vatEnabled` — always undefined |
| 4 | `src/components/order-entry/CollectPaymentPanel.jsx` | L337-340 | No VAT skip check (GST skip exists at L321) |
| 5 | `src/api/transforms/orderTransform.js` | L803, L807, L843, L922 | Consumer of `vatEnabled` from taxFlags — correct code, but receives broken input |

---

## Classification

- **Bug type:** CODE_ERROR (profileTransform never extracts VAT switch from API)
- **Risk:** CRITICAL
- **Area:** Payments / Coupons / Credit
- **Client:** ALL (Mantri is evidence source; affects all restaurants with VAT-type items)
- **Assignee:** Abhishek (FE code error, not backend-blocked)
- **Routing reason:** FE code error in profileTransform + consumer sites, not blocked at backend
- **Fast Lane eligible:** NO (5 files, R5 hotspots, financial/tax logic)

---

## Proposed Fix Outline (for Planning agent)

**Fix A — profileTransform.js:** Add VAT status to the tax block:
```javascript
vatStatus: api.vat_info?.status === true || api.vat_info?.status === 1,
```
(Exact field TBD — probe Mantri profile API for `vat_info.status` shape)

**Fix B — OrderEntry.jsx (8 sites) + CartPanel.jsx (2 sites):** Change property path:
```javascript
// FROM: restaurant?.settings?.vatEnabled !== false
// TO:   restaurant?.tax?.vatStatus !== false
```

**Fix C — CollectPaymentPanel.jsx L337:** Add VAT skip check mirroring GST L321:
```javascript
if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return;
```

---

## Open Questions

| # | Question | Impact |
|---|----------|--------|
| OD-683-01 | What is the exact shape of `vat_info.status` in the profile API? Is it boolean, integer (0/1), or string? Need curl probe on Mantri. | Determines Fix A transform logic. |
| OD-683-02 | Are there restaurants with VAT-type items AND VAT switch OFF in preprod? Needed for live testing. | Determines test coverage. |

---

## Registry Entry

```json
{
  "id": "BUG-683",
  "type": "BUG",
  "title": "VAT Still Charged When VAT Switch Is OFF (App Never Reads VAT Switch)",
  "priority": "P0",
  "risk": "CRITICAL",
  "status": "GATE_1_INTAKE_COMPLETE 2026-11-18",
  "sprint_key": "nov_cr_batch",
  "area": "Payments / Coupons / Credit",
  "assignee": "Abhishek",
  "client": "ALL",
  "intake_doc": "change_requests/BUG-683_VAT_SWITCH_NEVER_READ_INTAKE.md",
  "files": "profileTransform.js, OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, orderTransform.js",
  "related": ["BUG-647", "BUG-336"]
}
```
