# BUG-097 Bucket 4 — Assign Rider Modal & API
## Owner Approval Plan
**Date:** 2026-05-20
**Status:** AWAITING OWNER APPROVAL — no code changes yet
**Scope:** Bucket 4 ONLY. Bucket 5 (Rider Accept/Reject socket events) is OUT OF SCOPE (still blocked on BQ-097-2 / BQ-097-3).

---

## 1. Prior-Bucket QA Snapshot (pre-flight check)

| Bucket | Implementation | QA Status |
|---|---|---|
| 0 Runtime verification | ✅ Done | ✅ Owner confirmed (delivery field names + `delivery_assign` profile flag) |
| 1 Transform + foundation | ✅ Done | ✅ Owner-accepted (Bucket 1 corrective approval doc closed) |
| 2 Dispatch API (`order-status-update` PUT) | ✅ Done | ✅ Owner-tested live — "Dispatch works" (405→PUT fix verified) |
| 2.5 Button labels (Handover / Delivered) | ✅ Done | 🟡 Screenshot-confirmed only (visual) — owner reply "its works any other test" treated as soft-pass. Live API smoke for Handover (Print-Bill on delivery order at status=5) NOT yet owner-validated end-to-end. |
| 3 Delivered via Collect Bill | (label only; existing flow) | 🟡 Same as 2.5 — no incremental backend change to test |

**Action item before starting Bucket 4 code:** Owner to confirm whether the Handover smoke (Card "Handover" button → CartPanel "Delivered ₹xxx" button → bill collected → order → paid + dashboard updates) is acceptably tested, OR park Bucket 4 implementation until that QA is signed off. Per user directive 2026-05-20, **do not mark previous buckets QA-passed** until this confirmation lands.

---

## 2. Bucket 4 Scope (frozen with user 2026-05-20)

### 2.1 What's in
1. Add `getDeliveryEmployees()` service call → `GET /api/v1/vendoremployee/delivery-employee-list`.
2. Add `assignDeliveryRider({order_id, delivery_man_id})` service call → `POST /api/v1/vendoremployee/delivery-order-assign`.
3. New `AssignRiderModal.jsx` component:
   - Single-select rider list (radio-style).
   - No filtering — show ALL employees returned by the endpoint (per user: no `role` field exists yet).
   - Loading state while fetching.
   - Error state with retry.
   - Empty state ("No riders available").
   - Confirm button → calls assign API → toast on success → close → parent re-fetches/socket-refreshes order.
4. Wire OrderCard "Assign Rider" button (currently a `console.log` stub at L863) to open the modal.
5. Wire TableCard "Assign" button (currently `console.log` stub at L450) to open the modal.
6. After successful assignment, the OrderCard rider chip (already rendered at L750–773 for `!isOwn` delivery orders) should also render for `isOwn` delivery orders so the assigned rider name + phone surface on the card immediately.
7. Add a small "Assigned" / "Reached" status badge alongside the rider name, sourced from existing `order.riderStatus` computed in `orderTransform.js` (already mapped at L304–309).

### 2.2 What's explicitly OUT
- ❌ Rider accept/reject socket handling (Bucket 5 — blocked on backend answers).
- ❌ Multi-rider assignment.
- ❌ Role/availability filter on rider list (backend gives no such field today).
- ❌ Re-assign / change-rider flow once a rider is already assigned (deferred — owner can request as a follow-up bucket).
- ❌ Cancel rider assignment (`delivery-order-cancel` endpoint is reserved in `constants.js` but NOT wired in this bucket).
- ❌ Any change to `DeliveryCard.jsx` (legacy/unused; leave intact).
- ❌ Any change to `/app/memory/final/` baseline docs.

### 2.3 Source-of-truth rules (re-stated, unchanged)
- Dispatch vs Assign decision is driven ONLY by `restaurant.features.deliveryAssign` (profile setting).
- `order_in` / `source` MUST NOT influence Dispatch vs Assign branching.
- Active card surfaces are `OrderCard.jsx` (Order View) and `TableCard.jsx` (Table View).
- `DeliveryCard.jsx` stays untouched.

---

## 3. API Contract Assumptions (to be validated at runtime)

### 3.1 `GET /api/v1/vendoremployee/delivery-employee-list`
- Auth: standard vendor-employee bearer (same as other v1 calls).
- Expected response shape (assumption — confirm during smoke):
  ```json
  {
    "status": true,
    "message": "...",
    "data": [
      { "id": <int>, "f_name": "...", "l_name": "...", "phone": "...", "image": "..." , ... }
    ]
  }
  ```
- The service will normalize each row to `{ id, fullName, phone, image }`. Unknown extra fields preserved on `_raw`.

### 3.2 `POST /api/v1/vendoremployee/delivery-order-assign`
- Body (assumption — confirm during smoke):
  ```json
  { "order_id": <int>, "delivery_man_id": <int> }
  ```
- Expected response: `{ status: true, message: "..." }` (or similar). Service treats `status:true` (or HTTP 2xx with no `status` field) as success; anything else → throws with `readableMessage`.
- If backend requires extra fields (e.g. `role_name`, `restaurant_id`), owner to flag during smoke and the service is updated additively.

**Risk if assumptions are wrong:** First live call may 422 / 400. Mitigation: payload is intentionally minimal; we add fields based on real backend echo, not guesses.

---

## 4. UX Layout (text wireframe)

```
┌──────────────────────────────────────────┐
│  Assign Rider                        [X] │
│  Order #ORD-1234  •  ₹450               │
├──────────────────────────────────────────┤
│ ○  Ravi Kumar          • 98765 43210    │
│ ○  Suman Patel         • 98712 33456    │
│ ●  Anil Sharma         • 90011 22334    │
│ ○  Pooja Singh         • 89999 88712    │
│   …                                      │
├──────────────────────────────────────────┤
│  [ Cancel ]            [ Assign Rider ]  │
└──────────────────────────────────────────┘
```
- Single-select radio (only one row at a time).
- Confirm button disabled until a row is picked.
- Loading skeleton while list loads. Error banner with "Retry" if list fetch fails.
- Modal closes on backdrop click (consistent with `StationPickerModal`).

---

## 5. Files To Be Touched (count + intent)

| # | File | Type | Intent |
|---|---|---|---|
| 1 | `api/services/deliveryService.js` | EDIT | Add `getDeliveryEmployees()` + `assignDeliveryRider()` functions. |
| 2 | `components/modals/AssignRiderModal.jsx` | NEW | Modal component (single-select, all-riders, no filter). |
| 3 | `components/cards/OrderCard.jsx` | EDIT | Replace `console.log` stub at L863 with modal open; lift rider chip gate from `!isOwn` to `hasRiderAssigned || !isOwn`; add status badge from `order.riderStatus`. |
| 4 | `components/cards/TableCard.jsx` | EDIT | Replace `console.log` stub at L450 with modal open; same chip+badge for `isOwn` delivery orders (TableCard does not currently render a rider chip — defer chip to OrderCard only if user prefers; flagged below as **OPEN QUESTION TC-1**). |

Total: **3 edits + 1 new file**. No transform changes, no constants changes, no context-provider changes.

---

## 6. Open Questions for Owner (before code)

**OQ-B4-1.** Are you OK with current Handover-flow QA status (screenshot-only) being treated as soft-pass for Bucket 4 to start, OR do you want a live Handover end-to-end smoke first?
**OQ-B4-2.** Should the rider chip + status badge also be rendered on `TableCard.jsx` (Table View), or kept OrderCard-only? (TableCard does not currently render a rider chip at all.)
**OQ-B4-3.** Confirm `delivery-order-assign` payload shape — `{order_id, delivery_man_id}` only? Or does backend need anything else (`role_name`, `restaurant_id`)? If unknown, we will smoke with minimal payload and patch additively on the first failure.
**OQ-B4-4.** Once a rider is assigned, do we keep the "Assign Rider" button visible to allow re-assignment, OR hide it entirely (current Bucket 4 plan = HIDE; re-assign deferred)? Confirm hide.

---

## 7. Owner Sign-Off Checklist

Before agent writes any code, owner must reply:
- [ ] Section 2.1 scope frozen as-is, OR diffs.
- [ ] Section 2.2 out-of-scope confirmed, OR moves into scope.
- [ ] Section 3 API assumptions acceptable as smoke target.
- [ ] Section 5 file list acceptable.
- [ ] All four OQ-B4-* answered.

Once owner replies "approved", agent will:
1. Generate the exact diff preview (companion doc `POS3_0_BUG_097_BUCKET_4_DIFF_PREVIEW_2026_05_20.md`).
2. **Stop again** for owner ack on the diff.
3. Only then implement.

---

## 8. Non-goals reminder

- No socket handler additions in this bucket.
- No `/app/memory/final/` baseline doc updates in this bucket.
- No changes to dispatch (Bucket 2) wiring — that stays exactly as deployed.
