# Print Payload Mini-CR Addendum — Implementation Report — 2026-05-17

## 1. Summary

Addendum to the Print Payload Mini-CR adding two backend-requested keys to the temp-store print payload.

- 2 files changed, +24 lines net.
- ESLint clean, Jest **34/34 suites — 497/497 tests pass** (was 496 → +1 new positive test), webpack compiled successfully, dev server HTTP 200.

## 2. What Was Fixed

Two new keys added to `buildBillPrintPayload` return, sourced straight from order context (`fromAPI.order.paymentStatus` / `paymentMethod`):

```js
payment_status: order.paymentStatus || '',
payment_method: order.paymentMethod || '',
```

- No override-branch handling.
- No change to Collect Bill flow.
- Audit Report (BUG-059) will inherit the same default-branch path; owner will specify any BUG-059-specific behavior during that bucket.

## 3. Files Changed

| File | +Lines | -Lines | Summary |
|---|---:|---:|---|
| `frontend/src/api/transforms/orderTransform.js` | 10 | 0 | Added `payment_status` + `payment_method` to `buildBillPrintPayload` return, right after `rtype`. |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | 14 | 0 | Updated docstring; added `payment_status`/`payment_method` `''` default assertions to all 5 existing tests; added new positive test for paid-order pass-through. |

## 4. Validation Results

| Check | Result |
|---|---|
| ESLint `orderTransform.js` | ✅ No issues |
| Full Jest suite | ✅ 34/34 suites, **497/497** tests pass |
| Webpack compile | ✅ Compiled successfully |
| Dev server | ✅ HTTP 200 |
| Earlier Wave 4 + Mini-CR changes | ✅ All preserved |

## 5. Expected On-The-Wire Behavior

| Print path | `payment_status` | `payment_method` |
|---|---|---|
| Collect Bill panel preview (unpaid order) | `"unpaid"` | `""` |
| Dashboard / OrderEntry reprint of paid Cash order | `"paid"` | `"cash"` |
| Dashboard reprint of paid Card order | `"paid"` | `"card"` |
| Dashboard reprint of TAB-settled | `"success"` | `"tab"` |
| PayLater-settled (backend typo) | `"sucess"` | `"paylater"` |
| Audit Report (BUG-059) — default flow today | inherits same path | inherits same path |

## 6. Repo State

| Item | Value |
|---|---|
| Branch | `17-may` |
| Base commit | `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a` |
| Wave 4 status | BUG-050 ✅ • BUG-057 ✅ • Mini-CR ✅ • Mini-CR Addendum ✅ • BUG-059 ⏸ |
| Commit allowed | No |

## 7. Next Action

Resume Wave 4 BUG-059 (Audit Report Print Bill on Paid tab). Diff preview at `POS2_0_WAVE_4_CODE_DIFF_PREVIEW_BUG_059_2026_05_17.md` is still valid; awaiting owner Gate 7 approval (A/B/C).

---

*— End of Print Payload Mini-CR Addendum Implementation Report —*
