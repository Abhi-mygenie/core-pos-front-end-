# BUG-395 — INVESTIGATION REPORT (re-request 2026-09-24): `order-temp-store` must always carry `deliveryCustHouse/Floor/City/State`

```
Role:        AGENT_PROMPT_ALPHA v0.7 Role 6 INVESTIGATION (no code written)
Trigger:     backend request 2026-09-24 (owner forwarded cURL, prod host manage.mygenie.online, Referer pos.mygenie.online, order 1286894 print_type "bill", order_type "delivery")
Ask:         4 keys deliveryCustHouse / deliveryCustFloor / deliveryCustCity / deliveryCustState ALWAYS present; real values for delivery, "" for every other order_type; never omitted
Mapped to:   BUG-395 (registered 2026-09-10 from the backend brief of the same date) — same 4 keys, same rule
Steps used:  7 / 10
Sandbox:     zero mutations. The forwarded cURL was NOT replayed (POST order-temp-store on PRODUCTION with a real order id + live printer agent = mutating). Only read-only GETs of public static assets on pos.mygenie.online.
Credentials: the bearer token in the forwarded cURL was not used or stored.
```

## 1. Summary
- **Root cause / finding:** the requested change **already exists in the codebase and is already live on production.** `toAPI.buildBillPrintPayload` (`frontend/src/api/transforms/orderTransform.js` L2199–2211, marker `BUG-395`) emits all four keys on every **bill** payload — real values when `order.orderType === 'delivery'`, `""` otherwise — exactly the requested rule. The production bundle `pos.mygenie.online/static/js/main.1f7d79fb.js` (fetched 2026-09-24) contains the identical minified code.
- **Residual gap (the only place the keys are absent):** the **KOT payload** and the "bill without order data" fallback (`frontend/src/api/services/orderService.js` `printOrder()` else-branch, L147–164) carry **no `deliveryCust*` keys at all** (not just the 4 new ones — none of the 9). If the backend's "always present in the API payload" means *every* `order-temp-store` call including `print_type: "kot"`, that branch needs the keys. The forwarded sample is `print_type: "bill"`, so this needs one backend/owner answer (§5).
- **Classification:** ALREADY_IMPLEMENTED (bill path) + OWNER_DECISION / BACKEND question (KOT path) · **Confidence: HIGH** (code traced in workspace and confirmed byte-for-byte in the prod bundle).

## 2. Hypotheses tested

| # | Hypothesis | Test method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Keys missing from the FE bill payload (new work) | grep scan + code trace `orderTransform.js` | 1–2 | **ELIMINATED** — 4 keys present since BUG-395 (2026-09-10), pattern identical to `deliveryCustAddress/Pincode/Phone` | `orderTransform.js:2199–2211` |
| H2 | Keys present in code but **not deployed to prod** (backend sees old build) | read-only GET of prod index + main bundle, grep | 5–6 | **ELIMINATED** — prod `main.1f7d79fb.js` contains `deliveryCustHouse/Floor/City/State` with the `"delivery"===e.orderType … \|\| ""` rule | `evidence/BUG-395/prod_bundle_probe_2026_09_24.txt` |
| H3 | A second payload builder omits the keys | code trace `orderService.js printOrder()` + all 17 callers | 3, 7 | **CONFIRMED (partial)** — the KOT / bill-without-orderData else-branch has no `deliveryCust*` keys (workspace and prod bundle). All **bill** callers pass `orderData`, so every bill goes through `buildBillPrintPayload` | `orderService.js:136–164`; callers list §3 |
| H4 | Keys present but **values empty** for delivery on some bill paths | callers + data-source trace | 7 | **NEEDS BACKEND DATA (residual, not a FE defect)** — value source is `overrides.deliveryAddress` (POS live flow, CRM `selectedAddress` → has house/floor/city/state since BUG-395 addendum-2) with fallback `order.deliveryAddress` = raw `api.delivery_address`. Dashboard/report **re-prints** pass `{}` overrides → values come only from the backend's own `delivery_address` object; if that object lacks `house/floor/city/state` the keys are sent as `""` | `OrderEntry.jsx` 1521/1562/1637/1936/2042/2325 (pass `selectedAddress`); `RePrintButton/TableCard/OrderCard/AllOrdersReportPage/OrderReportBetaPage` (pass `{}`) |

## 3. Data-flow trace (bill print)
`OrderEntry` (delivery) `selectedAddress` (CRM `customerTransform.js` L195–203: house/floor/city/state — BUG-395 addendum-2) → `printOrder(id,'bill',null,order,scPct,{…, deliveryAddress: selectedAddress}, agents)` (`OrderEntry.jsx` L1521/1562/1637/1936/2042/2325) → `orderService.printOrder` L139 → `toAPI.buildBillPrintPayload(order, scPct, overrides)` → `orderTransform.js` L2184–2211: `deliveryCust{Name,AddressType,Address,Pincode,Phone,House,Floor,City,State}` = `order.orderType==='delivery' ? (overrides.deliveryAddress?.x || order.deliveryAddress?.x || '') : ''` → `order_type: order.rawOrderType` (L2214) → `api.post('/api/v1/vendoremployee/order-temp-store')` (`constants.js` L108).
Fallback source `order.deliveryAddress` = `fromAPI.order` L304 `api.delivery_address` (raw backend object). Outbound `place-order` `delivery_address` (`buildDeliveryAddress` L936–952) already sends `house/floor/road/city/state` to the backend, so the backend has the data to echo back.
**No break point in the bill chain.** Break point for KOT: `orderService.js` L147–164 builds a hand-rolled payload without any `deliveryCust*` key.

Callers (17): bill = `OrderEntry.jsx` ×7 (live values + `selectedAddress`), `RePrintButton.jsx` L115, `TableCard.jsx` L227, `OrderCard.jsx` L253, `AllOrdersReportPage.jsx` L857, `OrderReportBetaPage.jsx` L339, `FolioCheckoutPanel.jsx` L104, `PmsCheckoutDrawer.jsx` L120 (all pass `orderData` → `buildBillPrintPayload`); kot = `RePrintButton.jsx` L56, `TableCard.jsx` L201, `OrderCard.jsx` L229 (else-branch).

## 4. Evidence artifacts (`/app/memory/evidence/BUG-395/`)
- `prod_bundle_probe_2026_09_24.txt` — prod index → `main.1f7d79fb.js` (5,679,764 B, not stored); occurrence counts; minified `buildBillPrintPayload` excerpt showing the 4 keys; minified KOT else-branch excerpt showing their absence.
- Workspace: `frontend/src/api/transforms/orderTransform.js` L2182–2211 · `frontend/src/api/services/orderService.js` L136–188 · `frontend/src/api/transforms/customerTransform.js` L195–203 · `frontend/src/api/transforms/orderTransform.js` L936–952 (`buildDeliveryAddress`).
- Prior record: `BUG_TRACKER.md` BUG-395 row (IMPLEMENTED Gate 5a; QA PASS 26/26 BATCH-03 2026-09-15) · `handover/QA_HANDOVER_BUG395_2026_09_10.md`, `QA_HANDOVER_BUG395_ADDENDUM2_2026_09_11.md` · `evidence/BUG-395/crm_probe_2026_09_10.json`.

## 5. Recommendations
1. **Reply to backend (BACKEND_ASK, no FE work):** "Already implemented (BUG-395, 2026-09-10) and live on pos.mygenie.online build `main.1f7d79fb.js`: every `print_type:"bill"` payload carries `deliveryCustHouse/Floor/City/State` — real values for `order_type:"delivery"`, `""` for all other types; keys never omitted. Please confirm (a) which payload you observed without the keys (order id + `print_type`), and (b) whether `print_type:"kot"` also needs them."
2. **If (b) = yes → FE change (OWNER_DECISION first):** add the 9 `deliveryCust*` keys (or at minimum the 4 requested) to the `printOrder()` else-branch in `orderService.js`, same conditional rule, sourced from `orderData.deliveryAddress` (KOT callers have no `selectedAddress`). Scope ≈ 10–12 lines, **1 file**, `orderService.js` is **not** a hotspot (R5 list: CollectPaymentPanel, orderTransform, pmsService, PmsCheckoutDrawer, legacy PMS pages, OrderEntry, DashboardPage, LoadingPage, round-off helper) and **not financial** (print metadata) → **planning-skip eligible — owner must approve**; otherwise full Gate 2–3. Impact: KOT template only; bill path untouched; `station_kot` shape unchanged (OQ-PA-11).
3. **If (a) shows empty values on a delivery bill re-print:** that is the backend's `delivery_address` object missing `house/floor/city/state` on the order-detail API (FE echoes what it receives; the FE already sends those sub-fields on `place-order`). → BACKEND_ASK: return them on `delivery_address`. No FE change.
4. **Process notes for the owner:** (i) BUG-395 registry status is "GATE_5B_QA_PASS (2026-09-15) — awaiting Gate 6 owner smoke", yet the code is live on production → **retroactive closure candidate** (Role 11 Phase B) — owner to confirm the prod release and mark OWNER VERIFIED / CLOSED. (ii) The same prod bundle also contains `front-desk-v2` / "Front Desk (Beta)" strings → **CR-385 code appears to be on production** while CR-385 Gate 5 is still awaiting the owner's sign-off word — please confirm this was an intended release.

## 6. Retroactive candidates
- **BUG-395** — code exists (`orderTransform.js` L2199–2211 + `customerTransform.js` addendum) and is live on prod; registry ≠ CLOSED → recommend CLOSURE Phase B after owner confirmation.
- **CR-385** (observation only) — `front-desk-v2` present in the prod bundle; registry = "P5 REGRESSION PASSED — awaiting owner sign-off". Not a closure candidate by itself (sign-off pending), but the owner should know it is already deployed.

## Handover
"Root cause: not a defect — the 4 keys are already emitted on every bill `order-temp-store` payload (BUG-395) and are live on prod `main.1f7d79fb.js`; only the KOT/else-branch payload lacks `deliveryCust*` keys. Confidence: HIGH. Steps: 7/10. FE fix: NO for bill; YES-if-backend-wants-KOT (~12 lines, 1 file `orderService.js`, non-hotspot, non-financial). Backend ask: YES — confirm observed payload (order id + print_type) and whether KOT needs the keys; return `house/floor/city/state` on `delivery_address` if re-print values are empty. Planning skip eligible: YES (owner approve) for the KOT change. Escalated from Bug Fix: NO. Retroactive candidates: BUG-395 (+ CR-385 deployed-on-prod observation). Report at `/app/memory/BUG-395_INVESTIGATION_REPORT_2026_09_24_TEMP_STORE_KEYS.md`."
