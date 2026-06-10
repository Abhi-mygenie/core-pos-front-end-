# MyGenie POS Frontend — PRD & Session Log

## Original Problem Statement
Deploy React frontend from GitHub repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `10-june`) into `/app`. Frontend-only deployment connecting to external APIs.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend**: FastAPI (minimal placeholder — app connects to external APIs)
- **External APIs**:
  - `https://preprod.mygenie.online/` — Main API
  - `https://presocket.mygenie.online` — Socket server
  - `https://crm.mygenie.online/api` — CRM API
- **Firebase**: Push notifications, analytics

## User Personas
- **Restaurant Owner (Abhi)**: Configures restaurant settings, reviews reports, manages operations
- **Cashier**: Takes orders, collects bills, manages split payments
- **Kitchen Staff**: Views KDS, updates food status

## Core Requirements
- POS frontend deployment with all env vars configured
- Restaurant Settings wizard (CR-019) must work correctly
- Collect Bill split payment flow must work correctly (CR-021)
- Order type dropdown must respect channel settings

---

## What's Been Implemented (June 10, 2026)

### Deployment
- ✅ Cloned repo from branch `10-june` into `/app`
- ✅ Set up all 14 environment variables (Firebase, API URLs, socket)
- ✅ Frontend compiles and serves successfully

### CR-020: Restaurant Settings Bug Sweep (15 bugs found, 13 fixed)

#### Phase 1 — Critical Data Fixes ✅ SIGNED OFF
| Bug | Fix | Status |
|-----|-----|--------|
| B1 | `online_payment` field added to toAPI transform | DONE |
| B9 | Removed manual Content-Type header from FormData upload | DONE |
| B10 | Mitigated by B9 (no code change) | DONE |

#### Phase 2 — Wizard Logic Fixes ✅ SIGNED OFF
| Bug | Fix | Status |
|-----|-----|--------|
| B3 | Logo/PDF only sent on Step 1 save | DONE |
| B5 | handleSkip upper-bound guard | DONE |
| B6 | goToStep enforces all prior required steps | DONE |

#### Phase 3 — UX Polish ✅ SIGNED OFF
| Bug | Fix | Status |
|-----|-----|--------|
| B7 | Error keys scoped per step (step1.phone vs step6.phone) | DONE |
| B8 | NumberInput allows empty transitional state | DONE |
| B4 | Removed unused imports (Building2, SkipForward) | DONE |

#### Phase 4 — Dashboard Channel Visibility ⏳ AWAITING OWNER SMOKE TEST
| Bug | Fix | Status |
|-----|-----|--------|
| B11 | ORDER_TYPES filtered by restaurant features in OrderEntry.jsx | DONE — awaiting smoke test |
| B2 | CLOSED — not a bug (mixed types confirmed intentional by backend) | CLOSED |

#### Additional Fixes (B12–B15) ✅ IMPLEMENTED, AWAITING SMOKE TEST
| Bug | Fix | Status |
|-----|-----|--------|
| B12 | "Default GST %" field hidden from UI (backend-only config) | DONE |
| B13 | GST Mode hint is now dynamic based on selection | DONE |
| B14 | GST Mode labels: "Item Level" / "Restaurant Level" | DONE |
| B15 | Short Code changed from TextInput to Toggle (toBool/toYesNo) | DONE |

#### Investigated — Backend Gap
| Item | Finding |
|------|---------|
| VAT Tax % | Field does NOT exist in backend API response. Only `vat.status` and `vat.code` exist. Backend team needs to add `vat_tax` field before frontend can show it. |

### CR-021: Collect Bill Split Payment (REGISTERED, NOT IMPLEMENTED)
- P0 priority — money-impacting bugs
- 4 bugs: B1 (partial_payments dropped), B2 (split not re-clamped on bill change), B3 (Card Txn ID forced when amount=0), B4 (no sum-must-cover-total check)
- All 5 owner decisions locked
- Full implementation plan with line-by-line diffs ready
- **Status: READY FOR GATE 6 (Code Implementation)**

### CR-018: Schedule Order (PRE-EXISTING, NOT IMPLEMENTED)
- 10 gaps identified in existing CR doc
- Phase 1 (G1-G4) already done before this session
- Phase 2 (G5-G10) pending implementation
- **Status: OPEN — independent of CR-020/021**

---

## Prioritized Backlog

### P0 (Immediate)
1. **CR-021 implementation** — Collect Bill split payment fixes (money-impacting)
2. **CR-020 Phase 4 smoke test** — Owner to verify B11 (channel dropdown)
3. **CR-020 B12-B15 smoke test** — Owner to verify GST/VAT/Short Code changes

### P1 (Next Sprint)
4. **CR-018 Phase 2** — Schedule Order gaps (G5-G10)
5. **VAT Tax %** — Backend team to add `vat_tax` field to settings API
6. **Ask owner**: Any other bugs in Restaurant Settings?

### P2 (Future)
7. ESLint warnings cleanup (react-hooks/exhaustive-deps)
8. VisualEditsPlugin overlay file missing (non-critical)

---

## Test Reports
| Iteration | Scope | Result |
|-----------|-------|--------|
| 1 | Initial deployment | 100% pass |
| 2 | CR-020 Phase 1 (B1, B9, B10) | 100% pass |
| 3 | CR-020 Phase 2 (B3, B5, B6) | 100% pass |
| 4 | CR-020 Phase 3 (B7, B8, B4) | 100% pass |
| 5 | CR-020 Phase 4 (B11) | 100% pass |
| 6 | CR-020 B12-B15 | 100% pass |

---

## Key Files Modified This Session
| File | Bugs Fixed |
|------|-----------|
| `src/api/transforms/restaurantSettingsTransform.js` | B1, B15 |
| `src/api/services/restaurantSettingsService.js` | B9 |
| `src/pages/RestaurantSettingsPage.jsx` | B3, B4, B5, B6, B7, B8, B12, B13, B14, B15 |
| `src/components/order-entry/OrderEntry.jsx` | B11 |

## Change Request Docs
- `/app/memory/change_requests/CR_018_SCHEDULE_ORDER_CR.md`
- `/app/memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md`
- `/app/memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md`
