# Session Handover — QA + Next Implementation Agent

**Session:** 2026-05-02 → 2026-05-03 · `1-may` branch
**Implementation Agent role:** Strict-gate per-bucket implementation for CR-005 → CR-009
**Working environment:** Emergent preview (`https://insights-phase.preview.emergentagent.com`) → preprod backend (`https://preprod.mygenie.online/`)
**Test login:** `owner@palmhouse.com` / `Qplazm@10` (Palm House, restaurant_id `541`)

---

## 1. TL;DR — What shipped this session

| # | Bucket | CR | What it does | Files | Status |
|---|---|---|---|---|---|
| 1 | A2 | CR-007 | Order ID chip on dashboard card · Order Entry mid-panel header · Print Bill button | `OrderCard.jsx`, `OrderEntry.jsx`, `RePrintButton.jsx` | ✅ Shipped |
| 2 | B2-split | CR-005 #1 | Audit Report **PG Order Id** + **PG Amount** columns (PG filter only) + scroll-architecture fix | `OrderTable.jsx`, `reportService.js`, `AllOrdersReportPage.jsx` | ✅ Shipped |
| 3 | B1 | CR-006 Phase B | **Multi-select variations** in `ItemCustomizationModal` with checkmark-pill UI + `min`/`max` enforcement | `ItemCustomizationModal.jsx`, `orderTransform.js` | ✅ Shipped |
| 4 | D1 | CR-008 #4 Phase A | **"Stay on Order Entry After Collect Bill"** toggle on `/visibility/status-config` → UI Elements | NEW `utils/orderEntryPrefs.js`, `StatusConfigPage.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx` | ✅ Shipped |
| 5 | UI polish | — | Card chip ↔ amount spacing on dashboard cards | `OrderCard.jsx` | ✅ Shipped (folded into A2) |
| 6 | Bug | BUG-PREPAID-MERGE-SHIFT | Hide Merge / Table-Shift buttons for prepaid orders | `OrderCard.jsx` | ✅ Shipped (folded into A2) |

**CR-006 fully closed** (Phase A optional + Phase B multi-select both shipped).

---

## 2. Per-bucket handover docs (mandatory reading for next agent)

| Doc | Path |
|---|---|
| Bucket A2 | `/app/memory/change_requests/implementation_handover/CR_BUCKET_A2_ORDERID_AND_PRINT_BILL_HANDOVER.md` |
| Bucket B2-split | `/app/memory/change_requests/implementation_handover/CR_BUCKET_B2_PG_COLUMNS_HANDOVER.md` |
| Bucket B1 | `/app/memory/change_requests/implementation_handover/CR_BUCKET_B1_MULTISELECT_VARIATIONS_HANDOVER.md` |
| **Bucket D1** | **`/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md`** |
| Parked A3/A4 | `/app/memory/change_requests/implementation_handover/CR_BUCKETS_A3_A4_PARKED_HANDOVER.md` |
| CR-011 (closed: not reproduced) | `/app/memory/change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` |
| CR-012 (menu-config data ticket) | `/app/memory/change_requests/CR_012_BIG_BUDDHA_FILLING_MAX_LABEL_MISMATCH.md` |
| Project PRD (live) | `/app/memory/PRD.md` |

---

## 3. QA test pack — what to verify

### 3.1 Bucket D1 — "Stay on Order Entry After Collect Bill" toggle

**Pre-req:** Login as `owner@palmhouse.com` on preprod.

#### Toggle visibility & persistence
| # | Step | Expected |
|---|---|---|
| 1 | Sidebar → Visibility Settings → Status Configuration → scroll to **UI Elements** | New card "Stay on Order Entry After Collect Bill" visible right below "Order Taking" |
| 2 | Toggle ON → click **Save Configuration** at top right | Toast / save confirms |
| 3 | Reload page → re-check the card | Still ON ✓ |
| 4 | DevTools → Application → localStorage → `mygenie_stay_on_order_after_bill` | `'true'` |
| 5 | Toggle OFF → Save → reload | Card OFF · localStorage = `'false'` |
| 6 | Manually delete the localStorage key → reload | Card OFF (silent fallback) |

#### Behaviour with toggle ON — **NEW path 1: Place + Pay (walk-in / counter)**
| # | Step | Expected |
|---|---|---|
| 7 | Open any walk-in or table → add items → click **Pay** (single-step Place+Pay) | Payment success → OrderEntry **STAYS OPEN**, walk-in mode, empty cart, no table selected, CollectPaymentPanel CLOSED |
| 8 | KOT print (if `autoBill` ON) | Fires before stay-on-order — receipt printed normally |

#### Behaviour with toggle ON — **NEW path 2: Collect Bill on existing order**
| # | Step | Expected |
|---|---|---|
| 9 | Place an order on a table (do NOT pay) → return to dashboard | Order card visible on dashboard with running status |
| 10 | Open that order → click **Collect Bill** → complete payment | OrderEntry **STAYS OPEN**, walk-in mode, empty cart, CollectPaymentPanel CLOSED |
| 11 | Try this with cash · UPI · card · split-bill | All paths must keep cashier on OrderEntry |
| 12 | Try this with a **room** order | Same behaviour |
| 13 | Try this with a **takeaway** / **delivery** order | Same behaviour |

#### Regression — toggle OFF (default)
| # | Step | Expected |
|---|---|---|
| 14 | Repeat steps 7 and 10 with toggle OFF | OrderEntry CLOSES → user lands on Dashboard (today's behaviour) |

#### Out-of-scope actions (must NOT change regardless of toggle)
| # | Step | Expected |
|---|---|---|
| 15 | Place Order (without Pay) | Always redirects to Dashboard ✓ |
| 16 | Cancel Order | Always redirects to Dashboard ✓ |
| 17 | Transfer Table / Merge / Shift | Always redirects to Dashboard ✓ |
| 18 | Bill payment FAILS | Toast shown; user stays on payment panel; no early redirect |

### 3.2 Bucket B1 — Multi-select variations

**Test items** (Palm House preprod, restaurant_id 541):
- **Big Buddha Burger (V)** — id 107738 — has multi-select "Choice Of Filling (Max 2)" (label says 2, backend `max=7`)
- **My Favourite Eggs** — id 107718 — multi-select "Choice of Egg" (`min=1`, `max=5`)
- **Open Burger (V,GF)** — id 107740 — multi-select "Choice of Filling (Max 3)" (`max=3`, label and data agree)

| # | Step | Expected |
|---|---|---|
| 1 | Open Order Entry → click "Big Buddha Burger (V)" | Modal opens with 3 groups |
| 2 | "Choice Of Filling (Max 2)" group | Renders as **outlined pills with checkbox icon** (not solid pills). Header shows hint `Pick at least 1` (orange). |
| 3 | Click "Pineapple" → click "Cheddar" | Both pills show green ✓ checkbox. Hint becomes `2 selected • min 1 • max 7` |
| 4 | Click "Pineapple" again | Toggles OFF — only Cheddar selected |
| 5 | "Choice Of Dip" (single-select) | Solid pills (legacy look) — UNCHANGED |
| 6 | "Choice Of Bun" (optional single-select) | Header shows `(Optional)` · click → click again deselects (A1 behaviour, must be preserved) |
| 7 | Pick filling=Pineapple+Cheddar, dip=Tomato Relish, no bun → Add → Place | DevTools Network → POST body must show: `"variations": [{"name":"Choice Of Dip","values":{"label":["Tomato Relish"]}},{"name":"Choice Of Filling (Max 2)","values":{"label":["Pineapple","Cheddar"]}}]` |
| 8 | Audit Report → open the placed order | Both filling labels visible in variations section |
| 9 | Open "My Favourite Eggs" → try to deselect ALL eggs | Add-to-Order disabled · hint shows `Pick at least 1` |
| 10 | Open "Open Burger" → pick 3 fillings → try to pick a 4th | 4th click disabled (max reached) · tooltip says max reached |

### 3.3 Bucket B2-split — Audit Report PG columns

| # | Step | Expected |
|---|---|---|
| 1 | Reports → Audit Report → no filter | NO PG columns visible |
| 2 | Apply Payment Gateway filter (PG) | **PG Order Id** and **PG Amount** columns appear |
| 3 | Resize window narrower than total column width | Header and body scroll TOGETHER horizontally (no desync) |
| 4 | PG Status column | Should NOT appear yet (backend `snapshot_razorpay_status` not shipped) — column self-hides |
| 5 | Once backend BE-W2 ships `snapshot_razorpay_status` | Column auto-reveals on next load (zero frontend deploy) |

### 3.4 Bucket A2 — Order ID, Print Bill, Hide Merge/Shift on prepaid

| # | Step | Expected |
|---|---|---|
| 1 | Dashboard order card | Order ID chip visible at top of card |
| 2 | Order Entry middle panel | Order ID header visible at top |
| 3 | Click Print Bill button | Bill receipt prints / preview shown |
| 4 | Prepaid (scan) order card | Merge and Table-Shift buttons HIDDEN (only shown for non-prepaid) |

---

## 4. Active production-blocking gotchas — read carefully

| # | Issue | Status |
|---|---|---|
| 1 | **Hotspot file: `OrderEntry.jsx`** — has 8+ `onClose()` callsites + critical socket-engage `await` timing. Only L1390 (Place+Pay) and L1509 (Collect-Bill on existing) were branched in D1. Do not touch other 8 callsites without explicit Owner approval. | ACTIVE |
| 2 | **Hotspot file: `CollectPaymentPanel.jsx`** — never edited this session, must remain that way unless bucket explicitly requires it. | ACTIVE |
| 3 | **Auto-print bill timing** — block at `OrderEntry.jsx:1434-1488` MUST run before any redirect/stay branch. Future agents adding new redirect logic must preserve this order. | ACTIVE |
| 4 | **Engage promise timing** — `await engagePromise` (L1495) MUST run before stay/redirect branch. Same critical contract on Place+Pay path (L1383 `placePromise`). | ACTIVE |
| 5 | **OrderEntry remount nonce** — `DashboardPage.handleCollectBillStayOnOrder` bumps `orderEntryResetNonce` which is the `key` on `<OrderEntry/>`. This is intentional — relies on React's mount lifecycle for clean state reset. Do NOT replace with internal-state-reset code. | ACTIVE |

---

## 5. Pending / parked work — prioritized for next agent

### 5.1 Frontend-only, unblocked (P1-P2)

| Priority | Item | Pre-reqs | Effort |
|---|---|---|---|
| 🔴 P1 | **CR-008 Sub-CR #1 — Delivery charges at order placement** (currently hardcoded 0 in `placeOrder`/`updateOrder`) | Q-D1..Q-D5 in CR-008 doc need Owner answers. Google Maps API key already in env. | LARGE — touches `AddressPickerModal`, `AddressFormModal`, `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx` |
| 🟠 P2 | **CR-008 Sub-CR #2 — Audit "Action Time" + "Time Diff" columns** | All source timestamps already in transform output (frontend-only) | SMALL — `OrderTable.jsx` columns + `reportTransform.js` |
| 🟠 P2 | **CR-008 Sub-CR #3 — Dispatch / assign integration** | Owner clarification needed on dispatch flow scope | MEDIUM-LARGE |
| 🟠 P2 | **CR-009 — Operations audit timeline (E buckets)** | Detailed scope review needed | LARGE |
| 🟢 P3 | **D2+ — further navigation tweaks** under CR-008 #4 (e.g. extend stay-on-order to other actions: Place-without-Pay, etc.) | Owner scope-bucketing needed (already flagged in D1 handover §10) | MEDIUM |

### 5.2 Backend-blocked (frontend ready or partially ready)

| Bucket | Field needed | Frontend readiness |
|---|---|---|
| A3 | `merged_at`, `transferred_at` | Wait for backend |
| A4 | `is_auto_confirmed` | Wait for backend |
| **B2 Phase 2** | `snapshot_razorpay_status` | **Frontend AUTO-REVEALS** when backend ships — zero FE deploy needed |
| B3 | `cancel_by_name` | Wait for backend |
| B4 | `order_serve_at` | Wait for backend |

### 5.3 Linked observations (NOT bugs caused by this session)

| ID | Description | Confirmed across | Suggested owner |
|---|---|---|---|
| OBS-001 | PAID dine-in tables linger on Table View with no auto-clear timer | This build + `18march` build | Backend table-state lifecycle |
| OBS-002 | PAID tiles absent from Status View by default (factory-disabled in Status Config) | This build | Product / Restaurant Ops |
| CR-011 | PG-scan `payment_type` casing mismatch | NOT REPRODUCED 2026-05-03 — Owner confirmed working. Re-open if recurs. | — |
| CR-012 | Big Buddha menu-config: label "Max 2" but backend `max=7` (and similar duplicates) | Palm House preprod | Restaurant ops to fix menu config |

### 5.4 Open questions waiting for Owner

| ID | Question | Source | Suggested default |
|---|---|---|---|
| Q-D1.1 (CR-008 #1) | Delivery-fee formula: flat / per-km / slab? | CR-008 doc | Per-km, rate from restaurant settings (TBD with backend) |
| Q-D1.2 | Distance Matrix vs haversine? | CR-008 doc | Distance Matrix (driving km) |
| Q-D1.3 | What if Google API fails / no coords? | CR-008 doc | Manual editable empty field |
| Q-D1.4 | Restaurant origin coordinates source? | CR-008 doc | Confirm with backend |
| Q-D1.5 | Free-delivery threshold override? | CR-008 doc | Defer to backend flag |

Full list in `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md`.

---

## 6. Storage keys reference (browser-global localStorage)

| Key | Scope | Type | Used by |
|---|---|---|---|
| `mygenie_stay_on_order_after_bill` | Browser-global | string `'true'`/`'false'` | **D1 (NEW)** — read by `OrderEntry.jsx`, written by `StatusConfigPage.jsx` |
| `mygenie_default_pos_view` | Browser-global | `'table'`/`'order'` | Existing — controls Dashboard initial sub-view |
| `mygenie_default_dashboard_view` | Browser-global | `'channel'`/`'status'` | Existing |
| `mygenie_view_mode_table_order` | Browser-global | `'table'`/`'order'`/`'both'` | Existing |
| `mygenie_view_mode_channel_status` | Browser-global | `'channel'`/`'status'`/`'both'` | Existing |
| `mygenie_order_taking_enabled` | Browser-global | JSON `{enabled: bool}` | Existing |
| `mygenie_channel_visibility` | Browser-global | JSON object | Existing |
| `mygenie_enabled_statuses` | Browser-global | JSON array | Existing |
| `mygenie_channel_max_columns` | Browser-global | number | Existing |
| `auth_token` | Browser-global | JWT string | Existing |

**Naming convention enforced:** `mygenie_<scope>_<key>`. New keys must follow this pattern.

---

## 7. Architecture refresher (for next agent)

### 7.1 OrderEntry is NOT a route
`OrderEntry.jsx` is a **modal-style overlay** rendered inside `DashboardPage`. State drivers:
- `orderEntryTable` — null = walk-in, object = bound to a table
- `orderEntryType` — `'dineIn' | 'walkIn' | 'takeAway' | 'delivery' | null`. When `null`, OrderEntry is closed and Dashboard is visible.

### 7.2 Two payment-success paths in `OrderEntry.onPaymentComplete`
- **Scenario 1** — Collect Bill on existing order (postpaid) → `await engagePromise` then branch at L1509
- **Scenario 2** — Place + Pay in single step (prepaid / walk-in) → `await placePromise` then branch at L1390

Both branches honour the D1 toggle uniformly.

### 7.3 Outbound transform contract (CRITICAL for B1)
Backend accepts variations as:
```json
"variations": [
  { "name": "<group name>", "values": { "label": ["<option1>", "<option2>"] } }
]
```
Verified live via Owner DevTools trace 2026-05-02 (Big Buddha Burger order).

### 7.4 Hotspot files — DO NOT TOUCH without bucket-level Owner approval
- `OrderEntry.jsx`
- `CollectPaymentPanel.jsx`
- `LoadingPage.jsx`
- `LoginPage.jsx`
- `App.js` (route registration)
- `ProtectedRoute.jsx`

### 7.5 Project commands

```bash
# Backups (always before hotspot edit)
cp <file> <file>.bak.<bucket>

# Lint
# Use mcp_lint_javascript on edited files

# Compile / dev server
# Auto via supervisor — check logs at /var/log/supervisor/frontend.out.log

# Restart backend or frontend if needed (rare — only on .env or dependency change)
sudo supervisorctl restart frontend
sudo supervisorctl restart backend
```

---

## 8. Operating principles enforced this session — keep these

1. **Strict Approval-Gate** per bucket. No code change without explicit Owner "Apply".
2. **Hotspot discipline.** Hotspot files only edited with bucket-level Owner approval.
3. **Plain-English explanations** when Owner asks. No tech jargon dumps.
4. **Live preprod verification** of backend payload shapes before assuming.
5. **Backups before edit** on hotspots — `.bak.<bucket>` snapshots, removed only after Owner verification.
6. **Per-bucket handover docs** in `/app/memory/change_requests/implementation_handover/` for every shipped bucket.
7. **Linked CR stubs** for side-effects discovered during implementation (CR-011, CR-012 originated this way).
8. **No emoji in code files** unless explicitly requested. Comments use `// CR-xxx / Bucket Y (Mon-Year, brief context):` prefix for traceability.

---

## 9. Last 3 user messages (for fork-resilience)

1. "P2: D2+ navigation tweaks (CR-008 #5+) — needs Owner scope-bucketing"
2. "make a handover document for QA and next implementation agent" ← THIS MESSAGE produced this doc
3. (Pending) — Owner has not yet picked the next bucket

---

## 10. Quick-start playbook for the next implementation agent

1. **Read in order:**
   - This handover (`/app/memory/SESSION_HANDOVER_2026_05_03.md`)
   - `/app/memory/PRD.md`
   - The handover docs for whichever bucket you're picking up
   - The parent CR doc (`/app/memory/change_requests/CR_*.md`) for that bucket
2. **Greet the Owner** with a clear plan summary using the standard format (Last completed → Pending → Upcoming → Parked → Clarifications).
3. **Use `ask_human`** to confirm priorities before any code change.
4. **Always gate-by-gate** — Discovery → Storage Contract / Plan → Settings UI / Behaviour → Verification → Handover.
5. **Login credentials** for QA / DevTools / Owner verification: `owner@palmhouse.com` / `Qplazm@10`.
6. **Run lint after edits** — `mcp_lint_javascript` per file. Treat any warning as a blocker.
7. **Smoke-screenshot after batch edits** — single screenshot to confirm app still boots. Do NOT take multiple screenshots while iterating.
8. **Hand off via** `/app/memory/change_requests/implementation_handover/CR_BUCKET_<X>_HANDOVER.md` for each shipped bucket.

---

## 11. Sign-off

- **Implementation agent (this session):** All scoped buckets shipped + Owner-verified.
- **Codebase health:** Lint clean · Webpack compiled clean · No service crashes · No hotspots left in mid-edit state.
- **Backups:** None remain (removed after each bucket's Owner verification — git history is the rollback source).
- **PRD updated:** Yes — `/app/memory/PRD.md`.
- **Test credentials updated:** Owner login already in use (no new credentials created this session).

**Hand-off ready.** Next agent or QA: pick from §5 backlog after Owner scope-confirmation.
