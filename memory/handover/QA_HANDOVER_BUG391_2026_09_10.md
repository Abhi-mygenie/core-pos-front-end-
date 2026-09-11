# QA Handover — BUG-391
## Aggregator Menu: GST Not Enforced — Fixed

**Date:** 2026-09-10
**Implemented by:** Implementation Agent (Role 3 — AGENT_PROMPT_ALPHA v0.7)
**Self-test:** 8/8 code markers present, 5/5 edit locations verified, webpack compiled successfully

---

## § 1 — Verification Matrix Results (Self-Test)

| Edit | File | Change | Self-Test |
|------|------|--------|-----------|
| E5 | `menuManagementTransform.js:268–269` | Aggregator safety net — `tax_type='GST', tax='5'` when `foodFor==='Aggregator'` | ✅ `grep -n "BUG-391" menuManagementTransform.js` → 2 hits at L268-269 |
| E1 | `ProductForm.jsx:231–232` | Edit mode: `taxPercentage=5, taxType='GST'` for Aggregator on init | ✅ Confirmed L231-232 |
| E2a | `ProductForm.jsx:278` | New item: `taxPercentage=5` for Aggregator | ✅ Confirmed L278 |
| E2b | `ProductForm.jsx:294` | `useEffect` deps: added `menuType` | ✅ `}, [product, categories, menuType]);` at L294 |
| E3 | `ProductForm.jsx:431–450` | Tax fields locked read-only for Aggregator (`GST (mandatory)` / `5% (mandatory)` labels) | ✅ Ternary block present, `data-testid` not needed — verified by grep |
| E4 | `BulkEditor.jsx:567+` | `validateRow`: unconditional Aggregator block — `taxType!=='GST'` or `taxPercent!==5` → red cell | ✅ Block present at L567, `gstRequired` block unchanged below it |

---

## § 2 — Test Cases

### BUG-391 — Core Enforcement

| # | Steps | Expected | data-testid / hint |
|---|-------|----------|--------------------|
| T1 | Menu Mgmt → Switch to **Aggregator** menu → click **Add Item** | Tax section shows grey labels "GST (mandatory)" and "5% (mandatory)" — no dropdown or input field | — |
| T2 | Menu Mgmt → Aggregator → Add Item → without touching tax → click **Save** | Item saves successfully. Network tab payload: `tax_type: "GST"`, `tax: "5"` | Network tab |
| T3 | Menu Mgmt → Aggregator → **Edit** an existing item that has `tax=0` stored in DB | Form opens with Tax showing "GST (mandatory)" / "5% (mandatory)" — not 0% | — |
| T4 | Menu Mgmt → **Normal** menu → Add Item → Tax section | **SelectField** (GST/VAT/None) + **InputField** (Tax %) still editable — unchanged | — |
| T5 | Menu Mgmt → Normal → Edit any item → Tax section | SelectField + InputField editable — unchanged | — |
| T6 | BulkEditor → Aggregator → change any row's **Tax %** to `0` → **Save Changes** | Red tint on Tax % cell + toast/error "Aggregator items must have exactly 5% GST" | — |
| T7 | BulkEditor → Aggregator → change any row's **Tax Type** to `VAT` (if editable) → Save Changes | Red tint on Tax Type cell + "Aggregator items must use GST tax type" | — |
| T8 | BulkEditor → Aggregator → row with `Tax GST 5%` (correct) → Save Changes | Saves cleanly — no validation error on this row | — |
| T9 | BulkEditor → Aggregator → change Tax % to `12` → Save Changes | Red cell + "Aggregator items must have exactly 5% GST" | — |
| T10 | Network tab: Aggregator item saved via ProductForm with correct form | Payload: `{ tax_type: "GST", tax: "5" }` — transform safety net confirmed | Network tab |

---

## § 3 — Regression Tests (Rule R6 mandatory)

| # | Test | Why |
|---|------|-----|
| R1 | Menu Mgmt → Normal → Add Item (GST 12%) → Save → confirm payload `tax: "12"` | E1/E2/E3 conditional — Normal path unchanged |
| R2 | Menu Mgmt → Normal → Edit item → change Tax to None → Save → payload `tax_type: "None"` | E5 safety net must NOT override Normal items |
| R3 | BulkEditor → Normal → `gstRequired=true` → row with Tax%=0 → Save → red cell (original CR-036-FU-03 behavior) | E4 block must not interfere with gstRequired path |
| R4 | BulkEditor → Normal → `gstRequired=false` → row with Tax%=0 → Save → no tax error | Original behavior preserved for non-Aggregator |

---

## § 4 — Registry Sync Confirmation

| Field | Value |
|-------|-------|
| Registry synced | YES |
| Items | BUG-391 |
| Gate | 5 (IMPLEMENTED — QA PENDING) |
| Sprint | pos_7_0 |
| EXIT GATE | 5/5 PASS |

EXIT GATE checklist:
- ✅ □1 registry.json: BUG-391 → gate:5, status:IMPLEMENTED, sprint_key:pos_7_0
- ✅ □2 BUG_TRACKER.md: row updated (below)
- ✅ □3 FILE_OWNERSHIP.md: ProductForm.jsx + BulkEditor.jsx + menuManagementTransform.js listed
- ✅ □4 Code markers: 8 `// BUG-391` across 3 files
- ✅ □5 Compile: `webpack compiled successfully` — 0 new warnings

---

## § 5 — Credentials + Environment

- Preprod: `https://preprod.mygenie.online`
- Account: `owner@cafe103.com` / `***`
- Route: `/menu` → Menu Management → switch to **Aggregator** tab → Add Item / Bulk Edit
