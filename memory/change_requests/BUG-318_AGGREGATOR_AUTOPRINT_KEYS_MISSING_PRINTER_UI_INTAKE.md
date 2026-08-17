# BUG-318 — Intake: Aggregator Auto-Print Keys Missing from Printer Agent UI (Wrong API)

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (code trace + curl)  
**Confidence:** HIGH  
**Duplicate check:** RELATED to CR-133 Gap Batch OD-B (now REVERSED by owner)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG / Design Change |
| Severity | P1 — HIGH (Aggregator auto-print completely non-functional via printer agent) |
| Risk | MEDIUM (touches aggregator print flow, but not financial) |
| Fast Lane eligible | NO — full Gate 2-3 required |

---

## Description

Three aggregator auto-print settings are **missing from the printer config UI** and **saving to the wrong API**:

1. `aggregator_auto_kot` — auto-print KOT on aggregator order
2. `aggregator_auto_bill` — auto-print bill on aggregator order
3. `aggregator_auto_bill_stage` — stage trigger: `"Acknowledged"` or `"Food Ready"`

**Current state:**
- CR-133 amendment (OD-B, 2026-08-10) moved these to AggregatorSetup → OperationalTab
- OperationalTab saves via `updateOperationalSettings()` → `POST /update-settings` → `basic: { aggregator_auto_kot, ... }`
- Printer agent device reads from `GET /printer-agent-config` → `auto_print.aggregator_auto_kot`
- **MISMATCH:** Settings saved to `update-settings` are NOT read by the printer agent. Printer agent reads from `printer-agent-config` which has empty `auto_print: {}` for this restaurant.

**Transform:** Already maps all 3 keys correctly in both fromAPI and toAPI (printerAgentConfigTransform.js:201-203, 283-285). Only the **UI** (AutoPrintTab) needs the fields restored.

**Owner-specified options for stage dropdown:** `["Acknowledged", "Food Ready"]`

**OD-B override:** Owner NOW requires these in the printer agent config UI (not AggregatorSetup).

---

## Fix Summary

1. **AutoPrintTab.jsx:** Re-add 3 fields — 2 toggles (auto_kot, auto_bill) + 1 dropdown (bill_stage with "Acknowledged"/"Food Ready" options)
2. **AutoPrintTab.jsx:** Remove or update the info banner (no longer redirect to AggregatorSetup for these settings)
3. **No transform change needed** — transform already handles these fields correctly

---

## Owner Decisions Needed

1. Should the aggregator settings also be REMOVED from AggregatorSetup / OperationalTab? Or kept in both places?
2. The `aggregator_auto_bill_stage_options` should come from API. Since API returns null for this field, hardcode `["Acknowledged", "Food Ready"]` as owner specified — confirm?
