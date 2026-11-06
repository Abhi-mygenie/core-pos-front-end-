# CR-513 — Impact Analysis (Gate 2)

**Date:** 2026-11-06
**Role:** PLANNING (Role 2) — Stage: Impact Analysis ONLY (no Implementation Plan, no code)
**Intake:** `change_requests/CR-513_ORDER_TEMP_STORE_DISCOUNT_PERCENTAGE_ROUNDOFF_INTAKE.md`
**Code Reality:** **NONE** — `discount_percentage` / `roundoff` emitted by no payload builder (grep 0 hits in `src/`).
**Risk:** **CRITICAL** (printing + discount + customer-facing bill) — unchanged from intake.
**Evidence:** `evidence/CR-513/CR-513_order_temp_store_probe_2026_11_06.json` (owner) · `evidence/CR-513/CR-513_order_source_field_probe_2026_11_06.json` (this session, sanitized, token masked)

---

## 0. Conflict Pre-Check

| Item | Status | Touches | Conflict? |
|---|---|---|---|
| **BUG-592** | GATE_1_INTAKE_COMPLETE (P0) | `orderTransform.js` L234 `discount` fallback + `buildBillPrintPayload` L2165 `discount_amount` | **YES — same line L2165 + same source L234.** Must be sequenced: BUG-592 fixes the ₹ value; CR-513 adds a sibling key. Recommend **one plan / one implementation pass** (or CR-513 strictly AFTER BUG-592). |
| **CR-502** | GATE_1_INTAKE_COMPLETE | Round-off in print payload, all paths (`orderTransform.js`, `CollectPaymentPanel.jsx`) | **YES — identical scope for `roundoff`.** OD-502-01 (key name) answered = `roundoff`. Recommend CR-502 FE-payload scope SUBSUMED into CR-513 (OD-513-03). |
| **CR-487** | registry: GATE_2_PLANNING / CR_REGISTRY.md: FROZEN — TRACKING ONLY (drift) | Bill content (Printer Agent template) | Indirect — CR-513 is its FE enabler. OD-487-04 answered = `discount_percentage`. |
| BUG-641 | GATE_5A_IMPLEMENTED | `buildBillPrintPayload` L1869 (billFoodList comp) | Same function, different region → parallel-safe, but QA must re-run BUG-641 print check. |
| BUG-639 / BUG-646 / BUG-647 | Gate 3 / investigation | `orderTransform.js` other functions (updateOrder, tax) | Same file, different functions → parallel-safe; merge-order note only. |
| CR-479 (2026-11-01) | IMPLEMENTED | `orderTransform.js` order payloads (cust_country_code) | Last FILE_OWNERSHIP modifier; not print payload → no conflict. |

R5 hotspots in scope: `orderTransform.js` (certain), `OrderEntry.jsx` + `CollectPaymentPanel.jsx` (depending on OD-513-04 path scope). **3 hotspot files → Owner Approval Matrix applies at Gate 4.**

---

## 1. Data Flow

```
UI / order source ──► caller builds `overrides` ──► printOrder() (orderService.js L139)
     ──► toAPI.buildBillPrintPayload(order, scPct, overrides) (orderTransform.js L1809)
     ──► POST /api/v1/vendoremployee/order-temp-store ──► Printer Agent template
```

Two branches inside the builder (BUG-168 v3, L1897): **Collect-Bill branch** (`overrides.orderItemTotal` defined → FE live values) and **Manual-print branch** (no financial overrides → backend values from `order`). Both end at the same return object (L2149-2257) where the new keys would be added next to `discount_amount` (L2165).

---

## 2. Source Map — per print path

### 2a. Live-source paths (values exist in FE state today) ✅

| # | Path | Caller | Override object | Discount % source | Round-off source |
|---|---|---|---|---|---|
| P1 | Collect Payment → **Print Bill** button | `CollectPaymentPanel.jsx` `handlePrintBill` L1289-1336 → `OrderEntry.jsx` `onPrintBill` L2184-2207 | CPP local `overrides` | `discountType==='percent' ? discountValue` (L701) and/or `selectedDiscountType.discountPercent` (preset, L697) | CPP `roundOff` (L817 = `finalTotal − rawFinalTotal`, CR-170, may be negative) |
| P2 | Prepaid Place+Pay **auto-print** (new order) | `OrderEntry.jsx` `autoPrintOverrides` L2287-2309 | built from `paymentData` | `paymentData.discounts.orderDiscountPercent` / `.presetDiscountPercent` (CPP L1216-1217) | `paymentData.roundOff` (CPP L1196) |
| P3 | Postpaid Collect-Bill **auto-print** | `OrderEntry.jsx` `collectBillOverrides` L2574-2603 | `paymentData` | same as P2 | same as P2 |
| P4a | QSR Place&Pay auto-print (sync) | `OrderEntry.jsx` ~L1716-1738 | `paymentData` | same as P2 | same as P2 |
| P4b | QSR Place&Pay auto-print (background, BUG-112) | `OrderEntry.jsx` ~L1757-1781 | `paymentData` | same as P2 | same as P2 |
| P4c | QSR Pay auto-print | `OrderEntry.jsx` ~L1835-1858 | `paymentData` | same as P2 | same as P2 |

All 6 = Collect-Bill branch. Values are already computed — the change is **threading 2 extra override keys** at each override-construction site (5 sites in OrderEntry + 1 in CPP) plus 2 keys in the builder. Note P4a/b/c and P3 omit `loyaltyAmount`/`restaurantPhone` inconsistently today — out of scope, do not "fix" (R14).

### 2b. Backend-source paths (Manual-print branch) ⚠

| # | Path | Caller | `order` comes from | Fields available in that API (probed 2026-11-06) |
|---|---|---|---|---|
| P5 | Dashboard reprint — OrderCard / TableCard / RePrintButton | `OrderCard.jsx` L255 · `TableCard.jsx` L228 · `RePrintButton.jsx` L115 | OrderContext (`employee-orders-list` at boot; **`get-single-order-new` on every socket refresh** — `fetchSingleOrderForSocket`, orderService.js L34) | `employee-orders-list`: `discount_value`, `order_discount`, `restaurant_discount_amount`, `order_discount_json` — **NO `order_discount_type`, NO `round_up`**. `get-single-order-new`: **NO discount fields at all, NO `round_up`** (only `room_discount`). |
| P6 | Reports reprint — Audit (AllOrdersReportPage L820-857) · Order Report Beta (L330-352) · OrderDetailSheet (L490-507) | each re-fetches `get-single-order-new` → `fromAPI.order` | `get-single-order-new` → **nothing** to source from. BUT the report **row** (`order-logs-report` `orders_table`) carries `discount_value` + `order_discount_type` ('Percent'/'Fixed') + `round_up` ✅ |
| P7 | PMS — PmsCheckoutDrawer L114-120 · FolioCheckoutPanel L300-302 | `get-single-order-new` | nothing to source from |

**Probe facts** (evidence file 2): order 1537042 paid, `discount_value=10.00`, `order_discount_type=Percent`, `restaurant_discount_amount=41`, `round_up=0.55` in order-logs-report; the same order via `get-single-order-new` has none of these keys. Flat example 1534579: `discount_value=3.00`, `order_discount_type=Fixed`.

**Consequences for P5-P7:**
1. `discount_percentage` cannot be reliably derived FE-side: `discount_value` is the raw input (% OR ₹) and its type is not exposed in the running-orders/single-order APIs. Deriving `% = restaurant_discount_amount / discountableSubtotal` is inexact (give_discount='No' items, rounding) → **not recommended for a CRITICAL financial print**.
2. `roundoff` is not exposed at all in running/single-order APIs.
3. **Side finding (relevant to BUG-592):** after any socket refresh the order is rebuilt from `get-single-order-new`, so `order.discount` (L234) becomes 0 → dashboard reprint `discount_amount` can silently drop to 0. Hand to BUG-592 planning; not CR-513 scope.
4. **Side finding (pre-existing, out of scope):** PMS callers pass `order.rawOrderDetails ?? order` — an array — as `order`, so most `order.*` reads in the builder are undefined on P7. Log as OPEN GAP candidate; do not touch under CR-513.

---

## 3. Recommended Scope Options (owner chooses — OD-513-04)

| Option | Paths | Files | Backend | Risk to existing bills |
|---|---|---|---|---|
| **A (recommended)** | P1-P4 (6 live sites). P5-P7 send `0` (absent-equivalent; backend treats absent as 0) | `orderTransform.js` (builder +2 keys) · `CollectPaymentPanel.jsx` (+2 keys in `handlePrintBill`) · `OrderEntry.jsx` (+2 keys × 5 sites) | none | Additive only |
| B | A + P6 report reprints using report-row values passed as overrides (`discountPercent`, `roundoff`) | A + 3 report files (non-R5) | none | Additive; but row data ≠ re-fetched order for edited orders |
| C | A + P5-P7 from `order` after backend exposes `order_discount_type` + `round_up` in `employee-orders-list` and `get-single-order-new` | A + `fromAPI.order` mapping (2 new fields) | **Backend brief required** (`backend_briefs/BACKEND_BRIEF_CR-513_2026_11_06.md`) | Additive; blocked until backend ships |

Recommended: **A now, C as follow-up** (B is a stop-gap that creates a second source of truth).

---

## 4. Affected Files (estimate)

| File | R5 | Option A edits |
|---|:---:|---|
| `src/api/transforms/orderTransform.js` | YES | `buildBillPrintPayload` return: +`discount_percentage`, +`roundoff` beside L2165 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | YES | `handlePrintBill` overrides (L1295-1334): +`discountPercent`, +`roundoff` |
| `src/components/order-entry/OrderEntry.jsx` | YES | +2 keys in 5 override objects (L~1719, ~1760, ~1840, L2287, L2574) |
| `fromAPI.order` (same file) | YES | Option C only |

Estimated lines: Option A ≈ 14-16 changed lines across 3 hotspot files. **Blast radius re-graded: SMALL → MEDIUM (3 files, all R5).** Fast Lane: NO.

---

## 5. Downstream Consumers

- Only consumer of the new keys = backend `order-temp-store` → Printer Agent template. No FE UI reads the print payload.
- `discount_amount`, `coupon_discount`, totals, GST untouched → no change to any existing printed number.
- Printer Agent template rendering of the two keys = **UNKNOWN** (Printer Agent team; CR-487 OD-487-06). If the template ignores them, bills look identical to today (safe).

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Mixed discounts: `discount_amount` = manual + preset + coupon (CPP L1294). A "(50%)" label next to a total that includes a coupon would be misleading | OD-513-06 |
| R2 | ~~Manual % and preset % both non-zero~~ — **CORRECTED 2026-11-06 (owner):** current functionality allows only ONE discount at a time; this IA missed that rule | Send the single active % (OD-513-06 LOCKED) |
| R3 | Round-off sign: FE `roundOff` can be negative (CR-170 floor case); report `round_up` samples are all ≥0 | OD-513-07 LOCKED = signed (option c). Template must render +/− |
| R4 | Room orders: CPP `roundOff` is food-only; Grand Total includes room balance | Template concern; document only |
| R5 | Same lines as BUG-592 | OD-513-08 LOCKED = (i) one combined plan + one coding pass |
| R6 | 3 R5 hotspot files | Owner Approval Matrix at Gate 4; QA regression: BUG-001/002/273/281/556/641 print payloads unchanged except 2 new keys |

## 7. Owner Decisions

Carried from intake: OD-513-01 (print % label) · OD-513-02 (print round-off line / when ₹0) · OD-513-03 (subsume CR-502 FE scope + CR-487 enabler) · OD-513-05 (flat ₹ discount → `discount_percentage` 0 or computed %).

Updated / new at Gate 2:
- **OD-513-04 (UPDATED):** Scope option **A / B / C** (§3). Agent recommends A now + C follow-up.
- **OD-513-06 (NEW):** Which % goes into `discount_percentage` — manual % only, preset % only, or whichever is active (manual wins)? Coupon never contributes. Agent recommends "active one; 0 for flat/coupon-only".
- **OD-513-07 (NEW):** `roundoff` sign — send signed (e.g. `-0.30`) or absolute? Agent recommends signed (matches CR-170 `round_up` contract on collect-bill).
- **OD-513-08 (NEW):** Sequence with BUG-592 — combined plan, or CR-513 after BUG-592?
- OD-513-09 (LOCKED from intake OD-513-06): both fields optional — YES.

## 8. Backend Ask (only if Option C chosen)

Expose `order_discount_type` and `round_up` (already stored — present in `order-logs-report`) in `GET employee-orders-list` and `POST get-single-order-new`. Brief to be written at Gate 3 if owner picks C.

## Next
Owner answers OD-513-04/06/07/08 (+ intake ODs) → **Gate 3 GO** → Implementation Plan (Verification Matrix + Registry Checklist).

---

## 9. Owner Decisions — LOCKED (2026-11-06)

| OD | Decision | Status |
|---|---|---|
| OD-513-06 | Only ONE discount can be active at a time (existing functionality — IA R2 corrected). `discount_percentage` = the active discount's % (manual % or preset %). No summing. Coupon never contributes. Flat ₹ handling = OD-513-05 (open). | **LOCKED** |
| OD-513-07 | `roundoff` sent **signed** — positive when rounded up, negative when rounded down (CR-170 floor case, e.g. ₹100.04 → ₹100 = −0.04). Option (c). | **LOCKED** |
| OD-513-08 | **(i)** One combined Implementation Plan + one coding pass for CR-513 + BUG-592 FE-side fix (`fromAPI.order` L234 fallback), so ₹ amount and % stay consistent. BUG-592 backend part (populate `restaurant_discount_amount` at prepaid order creation) remains a backend dependency. | **LOCKED** |
| PMS paths (P7) | Out of CR-513 scope → separate follow-up CR (includes `rawOrderDetails ?? order` gap). | **LOCKED (deferred)** |
| OD-513-09 | Both fields optional | **LOCKED** |

**Still OPEN before Gate 3:** OD-513-04 (scope A/B/C — agent recommends A + C follow-up) · intake OD-513-01 (print % label), OD-513-02 (round-off line / when ₹0), OD-513-03 (subsume CR-502 FE scope + CR-487 enabler — agent recommends YES), OD-513-05 (flat ₹ → 0 or computed % — agent recommends 0, consistent with OD-06).

**Gate 3 implications of OD-08 (i):** plan must also cover BUG-592 FE edit at `fromAPI.order` L234 and the socket-refresh finding (§2b item 3: `get-single-order-new` has no discount fields → `order.discount` resets to 0). Plan doc name: `plans/CR-513_BUG-592_IMPLEMENTATION_PLAN.md`.

## 10. Owner Decisions — Round 3 (2026-11-06)

| OD | Decision | Status |
|---|---|---|
| OD-513-04 | **Option A** — send fields on the 6 live paths (P1, P2, P3, P4a/b/c). Files: `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` (all R5). | **LOCKED** |
| OD-513-01 | Whether/how % label prints = **Printer Agent team** (template). Not an FE decision. | **CLOSED — N/A for FE** |
| OD-513-02 | Whether/how round-off line prints = **Printer Agent team**. Not an FE decision. | **CLOSED — N/A for FE** |
| OD-513-03 | Owner: "done by printer agent". Agent clarification asked: OD-03 was about registry overlap (CR-502 FE payload scope + CR-487 enabler) — pending. | **CLARIFICATION PENDING** |
| OD-513-05 | Flat ₹ discount → **"passing nothing"**. Agent interpretation: omit `discount_percentage` key (not `0`). Confirmation pending (also for no-discount orders and P5-P7 reprint paths). | **PENDING CONFIRM** |

## 11. Owner Decisions — Round 4 (2026-11-06)

| OD | Decision | Status |
|---|---|---|
| OD-513-05 | `discount_percentage` **omitted** (key not sent) for flat ₹ discount AND when no discount applies. "Nothing should be sent." Also omitted on non-Option-A paths (no source). | **LOCKED** |
| OD-513-10 (NEW) | `roundoff` **omitted** (key not sent) when value is ₹0.00. Non-zero → signed value (OD-07). | **LOCKED** |
| OD-513-03 | Owner asked for walkthrough of CR-502 / CR-487 before deciding. | **OPEN** |

Supersedes §3 Option A note "P5-P7 send 0" → P5-P7 send **nothing** (keys omitted).

## 12. Consolidation (2026-11-06)

**OD-513-03 LOCKED:** owner — CR-487 and CR-502 are duplicates → **SUBSUMED into CR-513**. One CR, one planning cycle, one coding pass (with BUG-592 FE fix per OD-08).

Answers carried over from the absorbed CRs:
- CR-502 OD-01 key name → `roundoff` · OD-02 ₹0 → omitted (OD-513-10) · OD-03 paths → see open confirmation Q1 below · OD-04 template → Printer Agent team.
- CR-487 OD-01 flat → `discount_percentage` omitted (OD-513-05) · OD-04 FE field → `discount_percentage` · OD-06 template owned by Printer Agent team.

**Open confirmations before Gate 3 (asked in chat):**
- Q1: CR-502 asked for round-off on ALL print paths. Option A covers the 6 live paths. Dashboard / report reprints have no source in `employee-orders-list` / `get-single-order-new` → keys omitted there unless backend exposes `round_up` + `order_discount_type`. Keep reprint paths as "send nothing"?
- Q2: BUG-592 backend part (populate `restaurant_discount_amount` at prepaid order creation) — done by backend, or still pending?
