# Intake Workflow — Conversational Bug/CR Registration

**Status:** ACTIVE
**Created:** 2026-06-01
**Location:** Control Layer — defines how the agent handles new bug/CR intake

---

## 1. Purpose

When the owner reports a problem or requests a feature during an Emergent chat session,
the agent MUST follow this conversational intake flow before any analysis or implementation.
The owner should never fill templates — the agent asks questions and auto-generates everything.

---

## 2. Trigger

The agent enters intake mode when the owner says anything like:
- "X is broken / not working / shows wrong value"
- "I want X / can you add X / we need X"
- "There's a bug in X"
- "Change X to Y"
- Any description of unexpected behavior or a new requirement

---

## 3. Conversational Flow (5 steps)

### Step 1 — What's the issue?
**Agent asks:** "What's the problem you're seeing?" (or acknowledges if owner already described it)
- Accept free text, voice transcript, or casual description
- Don't interrupt — let the owner finish their thought

### Step 2 — Bug or Feature?
**Agent asks:** "Is this something that's **broken** (bug) or something **new/changed** you want (feature/CR)?"
- If obvious from context, agent can classify without asking
- Bug → BUG-{next_id} path
- Feature/Change → CR-{next_id} path

### Step 3 — Screenshots/Video?
**Agent asks:** "Do you have any screenshots or screen recordings? (attach them here or describe what you see)"
- If owner provides: store in `/app/memory/memory/bugs/attachments/BUG-{id}/` or `crs/attachments/CR-{id}/`
- If no attachment: that's fine — record the verbal description

### Step 4 — Where & How Urgent?
**Agent asks two quick questions:**

**Area** (agent suggests based on description, owner confirms):
> "This sounds like it's in **[Reports / Dashboard / Order Entry / etc.]** — is that right?"

**MANDATORY: Area must be one of these exact values (brief-pos-agent.md POS area list):**

| Value | Use for |
|---|---|
| `Printing / Printer Agent` | KOT, bill print, printer agent, LAN printer, print jobs |
| `Reports / Analytics` | Audit, Daily, Settlement, Order reports, analytics, exports, dashboards |
| `PMS / Rooms` | PMS front desk, check-in, arrivals, tape chart, folio, housekeeping, bookings |
| `Inventory / Stock` | Stock, ingredients, recipes, purchases, wastage, smart purchase |
| `Payments / Coupons / Credit` | Coupons, discounts, billing, payment flows, loyalty, credit, GST on bills, bank transfer IDs |
| `Settings / Configuration` | Restaurant settings, configuration, setup wizard tiles |
| `Permissions / Security` | Role gating, permissions, security, protected routes |
| `Menu / Order Entry` | Menu items, categories, add-ons, popular food, active menu, order-taking flow |
| `Aggregator / Sockets` | Sockets, aggregator (Swiggy/Zomato), FCM notifications, buzzer, aggregator toggle |
| `Delivery` | Delivery assign, rider login, delivery-specific order flow |
| `CRM / Customer Intelligence` | Customer intelligence, customer notes, CRM sync, loyalty config via CRM |
| `Tooling / Control Layer` | Agent prompts, scripts, registry sync, developer tooling, area migration |
| `Other` | Cross-cutting issues (tablet layout across all screens), items with no clear single owner |
| `Old POS` | **NOT a valid module.** Use title prefix "Old POS —" + assign a real module above. |

**Module assignment rule (OD-428-02, locked 2026-10-15):**
> Assign by the **primary user mental model** — what the user thinks the feature IS, not where it lives in code or where the bug first appears.
> *Example: A KOT issue → Printing/Printer Agent (not Menu/Order Entry, even though triggered during ordering). A backward GST issue → Payments/Coupons/Credit (not Menu/Order Entry, even though it affects item pricing).*

If the item spans two modules, pick the one the owner would report it under.
9. Socket / Notifications
10. Other

**Priority:**
> "How critical is this?"
> - **P0** — Blocking (can't use the app / money is wrong)
> - **P1** — High (workaround exists but painful)
> - **P2** — Medium (annoying but not blocking)
> - **P3** — Low (cosmetic / nice-to-have)

### Step 5 — Confirm & Register
**Agent shows summary:**
```
Here's what I've captured:

**BUG-{id}: {title}**
- Type: Bug / CR
- Area: {module}
- Priority: {P0-P3}
- Symptom: {description}
- Attachments: {list or "none"}

Should I register this?
```

Owner confirms → agent runs `create_intake.py` → done.

---

## 4. For CR (Change Request) — Extra Questions

After Step 2 (owner says "feature" or "change"), add:

### Step 3-CR — Expected Behavior
**Agent asks:** "What should it do? Describe how you want it to work."

### Step 4-CR — Reference
**Agent asks:** "Is there a reference? (old POS screenshot, competitor app, design mockup, or just your description?)"

Then continue with Step 4 (area + priority) and Step 5 (confirm).

---

## 5. Minimum Required Fields

| Field | Bug | CR | Source |
|---|---|---|---|
| Title (1-line summary) | Required | Required | Agent generates from description |
| Description (symptom/requirement) | Required | Required | Step 1 |
| Type (bug/cr) | Required | Required | Step 2 |
| Attachments | Optional | Optional | Step 3 |
| Area/Module | Required | Required | Step 4 (agent suggests) |
| Priority | Required | Required | Step 4 |
| Expected behavior | Implicit | Required | Step 3-CR |
| Owner confirmation | Required | Required | Step 5 |

---

## 6. What the Agent Auto-Generates (owner never sees this)

After owner confirms in Step 5, agent runs:

```bash
python3 /app/scripts/create_intake.py \
  --type bug \
  --title "Audit Report PDF — rows break across pages" \
  --description "PDF export has mixed/misaligned rows..." \
  --area "Reports" \
  --priority P2 \
  --attachments "screenshot_001.png"
```

The script:
1. Reads `registry.json` to find next sequential ID
2. Creates intake doc at:
   - Bug: `/app/memory/memory/bugs/intake/BUG_{id}_INTAKE_{date}.md`
   - CR: `/app/memory/memory/crs/intake/CR_{id}_INTAKE_{date}.md`
3. Adds entry to `registry.json` with `completeness: "1/7"`
4. Runs `node scripts/gen_dashboard_data.js` to update dashboard
5. Returns: `"BUG-112 registered. In POS 4.0 backlog for triage."`

---

## 7. ID Counters (current as of 2026-06-01)

| Type | Last Used | Next Available |
|---|---|---|
| BUG | BUG-111 | BUG-112 |
| CR | CR-009 | CR-010 |
| PROD-HOTFIX | PROD-HOTFIX-008 | PROD-HOTFIX-009 |

These are derived from `registry.json` at runtime — no manual counter file needed.

---

## 8. Rules

1. **Never skip the confirmation step** — always show the summary before registering.
2. **Never ask the owner to fill a template** — the agent does all formatting.
3. **Always assign to POS 4.0 sprint** — new items go to POS 4.0 Bucket D (Intake).
4. **Code Gate is mandatory** — POS 4.0 items cannot have code written until artifacts 0-4 exist.
5. **Attachments are optional** — don't block registration on missing screenshots.
6. **Agent may combine Steps** — if the owner's first message covers everything, skip redundant questions.
7. **Voice transcripts** — if the owner sends a voice note, transcribe first, then follow the same flow.

---

## 9. Example Conversations

### Example 1: Bug (minimal)
> **Owner:** "PDF export rows are all messed up on the audit page"
> **Agent:** "Got it — sounds like a bug in Reports → Audit → PDF Export. Do you have a screenshot? And how urgent — P0 (blocking), P1 (high), P2 (medium), P3 (low)?"
> **Owner:** "P2, no screenshot"
> **Agent:** "Here's what I've captured:
> **BUG-112: Audit Report PDF — rows misaligned across pages**
> - Type: Bug | Area: Reports → PDF Export | Priority: P2
> - Symptom: PDF export rows are misaligned/broken
> Should I register this?"
> **Owner:** "Yes"
> **Agent:** *runs create_intake.py* → "BUG-112 registered in POS 4.0 backlog."

### Example 2: CR (with screenshot)
> **Owner:** "I want the CSV export to have GST columns like the old POS" *attaches screenshot*
> **Agent:** "Got it — a feature request to enhance Reports → CSV Export. Priority?"
> **Owner:** "P1"
> **Agent:** "**CR-010: Audit CSV Export — add GST breakdown columns (parity with old POS)**
> - Type: CR | Area: Reports → CSV Export | Priority: P1
> - Expected: CSV includes GST, CGST, SGST columns matching old POS format
> - Attachment: old_pos_csv_screenshot.png
> Register this?"
> **Owner:** "Yes"

---

*End of Intake Workflow — 2026-06-01*
