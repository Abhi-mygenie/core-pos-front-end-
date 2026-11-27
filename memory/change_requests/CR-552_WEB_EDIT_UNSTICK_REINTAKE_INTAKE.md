# CR-552 (RE-INTAKE) — Web-edit "unstick": auto-confirm food_status=7 after Update Order

**ID:** CR-552 (same ID, slice "unstick")
**Type:** CR (re-intake / cherry-pick of deferred slice)
**Registered:** 2026-11-24 (INTAKE role, Gate 1)
**Classification:** CR — web-edit order flow correctness (Not-Confirm lines + ScanOrderPopOut banner)
**Severity/Priority:** **P1** (agent-proposed; order-flow correctness — manual Accept is an unreliable workaround; owner may set P2)
**Risk:** **HIGH** (order confirm flow + KOT/printer-agent dispatch + sockets; hotspot file `OrderEntry.jsx`)
**Area:** Order Entry / Dashboard (web-edit → Scan popout)
**Client:** ALL
**Assignee:** Abhishek (frontend, not backend-blocked)
**Fast Lane:** NOT eligible (order/print/socket area, hotspot file)
**Duplicate check:** **RELATED** — slice of CR-552. The CR-552 **body** (per-item approval: `orderTransform` flags, `reportTransform` label, `ScanOrderPopOut` Mode A/B, `DashboardPage` reject) is **already on main (GATE_5A)**. This re-intake is the **separate "unstick" slice** that lives only on `notification-fix`.

---

## 1. Problem

When a web order is edited from the Scan banner and **Update Order** is pressed, the order stays `fOrderStatus=2` but the appended lines remain `food_status=7` (Not-Confirm). Nothing calls `confirmOrder`, so `ScanOrderPopOut` keeps showing the order as stuck/unconfirmed until the user manually hits **Accept**. The appended items may never reach the kitchen (no KOT) if the banner is missed.

## 2. Why this is a re-intake (decision history)

- CR-552 per-item-approval shipped to `main` (GATE_5A, 2026-11-18/19); registry notes "PARTIAL (no per-item Accept)".
- The **unstick** behaviour (auto-confirm remaining Not-Confirm lines right after the Update-Order socket-engage, mirroring `DashboardPage.handleConfirmOrder`) was implemented later on branch `notification-fix` and **never ported to `main`**.
- Gap report `memory/INV-NOTIFICATION-FIX-DEPLOY-GAP-2026-11-24_INVESTIGATION_REPORT.md` §2.B confirms the symptom is **still live on main**. This is queue item #2 from `SESSION_HANDOVER_2026-11-24_CR-527a_SHIPPED_AND_NOTIFICATION_FIX_GAP.md` §6.

## 3. Evidence (verified this session)

- **`notification-fix` (`8c80bfe`) — `components/order-entry/OrderEntry.jsx`:**
  - L18 import adds `confirmOrder, updatePrintStatus` (`// CR-561 + CR-552 unstick`).
  - After `await engagePromise` + redirect (~L1390): block reads order snapshot, computes `hasNotConfirm` (`isWebOrder` + any `isNotConfirmed && status!=='cancelled'`), and if true `await confirmOrder(placedOrderId, role, defaultOrderStatus, printerAgent)`; when `settings.autoKot && settings.scanOrderAutoPrint` it builds `printerAgent` via `selectAgentsForKot(cartStationsToSet(confirmItems))` + `selectAgentsForBill`, then `updatePrintStatus(..., {kot_print:'Yes', bill_print:'No'})`. CRM/confirm failure → non-blocking toast ("use Accept on the banner if it reappears").
- **`main` (deployed) — `OrderEntry.jsx`:** auto-confirm **absent** (grep `CR-552|food_status|confirmOrder` in file → 0). Import line L18 = `fetchSingleOrderForSocket, printOrder, updateFoodItemPrice` only.
- **Source:** AGENT-DISCOVERED (branch-gap investigation). **Confidence:** CONFIRMED (line-level diff).

## 4. Dependencies (all present on `main`)

- `confirmOrder` (`orderService.js` L82) · `updatePrintStatus` (L95) ✅
- `printerAgentSelector` (`selectAgentsForKot`/`selectAgentsForBill`/`cartStationsToSet`) ✅
- **CR-559** auto-print gate (`settings.scanOrderAutoPrint`, `printerAgents`) — IMPLEMENTED on main (Gate-4) ✅
- CR-552 body on main supplies the `isNotConfirmed` item flag and `isWebOrder`. ✅

## 5. Scope / Blast radius

- **File (port target):** `frontend/src/components/order-entry/OrderEntry.jsx` — **1 file**, ~41-line region (1 import edit + 1 post-update auto-confirm block).
- **⚠ NOT a clean file copy:** `git diff origin/notification-fix -- OrderEntry.jsx` = **+2 / −39** → `nf`'s `OrderEntry.jsx` **lags `main` by 39 lines** on unrelated changes. Must **extract only the CR-552 unstick hunk** (import + block) and apply onto main's current file; do NOT overwrite the file from `nf`.
- **Hotspot:** YES (core order flow). Estimated scope: **SMALL (1 file)** but **HIGH risk** (order confirm + print dispatch).
- Separable from CR-527a (different file) and CR-527b (different file) → parallel-safe.

## 6. Open questions / owner decisions

- **OD-552-unstick-1:** Confirm **P1 / Risk HIGH** (vs P2 given the manual-Accept workaround).
- **OD-552-unstick-2 (backend probe — carries OD-552-01/OD-558-01):** Does an **order-level `confirmOrder`** on a `fOrderStatus=2` order correctly flip **only** the appended `food_status=7` lines (not re-confirm/alter already-confirmed lines, no double KOT)? → needs a **live web-edit probe** at Gate 2/3 before ship.
- **OD-552-unstick-3:** Auto-KOT on the auto-confirm path — ship gated behind `scanOrderAutoPrint` exactly as `nf` (recommended), confirm no duplicate KOT vs a later manual Accept.

## 7. Source commit for cherry-pick

- Branch `notification-fix` (`8c80bfe`, single squashed commit). Extract the `OrderEntry.jsx` **import + unstick hunk only** — per-hunk onto main's newer file (not `git cherry-pick <sha>`, not a file copy).

## 8. Credentials / environment

- Test account: `/app/memory/test_credentials.md` (`pms@macha` / ALL). Backend probe needs a restaurant that supports web-edit orders (reference impl used restaurant-672).

---

**Gate status:** GATE_1_INTAKE_COMPLETE
**Next:** PLANNING Gate 2 (Impact Analysis) — trace main's Update-Order path + verify in-scope vars, and define the live backend confirm-order probe (OD-552-unstick-2). No code until owner Gate-4 GO.
