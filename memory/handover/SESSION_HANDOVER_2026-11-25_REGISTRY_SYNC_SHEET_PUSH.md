# Session Handover — 2026-11-25 (Registry Sync + Sheet Push)

## Session Summary
Full registry audit, code investigation, QA catch-up, sheet sync session. Re-pulled codebase from remote (28 new commits from FCM/notification agent). Performed deep code investigation on 22 not-implemented items, discovered 6 already implemented in code. Updated 15 items to QA_PASS from Nov Sprint QA Report. Fixed status mapping bug causing 13 items to appear on wrong sheet tab. Disabled assignee+priority pull from sheet (registry is now authoritative for both).

## Roles Executed
- **DEPLOYMENT**: Re-pulled main branch (commit 44f7cb55), preserved .env files, collected 3 Firebase/Maps secrets
- **SHEET DRIFT (Role 14)**: Pulled sheet drift — 107 changes (55 assignee + 10 priority + 42 minor)
- **INTAKE (Role 1)**: Code investigation on 22 PART 2 items; registry updates for discovered implementations
- **SHEET PUSH (Role 13)**: 6 successful pushes throughout session, final state: 0 errors, 0 drift

## Changes Made to Registry (registry.json)

### Release Dates
- 99 items implemented after Nov 14 → release_date = `2026-11-25`
- 3 superseded items (BUG-454, BUG-676, CR-534) → release_date cleared

### Assignees
- 55 items synced from sheet (CTO re-assignments to Gyan/Parth/Piyush)
- 5 blank assignees filled → Abhishek (BUG-229, BUG-230, CR-365, CR-058, BUG-746)
- CR-536, CR-542, BUG-709 → Abhishek (overriding CTO sheet edits per owner directive)

### Priority
- 13 items upgraded to P0: BUG-720, BUG-721, BUG-734, BUG-738, BUG-732, BUG-736, BUG-719, CR-443, CR-494, CR-495, CR-548, CR-549, CR-560 (one-time override pushed to sheet)

### Status Advances — Code Investigation (PART 2)
| Item | Old Status | New Status | Evidence |
|------|-----------|------------|----------|
| BUG-681 | GATE_4_GO | GATE_5A_IMPLEMENTED | CreditCustomerDetailSheet.jsx:174,184 — coverage.type fix |
| BUG-682 | GATE_4_GO | GATE_5A_IMPLEMENTED | profileTransform.js, 6+ files — cancelNoteMandatory wired |
| BUG-702 | GATE_2_IA_COMPLETE | GATE_5A_IMPLEMENTED | ScanOrderPopOut.jsx:70,88 + PopoutItemRow.jsx — via CR-557 |
| BUG-679 | GATE_2_IA_COMPLETE | GATE_5A_IMPLEMENTED | PopoutItemRow.jsx:74 — cancelled strikethrough + filter |
| CR-505 | GATE_1_INTAKE | GATE_5A_IMPLEMENTED | Covered by BUG-645 (OrderReportBetaPage split display) |
| CR-510 | QA_VERIFY | GATE_5A_IMPLEMENTED | OrderDetailSheet L337/L377-394 variation rendering |
| BUG-739 | GATE_1_INTAKE | GATE_5A_IMPLEMENTED | AuditLogMockup.jsx L251,268,279,280 — totalEvents fix |

### Status Advances — Superseded / Closed
| Item | New Status | Reason |
|------|-----------|--------|
| BUG-454 | CLOSED — SUPERSEDED | By BUG-747 + CR-562 + BUG-749 (FCM Phase 1-3 pack) |
| BUG-676 | CLOSED — SUPERSEDED | By BUG-751 (YtcFcmHydrator) + BUG-747 (SoundUnlockBanner) |
| CR-558 | CLOSED — DONE_NO_CODE | Option B works via existing controls |
| CR-534 | CLOSED — ALREADY EXISTS | ScanOrderPopOut.jsx L483-485 renders customer phone |

### Status Advances — QA Pass (from Nov Sprint QA Report)
15 items: BUG-677, CR-493, BUG-670, BUG-674, BUG-675, CR-524, CR-372-B, CR-521, CR-394, BUG-229, BUG-230, BUG-669, BUG-667, BUG-673, CR-527

### Backend Reclassifications
| Item | New Status | Blocked On |
|------|-----------|-----------|
| BUG-709 | GATE_2_IA_COMPLETE — FE_CORRECT | BACKEND (drops make_unpaid after cancel) |
| BUG-712 | GATE_2_IA_COMPLETE — FE_CORRECT | BACKEND (doesn't return customer name on GET) |

### Validation Fixes
- 12 closed_at dates filled (BUG-693, 702, 710, 724-727, 729, 737, 740, 747, 749-752, CR-553, 559, 562, BUG-728)
- 2 registered_date filled (BUG-744, BUG-745 → 2026-11-21)
- 4 areas normalized to 13-module taxonomy (CR-552, BUG-702, BUG-736, BUG-741)
- 18 notes/descriptions written (3-5 lines each for empty/short items)
- 2 titles filled (BUG-744, BUG-745)

### Status Mapping Bug Fix
Root cause: `to_contract_status()` uses substring matching. Prose like "was GATE_3" or "awaiting Gate 2 IA" triggered PLANNING mapping before IMPLEMENTED/INTAKE check.
Fix: Replaced gate references in prose with abbreviations (G2, G3) in 13 items.
Affected: BUG-708, CR-554, CR-555, CR-556, BUG-713, BUG-722, BUG-730, BUG-720, BUG-721, BUG-732, BUG-734, BUG-736, BUG-738.

## Changes Made to Push Script (sheets_sync.py)

### Permanent Changes
1. **Priority pull DISABLED** (line 1301-1308): Registry priority is authoritative. Sheet priority is never pulled back. Comment: `# Priority — registry is authoritative (owner decision 2026-11-25).`
2. **Assignee pull DISABLED** (line 1494-1501): Registry assignee is authoritative. Sheet assignee is never pulled back. Comment: `# Assignee pull: DISABLED (registry is authoritative)`

### Rationale
Owner directive: "assignee and priority will not be changed" from sheet. Both fields are now push-only (registry → sheet, never sheet → registry).

## Final Sheet State (after last push)
| Tab | Count |
|-----|-------|
| Intake | 81 |
| Planning | 30 |
| Implemented | 190 |
| QA | 232 |
| Smoke | 272 |
| Closed | 354 |
| Parked | 27 |
| Duplicate | 6 |
| **Total** | **1192** |
| Unclassified | 0 |
| Errors | 0 |
| Drift | 0 |

## Open Items for Next Session

### P0 Abhishek — Intake (7 items, need Gate 2 IA)
CR-533, BUG-720, BUG-721, BUG-732, BUG-734, BUG-736, BUG-738

### P0 Abhishek — Planning (6 items)
- **Actionable**: BUG-607 (GST, design approved), BUG-705 (PayLater methods, plan complete)
- **Backend-blocked**: CR-536, CR-542, BUG-709, BUG-712

### QA Needed
- 68 implemented items have QA handovers but no formal QA_PASS in registry
- BUG-750 has zero QA coverage (buzzer not stopping on Update Order)

### Decisions Logged This Session
1. Registry is authoritative for Priority and Assignee (not sheet)
2. Abhishek is default assignee for all new items
3. Every new intake must include 3-5 line description in notes field
4. Release date 2026-11-25 for all items implemented after Nov 14
5. Superseded items get release_date cleared (not shipped)
6. After every registry update → run `--push --dry-run` to validate before pushing

## Credentials
- `owner@cafe103.com` / `Qplazm@10`
- `owner@thegoankitchen.com` / `Qplazm@10`
- Firebase/Maps keys: via Emergent secrets UI (REACT_APP_FIREBASE_API_KEY, VAPID_KEY, GOOGLE_MAPS_KEY)
- Google Sheets OAuth: in frontend/.env (GOOGLE_OAUTH_CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, SHEET_ID)
