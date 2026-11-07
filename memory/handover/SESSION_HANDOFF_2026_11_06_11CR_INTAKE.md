# Session Handoff Brief — 2026-11-06
## For Next INTAKE Agent

### What happened this session
11 new CRs were drafted for owner-reported requirements. These are captured in the intake docs inside this ZIP. However, **the registry in the next session may have changed** — other agents or manual edits may have added/removed/renumbered items.

### What the next INTAKE agent MUST do

**Step 1 — Load the LATEST registry**
```
READ /app/memory/control/registry.json
```
Do NOT trust the CR numbers in these intake docs blindly. The registry is the single source of truth. Check the latest `max(CR-ID)` and assign fresh sequential IDs from there.

**Step 2 — Re-register each item using the INTAKE role**
For each of the 11 items described below, follow the full INTAKE workflow from `AGENT_PROMPT_ALPHA.md` Role 1:
1. Code Reality Check (grep codebase)
2. Duplicate Detection (search registry + codebase)
3. Classify + Severity (use the severities below as owner-confirmed starting points)
4. Evidence Capture
5. Blast Radius
6. Register with the CORRECT next-available ID from the live registry

**Step 3 — Use these intake docs as INPUT, not as final artifacts**
The intake docs in this ZIP are drafts with code traces, duplicate checks, and open decisions already done. The next agent should use them as reference material to speed up the intake process — but must re-verify against the current codebase state and produce fresh artifacts with correct IDs.

---

### The 11 items to register

#### Group A — Permissions / Order Flow (4 items, linked)

**1. Complementary Rights-Based Gating**
- Backend passes `complementary_food` role — only employees with this permission should mark items as complementary at runtime
- Severity: P1 | Risk: CRITICAL | Area: Permissions / Security
- Code: `hasPermission()` pattern exists for cancel but NOT for comp
- Related: CR-058, CR-104, BUG-298/299
- 3 ODs open (hidden vs disabled, permission source, item vs order scope)

**2. Cancellation Reason Mandatory**
- Every cancellation (order + item level) must require a reason from the backend reasons list
- Severity: P1 | Risk: HIGH | Area: Menu / Order Entry
- Code: `CANCELLATION_REASONS` endpoint exists, used in insights, enforcement inconsistent
- Related: BUG-440 (empty reasons dropdown)
- 3 ODs open

**3. Cancellation Min Amount Threshold + Manager PIN**
- Below configurable amount: normal cancel. Above: requires manager PIN to authorize
- Severity: P1 | Risk: CRITICAL | Area: Permissions / Security
- Code: NONE — no amount check, no PIN flow exists
- BACKEND DEPENDENCY: PIN endpoint + threshold in settings
- Extends item #2 (reason + threshold + PIN)
- 5 ODs open

**4. Complementary Only for Rooms with Breakfast Meal Plan**
- Comp marking only for rooms booked with breakfast/meal plan, not Room Only
- Severity: P1 | Risk: HIGH | Area: PMS / Rooms
- Code: `mealPlan` exists in transforms but NOT checked in comp flow
- DEPENDS ON item #1 (permission + meal plan = double gate)
- 4 ODs open

#### Group B — Notifications (1 item)

**5. After-Serve Cancellation — In-App Notification**
- When a served item is cancelled, alert manager/owner via in-app notification
- Severity: P1 | Risk: MEDIUM | Area: Aggregator / Sockets
- Code: NONE for this specific trigger
- BACKEND DEPENDENCY: after-serve cancel event differentiation
- 3 ODs open

#### Group C — Reports (1 item)

**6. Daily and Weekly Summary (Crisp)**
- Quick at-a-glance view: revenue, orders, cancellations, payment split, top items
- Severity: P1 | Risk: MEDIUM | Area: Reports / Analytics
- Code: PARTIAL — Daily Report + insights exist but no crisp summary
- 5 ODs open

#### Group D — Inventory (2 items, linked)

**7. Recipe Correction Workflow**
- Edit recipes with before/after tracking, optional retroactive stock adjustment
- Severity: P1 | Risk: HIGH | Area: Inventory / Stock
- Code: Recipe CRUD exists, no "correction" workflow with change tracking
- 4 ODs open

**8. Final Audit After Recipe Correction**
- Post-correction stock verification: compare stock vs expected, flag discrepancies
- Severity: P1 | Risk: HIGH | Area: Inventory / Stock
- DEPENDS ON item #7
- Code: StockAuditPanel exists, no recipe-correction-triggered audit
- 4 ODs open

#### Group E — Printing (3 items, 2 tracking-only)

**9. iPhone WiFi Printing** — TRACKING ONLY
- Printer Agent team owns this. Register for visibility, no POS FE code
- Severity: P1 | Risk: MEDIUM | Area: Printing / Printer Agent
- Related: BUG-468

**10. Running Order KOT on Update** — TRACKING ONLY
- Printer Agent team owns this. Register for visibility, no POS FE code
- Severity: P1 | Risk: MEDIUM | Area: Printing / Printer Agent
- Related: CR-395

**11. Round Off Value on Printed Bill**
- Pass round-off value via `order_temp` key at ALL print paths (collect bill, prepaid, manual, auto)
- Severity: P1 | Risk: HIGH | Area: Printing / Printer Agent
- Code: Round-off computed (CR-170) but NOT in print payload. Same gap pattern as BUG-536
- Key name in `order_temp` to be confirmed at Impact Analysis (owner instruction)
- 4 ODs open

---

### Dependency chains
```
Item #1 (comp permission) ──→ Item #4 (room breakfast comp)
Item #2 (cancel reason)   ──→ Item #3 (cancel PIN/threshold)
Item #7 (recipe correction)──→ Item #8 (final audit)
```

### Backend dependencies (5 items)
Items #3, #5, #6, #7, #8 need backend work or APIs.

### Related files in this ZIP
- `related_investigations/BUG-440` — cancel dialog reasons empty (context for item #2)
- `related_investigations/BUG-536` — SC GST missing from print (same pattern as item #11)
- `related_investigations/BUG-457` — addon recipe delete (context for items #7/#8)
- `related_investigations/BUG-459` — stock audit qty mismatch (context for items #7/#8)
- `related_investigations/BUG-468` — iPhone bill print (context for item #9)
