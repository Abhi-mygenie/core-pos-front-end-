# MyGenie POS Front-End — PRD (Updated 2026-08-11)

## Project Overview
- **Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
- **Branch:** `printer`
- **Stack:** React 19 + CRACO + yarn
- **App root:** /app/frontend/
- **Runtime:** Node 20.20.2 (--ignore-engines required for @testing-library/jest-dom@6.10.0)
- **Process manager:** supervisor → `craco start` on port 3000

## Architecture
- Pure frontend React SPA (no local backend)
- External APIs: preprod.mygenie.online, presocket.mygenie.online, Firebase, CRM, Google Maps
- Authentication: Firebase Auth (Bearer token per request)
- State management: React Context (RestaurantContext, AuthContext, etc.)
- UI: Tailwind CSS + shadcn/ui components + Radix UI
- Agent framework: AGENT_PROMPT_ALPHA v0.7

## Sprint: pos_5_1

## CR Status (as of 2026-08-11)

| CR | Title | Gate | Status |
|---|---|---|---|
| CR-132 | Restaurant Settings — Wire New Backend Fields (49→42 fields, 8 screens) | 2 | Gate 2 Complete — awaiting owner S3-S9 feedback |
| CR-133 | Printer Agent Config — Full Settings Screen (4-tab) | 5 | IMPLEMENTED — awaiting owner Gate-6 smoke |
| CR-133 Gap Batch | Printer Config fixes: copies/style sticky, Android split, employee dropdown | 5 | IMPLEMENTED — awaiting QA |
| CR-134 | Settings Tiles Mirror | 1 | ON HOLD — depends on CR-132 |
| CR-135 | Aggregator Setup (UrbanPiper Config + Operational Settings) | 5 | QA PASS — awaiting owner Gate-6 smoke |

## What's Been Implemented (this session)

### CR-135 — Aggregator Setup Screen
- **Route:** `/aggregator/setup` (ProtectedRoute)
- **Sidebar:** AGGREGATOR section (orange label), Aggregator Setup + Food Mapping SOON
- **Config tab:** 3-state brand selector (main/sub-brands/add-new), UrbanPiper credentials (masked), Location, Platform Links, Platform Status (toggle=display, button=action), Push Store
- **Operational tab:** Auto-KOT, Auto-Bill + stage (conditional), Order Tone, Prep Time, Bonus Time Brackets editor
- **Key architecture:** Partial merge (sparse `{basic:{8 fields}}`), `_raw` pass-through for aggregator-config, findOrEmptyConfig for new brands

### CR-133 Amendment
- Removed Aggregator Orders section from `AutoPrintTab.jsx` (moved to CR-135)

### CR-133 Gap Batch
- **G1+G4:** NumberInput + PrintStyleTab — sticky value fix (allow-empty onChange, blur clamp)
- **G3b:** Employee dropdown in Bill Content tab (`/employee/employees-list`)
- **G5+G6:** Print style Windows/Android split — `normalizeStyle` reads `windows.*`, `applyStyle` writes windows + flat + android. `PrintStyleTab` has platform toggle per row + global settings split

## Key Files — CR-135
```
src/api/services/aggregatorConfigService.js
src/api/transforms/aggregatorConfigTransform.js
src/components/settings/aggregatorSetup/AggregatorSetupView.jsx
src/components/settings/aggregatorSetup/ConfigTab.jsx
src/components/settings/aggregatorSetup/OperationalTab.jsx
src/pages/AggregatorSetupPage.jsx
src/components/layout/Sidebar.jsx  (+aggregator section)
src/App.js  (+route)
```

## Key Files — CR-133 Gap Batch
```
src/components/panels/settings/shared.jsx  (NumberInput fix)
src/api/transforms/printerAgentConfigTransform.js  (normalizeStyle/applyStyle/global_settings/employeeId)
src/components/panels/settings/printerConfig/PrintStyleTab.jsx  (Windows+Android)
src/api/services/printerAgentConfigService.js  (+getEmployeeList)
src/components/panels/settings/printerConfig/BillContentTab.jsx  (+employee dropdown)
```

## Environment
- **Supervisor:** frontend RUNNING (craco start, port 3000)
- **Branch:** printer
- **.env:** All 16 vars configured
- **Preview routes:** `/aggregator-preview` (public), `/printer-config-preview` (public), `/aggregator/setup` (auth required)

## Prioritized Backlog

### P0 (immediate)
- Run QA agent for CR-133 Gap Batch (`QA_HANDOVER_CR133_GAP_BATCH_2026_08_11.md`)
- CR-135 owner Gate-6 smoke on preprod

### P1 (this sprint)
- CR-133 original: owner smoke + backend printer DELETE fix
- CR-132: owner reviews Screens 3-9, Gate 3 plan
- CR-133 OD-10: preview/test-print answer

### P2 (next sprint)
- CR-134: Settings Tiles Mirror (blocked on CR-132)
- CR-135: Food Mapping tab (comingSoon → implement)

## Known Open Issues
- CR-133: printer DELETE silently re-injected by backend (deep-merge by id). FE ships reconciliation warning toast. Backend fix pending.
- CR-133 amendment D1-D4: duplicate fields (no_of_bill, no_of_kot, auto_bill/kot) in both printer-agent-config and update-settings. Backend confirmation pending.
- CRM API key "509" value was truncated in .env — not included.
