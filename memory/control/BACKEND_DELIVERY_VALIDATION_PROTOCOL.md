# Backend Delivery Validation Protocol — v1 — 2026-11-16

**Purpose:** Standardize how the FE agent validates a backend handoff/delivery against the locked API contract, and how to send structured feedback when deviations are found.

**Trigger:** Backend agent delivers a handoff document (implementation complete, preprod verified, ready for FE wiring). FE agent validates BEFORE writing any code.

---

## PHASE 1: Line-by-Line Contract Validation

For EVERY item in the backend handoff, the FE agent runs this checklist against the locked contract file (`contracts/BATCH-X_<ID>_API_CONTRACT_<DATE>.md`):

### 1A. Field-Level Check (per endpoint)

| Check | Rule | If violated |
|---|---|---|
| Field name matches contract | Names are LOCKED. `cancel_item_note` in contract = `cancel_item_note` in handoff. No renames. | **REJECT** — "Field renamed: contract says `X`, handoff says `Y`" |
| Field type matches | string/int/array/boolean as contracted | **REJECT** — "Type changed: contract says string, handoff says int" |
| Field location matches | Same endpoint path, same nesting level | **REJECT** — "Field moved: contract says `orders[].X`, handoff says `data.X`" |
| Required/optional matches | If contract says "always sent", handoff can't make it optional | **REJECT** — "Requirement changed" |
| Enum values match | If contract lists specific values, handoff must use the same | **REJECT** — "Enum value added/changed without contract update" |
| Error codes match | HTTP status + error code as contracted | **FLAG** — "Error response pattern differs" |

### 1B. Behaviour Check (per BA/BD item)

| Check | Rule | If violated |
|---|---|---|
| Behaviour rule implemented | Contract says "never copy reason into note" → handoff must confirm this | **REJECT** if contradicted |
| No side effects added | Backend must not add behaviours not in contract (e.g., auto-populating a field, triggering a webhook) | **FLAG** — "New behaviour not in contract: `X`" |
| Existing endpoints unchanged | Contract rule: "additive only — existing requests and responses keep working" | **REJECT** if breaking change |

### 1C. Additions Check (things in handoff NOT in contract)

| Category | Action |
|---|---|
| **New field** not in contract | **FLAG** — FE does not use until owner approves and contract is amended |
| **New constraint** (e.g., max length, rate limit) | **FLAG** — FE must handle (e.g., maxLength on textarea) but contract should be updated |
| **New error response pattern** | **FLAG** — FE must handle but contract should document it |
| **New endpoint** | **REJECT** — contract says "No new endpoint URLs were created" but one appears |
| **Implementation detail** (e.g., which DB column, migration file) | **IGNORE** — backend internal, FE doesn't care |
| **Deployment instruction** (e.g., run migration first) | **NOTE** — pass to deployment role, not FE concern |

---

## PHASE 2: Classify Each Finding

After the line-by-line check, classify every finding into one of:

| Classification | Meaning | Action |
|---|---|---|
| ✅ **CONTRACT_MATCH** | Handoff matches contract exactly | Proceed with FE implementation |
| ⚠️ **CONTRACT_ADDITION** | Handoff adds info not in contract but doesn't contradict it | Note it. Ask owner: amend contract or ignore? FE handles if needed (e.g., maxLength) |
| ❌ **CONTRACT_DEVIATION** | Handoff contradicts or changes something in the locked contract | **STOP. Do not implement. Send BACKEND_CONTRACT_REVIEW brief.** |
| 🔍 **VERIFY_ON_PREPROD** | Handoff claims behaviour but FE should curl-verify before trusting | Probe preprod. If verified → CONTRACT_MATCH. If not → CONTRACT_DEVIATION |
| 📋 **QA_ONLY** | Backend behaviour change that FE doesn't code — just verifies in QA | Add to QA handover verification matrix |

---

## PHASE 3: Generate Response Brief

### If ALL items are CONTRACT_MATCH or CONTRACT_ADDITION:

```
BACKEND DELIVERY ACCEPTED — <BA-IDs>

Validated against: contracts/<contract_file>
Date: <date>
Items: <BA-01, BA-02, ...>

## Contract Match (N/N)
| BA-ID | Contract field/behaviour | Handoff confirms | Status |
|---|---|---|---|
| BA-01 | `cancel_item_note` on cancel-food-item | ✅ Exact match | ACCEPTED |

## Additions (not in contract — noted)
| # | What | FE impact | Action |
|---|---|---|---|
| 1 | 255-char limit with success:false in 200 | Add maxLength on textarea | FE handles, contract amendment recommended |

## Unblocked FE edits
| Edit | Bug/CR | Ready for Gate 4? |
|---|---|---|
| BUG-670 B1 | BUG-670 | YES |

Next: Gate 4 GO for unblocked edits.
```

---

### If ANY item is CONTRACT_DEVIATION — send this to backend agent:

```markdown
# BACKEND_CONTRACT_REVIEW_<BA-IDs>_<DATE>

## Status: REJECTED — CONTRACT DEVIATION DETECTED

Locked contract: `contracts/<contract_file>` (approved <date>, owner R20)
Contract rule: Names are fixed. No renames, no retypes, no drops, no additions without owner approval.

## Deviations Found

| # | BA-ID | Contract says | Handoff says | Deviation type |
|---|---|---|---|---|
| 1 | BA-XX | Field `cancel_item_note`, string, max 255 | Field `item_cancel_note`, string, max 500 | FIELD_RENAMED + CONSTRAINT_CHANGED |
| 2 | BA-YY | Error: 422 `CANCEL_NOTE_REQUIRED` | Error: 200 with `success: false` | ERROR_PATTERN_CHANGED |

## Required Action

For each deviation, backend agent must choose ONE:
1. **FIX** — change the implementation to match the contract exactly. Re-deliver.
2. **JUSTIFY** — explain why the contract can't be met. This goes to the OWNER for a contract amendment decision. FE does NOT implement until owner amends the contract.

## What FE will NOT do
- FE will NOT rename fields to match a non-contract name
- FE will NOT implement against a changed contract without owner sign-off
- FE will NOT "work around" a deviation — the contract is the source of truth

## What FE WILL do
- Accept the delivery immediately once deviations are resolved
- Implement unblocked edits that have no deviations

## Items accepted (no deviation)
| BA-ID | Status |
|---|---|
| BA-03 | ✅ ACCEPTED — behaviour matches contract |

## Items blocked (deviation)
| BA-ID | Status |
|---|---|
| BA-XX | ❌ BLOCKED — awaiting fix or owner amendment |

---
Sent by: FE Planning Agent
Contract authority: Owner (R19/R20 rules)
```

---

## PHASE 4: Owner Escalation (if needed)

When backend responds with JUSTIFY (can't match contract):

```markdown
# OWNER_CONTRACT_AMENDMENT_REQUEST_<BA-IDs>_<DATE>

## Context
Backend delivered BA-XX but it deviates from the locked contract.
Backend justification: "<backend's reason>"

## Contract says
<exact text from contract>

## Backend says
<exact text from handoff>

## Options
A) **Amend contract** — accept backend's version, update contract file, FE implements new version
B) **Enforce contract** — backend must change implementation to match original contract
C) **Compromise** — owner defines a third option

## Impact of each option
- Option A: FE changes <list files/lines>. Risk: <low/medium/high>
- Option B: Backend re-work. ETA: <backend to estimate>
- Option C: <depends on owner's choice>

Awaiting owner decision. FE will not proceed until contract is either enforced or amended.
```

---

## Quick Reference: Contract Rules (from BATCH-A Index)

1. **Names are fixed.** Backend implements exactly as written.
2. **No renames.** Renamed/retyped/dropped/added field → reply REJECTED, goes to owner.
3. **Existing keys never renamed** (owner 2026-11-15). Existing name used as-is.
4. **Additive only.** Existing requests and responses keep working.
5. **Errors:** HTTP 403 (right/PIN) or 422 (validation), with `{ "error_code": "CODE", "message": "text" }`.
6. **Sign-off:** Backend fills table at bottom of contract. FE checks before Gate 4.
