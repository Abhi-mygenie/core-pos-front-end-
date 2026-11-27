# Session Handover — 2026-11-18 — Web Edit Order Confirm (INV-WEB-EDIT-NOTCONFIRM → CR-552)

**Branch:** `web-edit-order-confirm` · **Repo:** Abhi-mygenie/core-pos-front-end- · **Author:** emergent-agent-e1
**Scope of session:** deploy repo into /app · close the FCM leg of INV-WEB-EDIT-NOTCONFIRM · register + plan CR-552. **No app code changed** (`frontend/src` diff = 0 across the whole session; all output is control-layer + evidence docs).

---

## 1. Deployment (done)
- Cloned repo into `/app` (platform files preserved: pod `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT=443`, `.emergent/emergent.yml`, markers). `yarn install --frozen-lockfile`. Supervisor runs `craco start` on :3000. App compiles, MyGenie POS login renders, backend `/api/` 200.
- Secrets collected via secure card: `REACT_APP_CRM_API_KEYS` (set). Firebase/Maps keys shipped with the repo; owner skipped overriding them.
- `frontend/.env` holds pod URL + injected secrets → **never committed** (excluded from every push).

## 2. INV-WEB-EDIT-NOTCONFIRM-2026-11-17 — FCM leg CLOSED WITH REAL DATA
- Root cause CONFIRMED (HIGH): web **edit** keeps order `f_order_status=2`; appended line carries item `food_status=7`, which the FE has no render/label/discovery branch for. Break points re-verified on a fresh live edit (order 1578831, `order_edit_count` → 8).
- **Live FCM payload captured** by owner from the real POS console: `notification.title="Please confirm this order"`, `data={sound:"forty_five_sec_buzzer", orderid, channel_id}`, `fcmOptions.link=.../dashboard`, **no `data.type`/`notification_type`**.
- **New finding:** POS2-007 confirm-order tone override is **dead** vs the live push (no `data.type`, explicit non-confirm sound) — buzzer still plays, but the `confirmOrderTone` setting has no effect. Tap → `/dashboard`, no deep-link (break point 7 confirmed).
- Artifacts: `INV-WEB-EDIT-NOTCONFIRM-2026-11-17_INVESTIGATION_REPORT.md`, `evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/` (socket_events.jsonl, single_order_..._session2.json, fcm_payload_captured.md, 03_SESSION2_FCM_LEG_ADDENDUM.md), `backend_briefs/BACKEND_BRIEF_INV-WEB-EDIT-NOTCONFIRM_2026-11-17.md` (RESOLVED).

## 3. CR-552 — registered + planned (Gates 1→3)
**CR-552: Per-item approval for web-order items (item-level Yet-to-Confirm) — WEB ORDERS ONLY** (NOT aggregator, NOT POS). P1 · HIGH · Menu/Order Entry · client MyGenie(672) · assignee Abhishek · sprint nov_cr_batch.
- Status: **GATE_3_PLAN_COMPLETE** (registry.json + CR_REGISTRY.md updated).
- Docs: intake `change_requests/38_CR-552_..._INTAKE.md`, IA `CR-552_IMPACT_ANALYSIS.md`, plan `CR-552_IMPLEMENTATION_PLAN.md`.
- **FE-ONLY, no backend.** Owner answered endpoints: Accept reuses `CONFIRM_ORDER` (`waiter-dinein-order-status-update` — bulk-sets `food_status 7→def`, does not re-stamp `f_order_status`); Reject loops `CANCEL_ITEM` over new items only.
- Design (owner-specified): banner pops for the edit; **new items actionable**, **previously-ordered items greyed inside an expandable "Previously ordered items" dropdown, not cancellable**; Reject cancels only the new items (never the previously-ordered ones / whole order).
- 4 edits / 4 files: `orderTransform.js` (additive `isNotConfirmed`), `ScanOrderPopOut.jsx` (Mode B), `DashboardPage.jsx` (`handleRejectNewItems`), `reportTransform.js` (label 7). Execute **AFTER CR-545** (same file). CartPanel/OrderCard item markers deferred to optional Phase 2.
- OD-552-01..06 all resolved (06 = reject reason modal applied to all new items, recommended default).

## 4. State / next actions
- **CR-552 awaiting Gate 4 GO** → then IMPLEMENTATION role (follow the plan edit-by-edit; run the 8-check Verification Matrix; execute Post-Code Registry Checklist).
- App is deployed & live in preview; **not yet pushed to a production URL** (deploy step still open if owner wants it).
- Earlier branch `20261118-062623` holds the investigation-only commit; this branch `web-edit-order-confirm` supersedes it with investigation + CR-552 planning + this handover.

## 5. Credentials note
Restaurant-672 test login (OWNER_RUBY) stored only in gitignored `memory/test_credentials.md` (never committed). No secrets in any pushed file.
