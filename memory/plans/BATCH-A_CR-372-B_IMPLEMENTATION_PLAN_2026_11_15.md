# BATCH-A · CR-372-B (Routes) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_FROZEN 2026-11-15** (owner approved, R16). No BLOCKED rows · mockup M10 linked · lines rechecked at HEAD `b5d7a42`. Changes after freeze need owner approval.
> Source rows: G6 E1–E4 (moved unchanged from `plans/BATCH-A_G6_ROUTES_IMPLEMENTATION_PLAN_2026_11_15.md`, now superseded).
> Risk: MEDIUM (registry; agent does not downgrade). Backend: none. Mockup: M10 `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html#m10` (approved 2026-11-14).
> Decisions: delete `/settlement/preview` · OD-372B-A `/local-printer-setup` requires login · OD-372B-B `/restaurant-picker` unchanged.
> Build only after Gate 4 GO **and** BUG-661 (App.js, GATE_5A) QA pass.

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: NONE)
| File | Line | Current |
|---|---|---|
| `src/App.js` | L60 | `import SettlementMockup from "./pages/SettlementMockup";` |
| `src/App.js` | L244 | `<Route path="/settlement/preview" element={<SettlementMockup />} />` (no guard) |
| `src/App.js` | L251 | `<Route path="/local-printer-setup" element={<LocalPrinterSetupView />} />  {/* CR-161/CR-351 */}` (no guard) |
| `src/App.js` | L160 | `/restaurant-picker` — NOT touched |
| `src/pages/SettlementMockup.jsx` | 528 lines | Only importer is App.js L60. `CashierSettlementMockup.jsx` (App.js L44/L220) is a different file — NOT touched |
| `ProtectedRoute` | — | already imported from `./components/guards` |

## 2. Conflict pre-check
- BUG-661 (GATE_5A, App.js L85/L116/L120/L136) — no line overlap; same file → build after BUG-661 QA, recheck lines.
- No other open item edits App.js L60/L244/L251.

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| `src/App.js` | none | CR-372-B alone (after BUG-661, outside Batch A) |

## 4. Exact edits — READY
| # | File / line | Current → New |
|---|---|---|
| G6-E1 | `src/App.js` L60 | Delete the `SettlementMockup` import line |
| G6-E2 | `src/App.js` L244 | Delete the `/settlement/preview` route line |
| G6-E3 | `src/pages/SettlementMockup.jsx` | Delete file |
| G6-E4 | `src/App.js` L251 | `element={<LocalPrinterSetupView />}` → `element={<ProtectedRoute><LocalPrinterSetupView /></ProtectedRoute>}` + marker `// CR-372-B` |

## 5. Blocked edits
None.

## 6. Scope lock
WILL change: `App.js` (E1, E2, E4), delete `SettlementMockup.jsx` (E3).
Will NOT touch: `/restaurant-picker`, report preview routes (already `PermissionRoute`), Settings → Local printer panel (`ListFormViews.jsx` L189–192, same component), `CashierSettlementMockup`.

## 7. Risks
- R-3: a printer device/agent opening `/local-printer-setup` without login will now see the login page (`PUBLIC_ROUTES.md` OD-CR372-01). Owner confirms live usage before release.
- Bookmarks to `/settlement/preview` get the app's not-found/redirect behaviour.

## 8. Execution order
E1 + E2 + E3 (one commit) → E4.

## 9. Verification matrix
| # | Edit | Check | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E4 | Logged out → open `/local-printer-setup` | Redirect to login | NO |
| V2 | E4 | Logged in → open `/local-printer-setup` | Printer setup loads as today | NO |
| V3 | — | Settings → Local printer panel | Unchanged | NO |
| V4 | E1–E3 | Open `/settlement/preview` | Not served | NO |
| V5 | — | `/restaurant-picker` as admin | Unchanged | NO |
| V6 | E1–E3 | Webpack build | 0 new errors; no unresolved import | YES |
| V7 | E1–E3 | `yarn test` | No test references `SettlementMockup`; pass count unchanged | YES |

## 10. Post-code registry checklist
- [ ] `control/PUBLIC_ROUTES.md`: move `/local-printer-setup` out of the public list; remove `/settlement/preview`
- [ ] `control/FILE_OWNERSHIP.md`: CR-372-B block (App.js E1/E2/E4, deleted file E3)
- [ ] `registry.json` + `CR_REGISTRY.md`: CR-372-B → GATE_4_IMPLEMENTED
- [ ] Code marker `// CR-372-B` in App.js

## 11. Mockup links
M10 → E1–E4.
