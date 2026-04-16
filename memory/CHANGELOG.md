# CHANGELOG — Codebase Analysis Documents

> Tracks all revisions to the 5 analysis documents in `/app/memory/`
> Each entry references the git commit range analyzed and the sections modified

---

## v2 — July 2025 (Latest)

**Git range**: `9beb08f` → `f494ad3` (branch `main`)
**Trigger**: User reported endpoint changes, bug fixes, and validations pushed to `main`
**Files changed in repo**: 18 source files

### PROJECT_INVENTORY.md
| Section | Change | Reason |
|---|---|---|
| §3 Codebase Metrics | API endpoints 34→35, Socket events 11→12 | New `PREPAID_ORDER` endpoint, new `split-order` socket event |
| §7 External API Dependencies | Added PREPAID_ORDER, noted SPLIT_ORDER v1→v2 upgrade | New/changed endpoints |
| §7 Socket channel description | 10→11 event types on order channel | `split-order` added |

### ARCHITECTURE_CURRENT_STATE.md
| Section | Change | Reason |
|---|---|---|
| §5 Socket Event Table | Added `split-order` row | New socket event with `handleSplitOrder` handler |
| §5 Key Pattern note | Added `split-order` to v2 inline-payload list | Event uses payload, no API fetch |
| NEW §7a | `placeOrderWithPayment` payload changes: `partial_payments` always mandatory, null→'' migration, tip_amount→string | Significant payload structure rewrite in `orderTransform.js` |
| NEW §7b | Prepaid Order Flow diagram | Entirely new feature: detection → block edits → `completePrepaidOrder` on served |
| NEW §7c | Delta Item Pattern (BUG-237) | New mechanism for placed item qty editing via unplaced delta items |
| NEW §7d | `orderItemsByTableId` breaking change | Data model changed from single object to array per tableId (split order support) |
| §12 Patterns Table | Added 4 new patterns | Delta items, split orders, input validation, payment validation |

### MODULE_MAP.md
| Section | Change | Reason |
|---|---|---|
| §2.2 OrderContext | `orderItemsByTableId` returns array, line count 337→344 | Split order support — breaking change |
| §2.3 orderService | Added `completePrepaidOrder`, `PREPAID_ORDER` endpoint, line count 128→147 | New prepaid flow |
| §2.4 orderTransform | Added note about `paymentType` field + payload changes | New field extracted, payload restructured |
| §2.5 Socket Modules | `socketHandlers` 594→652 lines, `useSocketEvents` 191→195, 12 events | `handleSplitOrder` added |
| §6 Module Sizes | Updated line counts: Dashboard 1376→1421, OrderEntry 1298→1420, CollectPaymentPanel 1235→1358, CartPanel 740→781 | All grew due to new features/validations |

### RISK_REGISTER.md
| Section | Change | Reason |
|---|---|---|
| NEW RISK-010a | `orderItemsByTableId` array breaking change (HIGH) | Consumers accessing as object will silently break |
| NEW RISK-010b | `partial_payments` always sent with 0-amount entries (MEDIUM) | Backend must handle 0-amount partial payments |
| NEW RISK-010c | null→'' payload semantics change (MEDIUM) | Backend IS NULL checks may behave differently |
| RISK-017 | Added partial mitigation note | Phone 10-digit cap, card txn ID, TAB customer validation added |
| Risk Summary | Updated counts: HIGH 6→9 | 3 new HIGH/MEDIUM risks |

### OPEN_QUESTIONS_FROM_CODE.md
| Section | Change | Reason |
|---|---|---|
| OQ-002 | Added `split-order` to remove-vs-update analysis | New event always updates, never removes |
| NEW OQ-021 | Prepaid order lifecycle gaps | New flow with unclear cancellation and socket behavior |
| NEW OQ-022 | Split order cross-device consistency | Socket only sends original order, new split order not broadcast |
| NEW OQ-023 | Delta item race condition with socket updates | Deltas silently discarded on socket sync |
| NEW OQ-024 | Split bill restriction to dine-in/walk-in | Business rule or technical limitation? |
| Summary table | Updated: added "New (July 2025)" row with 4 questions | New category |

---

## v1 — July 2025 (Initial)

**Git commit**: `9beb08f` (branch `main`)
**Trigger**: Initial codebase analysis requested by user
**Method**: Full clone + static code analysis of entire `src/` directory (209 files, ~36,387 LOC)

### All 5 Documents Created
| Document | Lines | Key Content |
|---|---|---|
| PROJECT_INVENTORY.md | 231 | Tech stack, directory structure, env vars, routes, API endpoints |
| ARCHITECTURE_CURRENT_STATE.md | 401 | Architecture diagrams, 9 contexts, auth/socket/API flows, order calc, print flow |
| MODULE_MAP.md | 226 | Dependency graph, module registry, duplicate logic, ownership, complexity hotspots |
| RISK_REGISTER.md | 208 | 22 risks: 4 CRITICAL, 6 HIGH, 8 MEDIUM, 4 LOW |
| OPEN_QUESTIONS_FROM_CODE.md | 174 | 20 questions across business logic, technical, integration, data model |

### Also Done
- Repo cloned from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` branch `main`
- Code deployed to `/app/frontend/` with all env vars configured
- Frontend running and verified via screenshot (login page loads correctly)
