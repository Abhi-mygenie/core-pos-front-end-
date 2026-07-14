# CRM 2.0 — Sprint Workspace

**Created:** 2026-05-26
**Status:** SCAFFOLD — sprint not yet started
**Predecessor sprint:** `/app/memory/crm/crm_1_0/` (Coupon V1+V2+V3 + Loyalty Phase B/C → POS BUG-108)

---

## 1. Sprint Scope (placeholder)

> **Working title:** CRM 2.0 — Cross/Up-sell + Notes + Wallet/Tab + Integrations + Carryover Bugs
>
> **Themes (from owner, 2026-05-26):**
> - **Cross-sell** — recommended add-ons / pairings at billing time
> - **Up-sell** — premium swaps / size upgrades
> - **Item-level notes** — per-line cashier/kitchen note (allergies, prep instructions, modifiers)
> - **Order-level notes** — order-wide note (table preference, occasion, delivery instruction)
> - **Wallet** — full wallet integration (debit / credit / balance) — supersedes the deferred Wallet CR from BUG-108
> - **Tab** — open-tab functionality (running bill across multiple add-on rounds)
> - **Integrations** — external integrations (TBD — payment gateways, delivery aggregators, KOT printers, etc.)
> - **Carryover bugs from CRM 1.0 / BUG-108** — including the open P1 `loyalty_idempotency_key=null` backend defect on order 869016

> Fill in concrete owner-approved scope, CR IDs, and acceptance criteria in `owner_decisions/` once the discovery phase completes.

---

## 2. Folder Map

| Folder | Purpose |
|---|---|
| `owner_decisions/` | Q&A matrix, owner-approval records, decision matrices, scope-freeze documents |
| `discovery/` | API capability discovery, CRM endpoint gap analysis, feature-flag inventory, POS↔CRM data-model audits |
| `contract/` | Frozen API contracts (request / response schemas, error codes, field-rename audits, idempotency keys) |
| `implementation/` | Implementation plans + per-phase implementation reports (one per CR/feature) |
| `qa/` | QA handoffs, QA reports (code-only + live), regression matrices, owner-smoke checklists |
| `handoff/` | POS-facing handoff summaries (parity with `crm_1_0/handoff/`) — the canonical doc the POS team consumes |
| `reconciliation/` | Sprint reconciliation docs + addendums (final-state truth at sprint close) |
| `open_gaps/` | Open gaps register(s) — updated each QA wave |
| `hotfix/` | Hotfix documents — owner-confirmed urgent fixes applied mid-sprint |
| `final/` | Frozen baseline rulebook for this sprint (architecture decisions / module decisions / business rules / playbook) — once frozen, **do not modify** |

---

## 3. Naming Convention

```
CRM2_0_<CR_ID>_<TOPIC>_<TYPE>_<YYYY_MM_DD>.md
```

**Components:**

| Token | Meaning | Example |
|---|---|---|
| `CRM2_0_` | Sprint prefix (always literal) | `CRM2_0_` |
| `<CR_ID>` | Change-request id within the sprint | `CR_002`, `CR_003A`, `CR_003B`, … |
| `<TOPIC>` | Short feature/area slug, ALL_CAPS, underscore-separated | `WALLET`, `TAB`, `CROSS_SELL`, `UPSELL`, `ITEM_NOTES`, `ORDER_NOTES`, `INTEGRATIONS`, `BUG_108_CARRYOVER` |
| `<TYPE>` | Document type — see allowed values below | `DISCOVERY` |
| `<YYYY_MM_DD>` | Doc date (creation or last major revision) | `2026_06_01` |

**Allowed `<TYPE>` values:**

| Type | Use for |
|---|---|
| `DISCOVERY` | Capability + gap discovery |
| `CONTRACT_FREEZE` | Frozen request/response schema |
| `IMPL_PLAN` | Implementation plan |
| `IMPL_REPORT` | Implementation report (per phase) |
| `QA_HANDOFF` | QA handoff |
| `QA_REPORT` | QA report (code-only or live) |
| `HANDOFF_TO_POS` | POS-facing API handoff summary |
| `RECONCILIATION` | Sprint reconciliation |
| `ADDENDUM` | Addendum to any of the above |
| `OPEN_GAPS` | Open gaps register |
| `OWNER_DECISION` | Owner Q&A / decision matrix entry |

**Example file names:**

```
owner_decisions/CRM2_0_CR_002_WALLET_OWNER_DECISION_2026_06_01.md
discovery/CRM2_0_CR_002_WALLET_DISCOVERY_2026_06_02.md
contract/CRM2_0_CR_002_WALLET_CONTRACT_FREEZE_2026_06_05.md
implementation/CRM2_0_CR_002_WALLET_IMPL_PLAN_2026_06_06.md
implementation/CRM2_0_CR_002_WALLET_IMPL_REPORT_2026_06_10.md
qa/CRM2_0_CR_002_WALLET_QA_HANDOFF_2026_06_12.md
qa/CRM2_0_CR_002_WALLET_QA_REPORT_2026_06_13.md
handoff/CRM2_0_CR_002_WALLET_HANDOFF_TO_POS_2026_06_15.md
reconciliation/CRM2_0_CR_002_WALLET_RECONCILIATION_2026_06_20.md
open_gaps/CRM2_0_CR_002_WALLET_OPEN_GAPS_2026_06_20.md
```

---

## 4. Recommended Read-Order (for future agents)

```
1. README.md                        ← this file
2. owner_decisions/   (sprint scope, decisions, approvals)
3. discovery/         (API capability, gap analysis)
4. contract/          (frozen schemas)
5. implementation/    (plans + reports, chronological)
6. qa/                (QA handoff → QA report → live QA addendums)
7. handoff/           (POS-facing handoff — final contract for POS team)
8. reconciliation/    (sprint reconciliation, latest-dated first)
9. open_gaps/         (current gap register, latest-dated)
10. final/            (frozen rulebook — read-only)
```

**Source-of-truth rule (inherited from BUG-108):** when docs and code conflict, **code wins** and a `STATUS_CONFLICT_DOCS_VS_CODE` entry is opened in `open_gaps/`.

---

## 5. Carryover from CRM 1.0 / BUG-108

Items inherited at sprint open that **must be tracked** in `open_gaps/`:

| Item | Status at carry-in | Owner |
|---|---|---|
| **P1 backend defect** — `loyalty_idempotency_key = null` on loyalty-redeeming orders (evidence: order 869016) | 🔴 OPEN_FAILED_QA at BUG-108 close | POS Backend (Laravel) team |
| Bill-print template `coupon_discount` line render (mapper I-3) | NOT_RUN — needs printed-bill artifact | Print-agent / POS Backend template team |
| V2/V3 commit-time explicit evidence (mapper I-4 partial) | PARTIAL — same passthrough as V1; LOW risk | Optional V2/V3 live commit |
| Coupon reversal/refund (deferred to CRM Phase 2) | DEFERRED at BUG-108 | CRM 2.0 candidate scope |
| Wallet CRM integration | DEFERRED at BUG-108 (Owner Q11 → separate CR) | **In-scope for CRM 2.0** |
| CRM admin UI for V3-B / V3-C coupon creation | DEFERRED at BUG-108 | CRM admin sprint (TBD whether in CRM 2.0) |
| Multi-coupon per order | NOT_IMPLEMENTED (product) | Product decision |
| Variant / add-on coupon matching | NOT_IMPLEMENTED (engine limit) | CRM engine extension |

Document each item explicitly in `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_<date>.md` at sprint start.

---

## 6. Cross-References

| External path | Why it matters |
|---|---|
| `/app/memory/final/` | Frozen platform-wide rulebook — **read-only**, never modified |
| `/app/memory/crm/crm_1_0/handoff/` | Predecessor sprint handoff (Coupon + Loyalty) — input contract for any change in CRM 2.0 |
| `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_*` | POS-side BUG-108 docs (final reconciliation, mapper audit, QA reports) |
| `/app/frontend/src/` | POS Frontend code — implementation truth for anything touching the POS UI |

---

## 7. Next Steps (sprint kick-off)

1. **Scope freeze** — owner_decisions/ — convert §1 placeholder into a frozen scope doc.
2. **CR breakdown** — assign one CR id per theme (e.g. `CR_002 = WALLET`, `CR_003 = TAB`, `CR_004 = CROSS_SELL`, `CR_005 = UPSELL`, `CR_006 = ITEM_NOTES`, `CR_007 = ORDER_NOTES`, `CR_008 = INTEGRATIONS`, `CR_009 = BUG_108_CARRYOVER`).
3. **Discovery wave** — one `*_DISCOVERY_*.md` per CR.
4. **Open-gaps carryover doc** — `open_gaps/CRM2_0_BUG_108_CARRYOVER_OPEN_GAPS_2026_05_26.md` — seeded from §5 of this README.
5. **Contract freeze** — only after owner sign-off on discovery.

---

## 8. Sprint Scaffold Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | All 9 folders created | ✅ |
| 2 | Each folder has a `.gitkeep` (folders strictly empty otherwise) | ✅ |
| 3 | README.md authored (this file) | ✅ |
| 4 | No content seeded inside sub-folders | ✅ |
| 5 | `/app/memory/crm/crm_1_0/` not touched | ✅ |
| 6 | `/app/memory/final/` not touched | ✅ |
| 7 | No code changes | ✅ |
| 8 | No data mutated | ✅ |

---

**End of CRM 2.0 README.**
