# CR-494 — Per-Action PIN + ₹ Thresholds + Daily Per-User Limits — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: NONE (no PIN dialog/flow; `components/ui/input-otp.jsx` exists, unused for this).
Risk: CRITICAL (cancel, discount, comp, bill edit; R5/R6). Backend-blocked: YES — fully.

## Owner decision (locked)
Separate restaurant PIN per action: cancel before serve, cancel after serve, cancel after bill, order edit after bill, discount, complimentary. Per-action ₹ threshold (≤ → no PIN, > → PIN, 0 = always). Daily per-user ₹+count limits for cancels AND discounts, same for all users; over → allowed with PIN. Config in backend admin (phase 1).

## Probe findings
- No PIN verify endpoint (guessed paths → 404, probe 30). No PIN/threshold/limit keys in profile or settings-list (probes 02/03).
- Existing related keys: `cancel_order_time=5`, `cancel_food_timings=5`, `allow_cancel_post_server/cancle_post_serve="Yes"`, `order_edit_access`, `role_base_discount`.
- Serve state is server-derived (`cancel_type` stored as Pre-Cooking etc., probe 24); FE uses `item.status` (`orderTransform.js` L1003). "After bill" = `billPrinted` flag (OrderCard L122, TableCard L146).

## Action → FE hook points
| Action | Entry point |
|---|---|
| Cancel item (before/after serve) | OrderEntry.jsx L1534 handleCancelFood (+CancelFoodModal) |
| Cancel order | OrderEntry.jsx L1565, DashboardPage.jsx L1375 |
| Cancel after bill | same, condition billPrinted |
| Order edit after bill | OrderCard/TableCard isEditLocked (CR-489, `order_edit_access`) |
| Discount | CollectPaymentPanel.jsx L390-423 apply discount + preset select L1494 |
| Complimentary | CPP L2499-2515, MarkCompModal, OrderEntry L1068-1097 |
New: shared PIN dialog component + amount calc per action.

## Open owner decisions
- OD-494-A: amount for a cancel = item line total incl. tax, or before tax? Order cancel = order total? OPEN.
- OD-494-B: discount threshold measured in ₹ of discount or % of bill? OPEN.
- OD-494-C: daily limit counter must be server-side (FE cannot count across devices) — confirm backend owns the counter. OPEN.
- OD-494-D: interaction with existing `order_edit_access` right (CR-489): right holder skips PIN, or PIN applies to everyone? OPEN.

## Owner review 2026-11-14 (round 2)
- Owner: "this is completely new CR" (re: no PIN/threshold/limit keys or endpoints exist). Meaning to confirm — OD-494-E: register the backend PIN/limits work as a separate new CR, or keep in CR-494 as all-new build? OPEN.

- Owner 2026-11-14 round 3: **OD-494-E = b — keep everything inside CR-494, all-new build** (no separate CR).

- Owner 2026-11-14 round 4: **OD-494-A = cancel amount INCLUDING tax** for threshold check.

## Backend asks
- B-494-1: PIN verify endpoint (action, pin) → ok/fail, no PIN ever sent to FE.
- B-494-2: settings keys: 6 thresholds, daily cancel ₹/count, daily discount ₹/count.
- B-494-3: per-user daily usage endpoint (or verify response says "limit exceeded → PIN required").
- B-494-4: server-side enforcement (reject cancel/discount/comp above threshold without PIN token).
- B-494-5: backend admin screen for PINs/thresholds/limits.
