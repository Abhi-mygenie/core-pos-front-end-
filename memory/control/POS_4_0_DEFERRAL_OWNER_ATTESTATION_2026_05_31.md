# POS 4.0 — Deferral Batch Owner Attestation

**Date:** 2026-05-31
**Phase opened:** POS 4.0 (consolidated backlog)
**Attested by:** Owner (directive during 2026-05-31 consolidation session)

This attestation authorizes moving the items below out of their original (now-closed)
sprints into the POS 4.0 backlog. Per governance, mass-deferral of P1/owner-scoped items
is an owner-gated status change — recorded here.

## Owner directives captured
1. Next phase named **POS 4.0**.
2. **BUG-104 (Credit/Tab)**, **BUG-105 (Settlement)**, **CRM CR-008 (Integrations)** → deferred to POS 4.0.
3. **POS2-006 (confirmOrderTone)** → deferred to POS 4.0.
4. **POS2-002** → confirmed working, CLOSED via a shipped CR (not deferred).
5. **POS2-005-FU §B (PG filter)** → CLOSED as-designed; keep cross-tab (all tabs). `POS2-006-PG-PAID-ONLY` dropped.
6. **BUG-097** main VERIFIED (smoke passed); residuals (CartPanel gate + Bucket-5 rider events) deferred to POS 4.0.

## Deferred batch (carried to POS 4.0 with blocker IDs + reactivation triggers)
### Bucket B — Deferred / Not started
| ID | Reactivation trigger |
|---|---|
| POS2-001 | Owner prioritization |
| CR-003 (Tab) | Owner prioritization |
| CR-005 (Wallet) | Discovery + owner prioritization |
| CR-008 (Integrations) | Owner defines scope |
| CR-009 (BUG-108 carryover) | Owner formalizes CR |
| Order Activity Log | Owner prioritization |
| UX-LOADING-02 | Owner picks Concern A + B |
| POS2-006 (confirmOrderTone) | Owner answers OW-Q1/OQ-2/OQ-4 |
| BUG-097 CartPanel gate | Owner picks Option A/B/C/D |

### Bucket C — Blocked (reactivation-gated)
| ID | Blocker | Reactivation trigger |
|---|---|---|
| BUG-090/091/092/093/094/101 | Backend | Backend delivers field/contract |
| BUG-096 | Backend (socket event names unknown) | Backend supplies event names |
| BUG-097 Bucket-5 rider events | Backend | Backend supplies rider socket events |
| BUG-106/107 | CRM | CRM delivers |
| BUG-108 P1 defect | CRM | CRM fixes backend defect |
| BUG-104 / BUG-105 | Owner scope | Owner scope session |
| POS2-003-REOPEN-B / POS2-008 | Backend parity | Backend confirms parity |
| CR-004 (Up-sell) | Server flag `upsell=false` | Owner enables flag |

### Bucket D — Intake only
| ID | Next step |
|---|---|
| PROD-HOTFIX-006 | Fast-track or schedule in POS 4.0 |

## Not deferred (closed this session — owner verified)
- BUG-097 (main) · AUDIT-CLOSURE-DRIFT-001 · CR-002 · POS2-002 · POS2-005-FU §B

## Scope guard
- The **24 unfrozen business rules** are NOT folded into POS 4.0; they remain on the
  separate 5-step promotion gate.
