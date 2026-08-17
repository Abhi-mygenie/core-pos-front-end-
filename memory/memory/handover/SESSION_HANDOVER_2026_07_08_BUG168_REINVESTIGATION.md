# SESSION HANDOVER — 2026-07-08 — BUG-168 Re-Investigation (Print Subtotal Drift)

**Registry synced:** YES — no code changes this session (investigation only)
**Scope drift:** NONE — investigation only, no code written
**From:** INVESTIGATION agent · **For:** PLANNING / IMPLEMENTATION agent

## 1. One-line state
BUG-168 fully re-investigated. Root cause confirmed: `employee-orders-list` was missing `order_sub_total_amount` → polling destroyed socket data → FE fallback computed wrong values. Backend has now added the missing fields. 4 FE simplifications identified in `buildBillPrintPayload` (manual print path only). 1 owner decision pending (GST/VAT split). No code changes made this session.

## 2. What was done this session

- Full re-investigation of BUG-168 print subtotal issue per owner's direction
- Curl-verified all 3 data sources (socket, list API, single-order API) — complete field comparison
- Identified 3-layer data loss chain (missing API field → polling overwrite → FE fallback)
- Owner shared socket payload confirming socket DOES have `order_sub_total_amount` — corrected earlier wrong assumption
- Git-blamed L1802-1907 — confirmed 88 lines existing (Apr-Jun 2026), 18 lines new (BUG-168 v2)
- Verified backend fix deployed — `employee-orders-list` now returns both fields
- Produced 3 artifacts: Investigation Report, Audit of Wrong FE Computations, Exact Changes Required

## 3. No code changes
This was investigation-only. Zero files modified.

## 4. What needs to happen next

### 4 Must-change locations (all in `orderTransform.js` → `buildBillPrintPayload`):
1. **L1938-1940:** Remove `computedSubtotal` fallback from `finalOrderItemTotal` → use `order.subtotalAmount` only
2. **L1946-1960:** Replace `finalOrderSubtotal` recomputation → use `order.subtotalBeforeTax` only (current code double-counts SC)
3. **L1881-1887:** Replace SC recomputation → use `order.serviceTax` only
4. **L1964-1965:** Tax — derive from backend values (owner decision pending on GST/VAT split)
5. **L1802-1907:** Guard entire computation block behind `if (overrides.orderItemTotal !== undefined)` — only for Collect Bill

### Owner decision pending:
Tax split (Change 6) — backend doesn't provide separate `gst_tax`/`vat_tax` totals. Options A/B/C in report.

### Scope:
- **Affected:** Manual print path only (OrderCard, TableCard, RePrintButton, Reports)
- **Not affected:** Collect Bill flow (uses overrides, untouched)
- **Files:** 1 file only (`orderTransform.js`)
- **Risk:** LOW-MEDIUM

## 5. Artifacts created this session

```
/app/memory/evidence/BUG-168-reinvestigation/
├── INVESTIGATION_REPORT.md              ← Full investigation report
├── AUDIT_WRONG_FE_COMPUTATIONS.md       ← All wrong FE code identified
├── EXACT_CHANGES_REQUIRED.md            ← Precise implementation guide
├── api_list_940285.json                 ← List API response (post backend fix)
├── single_order_940279.json             ← Single order API response
├── socket_940285.json                   ← Socket payload (from owner)
└── running_orders_940279.json           ← List API response (pre backend fix)
```

## 6. Environment at session close
- Frontend: RUNNING on port 3000 (webpack compiled clean)
- Backend: RUNNING on port 8001
- Preprod: `https://preprod.mygenie.online` — reachable, backend fix deployed
- Test credentials: see `/app/memory/control/test_credentials.md` (unchanged)

---

**HANDOVER LINE FOR NEXT AGENT:**
Alpha v0.7 SESSION HANDOVER. Read `/app/memory/evidence/BUG-168-reinvestigation/EXACT_CHANGES_REQUIRED.md` first — it has the precise line-by-line implementation guide. Backend fix is deployed. 4 FE simplifications needed, all in `buildBillPrintPayload` manual print path. Collect Bill path untouched. 1 owner decision pending on tax split (Change 6).
