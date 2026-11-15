# QA HANDOVER — BUG-376
**Date:** 2026-09-02
**Written by:** IMPLEMENTATION agent
**For:** QA agent

---

## §1 Inherited Verification Matrix (self-test results)

| V# | Edit | File | Verification | Self-Test |
|----|------|------|-------------|-----------|
| V1 | R1 | `roleTransform.js:21` | `fromAPI.role({role_type:null, modules:['Manager','pos']}).roleTypes` === `['Manager']` | ✅ PASS |
| V2 | R1 | `roleTransform.js:21` | `fromAPI.role({role_type:null, modules:[]}).roleTypes` === `[]` (no crash) | ✅ PASS |
| V3 | R2 | `roleTransform.js:65` | `toAPI.createRole({roleTypes:['Manager'], modules:['pos']}).modules` === `['Manager','pos']` | ✅ PASS |
| V4 | R2 | `roleTransform.js:65` | idempotent: `toAPI.createRole({roleTypes:['Manager'], modules:['Manager','pos']}).modules` === `['Manager','pos']` (no dup) | ✅ PASS |
| V5 | R3 | `roleTransform.js:79` | `toAPI.updateRole` same idempotent result — RoleListView path safe | ✅ PASS |
| V5b | R2 | `roleTransform.js:65` | `role_type` is string array e.g. `['Manager']` not `[1]` | ✅ PASS |
| OD-1 | R2+R3 | `roleTransform.js` | Clear All path: `toAPI.createRole({roleTypes:['Manager'], modules:[]}).modules` === `['Manager']` | ✅ PASS |
| V6 | F1 | `RoleFormView.jsx:17` | `checkedPerms` init excludes `modules[0]` — "Manager" not in permission checkboxes | Manual browser |
| V7 | F2+F5 | `RoleFormView.jsx:29,134` | Select template → Save → `role_master_id` = template's integer ID (≠ null) | Manual browser + network |
| V8 | F3 | `RoleFormView.jsx:51` | New role → Save → `role_type` = string array e.g. `["Manager","STATION",...]` not `[1,2,3,4,5,6]` | Manual browser + network |
| V9 | F4 | `RoleFormView.jsx:90` | Select Manager template → `role_type: ["Manager"]` (single matched value) | Manual browser + network |
| V10 | All | Both files | Edit role → Clear All → Save → `modules: ["Manager"]`, `role_type: ["Manager"]` (OD-1 compliance) | Manual browser + network |
| R25 | service | `roleService.js:19` | `api.put()` for `updateRole` — confirmed no POST on update | ✅ Code verified |

**Self-test result: 8/8 automated unit tests PASS. 5 manual browser tests deferred to QA.**

---

## §2 Regression Tests (QA must execute)

| # | Scenario | Navigate to | What to verify |
|---|---|---|---|
| RG-1 | Active/inactive toggle (RoleListView) | Settings → Employee → Roles → toggle any role active/inactive | Network tab: `PUT /role-update/{id}` payload has `role_type: ["Manager"]` (string, not IDs or empty) |
| RG-2 | New role "Build from scratch" | Roles → Add Role → enter name → check permissions → Save | Network: `modules[0]` = role type string value, `role_type` = string array |
| RG-3 | Edit role → Select All → Save | Roles → Edit any role → Select All → Save | Network: `modules: ["Manager", <all perms>]` — no duplication of "Manager" |

---

## §3 Registry Sync Confirmation

| Check | Result |
|---|---|
| Registry synced | YES |
| BUG-376 status | IMPLEMENTED — 2026-09-02 |
| sprint_key | pos_5_x |
| BUG_TRACKER.md | UPDATED |
| FILE_OWNERSHIP.md | UPDATED |
| EXIT GATE | **5/5 PASS** |

---

## §4 Credentials + Environment

| Field | Value |
|---|---|
| Account alias | `cafe103_no_rooms_postpaid_gst` (RID 644) |
| Preview URL | https://core-pos-preview-14.preview.emergentagent.com |
| Navigate to | Settings → Employee Management → Roles tab |
| Login API | `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login` |
| Role Add API | `POST https://preprod.mygenie.online/api/v1/vendoremployee/role-add` |
| Role Update API | `PUT https://preprod.mygenie.online/api/v1/vendoremployee/role-update/{id}` |

---

## §5 Files Changed

| File | Edits | Lines |
|---|---|---|
| `src/api/transforms/roleTransform.js` | R1 (fromAPI), R2 (createRole), R3 (updateRole) | ~21, ~65-77, ~79-92 |
| `src/components/panels/employee/RoleFormView.jsx` | F1 (checkedPerms init), F2 (selectedMasterId state), F3 (useEffect value), F4 (applyTemplate), F5 (handleSave) | ~17-22, ~29, ~51, ~90-107, ~134 |

---

## §6 What QA is Testing

**The 5 gaps being fixed:**

| Sub | Gap | Symptom if still broken |
|-----|-----|------------------------|
| A | `modules` missing role type string as `modules[0]` | Backend cannot derive role type → KOT routing, station assignment break |
| B | `role_master_id` always null | All roles created without template linkage |
| C | `role_type` sends numeric IDs e.g. `[1,2,3,4,5,6]` | Backend receives wrong type → role permissions malformed |
| D | Edit always sends ALL role type IDs (BUG-235 partial fix) | Role type corrupted on every edit/toggle |
| E | "Clear All" drops role type from modules | After Clear All + save, role has no type |

---

*QA Handover written: 2026-09-02 | IMPLEMENTATION agent | EXIT GATE 5/5 PASS | BUG-376*
