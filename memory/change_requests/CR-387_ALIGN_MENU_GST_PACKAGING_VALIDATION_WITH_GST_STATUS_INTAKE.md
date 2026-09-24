# CR-387 — Align menu GST / packaging validation with outlet `gst_status`

**ID:** CR-387 · **Registered:** 2026-09-24 · **Status:** INTAKE — GATE 1 — awaiting backend answers + owner decisions · **Type:** CR (rule alignment) · **Priority:** P1 · **Risk:** HIGH (tax rules, API contract) · **Sprint:** unassigned
**Source:** OWNER-REQUESTED investigation + AGENT-DISCOVERED clashes (INV report §4–§5) · **Confidence:** CONFIRMED (code) for X1/X2/X4; ⚠️ backend behaviour unverified

## Scope
1. **X1** Aggregator + packaged item: BUG-391 "exactly 5 % GST" overrides the CR-036-FU-03 packaged-item exemption (`BulkEditor.jsx:568-584`, `ProductForm.jsx:440-456`).
2. **X2** `gst_status=false`: BUG-391 rule still forces GST 5 % on Aggregator items.
3. **X4** packaged items carry no GST anywhere — no packaging-GST key in the contract (`pack_charges` only).
4. Settings wizard reads/writes legacy `basic.gst.{status,code}` (`restaurantSettingsTransform.js:118-119, 218`) — new flat `basic.gst_status` (owner curl) not consumed.
5. Type drift: profile `gst_status: true` vs settings-list `gst_status: 1`; FE gate `=== true` (`profileTransform.js:184`).

## Code reality: PARTIAL — gating exists for BulkEditor V1 + Collect Bill display; missing for Aggregator rule, form, import, order payload (BUG-454), settings flat key.

## Duplicate check: RELATED CR-036-FU-03, BUG-391, BUG-336, BUG-326, CR-158, INV-GST-001. DISTINCT.

## Backend questions (see `backend_briefs/BACKEND_BRIEF_CR-387_2026-09-24.md`)
BQ-387-01 same column for `basic.gst_status` and `basic.gst.status`? deprecation?  · BQ-387-02 normalise bool/int? · BQ-387-03 server-side rules for tax vs `packed_food`/`pack_charges` on add/edit/import · BQ-387-04 packaging GST key planned?

## Owner decisions
| OD | Question | Recommendation |
|---|---|---|
| OD-387-01 | Aggregator **packaged** item: 5 % forced, any rate allowed, or exempt? | allow any GST rate ≥ 0 (MRP goods), keep 5 % default |
| OD-387-02 | `gst_status=false` + Aggregator menu: save with 0 %, keep 5 %, or block Aggregator menu? | 0 %, with warning |
| OD-387-03 | Excel import: FE pre-validation before upload, or surface backend errors only? | backend errors only (until BQ-387-03) |
| OD-387-04 | Packaging GST: out of scope until backend key exists? | yes |

## Blast radius
MEDIUM — `BulkEditor.jsx`, `ProductForm.jsx`, `menuManagementTransform.js`, `restaurantSettingsTransform.js` (~40–60 lines). No R5 hotspot. Depends on BUG-454 for end-to-end correctness.

*Intake written 2026-09-24 · INVESTIGATION→INTAKE (ALPHA v0.7)*
