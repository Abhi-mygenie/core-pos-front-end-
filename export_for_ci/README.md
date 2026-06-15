# MyGenie POS — Agent Dispatch System Export

**Exported:** 2026-06-15
**Purpose:** Reference files for designing Central Inventory dispatch system

## Files

### Core Dispatch Chain
| # | File | Purpose |
|---|------|---------|
| 1 | `workflow_queue.json` | The actual queue file agents read at session start (STEP -1) |
| 2 | `workflow.js` | Batch manager — creates/updates/cancels batches, syncs to disk via API |
| 3 | `dashboard.js` | Full dashboard UI — renders batch controls, gate progress, smoke cards |
| 4 | `dashboard_index.html` | Dashboard HTML entry point |
| 5 | `auth.js` | Dashboard login gate (session-based, not Firebase) |
| 6 | `server.py` | FastAPI backend — `POST /api/workflow-queue` saves queue to disk, `GET` reads it |

### Registry & Data
| # | File | Purpose |
|---|------|---------|
| 7 | `registry_sample.json` | Schema sample: 5 items from 214-item registry (sprints_meta + item fields) |
| 8 | `registry_sync.py` | Script that syncs registry.json (adds missing items, fixes sprint_keys) |
| 9 | `dashboard_data_config.json` | Dashboard config — tabs, headline, UI settings |
| 10 | `dashboard_data_cr_registry.json` | CR data consumed by dashboard tabs |
| 11 | `dashboard_data_bug_tracker.json` | Bug data consumed by dashboard tabs |
| 12 | `dashboard_data_access.json` | Access control — who can login to dashboard |

### Agent Prompt
| # | File | Purpose |
|---|------|---------|
| 13 | `AGENT_PROMPT_ALPHA.md` | v0.6 — 12-role agent system prompt (1482 lines). STEP -1 reads the queue. |

## Dispatch Flow

```
Owner opens dashboard (dashboard_index.html)
  → Logs in (auth.js validates against access.json)
  → Sees items from cr_registry.json + bug_tracker.json
  → Selects items → clicks "Send to Impact Analysis"
    → workflow.js:createBatch() writes to localStorage + POST /api/workflow-queue
      → server.py saves to workflow_queue.json on disk
        → Next agent session reads workflow_queue.json at STEP -1
          → Agent picks role from batch stage, processes items
          → Agent updates batch status to DONE via POST /api/workflow-queue
```

## Key Schema: workflow_queue.json

```json
{
  "batches": [
    {
      "batch_id": "BATCH-2026-06-15-001",
      "stage": "impact_analysis",       // impact_analysis | implementation_plan | gate4 | implementation | qa | smoke
      "sprint": "pos_5_0",
      "items": ["BUG-096", "BUG-118"],  // item IDs from registry.json
      "status": "QUEUED",               // QUEUED | IN_PROGRESS | DONE
      "created_at": "2026-06-15T04:59:36.488Z",
      "owner_notes": "first batch"
    }
  ],
  "approvals": [],       // Gate 4 GO/NO decisions
  "smoke_results": []    // Owner smoke PASS/FAIL per item
}
```

## Key Schema: registry.json item

```json
{
  "id": "CR-047",
  "title": "AGENT_PROMPT_ALPHA v0.6 ...",
  "type": "cr",                          // cr | bug
  "status": "CLOSED — OWNER VERIFIED",
  "priority": "P1",
  "area": "Agent Control Layer",
  "sprint_key": "pos_5_0",
  "created_date": "2026-06-15",
  "completeness": "7/7",
  "art1_intake": "PRESENT",              // PRESENT | MISSING
  "art2_impact": "PRESENT",
  "art3_plan": "PRESENT",
  "art4_code_gate": "N/A",
  "art5_impl_summary_qa": "PRESENT",
  "art6_owner_smoke": "PRESENT",
  "artifact_refs": "memory/change_requests/CR_047_...",
  "category": "Agent Control Layer"
}
```
