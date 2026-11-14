# BATCH-A — Impact Analysis Summary (Gate 2) — 2026-11-14

Role: PLANNING (Gate 2 only). Owner GO: "planning role for impact analysis of batch A, do every probe, don't assume anything".
Scope: all 13 items in one go (owner choice). Zero source code changes. Gate 3 NOT started.
Probe account: cafe103 owner alias (RID 644). Credentials NOT stored (owner: session only). Tokens masked `***` in all evidence.
Write probes owner-approved on test orders only: #021537 (id 1578756) and #021538 (id 1578757), both cancelled (clean).

## Evidence index — `/app/memory/evidence/BATCH-A-IA/probes_2026_11_14/`
| File | What it proves |
|---|---|
| 01_login_masked.json | Login `role[]` for Owner = 52 keys; NO `complementary_food`, no reprint / pay-later / PIN keys |
| 02_profile.json | `restaurants[0].complementary="No"`, `cancel_order_time=5`, `cancel_food_timings=5`, `allow_cancel_post_server="Yes"`, `restaurant_discount_type[0]` = "Complementary" 100% |
| 03_settings_list.json | No PIN / threshold / daily-limit / notes-mandatory / meal-package keys |
| 04/05/07 role lists | Backend module catalogue (55 keys). `complementary_food` (id 102) EXISTS; Owner role-master default includes it but this owner login does not have it. `update_payment` (23), `order_unpaid` (22), `print_icon` (96), `clear_payment` (26), `printer` (11, backend) exist |
| 06_cancellation_reasons.json | Needs `limit`+`offset` (403 without). 12 reasons, `item_type` Order / Food |
| 08_cancel_order_list_*.json | Order row returns `cancellation_reason`, `cancellation_note`, `cancel_state`; line returns `reason_type`, `reason`, `cancel_type`; NO line note field |
| 09_order_beta_combined.json | Order Beta row has NO cancellation reason / note / comp fields |
| 10_insights_cancellations.json | Items carry `reason` + `notes`; "No reason provided" = 5 cancels in Nov 1–14 (reason not always enforced at source) |
| 20–26 (write probe) | See below |
| 30_missing_endpoint_probes.txt | Guessed PIN / notification-pref / cancel-config endpoints → all 404 |
| 31/32 comp probe | Backend ACCEPTED `is_complementary=Yes` + `complementary_reason` from a user WITHOUT `complementary_food` |
| batch_a_write_probe.py | Re-runnable probe script |

## Write-probe results (R11)
1. **Item cancel note (BUG-670):** sent `cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note` on `PUT cancel-food-item` → 200, **none stored or returned**. Backend has no item cancel-note field.
2. **Order cancel note (BUG-674):** `PUT order-status-update` `cancellation_note:"custom"` → stored, returned in cancel-order-list. FE today sends `reasonNote || reasonText` and no UI ever sets `reasonNote` → note = reason text duplicate.
3. **Quirk:** on full-order cancel, backend overwrites each remaining line's `reason` with the order `cancellation_note` text (line 3969231 reason = note, not reason).
4. **Cancel stage:** FE sends `cancel_type: 'Pre-Serve'|'Post-Serve'`; backend stores its own `Pre-Cooking` (server-derived). After-serve detection is server-side.
5. **Cancellation report "notes":** insights `items[].notes` = `food_level_notes` (kitchen note "BATCH-A IA PROBE"), NOT a cancel note. FE `reportTransform.js:789` / `insightsService.js:305` read `cancel_reason_text`, which the API never returns.
6. **Comp without right (CR-492):** accepted and saved (`complementary=1`, reason saved). FE gate alone is bypassable → backend enforcement needed.

## Conflict pre-check (R16)
Many open items at GATE_5A/5B touch the same hotspots (CollectPaymentPanel, OrderEntry, orderTransform, DashboardPage, OrderReportBetaPage, App.js) — e.g. BUG-660/665/666 (CPP+orderTransform), BUG-662/656/657, CR-512 (OrderEntry), BUG-652..655 (DashboardPage), BUG-626/546, CR-423 (OrderReportBetaPage), BUG-661 (App.js). Gate 3 must re-verify line anchors at HEAD; no parallel edits on these files until those pass QA.
`CancelFoodModal.jsx` / `CancelOrderModal.jsx`: no open owners.

## Item docs
| Stage | Item | Doc | Risk | Backend-blocked? |
|---|---|---|---|---|
| 1 | CR-071 | CR-071_IMPACT_ANALYSIS.md | HIGH | NO (scope OD open) |
| 1 | CR-492 | CR-492_IMPACT_ANALYSIS.md | CRITICAL | PARTIAL (enforcement + owner key) |
| 1 | CR-515 | CR-515_IMPACT_ANALYSIS.md | HIGH | DEPENDS on OD-515-A |
| 2 | CR-493 | CR-493_IMPACT_ANALYSIS.md | HIGH | YES (notes setting key) |
| 2 | BUG-674 | BUG-674_IMPACT_ANALYSIS.md | HIGH | PARTIAL (Order Beta fields) |
| 2 | BUG-670 | BUG-670_IMPACT_ANALYSIS.md | HIGH | YES (item note field) |
| 3 | CR-494 | CR-494_IMPACT_ANALYSIS.md | CRITICAL | YES (all) |
| 4 | CR-445 | CR-445_IMPACT_ANALYSIS.md | CRITICAL | PARTIAL (contract OD) |
| 4 | CR-495 | CR-495_IMPACT_ANALYSIS.md | CRITICAL | YES + probe blocked (no PMS on cafe103) |
| 5 | CR-443 | CR-443_IMPACT_ANALYSIS.md | HIGH | YES (events, right key) |
| 6 | CR-529 | CR-529_IMPACT_ANALYSIS.md | CRITICAL | Phase 2 — not analysed beyond dependency |
| 6 | CR-540 | CR-540_IMPACT_ANALYSIS.md | HIGH | Scope OD open |
| 6 | CR-372-B | CR-372-B_IMPACT_ANALYSIS.md | LOW | NO |

## Owner decisions log (rounds 1–4, 2026-11-14)
| OD | Decision |
|---|---|
| Scope | All 13 items in one go; write probes allowed on test orders; credentials session-only |
| BUG-670 | Owner confirmed (screenshots): item notes not shown. FE drops notes + backend has no field |
| BUG-674 | No order-notes UI today → add. Items must get order cancel reason/note (backend). Order Beta must show reason/note (backend). OD-674-A = save note EMPTY when blank |
| CR-493 | OD-493-B = block cancel + message when no reasons configured |
| CR-492 | FE gate on `complementary_food` confirmed. OD-492-A = existing comp lines read-only |
| CR-515 | FE gating confirmed missing. Reuse existing rights (role editor screenshot). Pages = c (Orders Beta + Order Report + dashboard + order screen). Reprint right → moved to P1 |
| CR-071 | Only rights Batch A needs; full wiring on HOLD until all batches done |
| CR-494 | All-new build inside CR-494 (no separate CR). OD-494-A = amount incl. tax |
| CR-445 | Whole-order comp saved as the 100% discount preset |
| CR-495 | Probed on The Palm House (RID 541): no meal plan / guest count anywhere |
| Brief | Backend brief WAITS until all Batch A answers are in |

## Pending owner questions (next IA agent asks these, 5 per round)
Round 5 (asked, NOT answered):
1. Item cancel right: a) needs Cancel Orders, b) keep as today (View Menu Items), c) new right only for item cancel.
2. OD-494-B discount threshold: ₹ of discount or % of bill.
3. OD-494-C daily cancel/discount counter: backend or per device.
4. OD-494-D edit-after-bill PIN: everyone, or `order_edit_access` holders skip.
5. OD-445-B whole-order comp checks: same as item comp (right + comp PIN) or right only.
Not yet asked:
6. OD-493-A: 5 cancels "No reason provided" in Nov — investigate source in CR-493 or separate item.
7. OD-492-B: cafe103 + Palm House owners lack `complementary_food` — update roles in admin before release?
8. OD-445-C: whole-order comp allowed on room / credit (TAB) orders?
9. OD-495-A: comp limit "day" = calendar day or business day.
10. OD-495-B: half/full board — one daily pool or separate limit per meal.
11. OD-495-C: room-only booking — comp hidden, or allowed with PIN.
12. OD-443-A: extra alert events (discount above ₹X, comp, cancel after bill)?
13. OD-443-B: alerts on POS + phone — need backend multi-device push?
14. OD-372B-A: `/local-printer-setup` — require login or keep open for printer device.
15. OD-372B-B: `/restaurant-picker` unguarded — intended?
16. OD-540-01/02: CR-540 priority + which of ideas 3/5/6/7/8 in phase 1.
17. Backend questions for Gyan (no owner answer needed, go in brief): OD-492-C restaurant `complementary` flag meaning; B-674-3 line reason overwrite.
Later: OD-529-A (phase 2 OTP channel); CR-515 reprint right (P1).
After all answered → show owner final missing-backend list → write `backend_briefs/BACKEND_BRIEF_BATCH-A_<date>.md` (Gyan + Parth for CR-495) → close Gate 2.

## Backend gaps found (to confirm with owner BEFORE writing the backend brief)
See §"Missing from backend" in the session handover / owner message. Brief NOT written yet (owner: show + confirm first).
