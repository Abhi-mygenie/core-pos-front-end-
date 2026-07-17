# BUG-095 — Socket Handler Dead Code Cleanup

**ID:** BUG-095
**Type:** Bug (hygiene/tech debt)
**Status:** PREREQUISITES DONE — remaining work is dead code removal only
**Priority:** P3 (downgraded from P2 — functional work complete)
**Area:** Socket / Code Quality
**Sprint:** POS 5.0
**Created:** 2026-05-18 (POS 3.0)
**Revised:** 2026-06-15 (Investigation session — confirmed prerequisites shipped, scoped remaining cleanup)
**Source:** AGENT-DISCOVERED
**Confidence:** CONFIRMED (code-verified)

---

## Symptom

Socket handler code accumulated dead/redundant code during POS 3.0 development. Prerequisites (BUG-088 + BUG-089) needed to ship first before cleanup was safe.

## Current Status

**Prerequisites — SHIPPED:**
- ✅ BUG-088 (redundant API calls) — CLOSED. Dedup guard implemented in `socketHandlers.js:17` using `recentlyProcessedOrderIds` map.
- ✅ BUG-089 (dedup guard) — CLOSED. Integrated into `handleUpdateFoodStatus` (line 391) to skip redundant calls when v2 payload already processed.

**Remaining dead code identified:**

| # | File | Dead Code | Why Dead | Safe to Remove? |
|---|------|-----------|----------|:---:|
| 1 | `socketHandlers.js:221` | `handleUpdateOrder` function (~17 lines) | Exported but NOT imported by `useSocketEvents.js`. Replaced by `handleOrderDataEvent`. Still referenced in `getHandler` map (line 803) and `index.js` re-export (line 28). | YES — `useSocketEvents` routes `update-order` to `handleOrderDataEvent` directly |
| 2 | `socketHandlers.js:800` | `getHandler()` utility function (~20 lines) | Maps event names to handlers, but `useSocketEvents.js` does its own routing via switch/if chain. No consumer calls `getHandler`. | VERIFY — may be used by tests or external code |
| 3 | `socketHandlers.js:825` | `isAsyncHandler()` utility (~10 lines) | Companion to `getHandler`. No consumer found. | VERIFY — same as above |

## Scope

- ~47 lines removal across 1 file (`socketHandlers.js`) + update `index.js` re-exports
- **Zero functional impact** — removing unused code only
- No hotspot files, no financial logic

## Duplicate Check

- DISTINCT — no other bug covers dead code cleanup in socket handlers
- RELATED to BUG-088 (CLOSED), BUG-089 (CLOSED) — prerequisites

## Blast Radius

- **Estimated scope:** SMALL (1-2 files)
- **Hotspot files touched:** NO
- **Regression risk:** MINIMAL — removing dead code, no behavior change

## Recommendation

P3 backlog. Can be done as a quick cleanup pass. No urgency — dead code doesn't affect runtime. Owner may choose to defer indefinitely.
