# CHANGELOG — Codebase Analysis Documents

> Tracks all revisions to the 5 analysis documents in `/app/memory/`
> Each entry references the git commit range analyzed and the sections modified

---

## v4 — July 2025 (Latest)

**Git range**: `c3f1eef` → `6928b49` (branch `main`)
**Trigger**: BUG-252 collectBillExisting rewrite for Old POS parity, table operation guards for takeaway/delivery
**Files changed in repo**: 4 source files

### PROJECT_INVENTORY.md
| Section | Change | Reason |
|---|---|---|
| No changes | — | No new endpoints, events, routes, or env vars |

### ARCHITECTURE_CURRENT_STATE.md
| Section | Change | Reason |
|---|---|---|
| NEW subsection in §7a | `collectBillExisting` payload rewrite: food_detail[], 12 discount fields, TAB payment_status:'success', waiter_id/restaurant_name, duplicate logic warning | Major payload expansion (BUG-252) |

### MODULE_MAP.md
| Section | Change | Reason |
|---|---|---|
| §2.4 orderTransform notes | `collectBillExisting` major rewrite noted, `food_detail` builder duplicates `buildCartItem` | Function change + duplication |
| §2.6 Order Entry components | Shift/Merge/Transfer hidden for takeaway/delivery noted | UI behavior change |
| §4 Duplicate Logic | Added `buildCartItem` vs `food_detail` builder as HIGH duplication | New significant duplication |

### RISK_REGISTER.md
| Section | Change | Reason |
|---|---|---|
| NEW RISK-011d | `collectBillExisting` food_detail builder duplicates `buildCartItem` (HIGH) | Two separate per-item financial implementations |
| NEW RISK-011e | TAB `payment_status: 'success'` special case (MEDIUM) | Easy to overlook, affects status filtering |
| Risk Summary | HIGH 9→10, MEDIUM 11→12 | 2 new risks |

### OPEN_QUESTIONS_FROM_CODE.md
| Section | Change | Reason |
|---|---|---|
| NEW OQ-028 | Why does collectBillExisting rebuild food_detail instead of reusing buildCartItem? | Duplicate logic concern |
| NEW OQ-029 | Why is TAB payment_status 'success' instead of 'paid'? | Backend contract question |
| Summary table | Added "New (July 2025 v4)" row with 2 questions | New category |

---

## v3 — July 2025

**Git range**: `f494ad3` → `c3f1eef` (branch `main`)
**Trigger**: Service charge feature, auto bill print, BUG-246 fix, delivery address fix
**Files changed in repo**: 8 source files

### PROJECT_INVENTORY.md
| Section | Change | Reason |
|---|---|---|
| No changes | — | No new endpoints, events, routes, or env vars |

### ARCHITECTURE_CURRENT_STATE.md
| Section | Change | Reason |
|---|---|---|
| §7 Order-Level Financial Totals | `calcOrderTotals` now includes service charge + GST on service charge in computation | Core financial calculation modified |
| §7a Null→Empty String Migration | Added `service_tax` no longer hardcoded 0, `billing_auto_bill_print` new field | Payload structure changes |
| NEW §7e | Service Charge Flow end-to-end: profile → options → calcOrderTotals → CollectPaymentPanel UI → print | Major new feature |
| §8 Print Flow | `printOrder` signature expanded, BUG-246 fix (unit_price vs price), `customerName` for bill | Print payload changes |

### MODULE_MAP.md
| Section | Change | Reason |
|---|---|---|
| §2.4 profileTransform | New fields: `serviceChargePercentage`, `autoServiceCharge` | Restaurant profile expanded |
| §2.4 orderTransform (notes) | `calcOrderTotals` + `buildBillPrintPayload` signatures changed, `customerName` field, `autoBill` option | Multiple function signatures changed |
| §2.3 orderService (note) | `printOrder` signature expanded with `serviceChargePercentage` | Function signature changed |
| §6 Module Sizes | OrderEntry 1420→1429, CollectPaymentPanel 1358→1390 | Service charge UI added |

### RISK_REGISTER.md
| Section | Change | Reason |
|---|---|---|
| RISK-011 | Updated line counts | Components still growing |
| NEW RISK-011a | Service charge GST uses average rate approximation (MEDIUM) | Inaccurate for mixed-tax menus |
| NEW RISK-011b | `customerName` vs `customer` field divergence (LOW-MEDIUM) | Two name fields, consumers may use wrong one |
| NEW RISK-011c | `autoServiceCharge` extracted but unused (LOW) | Dead field, possibly incomplete feature |
| Risk Summary | Updated: MEDIUM 8→11 | 3 new medium risks |

### OPEN_QUESTIONS_FROM_CODE.md
| Section | Change | Reason |
|---|---|---|
| OQ-001 | Updated: rawTotal now includes serviceCharge | Rounding input changed |
| NEW OQ-025 | `autoServiceCharge` extracted but unused — toggle or dead code? | Unclear business intent |
| NEW OQ-026 | Average GST rate for service charge — legally compliant? | Financial accuracy concern |
| NEW OQ-027 | Bill print recomputes subtotal from raw data — why not use stored fields? | BUG-246 reveals unreliable stored financials |
| Summary table | Added "New (July 2025 v3)" row with 3 questions | New category |

---

## v2 — July 2025

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
