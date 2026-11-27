# Owner Decision: Sheet Push Field Rules

**Date:** 2026-11-18
**Decision by:** Owner
**Applies to:** All future `sheets_sync.py --push` operations

## Rules

| Field | Push behaviour |
|-------|---------------|
| **Priority** | **NEVER overwrite.** If the Sheet cell already has a value, keep it (CTO-owned). Only fill if Sheet cell is blank. |
| **Assignee** | **NEVER overwrite.** If the Sheet cell already has a value, keep it (CTO-owned). Only fill if Sheet cell is blank. |
| **All other fields** | Push from registry → Sheet normally. |
| **Blank registry values** | Skip — do not write blank/empty over a Sheet value that already has content. |

## Rationale

CTO edits Priority and Assignee directly on the Google Sheet. The push script was overwriting these CTO edits with registry values. This decision makes Priority and Assignee **Sheet-authoritative** (CTO wins), while all other fields remain **registry-authoritative** (agent wins).

## Implementation Status

- `AGENT_PROMPT_ALPHA.md` Role 13 (Sheet Push Agent): Updated with "Push Field Rules" section.
- `CONTROL_DASHBOARD.md`: Decision recorded.
- `sheets_sync.py`: **FULLY IMPLEMENTED.**
  - Push writes col W (Release date) — was already in v1.6 script.
  - Pull accepts blank release dates as "cleared by owner" — fixed 2026-11-18.
  - Outdated docstrings corrected 2026-11-18.

## Next

`sheets_sync.py` must be updated to:
1. Before writing a row, read the existing Sheet row for Priority (col F) and Assignee (col H).
2. If Sheet cell has a value → keep it (skip writing from registry).
3. If Sheet cell is blank AND registry has a value → write it.
4. For all other columns → write from registry as before.
5. For any blank registry value → skip (don't overwrite Sheet content with blank).
