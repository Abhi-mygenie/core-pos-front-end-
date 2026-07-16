# BUG-192: Prep & Serve Time — Handover Time Showing 0 + Full Logic Investigation

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** MEDIUM
**Severity:** P1
**Classification:** BACKEND_DATA (missing timestamps)

## Description
In Insights → Kitchen Ops → Prep & Serve Time, Takeaway channel shows Handover: 0 min.

## Investigation Findings

**Complete timing logic documented from `prepServeService.js`:**

**Item Classification (per food item):**
- **Kitchen:** `created_at → ready_at` (gap > 30s) `→ serve_at` → Prep + Serve
- **Bar:** `created_at ≈ ready_at` (gap ≤ 30s) `→ serve_at` → Serve only
- **Direct:** no timestamps / all ≈ created_at → skip entirely

**Channel breakdown:**
- `CHANNEL_CONFIG.Takeaway.serveLabel = 'Handover'` — "Handover" = avg serve time
- Handover = average of (`serve_at - ready_at`) across all takeaway kitchen/bar items

**Why Handover = 0:**
Takeaway items lack `serve_at` timestamps. When kitchen marks "Ready" → `ready_at` is set. But nobody clicks "Served/Handed over" for takeaway → `serve_at` stays null → excluded from average → 0 min.

**Timing assumptions/exceptions in code:**
1. Items within 30 seconds of `created_at` → "Direct" → excluded from ALL timing
2. `ready_at` within 30s of created but `serve_at` later → "Bar" mode → serve only
3. Max cap: 120 minutes — above = data error, excluded
4. Negative time differences → data error → excluded
5. **No SLAs/targets configured** — "Escalation Matrix" shows "Coming Soon"

## Fix Required
- **BACKEND / OPERATIONAL** — either:
  - Add a "Handed Over" action for takeaway orders so `serve_at` gets recorded
  - Or backend auto-records `serve_at` when takeaway order is collected/status changes
- **Zero FE changes needed** — logic is correct, just no data to compute on

## Files
- FE correct: `prepServeService.js`, `PrepServeTimeMockup.jsx`
