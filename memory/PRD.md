# MyGenie Core POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo (core-pos-front-end-, branch main) into /app. Run as-is, no code edits. Collect missing API keys. Push to GitHub.

## Architecture
- **Frontend**: React 19 (CRA + CRACO) on port 3000 via supervisor
- **Backend**: Laravel at preprod.mygenie.online (external)
- **Socket**: presocket.mygenie.online
- **Firebase**: Auth + notifications
- **CRM**: crm.mygenie.online/api

## Current Sprint Status (2026-11-25)

### Registry Totals (1192 items)
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

### Decisions Locked (2026-11-25)
1. **Registry is authoritative** for Priority and Assignee (sheet never pulls back)
2. **Abhishek is default assignee** for all new items
3. **Every new intake** must include 3-5 line description in notes field
4. **Release date 2026-11-25** for all items implemented after Nov 14
5. **After every registry update** → run `--push --dry-run` to validate before pushing
6. **Status prose** must not contain bare GATE_2/GATE_3 keywords (use G2/G3 abbreviations to avoid mapping bugs)

### Credentials
- `owner@cafe103.com` / `Qplazm@10`
- `owner@thegoankitchen.com` / `Qplazm@10`

## What's Been Done (2026-11-25 Session)
- Re-pulled codebase from remote (28 new commits — FCM/notification pack)
- Registry audit: 99 release dates, 55 assignee syncs, 18 descriptions, 13 P0 upgrades
- Code investigation: 6 items discovered implemented, 4 superseded/closed, 1 advanced
- QA catch-up: 15 items → QA_PASS from Nov Sprint report
- Backend reclassification: BUG-709, BUG-712 → FE_CORRECT + BACKEND blocked
- Status mapping bug fixed (13 items had GATE_3/Gate 2 in prose)
- Push script: priority + assignee pull permanently disabled

## P0 Abhishek — Open Work

### Intake (7 items — need Gate 2 IA)
- CR-533: Scan Order Popup: Minimize to YTC Tab
- BUG-720: Deep-link bypass for restricted pages (security)
- BUG-721: Dashboard Print KOT / YTC Cancel not rights-gated
- BUG-732: Cart edit row jumps to bottom
- BUG-734: Credit remove shows [null] item names
- BUG-736: "Update now" toast overlaps table rows
- BUG-738: Channel/amount mismatch for Room orders

### Planning (6 items)
- **BUG-607**: Item-Level GST (design approved, actionable)
- **BUG-705**: PayLater shows only Cash/UPI/Card (plan complete, needs Gate 4 GO)
- CR-536: Credit GST/Address/UPI (BACKEND blocked)
- CR-542: Make Unpaid reason mandatory (BACKEND blocked)
- BUG-709: Make Unpaid audit event (FE correct, BACKEND)
- BUG-712: Customer name not returned (FE correct, BACKEND)

### QA Needed
- 68 implemented items have QA handovers but no formal QA_PASS
- BUG-750: zero QA coverage (buzzer not stopping on Update Order)
