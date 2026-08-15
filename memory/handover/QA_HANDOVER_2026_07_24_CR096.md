# QA Handover — CR-096
**Date:** 2026-07-24
**Implementation Agent:** E1
**Self-test:** 2/2 edits verified in code, 5/5 EXIT GATE checks passed

---

## 1. Inherited from Plan — Verification Matrix

| Edit # | File | Change | Self-Test Result |
|---|---|---|:---:|
| E1 | `roleTransform.js:57` | `mapRole: t.map_role \|\| null` added to `roleMasterList` | ✅ Confirmed — line 57 present |
| E2 | `RoleFormView.jsx:83–95` | `applyTemplate` derives `roleTypes` from `mapRole`; guard for unloaded catalog | ✅ Confirmed — lines 83-95 match plan |

---

## 2. QA Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Waiter template → correct role_type | Add Role → select "Waiter(S)" or "Waiter(T)" → Save → Network tab | `role_type: [2]` sent (Waiter only). No 422. Role created. |
| T2 | Station template → correct role_type | Add Role → select "Station (Chef)" → Save → Network tab | `role_type: [1]` sent (STATION only). No 422. |
| T3 | Manager template → correct role_type | Add Role → select "Manager" or "Captain" or "Owner" → Save | `role_type: [3]` sent (Manager only). No 422. |
| T4 | Delivery template → correct role_type | Add Role → select "Delivery Boy" → Save | `role_type: [6]` sent (Delivery only). No 422. |
| T5 | Build from scratch → all types | Add Role → do NOT select template → enter name → select permissions → Save | `role_type: [1,2,3,4,5,6]` sent. No 422. |
| T6 | Switch template → switch role_type | Select "Waiter(S)" first → then switch to "Manager" → Save | `role_type: [3]` (not [2]). Last template wins. |
| T7 | Clear template → reset to all types | Select any template → then clear template selection → Save | `role_type: [1,2,3,4,5,6]`. No 422. |
| T8 | Edit existing role — no override | Edit any existing custom role (no template change) → Save | `roleTypes` preserved from `fromAPI.role()`. No 422. |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-235: new role (no template, first page load) still saves without 422 | BUG-235 `useEffect` still fires on first load |
| R2 | BUG-235: active toggle in RoleListView still works | `role.roleTypes` path unchanged |
| R3 | BUG-234: Employee role dropdown still shows only editable+active roles | EmployeeListView.jsx untouched |
| R4 | Template permissions still apply correctly | `setCheckedPerms(new Set(t.defaultModules))` call unchanged in E2 |
| R5 | System role stays read-only | `isReadOnly` guard at top of `applyTemplate` unchanged |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
CR-096: status=IMPLEMENTED, sprint=pos_5_0, gate=0-5
EXIT GATE:
  □1 Registry sync:     ✅ PASS
  □2 CR_REGISTRY.md:    ✅ PASS — row updated IMPLEMENTED
  □3 FILE_OWNERSHIP.md: ✅ PASS — 2 rows added for CR-096
  □4 Code markers:      ✅ PASS — CR-096 in both modified files
  □5 Compile check:     ✅ PASS — 1 pre-existing warning, 0 new
```

---

## 5. Credentials + Environment

```
Login:  owner@cafe103.com / Qplazm@10
URL:    https://pos-front-deploy-8.preview.emergentagent.com
Path:   Settings → Employee Management → Roles → Add Role
```

---

## 6. Note on Curl Validation

POST `role-add` endpoint is CSRF-protected — not testable via curl. All QA tests above must be done via browser Network tab. T1–T4 are the critical verification path for CR-096 correctness.
