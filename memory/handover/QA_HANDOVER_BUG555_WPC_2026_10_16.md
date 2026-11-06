# QA Handover — BUG-555 WP-C
## Header Breakpoints lg → xl (1024px → 1280px)
**Date:** 2026-10-16 · **From:** IMPLEMENTATION · **To:** QA
**Registry sync:** YES — BUG-555 wpc_status → GATE_5A_IMPLEMENTED
**EXIT GATE:** 5/5 PASS

---

## 1. What Changed

| # | Line | Change |
|---|---|---|
| C1 | 275 | `hidden lg:flex` → `hidden xl:flex` (pills nav) |
| comment | 341–342 | Block comment updated: `<1024px` → `<1280px` |
| C2 | 343 | `lg:hidden` → `xl:hidden` (tablet dropdown) |
| C3 | 432 | `hidden lg:flex` → `hidden xl:flex` (PlatformDropdown) |
| C4 | 437 | `lg:px-4` → `xl:px-4` · **min-w-0 from BUG-565 preserved** |
| C5 | 442 | `hidden lg:flex` → `hidden xl:flex` (counter chip) |
| C6 | 445 | `lg:flex-initial` → `xl:flex-initial` (search mode) |
| C7 | 449 | `lg:w-64/lg:w-48` → `xl:w-64/xl:w-48` (search width) |
| C8 | 487 | `lg:right-auto…lg:w-96` → `xl:right-auto…xl:w-96` (dropdown pos) |
| C9 | 769 | Add group: `+flex-shrink-0` |
| C10 | 774 | Add button: `+max-sm:min-w-[44px] max-sm:min-h-[44px]` `+justify-center` `+aria-label="Add"` |
| C11 | 780 | Add span: `+hidden sm:inline` (icon-only <640px) |

**Self-test:** V1 grep — 0 old `lg:` lines remain ✅ · V2 — 8 xl: classes present ✅ · V3 — min-w-0 preserved ✅ · V4–V6 — C9/C10/C11 confirmed ✅ · Compile: 1 pre-existing warning, 0 new ✅

---

## 2. Test Cases

| # | Test | Viewport | Steps | Expected |
|---|---|---|---|---|
| **V1** | **Pills visible at 1280** | **1280×800** | Load dashboard | Pills nav shows filter chips, PlatformDropdown visible |
| **V2** | **Pills hidden, dropdown shows at 1100** | **1100×800** | Load dashboard | Pills nav hidden; `[data-testid='tablet-filter-dropdown-btn']` visible |
| **V3** | **Tablet dropdown at 960** | **960×600** | Load dashboard | Dropdown still visible (unchanged — was already tablet) |
| **V4** | **Desktop ≥1280 unchanged** | **1280×800** | Compare header visually | Pixel-identical to pre-WP-C at ≥1280px |
| **V5** | **Add icon-only at 400px (phone)** | **400×800** | Load dashboard | Add button shows only `+` icon (span hidden), 44×44px |
| **V6** | **Add text visible at 640px** | **640×800** | Load dashboard | Add button shows `+ Add` text |
| **V7** | **Desktop Add height 40px** | **1280×800** | Measure `[data-testid='add-table-btn']` height | 40px — `max-sm:` doesn't fire |
| **V8** | **CR-414 T13 desktop regression** | **1280×800** | Full header inspection | Pills, search, Add, Platform dropdown all present; no visual change |
| **V9** | **BUG-565 min-w-0 regression** | **600×960** | Check header scrollWidth | No overflow; min-w-0 preserved on center section |
| **V10** | **Compile** | — | `tail -3 /var/log/supervisor/frontend.out.log` | `webpack compiled with 1 warning` (pre-existing only) |

---

## 3. Regression Tests

| # | Test | Why |
|---|---|---|
| R1 | Filter dropdown still opens at 600×960 | C2 changed `lg:hidden` → `xl:hidden`; must still show <1280px |
| R2 | Status filter guard still fires | BUG-566 guard code (L247-248) — no regression from C4 |
| R3 | Search results drop at 600×960 | C8 changed search dropdown positioning |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-555 wpc_status → GATE_5A_IMPLEMENTED
Sprint: oct_cr_batch
EXIT GATE: ALL 5 PASSED
  ✅ 1. registry.json: wpc_status GATE_5A_IMPLEMENTED
  ✅ 2. BUG_TRACKER.md: updated
  ✅ 3. FILE_OWNERSHIP.md: Header.jsx entry updated
  ✅ 4. Code markers: BUG-555 WP-C on all 12 changed lines
  ✅ 5. Compile: 1 pre-existing warning, 0 new
```

## 5. Credentials + Environment

- App URL: https://genie-pos-app.preview.emergentagent.com
- Email: owner@cafe103.com · Password: Qplazm@10
- Note: preprod /products has been timing out (iterations 2–6). Code checks should PASS; browser tests may be blocked.
