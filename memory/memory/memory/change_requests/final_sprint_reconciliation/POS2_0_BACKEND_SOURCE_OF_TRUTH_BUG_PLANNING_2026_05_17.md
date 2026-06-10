# POS2.0 Backend Source-of-Truth Bug Planning — 2026-05-17

## 1. Purpose

This is the **Phase 3 planning document** for POS2.0 bugs that were blocked or high-risk because frontend/backend authority, payload contracts, socket contracts, GST/tax handling, or print-template source of truth are unclear.

### Bugs Covered

- **BUG-082** — Socket contract clarification (`order_from` / "index 4 as primary")
- **BUG-083** — Delivery GST key / CR-013 Phase 3 (`delivery_charge_gst_amount`)
- **BUG-084** — Per-component CGST/SGST payload gap
- **BUG-085** — Frontend / backend print template GST display gap

### Scope Constraints

- **No implementation was done.**
- **No source code was modified.**
- **No final baseline (`/app/memory/final/`) was updated.**
- **No pending freeze doc was updated.**
- **No bug tracker statuses were changed.**
- **No commits were made.**
- Code inspection was performed for planning evidence only.

---

## 2. Inputs Read

### Repository

| Item | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash after clone | `862f413` |
| Clone time (UTC) | `2026-05-16T19:43:26Z` |
| `/app` wiped and fresh cloned | Yes |
| Working tree clean | Yes |

### Baseline docs read

- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### Overlay / sprint docs read

- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` (verified exists)
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` (verified exists)
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` (verified exists)
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` (verified exists)
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` (verified exists)
- `/app/memory/change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` (verified exists)

### Business rules reconciliation docs read

- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

### Bug impact analysis read

- `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` (sections BUG-082 through BUG-085)

### Phase 1 / Phase 2 planning docs

- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md` — **not present** in fresh clone
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md` — **not present** in fresh clone

### Code files inspected for evidence

| File | Reason |
|---|---|
| `frontend/src/api/socket/socketEvents.js` L148-154 | `MSG_INDEX` constant definition; index 4 = `PAYLOAD` |
| `frontend/src/api/socket/socketHandlers.js` L1-52, L145-200, L455-518 | `parseMessage`, `handleNewOrder`, `handleScanNewOrder` — socket event parsing and `order_from` enrichment fallback |
| `frontend/src/api/transforms/orderTransform.js` L585-681 | `calcOrderTotals` — composite `gst_tax` folding, missing `delivery_charge_gst_amount` |
| `frontend/src/api/transforms/orderTransform.js` L1130-1300 | `collectBillExisting` — payment payload, missing delivery GST key |
| `frontend/src/api/transforms/orderTransform.js` L1360-1696 | `buildBillPrintPayload` — print payload, `cgst_amount`/`sgst_amount` as 50/50 of composite only |
| `frontend/src/api/transforms/profileTransform.js` L130-157 | `deliveryChargeGstPct` / `serviceChargeTaxPct` parsing from profile |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L205-232, L518-577, L685-756, L1698-1782 | Per-component CGST/SGST UI display (already correct), payload construction |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` L1-60 | `isUnconfirmedScanOrder` predicate: `orderFrom === 'web' && fOrderStatus === 7` |

---

## 3. Scope

### Included Bugs

| Bug | Backend / Contract Area | Why Included In Phase 3 | Current Risk |
|---|---|---|---|
| BUG-082 | Socket contract — `order_from` / "index 4 as primary" | Owner wording "index 4 as primary web source" conflicts with the current index-4-as-full-payload parser + scan-channel fallback workaround. Backend must confirm exact contract. | High — changing parser or retiring fallback without backend confirmation could break web order popup/counter. |
| BUG-083 | Delivery GST payload key — `delivery_charge_gst_amount` / CR-013 Phase 3 / BE-G9 | Code comment explicitly defers `delivery_charge_gst_amount` to BE-G9 Phase 3. Backend must confirm field name + composite retention policy before frontend maps it. | High — adding wrong key name risks backend rejection or silent data loss; wrong composite policy risks double-counting. |
| BUG-084 | Per-component CGST/SGST payload keys | UI already shows per-component split; payload only emits composite `cgst_amount`/`sgst_amount`. Backend must confirm per-component key names and whether composite fields are retained. | High — backend schema defines accepted keys; wrong names cause silent discard; dropping composite could break legacy consumers. |
| BUG-085 | Print template GST display — frontend payload vs backend template rendering | Frontend can enrich payload, but the printed bill is rendered by the backend template. Template must adopt new fields; double-count protection required. | High — frontend-only change is insufficient; backend template change is prerequisite; double-count risk (Bean Me Up precedent). |

### Excluded Bugs

| Bug / Group | Reason Excluded | Planning Phase |
|---|---|---|
| BUG-051, BUG-054, BUG-055, BUG-062, BUG-068, BUG-070, BUG-071, BUG-073 | Clean safe bugs — no backend/owner ambiguity | Phase 1 (not yet created on disk) |
| BUG-075, BUG-079, BUG-080 | Owner-decision alignment bugs (pending-freeze rules already documented; owner decision may be needed for edge cases) | Phase 2 (not yet created on disk) |
| BUG-050, BUG-052, BUG-053, BUG-056–BUG-061, BUG-063–BUG-067, BUG-069, BUG-072, BUG-074, BUG-078 | Remaining blocked bugs — various owner/backend blockers | Phase 4 (future) |
| BUG-076, BUG-077, BUG-081, BUG-086 | Duplicate / already resolved | No further planning |

---

## 4. Backend / Source-of-Truth Summary

| Bug | Area | Current FE Behaviour | Expected / Unknown BE Behaviour | Source-of-Truth Status | Backend Answer Needed? | Owner Answer Needed? | Planning Status |
|---|---|---|---|---|---|---|---|
| BUG-082 | Socket event / `order_from` | FE reads index 4 as full payload object (orders array). `handleScanNewOrder` has a fallback that sets `orderFrom='web'` when backend omits `order_from`. | Unknown: does "index 4 as primary" mean (a) new socket contract with primitive at index 4, (b) trust `order_from` field inside payload at index 4, or (c) something else? Also unknown: does backend now reliably ship `order_from='web'`? | **Unclear** — FE has a workaround (channel-based fallback); owner wants index-4 primary but exact meaning is ambiguous. | **Yes** — exact socket message shape + `order_from` reliability | Possibly — if backend cannot confirm, owner must clarify exact intent | `ready_after_backend_confirmation` |
| BUG-083 | Delivery GST payload key | FE computes `delGstAmt` locally but folds it into composite `gst_tax`. No `delivery_charge_gst_amount` key emitted. Code comment says "BE-G9 in Phase 3". | Unknown: (1) exact backend key name (`delivery_charge_gst_amount` vs other), (2) whether composite `gst_tax` should still include delivery GST component (backward-compat) or exclude it (clean separation), (3) whether backend accepts/stores/reports/prints this key. | **Backend authoritative** — field name + acceptance policy + composite retention are backend decisions. | **Yes** — field name, composite policy, storage/report/print behaviour | No (owner already "unparked" Phase 3; only backend contract question remains) | `ready_after_backend_confirmation` |
| BUG-084 | Per-component CGST/SGST keys | FE UI already renders per-component CGST/SGST halves (item, SC, Tip, Delivery) — **UI is correct**. Payload emits only `cgst_amount`/`sgst_amount` (50/50 of composite total), `service_gst_tax_amount`, `tip_tax_amount`. No per-component CGST/SGST split keys in payload. | Unknown: (1) exact per-component key names backend expects, (2) whether composite `gst_tax`/`cgst_amount`/`sgst_amount` should be retained alongside per-component keys, (3) which payload flows need the new keys (place, update, collect-bill, print, transfer-to-room). | **Backend authoritative** — payload schema defines accepted field names. | **Yes** — per-component key names, composite retention policy, payload flow scope | No | `ready_after_backend_confirmation` |
| BUG-085 | Print template GST display | FE `buildBillPrintPayload` emits `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax`. No per-component GST breakdown. Backend template renders the receipt from these fields. | Unknown: (1) which new fields will the backend template render, (2) how template avoids double-counting if both composite AND component fields are present, (3) whether template change is scheduled. | **Backend authoritative** — receipt rendering is template-driven; FE can only enrich payload. | **Yes** — template field adoption, double-count prevention, adoption timeline | Possibly — owner approval of additional receipt lines / layout | `backend_first_required` |

---

## 5. Field / Contract Matrix

| Bug | Field / Contract | Current FE Source | Expected BE Source | DB Storage Needed? | Print Source | Report Source | Risk |
|---|---|---|---|---|---|---|---|
| BUG-082 | Socket message index 4 content | `MSG_INDEX.PAYLOAD = 4` → full orders array/object | Unknown — primitive string vs object | N/A (socket-only) | N/A | N/A | Breaking change if socket shape changes |
| BUG-082 | `order_from` field in order payload | Derived: `api.order_from` from API + `handleScanNewOrder` fallback to `'web'` when missing | Unknown — does backend now reliably ship `order_from` on `single-order-new`? | Backend-owned | N/A | N/A | Popup/counter breaks if field absent and fallback retired |
| BUG-083 | `delivery_charge_gst_amount` | Not emitted. Computed as `delGstAmt` in `calcOrderTotals` L648, folded into `gst_tax` | Unknown key name — `delivery_charge_gst_amount` assumed | Unknown | Unknown | Unknown | Backend rejection or silent discard if wrong key |
| BUG-083 | Composite `gst_tax` | Currently includes delivery GST component: `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt` | Unknown — should composite retain delivery GST or exclude it? | Backend-owned | Backend template reads `gst_tax` | Backend-owned | Double-counting if both composite-with-delivery AND separate delivery key are summed |
| BUG-084 | Per-component CGST/SGST keys (item) | Not in payload. UI shows `itemGstPostDiscount / 2` for each half. | Unknown key names (e.g., `item_cgst_amount`, `item_sgst_amount`?) | Unknown | Unknown | Unknown | Backend must define names |
| BUG-084 | Per-component CGST/SGST keys (SC) | `service_gst_tax_amount` exists in payload (aggregate, not split) | Unknown — does backend want `service_cgst_amount` / `service_sgst_amount`? | Unknown | Unknown | Unknown | Risk of new field names conflicting with existing |
| BUG-084 | Per-component CGST/SGST keys (Tip) | `tip_tax_amount` exists in payload (aggregate, not split) | Unknown — does backend want `tip_cgst_amount` / `tip_sgst_amount`? | Unknown | Unknown | Unknown | Same risk |
| BUG-084 | Per-component CGST/SGST keys (Delivery) | Not in payload (delivery GST folded into composite) | Unknown — depends on BUG-083 resolution first | Unknown | Unknown | Unknown | Coupled with BUG-083 |
| BUG-084 | Composite `cgst_amount` / `sgst_amount` | `buildBillPrintPayload` L1691-1692: 50/50 of `finalGstTax` | Unknown — retained alongside per-component keys? | Backend-owned | Backend template reads these | Backend-owned | Double-counting if both levels sent and summed |
| BUG-085 | Print payload per-component GST fields | Not present in `buildBillPrintPayload` return object | Unknown — which fields does the print template need? | N/A (print payload) | Backend template renders receipt | N/A | Template must be updated before payload enrichment has visible effect |
| BUG-085 | Print template double-count protection | Not applicable (no per-component fields sent today) | Unknown — how does template avoid summing composite AND component? | N/A | Backend template logic | N/A | Bean Me Up-style double-count risk is the primary concern |
| BUG-085 | `order_amount` / `payment_amount` / `grant_amount` | Multiple payload flows emit these | Not directly affected, but must stay numerically consistent after GST field changes | Backend-owned | Backend template reads these | Backend-owned | Regression risk if GST breakdown changes affect grand total |

---

## 6. Per-Bug Backend Planning

### BUG-082 — Socket Contract Clarification

#### Current Issue

Owner-reported bug: "Socket index 4 should be read as the primary web source." The intent is ambiguous — three possible interpretations exist.

#### Current Frontend Behaviour

1. **`socketEvents.js` L148-154:** `MSG_INDEX.PAYLOAD = 4` defines index 4 as the full payload object (contains `orders` array for `new-order` events).

2. **`socketHandlers.js` L41-52:** `parseMessage` reads `payload: message[MSG_INDEX.PAYLOAD] || null`.

3. **`socketHandlers.js` L146-200:** `handleNewOrder` reads `parsed.payload.orders` — the orders array inside the payload at index 4. It does NOT extract `order_from` or any web-source indicator from index 4 directly.

4. **`socketHandlers.js` L498-511:** `handleScanNewOrder` has a **channel-arrival enrichment fallback**:
   - The `scan-new-order` channel is itself proof-of-origin (only web/QR orders arrive on this channel).
   - Backend's `single-order-new` response was observed (order 825770, 2026-05-10) to omit `order_from='web'`.
   - Fallback fills `order.orderFrom = 'web'` and `order.isWebOrder = true` only when the backend did not supply it.
   - Comment explicitly says: "never overwrite an explicit backend value (preserves forward-compat with BE-OF1 once backend ships the field on this endpoint)."

5. **`ScanOrderPopOut.jsx` L53-54:** predicate is `order.orderFrom === 'web' && order.fOrderStatus === 7` — drives the popup/counter for web orders.

#### Backend / Socket Contract Needed

Three possible interpretations of "index 4 as primary":

**(a) New socket contract:** Index 4 becomes a primitive `order_from` string (e.g., `'web'` or `'pos'`) instead of the full payload object. This would be a **breaking change** to the socket message structure.

**(b) Trust `order_from` inside the payload at index 4:** The backend now reliably ships `order_from='web'` inside the orders array at index 4. Frontend should read it as the primary source and can retire the channel-based fallback at L508-511.

**(c) Something else:** The bug may reference a different event or a planned-but-not-yet-implemented change.

**Most plausible interpretation (from impact analysis): (b)** — trust backend's `order_from` field now that backend has fixed the omission. The fallback can then be retired or downgraded to a defensive safety net.

#### Business Baseline Reference

- **Frozen baseline:** No rule explicitly defines `order_from` source-of-truth.
- **Architecture rule SM-07:** "Table status is derived from order-socket `f_order_status`" — establishes socket payload as authoritative for operational state.
- **Module 7 (Realtime Socket)** future-change rule: "Socket changes require channel/event inventory and downstream state review."

#### Pending Freeze Reference

- **Part B10 — SCAN-003:** "Socket event `scan-new-order` carries the order source at position 4: `['scan-new-order', orderId, restaurantId, status, 'web']`. Frontend must read index 4 as the primary source identifier. `order_in` enrichment is a secondary fallback only."
- **Note:** This pending freeze wording describes a **different message structure** than what is observed in code — the pending freeze says position 4 is a primitive `'web'` string, whereas the current code reads position 4 as a full payload object. **This wording conflict is the core ambiguity.**

#### Reconciliation Finding

- Reconciliation report (Section 6, BUG-082): "needs_backend_source_of_truth_audit" — socket contract ambiguity.
- Reconciliation Addendum §1: "Backend must confirm the exact socket contract before any fallback retirement or parser rewrite."
- Reconciliation Addendum §3: FE authority = index 4 as payload + web-channel fallback; BE authority = socket message shape is backend-owned.

#### Source-of-Truth Assessment

**Socket message shape is backend-owned.** Frontend reads whatever structure backend emits. The pending freeze wording (SCAN-003) suggests a message structure where index 4 is a primitive `'web'`, but current code and live observation show index 4 as a full payload object. One of these is wrong, or the message structure differs between `new-order` and `scan-new-order` channels.

#### Backend Questions

| Q-ID | Question |
|---|---|
| Q-082-1 | For the `scan-new-order` socket event, what is the exact message structure? Specifically: is message index 4 a **primitive string** (e.g., `'web'`) indicating order source, or a **full payload object** containing the orders array? |
| Q-082-2 | For the `new-order` socket event, is the message structure the same as `scan-new-order`, or different? |
| Q-082-3 | Does the `single-order-new` API response (used as fallback in `handleScanNewOrder`) now reliably include `order_from='web'` for web/QR orders? Was the omission observed on order 825770 (2026-05-10) a backend bug that has been fixed? |
| Q-082-4 | If the backend now ships `order_from` reliably, should the frontend **retire** the channel-based fallback at `socketHandlers.js:508-511`, **downgrade** it to a defensive safety net, or **keep it unchanged**? |

#### Owner Questions If Any

| Q-ID | Question |
|---|---|
| Q-082-O1 | The pending freeze wording (SCAN-003) says index 4 is a primitive `'web'` string, but current code treats index 4 as a full payload object. Which is correct? If the pending freeze wording was written based on a planned backend change, has that change been deployed? |

#### Frontend Planning Options After Backend Answer

| Option | Condition | Implementation Scope |
|---|---|---|
| **A.** Backend confirms index 4 is still a full payload object and `order_from` is reliably shipped inside it | Backend confirms (b) interpretation | Retire or downgrade L508-511 fallback; read `order_from` from the parsed order; update SCAN-003 pending freeze wording to match. |
| **B.** Backend confirms index 4 is now a primitive `order_from` string for `scan-new-order` only | Backend confirms (a) interpretation for scan-new-order | Major refactor: `parseMessage` must handle two message shapes; `handleScanNewOrder` must read `order_from` from index 4 and fetch full order from API. |
| **C.** Backend confirms both channels use a new structure with `order_from` at index 4 and payload shifted to index 5+ | Backend confirms (a) interpretation for all channels | Breaking change to `MSG_INDEX`; all handlers need update. |
| **D.** Add defensive fallback only, without changing business behaviour | No backend answer yet, but owner wants progress | Only if explicitly approved — risks divergence from backend contract. |
| **E.** Block until socket contract is documented | Backend cannot confirm now | No implementation; keep current fallback. |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Web order popup triggers on approved source | Emit `scan-new-order` socket event with approved structure → verify ScanOrderPopOut appears | Popup appears for `orderFrom === 'web' && fOrderStatus === 7` |
| POS orders do not trigger web popup | Emit `new-order` for a POS order → verify no ScanOrderPopOut | No popup for non-web orders |
| Web counter on dashboard header reflects web orders only | Count web orders on dashboard after socket event | Counter increments only for web-origin orders |
| Legacy fallback works if retained | Emit `scan-new-order` where backend omits `order_from` → verify fallback fills `'web'` | Order still appears in popup (if fallback is retained) |
| No regression on engage locks, table sync, or order state | Place web order → verify table engaged + order appears on dashboard | Normal operational flow preserved |

#### Planning Status

**`ready_after_backend_confirmation`**

---

### BUG-083 — Delivery GST Key / CR-013 Phase 3

#### Current Issue

Frontend computes delivery charge GST locally (`delGstAmt = deliveryCharge * delTaxRate`) but folds it into the composite `gst_tax` field. No separate `delivery_charge_gst_amount` key is emitted in any payload. Code comment explicitly says "BE-G9 in Phase 3." The owner has now "unparked" Phase 3 via this bug.

#### Current Frontend Behaviour

1. **`profileTransform.js` L145-157:** `deliveryChargeGstPct` is correctly parsed from `api.deliver_charge_gst ?? api.settings?.deliver_charge_gst`. Force-0 fallback for missing/null/blank/non-numeric/negative values.

2. **`orderTransform.js` L585-681 (`calcOrderTotals`):**
   - L648: `const delGstAmt = deliveryCharge * delTaxRate;`
   - L651: `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;` — delivery GST **folded into composite**.
   - L669: Return emits `gst_tax: Math.round(gstTax * 100) / 100` — composite includes delivery GST.
   - L678-679: Returns `service_gst_tax_amount` and `tip_tax_amount` — but **no `delivery_charge_gst_amount`**.
   - L642-643: Comment: "Delivery GST stays folded into composite gst_tax for now — a dedicated `delivery_charge_gst_amount` key is BE-G9 in Phase 3."

3. **`orderTransform.js` L1130-1300 (`collectBillExisting`):**
   - L1246-1264: Emits `gst_tax`, `service_gst_tax_amount`, `tip_tax_amount` — **no `delivery_charge_gst_amount`**.

4. **`orderTransform.js` L1360-1696 (`buildBillPrintPayload`):**
   - L1683-1694: Emits `gst_tax`, `cgst_amount`, `sgst_amount` — **no `delivery_charge_gst_amount`**.

5. **`CollectPaymentPanel.jsx` L1760-1771:** UI **already shows** delivery GST as a separate CGST/SGST pair when `deliveryGst > 0`.

#### Backend / Payload Contract Needed

| Contract Question | Why Needed |
|---|---|
| Exact key name for the separate delivery GST field | `delivery_charge_gst_amount` is assumed but not confirmed. Other candidates: `delivery_gst_tax_amount`, `delivery_gst_amount`. |
| Composite `gst_tax` retention policy | Should `gst_tax` continue to include the delivery GST component (backward-compat)? Or should delivery GST be excluded from composite now that it has its own field (clean separation)? |
| Which payload flows need the new key | Place order? Update order? Collect bill? Print bill? Transfer to room? All? |
| Backend acceptance, storage, and reporting | Does backend persist this field? Does it appear in reports? |
| Print template rendering | Does the print template render `delivery_charge_gst_amount` as a separate line? |
| Non-delivery orders | Must non-delivery orders explicitly send `delivery_charge_gst_amount: 0`, or should the key be absent? |

#### Business Baseline Reference

- **Frozen TAX-008:** "If `service_charge_tax` or `deliver_charge_gst` is null/missing in profile → system forces that rate to 0%." — Confirms rate source exists.
- **Frozen TAX-001/002:** GST calculation rules (exclusive/inclusive) — delivery GST follows exclusive.
- **Frozen TOTALS-002:** "Subtotal = Item Total − discount + Service Charge + tip + delivery charge. Subtotal is always pre-tax." — Delivery charge is part of subtotal.
- DEL-001/002/003 are **intentionally excluded from frozen baseline** and tracked in pending freeze.

#### Pending Freeze Reference

- **Part B5 — DEL-001:** "Delivery GST must be sent as a dedicated separate key `delivery_charge_gst_amount` in the payload AND folded into composite `gst_tax`. Both must be present."
- **Part B6 — DEL-002:** "`delivery_charge_gst_amount` is the ONLY delivery GST source. Rate from `deliver_charge_gst` profile field only."
- **Part B7 — DEL-003:** "A dedicated `delivery_charge_gst_amount` field EXISTS and IS sent in all order payloads."
- **Linked BUG-009** in pending freeze (pre-existing delivery GST payload issue).

#### Reconciliation Finding

- Reconciliation report (Section 6, BUG-083): "block_implementation_planning" — BE-G9 contract missing.
- Reconciliation Addendum §1: "Backend must confirm field name + composite-retention rule before frontend planning."
- Reconciliation Addendum §3: FE authority = computes delivery GST locally, does not emit separate field; BE authority = dedicated key name + persistence rules are backend-owned.

#### Source-of-Truth Assessment

**Backend authoritative.** The field name, acceptance, storage, reporting, and print-template rendering are all backend decisions. Frontend can compute the value (already does) but cannot emit a field that backend does not accept.

**Important conflict:** Pending freeze DEL-001 says "AND folded into composite `gst_tax`" — this means composite retention is the owner-approved policy. **However, this has not been confirmed with the backend team.**

#### Backend Questions

| Q-ID | Question |
|---|---|
| Q-083-1 | What is the exact backend key name for delivery charge GST amount? Is it `delivery_charge_gst_amount`, `delivery_gst_tax_amount`, or something else? |
| Q-083-2 | Should the composite `gst_tax` field **continue to include** the delivery GST component (per pending-freeze DEL-001: "AND folded into composite `gst_tax`"), or should delivery GST be **excluded** from composite now that it has its own key? |
| Q-083-3 | Which payload endpoints accept this field? Place order, update order, collect bill, print bill, transfer to room — all or subset? |
| Q-083-4 | Does backend persist this field to DB? Does it appear in reports or the dashboard? |
| Q-083-5 | Does the print template render this field as a separate line on the receipt? |
| Q-083-6 | For non-delivery orders: should the key be sent as `0`, or should it be absent from the payload? |

#### Owner Questions If Any

None required — owner has already unparked Phase 3. Only backend contract confirmation is needed.

#### Frontend Planning Options After Backend Answer

| Option | Condition | Implementation Scope |
|---|---|---|
| **A.** Backend confirms `delivery_charge_gst_amount`; composite retains delivery GST | Backend confirms name + DEL-001 composite policy | Add key to `calcOrderTotals` return, `collectBillExisting`, `buildBillPrintPayload`, and all place/update flows. Composite unchanged. |
| **B.** Backend uses different key name; composite retains delivery GST | Backend confirms different name | Same as A but with the confirmed key name. |
| **C.** Backend wants delivery GST excluded from composite | Backend confirms clean separation | Add new key AND subtract `delGstAmt` from composite `gst_tax`. High regression risk — all downstream consumers of `gst_tax` must be audited. |
| **D.** Block until backend confirms | Backend cannot confirm now | No implementation; keep current "BE-G9 Phase 3" deferral. |
| **E.** Defer CR-013 Phase 3 | Owner decides to defer further | No implementation. |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Delivery order emits separate delivery GST key | Place a delivery order with `deliver_charge_gst > 0` → inspect payload | `delivery_charge_gst_amount` (or confirmed key) present with correct value |
| Non-delivery order handles delivery GST correctly | Place a dine-in order → inspect payload | Key is `0` or absent per backend contract |
| Composite `gst_tax` remains correct | Compare `gst_tax` value with sum of components | `gst_tax == itemGst + scGst + tipGst + delGst` (if composite retains) OR `gst_tax == itemGst + scGst + tipGst` (if composite excludes) |
| Non-delivery order totals are numerically unchanged | Compare non-delivery payload before and after change | Byte-identical totals for non-delivery flows |
| Print bill shows delivery GST | Print a delivery order bill → inspect printed output | Delivery GST appears as a separate line if template supports it |

#### Planning Status

**`ready_after_backend_confirmation`**

---

### BUG-084 — Per-Component CGST/SGST Payload Gap

#### Current Issue

The Collect Bill UI already shows per-component CGST/SGST halves for items, SC, Tip, and Delivery. However, the payload and print payload only emit composite `cgst_amount` / `sgst_amount` (50/50 of total `finalGstTax`). Backend needs to confirm per-component key names.

#### Current Frontend Behaviour

1. **`CollectPaymentPanel.jsx` L1714-1772:** UI renders per-component breakdown:
   - Item CGST/SGST: `itemGstPostDiscount / 2` each (L1718, L1722)
   - SC CGST/SGST: `scGst / 2` each (L1739, L1743)
   - Tip CGST/SGST: `tipGst / 2` each (L1752, L1756)
   - Delivery CGST/SGST: `deliveryGst / 2` each (L1765, L1769)
   - **UI is already correct.**

2. **`orderTransform.js` L585-681 (`calcOrderTotals`):**
   - Returns `gst_tax` (composite), `service_gst_tax_amount` (SC GST aggregate), `tip_tax_amount` (Tip GST aggregate).
   - **No per-component CGST/SGST split fields** in the return.

3. **`orderTransform.js` L1691-1692 (`buildBillPrintPayload`):**
   - `cgst_amount: Math.round((finalGstTax / 2) * 100) / 100`
   - `sgst_amount: Math.round((finalGstTax / 2) * 100) / 100`
   - These are **whole-bill-level** 50/50 splits, not per-component.

4. **`orderTransform.js` L1246-1264 (`collectBillExisting`):**
   - Same pattern — `gst_tax`, `service_gst_tax_amount`, `tip_tax_amount` only.

5. **Code comment at L1684-1690:** "per-component slot adoption tracked under Phase 3 CR (CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md)."

#### Backend / Tax Schema Needed

| Contract Question | Why Needed |
|---|---|
| Exact per-component key names for item CGST/SGST | e.g., `item_cgst_amount`, `item_sgst_amount` — or different? |
| Exact per-component key names for SC CGST/SGST | e.g., `service_cgst_amount`, `service_sgst_amount` — or different? |
| Exact per-component key names for Tip CGST/SGST | e.g., `tip_cgst_amount`, `tip_sgst_amount` — or different? |
| Exact per-component key names for Delivery CGST/SGST | e.g., `delivery_cgst_amount`, `delivery_sgst_amount` — depends on BUG-083 first |
| Composite field retention | Should existing `cgst_amount` / `sgst_amount` / `gst_tax` / `service_gst_tax_amount` / `tip_tax_amount` be **retained** alongside per-component keys, or **replaced**? |
| Which payload flows need per-component keys | Place order, update order, collect bill, print bill, all? |
| Double-count protection | If both composite AND per-component fields are present, how does backend avoid summing both? |

#### Business Baseline Reference

- **Frozen TAX-001/002:** GST calculation rules.
- **Frozen TAX-005:** Mixed GST + VAT — tracked separately.
- **Pending TAX-006 (Part B2):** "CGST/SGST 50/50 split applies to ALL GST types: item GST + SC GST + delivery charge GST + tip GST."
- **Pending TAX-007 (Part B3):** "Both the Collect Bill screen and the printed bill must show the full GST breakdown."

#### Pending Freeze Reference

- **Part B2 — TAX-006:** Approved-with-amendment; code action = verify split covers all GST components. Linked BUG-010.
- **Part B3 — TAX-007:** Approved-with-amendment; code action = verify print payload includes all GST breakdown keys. Linked BUG-011.

#### Reconciliation Finding

- Reconciliation report (Section 6, BUG-084): "block_implementation_planning" — per-component GST key contract missing.
- Reconciliation Addendum §1: "Backend must confirm per-component key names and whether composite totals remain alongside them."

#### Source-of-Truth Assessment

**Backend authoritative** for payload key names. **Frontend already correct** for UI display. The gap is purely in the payload layer — frontend computes per-component values inline but does not persist them into outgoing payloads.

**Dependency on BUG-083:** Delivery component CGST/SGST keys depend on `delivery_charge_gst_amount` being confirmed first.

#### Backend Questions

| Q-ID | Question |
|---|---|
| Q-084-1 | What are the exact per-component CGST/SGST key names for each GST source (item, SC, Tip, Delivery)? |
| Q-084-2 | Should the existing composite keys (`cgst_amount`, `sgst_amount`, `gst_tax`, `service_gst_tax_amount`, `tip_tax_amount`) be **retained alongside** the new per-component keys, or **replaced** by them? |
| Q-084-3 | If both composite and per-component keys are present, how does the backend ensure no double-counting in storage, reporting, or printing? |
| Q-084-4 | Which payload flows must include the new per-component keys? (Place order, update order, collect bill, print bill, transfer to room) |

#### Owner Questions If Any

None required — pending freeze TAX-006/TAX-007 already establish owner intent.

#### Frontend Planning Options After Backend Answer

| Option | Condition | Implementation Scope |
|---|---|---|
| **A.** Backend confirms exact key names and composite retention | Full contract provided | Add per-component keys to `calcOrderTotals` return and propagate through all payload builders. Composite keys retained. |
| **B.** Backend continues using aggregate GST only | Backend does not want per-component keys in payload | No payload change; per-component display remains UI-only. Close BUG-084 as display-only. |
| **C.** Component fields are frontend-only display and not payload | Backend explicitly says "not needed" | No change. |
| **D.** Block until backend confirms schema and double-count protection | Cannot get backend answer now | No implementation. |
| **E.** Defer CR-013 Phase 3 | Owner decides to defer | No implementation. |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Per-component CGST/SGST sum to component total | Place order with all GST components → verify `item_cgst + item_sgst == itemGstPostDiscount` (similarly for SC, Tip, Delivery) | Mathematical parity |
| Composite fields still correct if retained | Verify `cgst_amount + sgst_amount == gst_tax` | No double-counting |
| Grand total unchanged | Compare grand total before and after per-component key addition | Byte-identical `order_amount` |
| Non-GST (VAT-only) tenants unaffected | Place VAT order → verify no spurious CGST/SGST keys | VAT-only flow unchanged |

#### Planning Status

**`ready_after_backend_confirmation`**

---

### BUG-085 — Frontend / Backend Print Template GST Display Gap

#### Current Issue

Printed bill currently shows only aggregate GST. Owner wants full per-component GST breakdown on the printed receipt. However, the receipt is **rendered by the backend print template** — frontend can only enrich the payload. Template must adopt new fields, and double-count protection is required.

#### Current Frontend Behaviour

1. **`orderTransform.js` L1360-1696 (`buildBillPrintPayload`):**
   - L1683: `gst_tax: finalGstTax` — composite total
   - L1691: `cgst_amount: Math.round((finalGstTax / 2) * 100) / 100` — 50/50 of composite
   - L1692: `sgst_amount: Math.round((finalGstTax / 2) * 100) / 100` — 50/50 of composite
   - L1693: `vat_tax: finalVatTax`
   - L1694: `delivery_charge` — principal amount only, no delivery GST key
   - **No per-component GST breakdown fields.**

2. **Code comment at L1684-1690:** "If the backend template doesn't yet read these fields they're harmless; per-component slot adoption tracked under Phase 3 CR."

3. **Print flow:** Frontend builds payload via `buildBillPrintPayload` → sends to `POST /api/v1/vendoremployee/order-temp-store` → backend stores and renders the receipt from the template.

#### Backend / Print Template Contract Needed

| Contract Question | Why Needed |
|---|---|
| Is the bill/print template **frontend-rendered**, **backend-rendered**, or **hybrid**? | Determines who must change for new fields to appear on the receipt. Evidence says **backend-rendered**. |
| Which per-component GST fields will the backend template render? | Template field names must match payload key names. |
| How will the template avoid double-counting? | If both composite (`gst_tax`, `cgst_amount`, `sgst_amount`) AND per-component fields are present in the payload, template must render only one set. |
| Will delivery GST / CGST / SGST breakdown appear on print? | Determines whether `delivery_charge_gst_amount` and its CGST/SGST split must be in the print payload. |
| Is backend template change scheduled? | Frontend payload enrichment is pointless until template is updated. |
| Bean Me Up double-count risk | Bean Me Up (id=742) is a known tenant with nested `deliver_charge_gst`. Does the current template already handle or mishandle any GST display? |

#### Business Baseline Reference

- **Pending TAX-007 (Part B3):** "Both the Collect Bill screen and the printed bill must show the full GST breakdown: composite CGST/SGST + individual SC GST, Tip GST, Delivery GST. Missing keys → escalate to backend."
- **Pending SC-004 / PAY-005 (Part C3):** "Alleged SC GST double-count on print" — owner states backend does not add SC GST independently. Verification pending.
- **Module 14 (Printing) future-change rule:** "Print changes require review of manual print, auto-print, room print, and fallback payload behavior together."

#### Pending Freeze Reference

- **Part B3 — TAX-007 / linked BUG-011:** Print bill GST breakdown missing.
- **Part C3 — SC-004 / PAY-005:** Alleged SC GST double-count on print — deferred, needs evidence.
- **Part D7 — SC-004 / PAY-005 verification gate:** Owner to share frontend print payload + printed bill for a dine-in with SC.

#### Reconciliation Finding

- Reconciliation report (Section 6, BUG-085): "block_implementation_planning" — backend template + owner receipt UX missing.
- Reconciliation Addendum §1: "Backend template adoption + owner receipt UX approval required before planning."
- QA assertion: "Printed bill shows each approved GST component once, with totals matching frontend payload and without Bean Me Up-style double counting."

#### Source-of-Truth Assessment

**Backend authoritative** for print template rendering. Frontend can add any fields to the print payload, but they are **invisible on the receipt** until the backend template renders them.

**The print template is the gating dependency.** No amount of frontend payload enrichment will change the printed bill unless the template is updated.

**SC-004 / PAY-005 (double-count concern):** The pending freeze explicitly defers this. If the backend template already performs its own GST computation from raw item data, adding per-component frontend-computed fields could result in double-counting on the receipt.

#### Backend Questions

| Q-ID | Question |
|---|---|
| Q-085-1 | Is the bill/print template backend-rendered from the `/order-temp-store` payload? Or does the template perform its own computation from the stored order? |
| Q-085-2 | Which per-component GST fields will the backend template render? Provide the exact field name list. |
| Q-085-3 | How will the template ensure no double-counting if both composite (`gst_tax`, `cgst_amount`, `sgst_amount`) AND per-component fields are present? |
| Q-085-4 | Is a backend template update for per-component GST display planned or scheduled? What is the timeline? |
| Q-085-5 | Does the current template perform any independent GST computation from raw item data (i.e., re-deriving tax from food_details), or does it purely render the payload fields it receives? |

#### Owner Questions If Any

| Q-ID | Question |
|---|---|
| Q-085-O1 | The per-component GST breakdown will add multiple lines to the printed receipt (up to 8 additional lines: item CGST, item SGST, SC CGST, SC SGST, Tip CGST, Tip SGST, Delivery CGST, Delivery SGST). Is this approved for the printed bill layout? |

#### Frontend Planning Options After Backend Answer

| Option | Condition | Implementation Scope |
|---|---|---|
| **A.** Backend template already supports per-component fields | Template accepts and renders new keys | Add per-component fields to `buildBillPrintPayload`. Depends on BUG-084 resolution. |
| **B.** Backend template must change first | Template update is planned | Wait for template update, then add fields. Sequence: backend template first → frontend payload enrichment second. |
| **C.** Hybrid flow — frontend owns some display, template owns rest | Partial template support | Document exact ownership split before implementation. |
| **D.** Block implementation until print source of truth is documented | Cannot confirm template behaviour | No implementation. |
| **E.** Defer print template GST display until Phase 3 backend contract is closed | Owner/backend decides to defer further | No implementation. |

#### QA Assertions Required

| Assertion | Test Flow | Expected Result |
|---|---|---|
| Printed bill shows approved GST breakdown | Print a dine-in bill with SC + Tip + Delivery → inspect printed receipt | Each approved component appears once |
| No double-counting on print | Compare printed total with frontend payload `order_amount` | Must match |
| Bean Me Up tenant print | Print a delivery bill on Bean Me Up (id=742) → inspect GST lines | No double-count; delivery GST correct |
| Room order print | Print a room order bill → inspect GST lines | ROOM-001 math preserved; GST breakdown correct |
| Non-GST (VAT-only) tenant print | Print a VAT-only order → verify no spurious CGST/SGST lines | VAT row only |

#### Planning Status

**`backend_first_required`**

---

## 7. Backend Questions To Ask

| Question ID | Bug | Backend Question | Required Evidence | Blocks Implementation? | Owner Needed? |
|---|---|---|---|---|---|
| Q-082-1 | BUG-082 | For `scan-new-order` socket event, is message index 4 a primitive string or a full payload object? | Socket contract documentation or live socket sample | Yes | No |
| Q-082-2 | BUG-082 | For `new-order` socket event, is the message structure the same as `scan-new-order`? | Socket contract documentation | Yes | No |
| Q-082-3 | BUG-082 | Does `single-order-new` API now reliably include `order_from='web'`? | API sample response for a web order | Yes | No |
| Q-082-4 | BUG-082 | Should frontend retire the channel-based `order_from='web'` fallback? | Backend confirmation of field reliability | Yes | No |
| Q-083-1 | BUG-083 | What is the exact backend key name for delivery charge GST amount? | Backend schema or payload spec | Yes | No |
| Q-083-2 | BUG-083 | Should composite `gst_tax` continue to include delivery GST or exclude it? | Backend acceptance policy | Yes | No |
| Q-083-3 | BUG-083 | Which payload endpoints accept the delivery GST key? | Backend endpoint documentation | Yes | No |
| Q-083-4 | BUG-083 | Does backend persist the delivery GST field to DB? Does it appear in reports? | DB schema or report evidence | Yes | No |
| Q-083-5 | BUG-083 | Does the print template render `delivery_charge_gst_amount` as a separate line? | Template evidence | Yes | No |
| Q-083-6 | BUG-083 | For non-delivery orders: key sent as `0` or absent? | Backend preference | No (non-blocking, but must be asked) | No |
| Q-084-1 | BUG-084 | What are the exact per-component CGST/SGST key names? | Backend schema or payload spec | Yes | No |
| Q-084-2 | BUG-084 | Should composite keys be retained alongside per-component keys? | Backend acceptance policy | Yes | No |
| Q-084-3 | BUG-084 | How does backend avoid double-counting if both composite and per-component keys are present? | Backend processing logic or rule | Yes | No |
| Q-084-4 | BUG-084 | Which payload flows must include per-component keys? | Backend endpoint documentation | Yes | No |
| Q-085-1 | BUG-085 | Is the print template purely payload-driven or does it re-derive GST from raw item data? | Template logic or source | Yes | No |
| Q-085-2 | BUG-085 | Which per-component GST fields will the template render? | Template field list | Yes | No |
| Q-085-3 | BUG-085 | How will the template avoid double-counting composite + per-component fields? | Template logic or rule | Yes | No |
| Q-085-4 | BUG-085 | Is a backend template update for per-component GST display planned/scheduled? | Timeline confirmation | Yes | No |
| Q-085-5 | BUG-085 | Does the current template perform independent GST computation from raw item data? | Template source or behaviour description | Yes | No |

**Total backend questions: 19**

---

## 8. Owner Questions If Any

| Question ID | Bug | Owner Question | Options | Why Needed | Blocks Implementation? |
|---|---|---|---|---|---|
| Q-082-O1 | BUG-082 | Pending freeze SCAN-003 says index 4 is a primitive `'web'` string, but current code treats index 4 as a full payload object. Which is correct? | (a) Pending freeze wording is correct — backend has changed the socket structure. (b) Pending freeze wording is aspirational — backend has not changed yet. (c) Pending freeze wording was a documentation error. | The two sources directly conflict and implementation direction depends on the answer. | Yes — until resolved, cannot determine correct parser logic. |
| Q-085-O1 | BUG-085 | Per-component GST breakdown adds up to 8 additional lines to the printed receipt. Is this approved for the bill layout? | (a) Approved — all components shown. (b) Approved with condensed layout — merge some lines. (c) Defer — print layout review needed. | Receipt length/readability concern; especially for thermal printers with limited paper width. | No (non-blocking for backend contract questions, but needed before final implementation). |

**Total owner questions: 2** (BUG-083 and BUG-084 do not require owner questions)

---

## 9. Planning Impact

| Bug | Can Enter Master Implementation Plan? | Condition | Notes |
|---|---|---|---|
| BUG-082 | Yes, after backend answer | Backend confirms socket message structure + `order_from` reliability. Owner clarifies SCAN-003 wording conflict. | If both confirm interpretation (b), implementation is straightforward. |
| BUG-083 | Yes, after backend answer | Backend confirms key name + composite retention policy + endpoint acceptance. | Pending freeze DEL-001 already defines composite retention; backend must confirm. |
| BUG-084 | Yes, after backend answer | Backend confirms per-component key names + composite retention + double-count protection. | Depends on BUG-083 resolution for delivery component. |
| BUG-085 | No, backend-first required | Backend must update print template before frontend implementation has visible effect. | Frontend payload enrichment is gated by template adoption. BUG-085 is the last in the dependency chain: BUG-083 → BUG-084 → BUG-085. |

---

## 10. QA Assertions For Future QA Agent

| Bug | QA Assertion | Test Flow | Expected Result | Evidence Required |
|---|---|---|---|---|
| BUG-082 | Socket event mapping does not break live order popup/state sync | Emit `scan-new-order` with approved structure → verify ScanOrderPopOut appears + dashboard order list + table engage | Popup triggers for `orderFrom === 'web' && fOrderStatus === 7`; POS orders do not trigger popup; table engage and order state sync correctly | Socket trace + UI screenshots + console logs |
| BUG-082 | Legacy fallback behaviour is intentional | If fallback retained: emit event with missing `order_from` → verify fallback fills `'web'`. If fallback retired: verify no fallback code remains. | Consistent with the approved implementation option | Code diff + live test |
| BUG-083 | Delivery GST is sent only for delivery and zero/absent for non-delivery per approved contract | Place delivery order with `deliver_charge_gst > 0` → inspect payload. Place dine-in order → inspect payload. | Delivery: separate key present with correct value. Non-delivery: key absent or `0` per contract. | Payload captures for both order types |
| BUG-083 | Composite `gst_tax` remains numerically correct per approved contract | Compare `gst_tax` with component sum | Sum matches approved policy (inclusive or exclusive of delivery GST) | Payload comparison |
| BUG-084 | GST totals do not double count CGST/SGST components | Place order with all GST components → verify per-component sum == composite total | `item_cgst + item_sgst + sc_cgst + sc_sgst + tip_cgst + tip_sgst + del_cgst + del_sgst == cgst_amount + sgst_amount == gst_tax` | Payload numerical verification |
| BUG-084 | VAT-only tenants unaffected | Place VAT order → verify no spurious CGST/SGST fields | VAT flow unchanged; no CGST/SGST keys (or all zero) | Payload capture on VAT tenant |
| BUG-085 | Print template shows approved GST/tax fields only | Print dine-in bill with SC + Tip → inspect receipt. Print delivery bill → inspect receipt. | Each approved GST component appears exactly once; totals match frontend payload | Printed bill scan/photo + payload comparison |
| BUG-085 | Bean Me Up print double-count risk is not introduced or worsened | Print delivery bill on Bean Me Up (id=742) → inspect GST lines and total | No double-counting; delivery GST correctly separated; total matches `order_amount` | Printed bill on Bean Me Up tenant |
| BUG-085 | Reports/dashboard totals remain consistent with backend source of truth | After GST field changes, compare dashboard order total with backend report total for the same order | Must match | Dashboard screenshot + backend report API response |

---

## 11. Handoff To Backend Source-of-Truth Audit

### Ready-to-Copy Backend Audit Prompt

```
BACKEND SOURCE-OF-TRUTH AUDIT — POS2.0 Phase 3 Bugs

Scope: BUG-082, BUG-083, BUG-084, BUG-085

QUESTIONS REQUIRING BACKEND ANSWERS:

BUG-082 — Socket Contract:
1. For `scan-new-order` socket event: is message[4] a primitive string ('web') or a full payload object (orders array)?
2. For `new-order` socket event: same structure as `scan-new-order`?
3. Does `single-order-new` API now reliably include `order_from='web'` for web/QR orders?
4. Should frontend retire the channel-based `order_from='web'` fallback (socketHandlers.js:508-511)?

BUG-083 — Delivery GST Key:
5. Exact backend key name for delivery charge GST amount?
6. Should composite `gst_tax` continue to include delivery GST (DEL-001 policy) or exclude it?
7. Which endpoints accept this field? (place, update, collect-bill, print, transfer-to-room)
8. Does backend persist this field? Does it appear in reports?
9. Does the print template render it?
10. Non-delivery orders: key sent as 0 or absent?

BUG-084 — Per-Component CGST/SGST:
11. Exact per-component CGST/SGST key names for item, SC, Tip, Delivery?
12. Should composite keys (cgst_amount, sgst_amount, gst_tax, service_gst_tax_amount, tip_tax_amount) be retained alongside?
13. How does backend avoid double-counting if both levels present?
14. Which payload flows need per-component keys?

BUG-085 — Print Template:
15. Is the print template purely payload-driven or does it re-derive GST?
16. Which per-component GST fields will the template render?
17. How will the template avoid double-counting?
18. Is a template update planned/scheduled?
19. Does the current template perform independent GST computation?

REQUIRED EVIDENCE FORMAT:
- For socket questions: socket contract spec or live socket message sample
- For payload questions: backend schema / accepted field list / sample request-response
- For print questions: template field list or template source extract
- For each answer: confirm whether the answer applies to ALL endpoints or specific ones

BLOCKERS:
- BUG-082: cannot change socket parser or retire fallback without Q1-Q4 answers
- BUG-083: cannot add delivery GST key without Q5-Q10 answers
- BUG-084: cannot add per-component keys without Q11-Q14 answers (depends on BUG-083)
- BUG-085: cannot enrich print payload until template is confirmed to support new fields (Q15-Q19)
```

---

## 12. Handoff To Master Planning Agent

The master planning agent should treat BUG-082, BUG-083, BUG-084, BUG-085 as follows:

### BUG-082 — Socket Contract Clarification

- **Status:** Blocked by backend contract confirmation (Q-082-1 through Q-082-4) and one owner clarification (Q-082-O1).
- **Dependency chain:** Independent of BUG-083/084/085.
- **Master plan entry condition:** Backend confirms socket message structure + `order_from` reliability. Owner resolves SCAN-003 wording conflict.
- **Implementation risk after unblock:** Low-to-medium (parser change or fallback retirement; localized to socket handlers).

### BUG-083 — Delivery GST Key

- **Status:** Blocked by backend contract confirmation (Q-083-1 through Q-083-6).
- **Dependency chain:** BUG-084 and BUG-085 depend on BUG-083 for delivery GST component.
- **Master plan entry condition:** Backend confirms key name + composite policy + endpoint acceptance.
- **Implementation risk after unblock:** Medium (touches `calcOrderTotals` return, all payload builders; regression risk on composite `gst_tax` value).

### BUG-084 — Per-Component CGST/SGST

- **Status:** Blocked by backend contract confirmation (Q-084-1 through Q-084-4).
- **Dependency chain:** Depends on BUG-083 for delivery component. BUG-085 depends on BUG-084 for print payload fields.
- **Master plan entry condition:** Backend confirms per-component key names + composite retention.
- **Implementation risk after unblock:** Medium-to-high (multiple payload builders; double-count audit required).

### BUG-085 — Print Template GST Display

- **Status:** Blocked by backend template confirmation (Q-085-1 through Q-085-5) and one owner question (Q-085-O1).
- **Dependency chain:** Last in chain — depends on BUG-083 + BUG-084 for field definitions, AND backend template update.
- **Master plan entry condition:** Backend confirms template adoption + double-count protection. Owner approves receipt layout.
- **Implementation risk after unblock:** Medium (additive payload fields; template must be updated first).
- **Ordering:** BUG-085 should be the LAST of the four bugs to be implemented, after BUG-083 → BUG-084 → backend template update.

### Recommended Implementation Order (After All Unblocked)

1. **BUG-082** (independent)
2. **BUG-083** (delivery GST key — prerequisite for 084/085)
3. **BUG-084** (per-component CGST/SGST — prerequisite for 085)
4. **BUG-085** (print template — last, after backend template update)

---

## 13. Final Status

**`backend_source_of_truth_bug_planning_created_with_owner_questions`**

- **19 backend questions** created across all 4 bugs.
- **2 owner questions** created (BUG-082 SCAN-003 wording conflict; BUG-085 receipt layout approval).
- BUG-082, BUG-083, BUG-084 can enter master plan **after backend answers**.
- BUG-085 requires **backend template update first** in addition to backend answers.
- **No code was changed.**
- **`/app/memory/final/` was not updated.**
- **Pending freeze doc was not updated.**

---

*— End of Phase 3 Backend Source-of-Truth Bug Planning —*
