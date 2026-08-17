# CR-027 Revalidation Report — Unified Toast & Error Surfacing

**Audit date:** 2026-06-12
**Auditor:** Senior Code Auditor (read-only revalidation — NO code written)
**Plan audited:** `/app/memory/change_requests/CR_027_UNIFIED_TOAST_ERROR_SURFACING_CR.md` (registered 2026-06-10)
**Method:** full grep inventory re-run, automated catch-block classifier across 24 files, manual context reads of every ambiguous catch, service-layer swallow trace, primitive availability check.

---

## 1. Inventory delta (vs §3.1 / §2.1)

Re-ran the plan's own grep (`toast({` in *.jsx/*.js, excluding node_modules/.bak/use-toast.js):

| Metric | Plan (Jun 10) | Today (Jun 12) | Delta |
|---|---|---|---|
| Files using toast | 28 (27 components + infra) | **27** — exact match with §3.1 component list | none added, none removed |
| Total `toast({` calls | 168 | **167** | −1 (cosmetic drift, no scope impact) |

**No new toast-using files. No listed file is missing.** However, the inventory has three **scope-correction findings**:

### 1.1 Files in the plan that have ZERO catch blocks (over-scoped)
| File | Plan said | Reality |
|---|---|---|
| `layout/Sidebar.jsx` | "~2 catches" | **0 catch blocks.** Both toasts are informational ("Close current order first" L221, "Coming Soon" L239). Nothing to convert. **Remove from Phase 2C.** |
| `panels/settings/TableManagementView.jsx` | in Phase 2C | **0 catch blocks, 0 API calls in file.** Fires optimistic success toasts only. Nothing to convert. |
| `panels/settings/shared.jsx` | in Phase 2C | **0 catch blocks.** Worse: `EditBar.handleSave` (L133-136) and `ListItem.handleDelete` (L183-186) fire **"Saved"/"Deleted" success toasts BEFORE invoking `onSave()`/`onDelete()`** — optimistic success with no error path at all. This is not a catch-conversion; it needs restructuring (await the operation, then toast success/error). **Out of CR-027's mechanical pattern — recommend logging as a separate small CR or explicit Phase 2C sub-task with its own pattern.** |

### 1.2 Files NOT in the plan that need adding (under-scoped)
| File | Evidence | Why it's in scope |
|---|---|---|
| `reports/CollectBillPanelDrawer.jsx` | 2 catches, **0 toasts** | This is the CR-021 artifact. CR-027 §8 itself says "once CR-021 lands, its new catches MUST follow the CR-027 pattern." CR-021 is now **CLOSED (owner verified 2026-06-11)** → this file must enter the Phase 2 inventory. L144: detail-fetch failure → `setLoadError(err?.message || ...)` — inline error, but uses `err.message` not `readableMessage`. L192: payment failure → delegated to `onCollectError?.(order, err)` callback; **verify the parent report pages' callbacks use `err.readableMessage`** (they own the toast per the in-code comment). |
| `api/crmAxios.js` | own divergent interceptor | See §3. |
| `order-entry/CollectPaymentPanel.jsx` | 5 catches, 0 toast-error catches | Deliberate **inline-error design** (`roomsError` state L361, coupon instruction copy L741, BUG-108 error-code→copy map). Not toast-pattern violations, but L361 extracts via `err?.response?.data?.message || err?.message` — should read `err.readableMessage` for consistency. Low priority; do NOT convert inline errors to toasts. |

### 1.3 CR-028 impact check
CR-028 handover confirms 5 files changed (`orderTransform.js`, `productTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`) — all changes are **computation-only** (discountable base, coupon guard, payload passthrough). Verified by grep: no new catch blocks with toast calls were introduced. `CartPanel.jsx` has one silent `.catch(() => {...})` (L945) pre-dating CR-028. **No CR-027 scope change from CR-028.** ✅

### 1.4 New-files-since-Jun-10 check — limitation
The repo was re-imported as a single auto-commit (`40b1e3e`); granular git history between Jun 10 and today is **not recoverable** in this checkout. Mitigation: the full grep inventory re-run (above) found no toast-using file outside the plan, and the catch-bearing non-toast files are itemised in §1.2. Residual risk: low.

---

## 2. Per-file catch audit (the 16 non-readableMessage files)

Legend: **silent** = catch with console only (or nothing), no user surface. **spam** = inside polling/hot loop. Polling check: no `setInterval`-driven API catches found in any audited file — **no toast-spam risk found anywhere** (all fetches are mount/action-triggered).

| File | Catches | With toast | Silent (API) | Silent (non-API) | Side-effects to preserve | Titles to preserve |
|---|---|---|---|---|---|---|
| `layout/Sidebar.jsx` | 0 | — | — | — | — | — (REMOVE from scope) |
| `modals/SplitBillModal.jsx` | 1 (L231) | 1 ✓ destructive | 0 | 0 | `setIsLoading(false)` in finally | "Error" (generic, fine) |
| `order-entry/OrderEntry.jsx` | **31** | 16 | **6** (L249 addr lookup, L282 add addr, L1308/1310 — see note A, L1809, L2062 auto-print, L1942-51 bg print) | ~9 (localStorage / intentional comment-documented) | many: `setIsPlacingOrder`, `setIsProcessingPayment`, early `return`s, `onClose()` skip-finally at L2083 — **highest-care file** | "Order Update Failed", "Order Failed"×2, "Transfer Failed", "Merge Failed", "Shift Failed", "Cancel Failed"×2, "Payment Failed"×7, "Failed to print bill", "Bill Split"×1 (note B) |
| `order-entry/RePrintButton.jsx` | 2 | 2 ✓ destructive | 0 | 0 | `setIsPrinting(false)` finally | "Failed to send KOT request", "Failed to send Bill request" — **note C: these toasts have NO description today; conversion ADDS `description: err.readableMessage`** |
| `panels/CreditManagementPanel.jsx` | 4 | 3 ✓ destructive | **1** (L69 customer-list fetch — Decision C: add toast) | 0 | `setLoading` finally | "Statement failed", "Download failed", "Export failed" |
| `panels/MenuManagementPanel.jsx` | 4 | 1 (L32, no variant) | **3** (L46 categories, L57 addons, L78 meta bundle — exactly as §4.4 says) | 0 | `setLoading` finally | "Error" |
| `panels/menu/BulkEditor.jsx` | 4 | 4 (no variant on any) | 0 | 0 | L373: `failed++` + `_saveStatus:"error"` row update **must stay**; `setExporting/setImporting` finally | "Error"×3, "Partial Save" path (L390 — not a catch, don't touch) |
| `panels/menu/CategoryList.jsx` | 4 | 4 (no variant) | 0 | 0 | `setSaving` finally, early returns | "Error" |
| `panels/menu/ProductForm.jsx` | 2 | 2 (no variant) | 0 | 0 | `setSaving` finally | "Error" |
| `panels/menu/ProductList.jsx` | 4 | 4 (no variant) | 0 | 0 | early returns | "Error" |
| `panels/settings/TableManagementView.jsx` | 0 | — | — | — | — | REMOVE from scope (see §1.1) |
| `panels/settings/shared.jsx` | 0 | — | — | — | — | REMOVE / re-scope (see §1.1) |
| `pages/AllOrdersReportPage.jsx` | 5 | 3 ✓ destructive | 0 — note D | 1 (L232 `.catch(()=>[])` intentional partial-data, documented) | L365: `setError` + `setAllOrders([])` + `setHasPlatformData(false)` **must stay** (renders error UI — switch `err.message`→`readableMessage`, no toast needed) | "Could not update payment method", "Could not mark as unpaid", "Failed to send Bill request" |
| `pages/RestaurantSettingsPage.jsx` | 2 | 2 ✓ destructive | 0 | 0 | `navigate()` + early return at L284 **must stay** | "Failed to load settings", "Save failed" |
| `pages/RoomOrdersReportPage.jsx` | 2 | 1 ✓ destructive | **1** (L466 — verify action type) | 0 | `setIs*` finally, early return | "Could not remove from room" |
| `pages/StatusConfigPage.jsx` | 13 | 3 | **1** (L552 station-data refresh after save — API, add toast) | **10** (L214-L322: ALL are `localStorage` JSON.parse hydration — **NOT API failures, OUT of Decision C scope**) | early returns at L330/338 | "Cannot disable"×2 (✓ destructive already) |

**Note A (OrderEntry L249):** `fetchDeliveryAddresses` catch is **unreachable for API errors** — `customerService.lookupAddresses` swallows all errors and returns `[]` (see §4). Adding a toast in the component changes nothing until the service re-throws.
**Note B (OrderEntry L2637):** catch deliberately shows a *success-style* "Bill Split" toast because the split already succeeded; only the follow-up fetch failed. **Must NOT be converted to a destructive error toast.**
**Note C (print catches):** `printOrder` posts through the main `api` axios instance (orderService L187) → `err.readableMessage` IS available in all print catches (RePrintButton, OrderCard L194/L222, TableCard L197/L226, AllOrdersReportPage L825). Conversion is straightforward.
**Note D:** silent **auto-print** catches in OrderEntry (L1809, L1942-51, L2062, and the L1308/1310 `.catch(console.error)` chains) are explicitly designed as *non-blocking background* paths ("THREW (non-blocking)"). Toasting them mid-redirect may surface confusing errors after the user has left the order. **Owner decision needed** (sibling of parked Q5): keep silent / toast / aggregate. Do not blanket-apply Decision C here.

**Revised catch-conversion estimate:** plan said ~10 for the Order Entry slice; **OrderEntry alone has 31 catch sites (16 toast conversions + 4-6 silent additions + ~9 explicit skips).** Phase 2B effort estimate should roughly double.

---

## 3. Interceptor gaps

### 3.1 `api/axios.js` — plan description CONFIRMED accurate
Current chain (L55-59) is exactly the 4-branch OR the doc describes (`errors[0].message → data.message → error.message → 'Something went wrong'`). The Laravel-422-object gap and raw `ECONNABORTED`/`ERR_NETWORK` passthrough are real. §4.2 pseudo-code is correct and additive. ✅

### 3.2 `api/crmAxios.js` — **GAP: NOT in the plan, has its own DIVERGENT interceptor**
L77-89: `data.message → data.detail → error.message → 'CRM request failed'`.
- Missing the Laravel 422-object branch AND the array branch.
- Missing friendly timeout/network text — and CRM timeout is **15s** (vs 60s main), so timeouts are *more* likely here. Today a CRM timeout surfaces as `"timeout of 15000ms exceeded"` to any consumer reading `readableMessage` (partially mitigated: `customerService.lookupCustomer` wraps timeouts in a typed error with curated copy, and CustomerModal L308 shows "CRM Timeout" — but other crmApi consumers don't).
- It DOES set `err.readableMessage`, so consumers are pattern-compatible.
**Amendment:** extend Phase 1 to apply the same additive branches (validation-object, friendly timeout/network) to `crmAxios.js`, keeping its `data.detail` branch. Or explicitly document the divergence as accepted.

### 3.3 Other instances
`grep "axios.create"` and `grep "from 'axios'"` across src (excl. tests/.bak): **only `api/axios.js` and `api/crmAxios.js`.** No rogue instances, no direct axios imports in components. Print-agent traffic rides the main instance (§2 Note C). ✅

---

## 4. Service-layer swallow risk (errors that never reach components)

| Service | Location | Behaviour | Component impact |
|---|---|---|---|
| `customerService.searchCustomers` | L28 | swallow → `[]` | search silently empty on CRM failure (deliberate, BUG-078 family) |
| `customerService.lookupCustomer` | L46 | 4xx → `null` (= "not found"); timeout/network → **re-throws typed error** with curated copy | OK — CustomerModal handles |
| `customerService.lookupAddresses` | L123 | swallow → `[]` | **OrderEntry L249 catch is dead code for API errors** (§2 Note A) |
| `loyaltyService` max-redeemable | L130 | swallow → safe empty result | CollectPaymentPanel inline copy handles; deliberate |
| `stationService.fetchStationData` | L281 | swallow → `{ ..., error: err.message }` result object | StatusConfigPage gets per-station `error` field — no `readableMessage` available; component must read `.error` |
| `reportService.getActiveSrmIds` | L353/L367 | swallow → `null` sentinel / skip folio | documented CR-001 D-1 degradation; deliberate |
| `reportService` parallel fetches | L571-575 | `.catch(() => [])` per source | deliberate partial-data report rendering |
| `insightsService` | many | `.catch(() => ({data:{}}))` / skip | deliberate aggregation degradation |
| `foodCourtService` / `prepServeService` chunk workers | L86 / L139 | store `{_error: err.message}` per chunk | callers must surface; uses `err.message` not `readableMessage` |
| `couponService` | L41/L85 | network-only catch, documented | deliberate |

**Assessment:** these are overwhelmingly *deliberate graceful-degradation* patterns (most carry BUG/CR comments). Converting them to re-throw would break partial-data UX and is NOT recommended. **Amendment:** the CR should add an explicit "service-layer swallows are accepted degradation; out of scope" clause, EXCEPT: (a) decide whether `lookupAddresses` failures deserve surfacing (else delete the dead OrderEntry catch toast plan for L249), (b) chunk-worker `_error` strings should capture `err.readableMessage || err.message` so per-row errors carry backend text — 2-line change, fits Phase 2.

---

## 5. Spot-check of "already-canonical" files (§D)

Sampled 6 of 11. **Finding: every sampled file has at least one non-compliant or silent catch.** The plan's framing ("mostly already-canonical; smallest churn") is optimistic:

| File | Compliant | Non-compliant found |
|---|---|---|
| `cards/OrderCard.jsx` | L245 settle, L264 dispatch — `readableMessage` + destructive ✓ | L194/L222 print toasts: no description, no readableMessage. **L117/L131/L145 (Ready/Serve/Accept): silent catches** wrapping parent callbacks — verify whether parents toast; if not, Decision C applies. L1039 silent. |
| `cards/TableCard.jsx` | L114/L130 ✓ | L197/L226/L247 print/settle: hardcoded, no readableMessage. **L99 silent.** L564 silent (non-API?). |
| `panels/SettlementPanel.jsx` | L109/L125/L136 ✓ | L61 report fetch: hardcoded "Failed to load settlement report." **L73 waiter-list fetch: silent.** |
| `pages/LoadingPage.jsx` | 7 of 8 bootstrap toasts use readableMessage ✓ | L262 kitchen-stations: hardcoded description. |
| `order-entry/CustomerModal.jsx` | L308 CRM-timeout typed copy ✓; L379 uses readableMessage via **inline `setError`** (valid inline pattern, not a toast) ✓ | none |
| `pages/LoginPage.jsx` | L88 `readableMessage \|\| fallback` + destructive ✓ (pattern-2 fallback; §4.1 says no `\|\|` — trivial cleanup, optional) | L76 FCM-token silent catch is deliberate ("proceed without it") — leave |
| `pages/LoadingPage.jsx` `TOAST_LIMIT=1` note | 8 sequential bootstrap toasts exist here — with LIMIT=1 only the last failure is visible. Confirms the plan's §4.7.1 aggregation concern is real and applies to LoadingPage too, not just MenuManagementPanel. |

**Implication:** slice 2C is NOT "mostly already-canonical" — these 11 files contain ~10 additional conversions/silent-catch decisions. Keep them fully in scope.

---

## 6. Phase 3 (BulkEditor) feasibility — CONFIRMED FEASIBLE

- **Row state:** rows already carry `_saveStatus` (init L75, set per-row via `setRows` map at L372/L376). Adding `_saveError: err.readableMessage` at L376 is a one-line extension of the existing pattern. ✓
- **Indicator:** red `AlertCircle` rendered per-row at L625 — natural tooltip anchor. `components/ui/tooltip.jsx` exists; native `title` attr acceptable per plan. ✓
- **Drawer:** `ui/dialog.jsx`, `ui/sheet.jsx`, AND `ui/drawer.jsx` all exist — **no new primitive needed.** ✓
- **`[View errors]` toast button:** `ToastAction` is exported from `ui/toast.jsx` (L47) but **currently unused anywhere in the app** — first usage; budget a few minutes for wiring/styling validation. ✓
- **Clear-on-re-edit:** dirty tracking via `isRowDirty` + cell edit handlers exists; clearing `_saveError` on edit slots into the existing cell-change path. ✓
- **One caveat:** `processOne` runs in `Promise.all` batches (MAX_CONCURRENT) — per-row `setRows` functional updates are already concurrency-safe; `_saveError` must use the same functional-update form (the plan's pseudo already does).

---

## 7. Other plan corrections

1. **CR-021 blocker: REMOVE.** `CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md` status = "CLOSED — OWNER VERIFIED 2026-06-11". The §4.7.1 row "ship CR-021 first" is satisfied. Consequence (per the CR's own §8): CR-021's artifacts (`CollectBillPanelDrawer.jsx` + parent callback paths) must be ADDED to the Phase 2 inventory — see §1.2.
2. **Toast-spam risk table (§4.7.2):** confirmed no polling-loop catches exist in any in-scope file — risk can be downgraded to N/A for current code.
3. **Missing-variant sweep is bigger than implied:** ~16 existing error toasts lack `variant: "destructive"` (entire menu slice, OrderEntry L1023/L1051/L2085, MenuManagementPanel L32). Decision D covers them; just ensure the diff-review checklist includes "variant added" not only "description swapped".
4. **§2.1 metric drift:** 168→167 toast calls. Cosmetic.

---

## 8. Final recommendation

## ✅ PROCEED WITH AMENDMENTS

The plan's architecture (additive interceptor → mechanical conversion → BulkEditor UI) is sound, Phase 1 pseudo-code is correct, Phase 3 is confirmed feasible, and no toast-spam or rogue-axios risks exist. Required amendments before Gate 6 pickup:

| # | Amendment | Phase |
|---|---|---|
| A1 | Add `api/crmAxios.js` to the interceptor work (same additive branches; keep `data.detail`) — or document divergence | 1 |
| A2 | Remove `Sidebar.jsx`, `TableManagementView.jsx`, `shared.jsx` from conversion list (0 catches); log shared.jsx/TableManagementView **optimistic-success-toast** restructure as a separate sub-task/CR | 2C |
| A3 | Add `reports/CollectBillPanelDrawer.jsx` (+ verify parent `onCollectError` callbacks use readableMessage) — CR-021 follow-up obligation | 2B/2C |
| A4 | Re-estimate Phase 2B: OrderEntry has 31 catch sites, not ~10; exclude the ~9 documented non-API/background catches explicitly in the slice checklist | 2B |
| A5 | Owner decision: silent **auto-print** failures in OrderEntry (toast vs stay-silent vs aggregate) — sibling of parked Q5; do not blanket-apply Decision C | 2B |
| A6 | StatusConfigPage: exclude the 10 localStorage-hydration catches from Decision C (not API); include L552 silent API catch | 2C |
| A7 | Add "service-layer swallows = accepted degradation" clause; fix chunk-worker `_error` to prefer `readableMessage`; decide `lookupAddresses` swallow (else OrderEntry L249 toast is dead code) | 2 |
| A8 | Keep all 11 "already-canonical" files fully in 2C scope — every sampled one has gaps (§5) | 2C |
| A9 | Remove the CR-021 blocker row (CLOSED 2026-06-11) | doc |
| A10 | Preserve OrderEntry L2637 "Bill Split" success-style catch toast as-is (do NOT convert to destructive) | 2B |
