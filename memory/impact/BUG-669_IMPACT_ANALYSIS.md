# BUG-669: Add-Ons and Variations Can't Be Saved at ₹0. Impact Analysis (Gate 2), 2026-11-15

Code Reality: NONE. No fix exists yet.
Conflict pre-check: `AddonManagementPanel.jsx` (BUG-608 GATE_5A, BUG-392/394 5B) and `ProductForm.jsx` (BUG-608 GATE_5A, BUG-627 / CR-449 5B). BUG-608 edited the same price `<input>` lines (onChange/onBlur). Gate 3 must re-anchor and keep the BUG-392 (onWheel), BUG-394 (special chars) and BUG-608 (select on focus) behaviour.
Risk: MEDIUM (menu master data validation; prices feed billing, but ₹0 is an owner-approved value and no tax/total logic changes).
Backend-blocked: **NO**. Probes P1a-P1d (2026-11-15, cafe103) show the backend accepts ₹0 for add-ons and variations.

## Owner decisions (locked)
- Intake: add-ons AND variations can be ₹0. The price must be typed (empty not allowed). ₹0 is allowed. Screens: Menu Management form + Bulk Editor.
- OD-669-A (R3): an empty add-on price box stays EMPTY (no auto-fill 0). Save is blocked with the message "Enter a price (0 is allowed)".
- OD-669-B (R3, owner): "in Menu Management we are not able to add zero-priced variations and add-ons" → both are blocked today.

## Screens found (3 create points + 1 edit-only)
| # | Screen | File / lines | What blocks ₹0 today |
|---|---|---|---|
| S1 | Menu Mgmt → Add-ons tab → Add | `AddonManagementPanel.jsx` L22 `EMPTY_ADD.price=''`, **L48 `if (!addForm.name.trim() \|\| !addForm.price) return;`**, L156 price input | **FE**: `price` is the number `0` → `!0 === true` → silent return. No message. **Root cause for add-ons (confirmed in code).** |
| S1b | same input | L156 `onChange` ignores `''`. `onBlur` sets `0` when empty | the box can't truly be empty after a touch → conflicts with OD-669-A |
| S2 | Product form → Food Addons → "New add-on" | `ProductForm.jsx` L224 `newAddonPrice=''`, **L628 `!newAddonPrice`** (string), L624 input | `"0"` is truthy → FE ALLOWS 0. Empty → silent return (no message). If 0 fails here, it's the backend → probe P1a |
| S3 | Product form → Food Variations → option row | `ProductForm.jsx` L87-121 `VariationOptionRow`, L128 new option `optionPrice:'0'`, L683 save → `toAPI.foodInfo` (`menuManagementTransform.js` L287 passes `variations` as-is) | No FE block at all, and the default is already '0'. Owner says it fails → **backend validation suspected** → probe P1b. The error shows as a toast `"<item>": <message>` (L704) |
| S4 | Add-on edit (S1 inline edit) | `AddonManagementPanel.jsx` L65-79 `handleUpdate`, L237 | no price check → 0 allowed in edit (consistent with the intake: "create with price then edit") |
| S5 | Bulk Editor | `BulkEditor.jsx` L210-218 variations payload (`optionPrice: String(v.price ?? 0)`), `VariationExpandPanel.jsx` L46-60 inline price, `AddonExpandPanel.jsx` (select only) | **Can't create** add-ons or variations. Edit of a variation price to 0 is allowed by FE. Read-only chip hides ₹0 (`val.price > 0 ? ...`), cosmetic |

## Probes (run 2026-11-15, cafe103; all test records deleted after)
| Probe | Call | Result |
|---|---|---|
| P1a | `POST product/add-addon` price **0** | **201**, saved `price: 0` (id 13732, deleted) |
| P1b | `POST product/add-food` (Normal) with variation option `optionPrice:"0"` | **200**, stored `"optionPrice":"0"` (id 248233, deleted) |
| P1c | control, option ₹3 | 200 (id 248234, deleted) |
| P1d | `POST product/foods/{id}` edit, option 4 → **0** | 200 (id 248235, deleted; read-back not captured) |
Evidence: `evidence/BATCH-D-IA/probes_2026_11_15/P1*.json`, `cleanup_*.json`.
**Conclusion:** add-on ₹0 is blocked by the **FE only** (S1 L48). The variation ₹0 block was **NOT reproduced**: FE (S3) and backend (Normal menu) both accept 0. Owner's report (OD-669-B) needs exact steps / menu type (Normal vs Aggregator, create vs edit, which screen) → asked in Gate 2 R6. The Aggregator path (`add-food-aggregator`) was not probed.

## Proposed FE change (Gate 3 detail)
| # | File / line | Change |
|---|---|---|
| E1 | AddonManagementPanel L48 | block only when `price === '' \|\| price == null` → toast "Enter a price (0 is allowed)" |
| E2 | AddonManagementPanel L156 | allow the empty state (keep `''` on clear, drop the onBlur auto-0) for the ADD row only (OD-669-A) |
| E3 | ProductForm L628 | `newAddonPrice === ''` → same toast. Allow `"0"` |
| E4 | ProductForm L87-121 / L128 | depends on OD-669-C (below): either keep the default '0', or start `''` + block save on an empty option price |
| E5 | (optional) VariationExpandPanel L66 | show `· ₹0` instead of nothing. Cosmetic, owner choice |

## Open owner question
- OD-669-C: new variation option, start empty (must be typed) or keep the pre-filled 0? (asked R3, owner answered with the bug fact instead → re-ask after probe P1b.)

## Verification seeds
V1 Add-ons tab: name + 0 → saved, shows ₹0. V2 name + empty → blocked with message. V3 Product form new add-on 0 → saved. V4 Product with variation option ₹0 → saved and visible in Order Entry customization at ₹0. V5 Bulk Editor variation → 0 saved. V6 Order Entry: ₹0 add-on/variation adds ₹0, bill total unchanged.
Regression: BUG-392 wheel, BUG-394 special chars, BUG-608 select-on-focus / reset, aggregator item save (BUG-327 multipart).
