# BATCH-A · G6 Routes (CR-372-B) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_READY** (FE only, no backend dependency). Build only after Gate 4 GO **and** BUG-661 (App.js, GATE_5A) passes QA.
> Mockup: `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html#m10` (approved 2026-11-14).
> Decisions: delete `/settlement/preview` · OD-372B-A `/local-printer-setup` requires login · OD-372B-B `/restaurant-picker` unchanged.

## 1. Code reality (verified at HEAD 2026-11-15)
| File | Line | Current |
|---|---|---|
| `src/App.js` | L60 | `import SettlementMockup from "./pages/SettlementMockup";` |
| `src/App.js` | L244 | `<Route path="/settlement/preview" element={<SettlementMockup />} />` (no guard) |
| `src/App.js` | L251 | `<Route path="/local-printer-setup" element={<LocalPrinterSetupView />} />  {/* CR-161/CR-351 */}` (no guard) |
| `src/App.js` | L160 | `/restaurant-picker` — NOT touched |
| `src/pages/SettlementMockup.jsx` | 528 lines | Only importer is App.js L60 (grep, incl. `__tests__`). `CashierSettlementMockup.jsx` is a different file — NOT touched. |
| `ProtectedRoute` | L87 | already imported from `./components/guards` |

## 2. Conflict pre-check
- BUG-661 (GATE_5A, App.js L85/L116/L120/L136) — no line overlap. Same file → build after BUG-661 QA, recheck line numbers.
- No other open item edits App.js L60/L244/L251.

## 3. Exact edits
| # | File | Change |
|---|---|---|
| G6-E1 | `src/App.js` L60 | Delete the `SettlementMockup` import line. |
| G6-E2 | `src/App.js` L244 | Delete the `/settlement/preview` route line. |
| G6-E3 | `src/pages/SettlementMockup.jsx` | Delete file. |
| G6-E4 | `src/App.js` L251 | `element={<LocalPrinterSetupView />}` → `element={<ProtectedRoute><LocalPrinterSetupView /></ProtectedRoute>}` + marker `// CR-372-B`. |

## 4. Scope lock
Only the 3 items above. NOT touched: `/restaurant-picker`, report preview routes (already `PermissionRoute`), Settings → Local printer panel (same component, already behind login), `CashierSettlementMockup`.

## 5. Risks
- R-3: a printer device/agent opening `/local-printer-setup` without login will now see the login page. `PUBLIC_ROUTES.md` OD-CR372-01 says the agent uses it without a session → owner confirms live usage before release (release check).
- Anyone with a bookmark to `/settlement/preview` gets the app's not-found/redirect behaviour.

## 6. Execution order
E1 + E2 + E3 together (one commit) → E4.

## 7. Verification matrix
| # | Check | Expected |
|---|---|---|
| V1 | Logged out → open `/local-printer-setup` | Redirect to login |
| V2 | Logged in → open `/local-printer-setup` | Printer setup screen loads as today |
| V3 | Settings → Local printer panel | Unchanged |
| V4 | Open `/settlement/preview` | Not served (no demo page) |
| V5 | `/restaurant-picker` logged in as admin | Unchanged |
| V6 | Webpack build | 0 new errors/warnings; no unresolved import |
| V7 | `yarn test` | No test references `SettlementMockup` — unchanged pass count |

## 8. Registry checklist (at Gate 5A)
- `control/PUBLIC_ROUTES.md`: move `/local-printer-setup` out of the public list (protected by CR-372-B); remove `/settlement/preview`.
- `control/FILE_OWNERSHIP.md`: CR-372-B block (App.js E1/E2/E4, deleted file E3).
- `CR_REGISTRY.md` + `registry.json`: status update.

## 9. Backend dependency markers
None.
