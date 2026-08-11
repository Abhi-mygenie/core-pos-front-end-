# SESSION HANDOVER — 2026-07-04 — Batch Intake (13 items)
**From:** INTAKE agent (this session) · **For:** next agent (PLANNING — Gate 2)
**Read first:** `memory/control/AGENT_PROMPT_ALPHA.md` · `INTAKE_WORKFLOW.md` · this file.

## 1. One-line state
13 items registered from owner batch report (10 bugs BUG-140…BUG-149 + 3 CRs CR-055/056/057). No code written. All items sit at Gate 0-1 ✅, awaiting PLANNING Gate 2 (Impact Analysis).

## 2. What was registered

| ID | Title | P | Risk | Notes |
|---|---|---|---|---|
| BUG-140 | Bulk Editor — Type field doesn't save | P1 | MEDIUM | Menu Mgmt · BulkEditor.jsx |
| BUG-141 | Excel Import — Type column not captured | P1 | MEDIUM | Menu Mgmt · import path TBD · possibly same root as BUG-140 |
| BUG-142 | POS Qty — NumLock ON → negative qty | **P0** | HIGH | **R6** money · Order Entry · CartPanel.jsx |
| BUG-143 | Short Code toggle ON but not effective | P1 | MEDIUM | Settings wired · print consumer TBD |
| BUG-144 | Token Number not on tickets / print | P1 | MEDIUM | Zero FE refs to token field — curl-probe needed |
| BUG-145 | "Complimentary" missing from Discount Type dropdown | P1 | HIGH | **R6** · RELATED to BUG-018/021 (SUBSUMED, different flow) |
| BUG-146 | Item-level time missing on OrderCard | P2 | LOW | Same surface as CR-055 + BUG-149 → batch-analyze |
| BUG-147 | Duplicate-item toast missing item name | P2 | LOW | `AddCustomItemModal.jsx:274` — literal string |
| BUG-148 | Cannot add new table | P1 | MEDIUM | Failure mode unknown · curl-probe needed |
| BUG-149 | Order ID missing on Scan & Delivery cards | P1 | MEDIUM | Same surface as BUG-146 + CR-055 |
| CR-055  | OrderCard — invert served-items collapse | P2 | MEDIUM | Owner ruling required on exact split |
| CR-056  | Restaurant Setting — scan-popup toggle | P2 | MEDIUM | Default ON; backend vs localStorage ruling required |
| CR-057  | Menu Mgmt — "No Tax" option + tax rules doc | P1 | **CRITICAL** | **R6 tax** · owner approval required · 6 rulings open · full E2E money regression |

## 3. Artifacts

- Bug intake docs: `memory/memory/bugs/intake/BUG_14{0..9}_INTAKE_2026_07_04.md` (10 files)
- CR intake docs: `memory/change_requests/CR_05{5,6,7}_*_INTAKE.md` (3 files)
- Registry: `memory/control/registry.json` — 13 new entries appended (total items: 226 → 239)
- Trackers: `memory/control/BUG_TRACKER.md` (new "POS 5.0 Batch Intake 2026-07-04" section) + `CR_REGISTRY.md` (3 rows appended to "POS 5.0 New CRs")

## 4. Duplicate check summary
- 12/13 DISTINCT
- **BUG-145** RELATED to BUG-018 + BUG-021 (both SUBSUMED owner-attested) — different surface (dropdown vs collect-bill flow). Registered as new; noted in `related` field.
- CR-054 is a pre-existing placeholder doc ("Training Sandbox") on disk but not in registry — that's why our CR IDs start at 055.

## 5. Owner decisions surfaced for Planning
1. **CR-057 (No Tax) — 6 rulings open** (see intake doc §5): semantics of No Tax, interaction with `gstMode`, scope (item vs category), interaction with item-level GST/VAT codes, report roll-up, backward compat.
2. **CR-055 — exact collapse split** (served visible + pending hidden? OR both visible grouped?).
3. **CR-056 — default ON/OFF** for new restaurants + storage strategy (backend field vs localStorage).
4. **BUG-145 — Complimentary as discount scope**: full-order comp vs item-level comp; audit/report bucket.
5. **BUG-144 — Token Number origin**: backend-generated vs operator-entered; placement (card / KOT / bill).
6. Screenshots / repro steps requested for: BUG-141, BUG-142, BUG-143, BUG-144, BUG-146, BUG-148, BUG-149, CR-055.

## 6. Suggested Planning batching
Same-surface items should be planned together to avoid duplicate work:
- **OrderCard cluster:** BUG-146 + BUG-149 + CR-055 (same renderer surface)
- **Menu Mgmt Type cluster:** BUG-140 + BUG-141 (likely shared transform)
- **Standalone / higher-risk:** BUG-142 (P0/R6), BUG-145 (R6), CR-057 (R6 CRITICAL — plan separately, needs owner rulings first)

## 7. Gotchas
- Session opened with a fresh deploy: repo cloned into `/app`, deps installed, services running via supervisor. Preview URL: `https://core-pos-frontend-10.preview.emergentagent.com` — but this is the **local emergent backend**, not `preprod.mygenie.online`. Login and real-data flows will need env pointed at preprod (or an owner-provided preprod token) before any live QA / curl-probe.
- `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` were added to `frontend/.env` this session to prevent the app from throwing "REACT_APP_API_BASE_URL not set" at boot. Both point at the local emergent backend as placeholders — Planning agent must swap or override for any live API probe.

## 8. Standard final response (INTAKE)
```
Intake complete: BUG-140…BUG-149 + CR-055/056/057 (13 items)
Classification: 10 BUG · 3 CR
Severity: 1×P0 · 8×P1 · 4×P2
Risk: 4×LOW · 6×MEDIUM · 2×HIGH · 1×CRITICAL
Duplicate check: 12 DISTINCT · 1 RELATED (BUG-145 → BUG-018/021)
Evidence: verbal only (screenshots requested for 8 items)
Blast radius: 3 SMALL · 9 MEDIUM · 1 LARGE (CR-057)
Docs updated: registry.json · BUG_TRACKER.md · CR_REGISTRY.md · 13 intake docs
Next: PLANNING Gate 2 (Impact Analysis) — start with OrderCard cluster (BUG-146+149+CR-055) or CR-057 owner rulings
```
