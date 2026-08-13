# QA Handover — BUG-248 (Bulk Editor isDirty + portionSize)

**Date:** 2026-07-25
**Items:** BUG-248
**Risk:** LOW
**Self-test:** 5/5 edits verified. EXIT GATE: 5/5 PASS.

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| 1 | BulkEditor.jsx:isDirty (L289-298) | 9 new checks exist | ✅ Verified (grep) |
| 2 | BulkEditor.jsx:buildPayload (L168) | `portion_size` present | ✅ Verified (grep) |
| — | BulkEditor.jsx | All 33 ALL_COLUMNS keys covered | ✅ 0 missing (python script) |
| — | BulkEditor.jsx | Compile: 0 new warnings | ✅ Same 1 pre-existing warning |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Packaged Item dirty detection | Open Bulk Editor → enable Tier 1 columns → toggle "Packaged Item" on one row → observe Save button | Save button shows "Save 1 Change", row has amber highlight on packedFood cell |
| T2 | Inventory dirty detection | Toggle "Inventory" column on a row → observe Save button | Save count increments, amber cell |
| T3 | Out of Stock dirty detection | Toggle "Out of Stock" on a row (enable Tier 2 via Columns picker) → observe | Save count increments |
| T4 | Hidden from POS dirty detection | Toggle "Hidden from POS" on a row → observe | Save count increments |
| T5 | Tax Calc dirty detection | Change "Tax Calc" dropdown (Exclusive→Inclusive or vice versa) → observe | Save count increments |
| T6 | Sold By (Unit) dirty detection | Change "Sold By (Unit)" dropdown on a row → observe | Save count increments |
| T7 | Avail. Start dirty detection | Edit "Avail. Start" time on a row → observe | Save count increments |
| T8 | Avail. End dirty detection | Edit "Avail. End" time on a row → observe | Save count increments |
| T9 | Portion Size dirty detection | Edit "Portion Size" text on a row (enable Tier 4 via Columns picker) → observe | Save count increments |
| T10 | Save persists isDisabled | Change "Hidden from POS" → Save → reload page → open Bulk Editor | Value persists (backend accepts `is_disable`) |
| T11 | Save persists itemUnit | Change "Sold By (Unit)" → Save → reload → verify | Value persists |
| T12 | Save persists availableTimeStart/End | Change times → Save → reload → verify | Values persist |
| T13 | Save sends portion_size | Change "Portion Size" → Save → check Network tab | Request body includes `portion_size` field |
| T14 | Existing dirty detection unchanged | Edit "Price" or "Name" → Save button still works as before | No regression on existing 24 checks |
| T15 | Part B fields (known limitation) | Change packedFood + save → reload | ⚠️ EXPECTED: value reverts (backend drops `packed_food`). Same for isInventory, stockOut, taxCalc. Document but do NOT fail. |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Bulk Editor opens without error | BulkEditor.jsx was modified |
| R2 | Edit Name + Price → Save → reload → values persist | Core existing flow unaffected |
| R3 | New row (+ Add Item) → all fields editable + Save works | `_isNew` path still returns true for all fields |
| R4 | beforeunload warning fires when dirty | `dirtyCountRef` still tracks correctly |

---

## 4. Registry Sync Confirmation

Registry synced: YES
Items: BUG-248
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED

---

## 5. Credentials + Environment

- URL: https://core-pos-dev-3.preview.emergentagent.com
- Bulk Editor access: Menu Management → Bulk Edit button
- Columns picker: top-right gear icon in Bulk Editor to enable Tier 2-4 columns
- Note: No login credentials available for preprod testing — API calls will fail without valid auth. QA should test on preprod with real account.
