# Design Agent Brief — Room Module V2 (Next Session)

> **Purpose:** Copy-paste-ready brief to pass to `design_agent_full_stack` in the next session.
> **Scope:** NARROW — produce design guidance for ~10 NEW UI patterns being added to the existing Room Check-In modal. NOT a full redesign of the module.
> **Prerequisite:** `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md` (V2.2) is already finalised and handed to the Implementation Agent as the functional source of truth.

---

## 1. Why we are engaging the design agent

V2 introduces ~10 new UI patterns that do not exist anywhere in the current POS codebase. Without dedicated design guidance, the Implementation Agent will improvise visuals — creating inconsistency with the established system (orange primary brand, `COLORS.*` tokens, lucide-react icons, local `InputField` / `SelectField` / `FileField` components).

We want a **design addendum** that maps each new pattern into the EXISTING visual system — not a net-new design system.

---

## 2. Hard constraints (tell the design agent explicitly)

The following must NOT be changed by the design agent:

| Constraint | Rationale |
|-----------|-----------|
| **3-column layout** of the modal (Guest \| Verification \| Booking & Payment) | Locked by V2 §4 and §13.2 |
| **Existing `COLORS.*` tokens** at `/app/frontend/src/constants` (orange primary, gray text, border gray, light bg, section bg, dark text) | Brand identity; already in production |
| **Icon library: lucide-react** | Already installed and used across the app |
| **Modal overlay pattern** (fixed overlay, left-aligned to sidebar, header + body + sticky footer) | Matches existing modals (`SplitBillModal`, `StationPickerModal`) |
| **Existing local components** (`InputField`, `SelectField`, `FileField`, `SectionLabel`) should be extended, not replaced with net-new variants | Reduces code churn |
| **shadcn/ui components** at `/app/frontend/src/components/ui/` may be used for new patterns (`Dialog`, `Popover`, `Tooltip`, etc.) when appropriate | Already in the codebase |
| **Typography** — keep existing font, sizes (text-xs, text-sm, text-base), weights | No new font family |
| **Data-testid convention** `checkin-*` (already enumerated in V2 §12.14) | Testing contract |

---

## 3. What the design agent SHOULD produce

A single addendum file at `/app/memory/ROOM_MODULE_V2_DESIGN_ADDENDUM.md` covering ONLY the 10 new UI patterns below, with for each:

- **Visual anatomy** (ASCII sketch or component structure)
- **Exact token references** (`COLORS.primaryOrange`, `text-xs`, `border-gray-200`, etc.)
- **Icon choices** (lucide-react icon names)
- **Interaction states** (default, hover, active, disabled, error, loading, focus)
- **Micro-animation** (if any — duration, easing)
- **Accessibility notes** (aria labels, keyboard nav, focus ring)
- **Responsive behaviour** within the 3-column grid (when to stack, when not to)

The addendum should NOT re-specify:
- The functional requirements (those live in V2 doc)
- The 3-column layout
- The modal shell / header / footer
- Existing form field visuals (unless a new pattern requires a variant)

---

## 4. The 10 new UI patterns needing design guidance

### 4.1 Country-code selector + phone input
- Combined control: country flag + `+91` dial code + phone number input.
- Default country: India (+91).
- Behaviour: operator can open a searchable dropdown to pick a different country.
- Validation state: invalid number → red border + inline error text below.
- Library options: `react-phone-number-input` or equivalent.
- Must sit in Column 1 where the current simple `Phone` field exists.

### 4.2 Dynamic Add-Row button (Adults)
- Primary action: add an additional adult row (#2, #3, #4, …).
- Appears at the bottom of the Adults area when `guest_details=Yes` and row count < cap.
- Visual treatment: outlined button + `Plus` lucide icon + label "Add Adult".
- Disabled state: when cap (`4 × rooms_selected`) is reached — show tooltip "Maximum X adults".
- Must feel lightweight (not a primary CTA — it's auxiliary).

### 4.3 Dynamic Add-Row button (Children)
- Same pattern as 4.2 but for children.
- Label: "Add Child".
- Disabled state same rules.

### 4.4 Additional Adult Row (repeated)
- Compact horizontal row containing:
  - Index badge (#2, #3, #4)
  - Name input
  - ID Type select
  - Front image file upload (mandatory marker)
  - Back image file upload (optional)
  - Remove-row `X` icon button
- Must fit inside Column 1 + Column 2 footprint (may span both or stack per row).
- Separator between rows: thin divider `border-t` or subtle gray background banding.

### 4.5 Child Row (repeated)
- Compact row: index badge (#1, #2, …) + Name input + Remove-row `X` icon.
- Simpler than adult row (just name).

### 4.6 Remove-row `X` button
- Small icon button (lucide `X`).
- Appears on hover of the row (desktop) or always visible (mobile).
- Tooltip: "Remove".
- Confirmation: none (one-click remove is fine for a row with only text input; ask PO if docs are attached whether to confirm).

### 4.7 "Edit time" override link (next to date picker)
- Small text link (not a button) beside the check-in date picker.
- Label: "Edit time" (default state) → "12:34 PM" (after override).
- Click → opens a small popover / inline time picker.
- Default time displayed = current time at modal open; payload value syncs with picker at submit (per V2 §7.9).

### 4.8 Nights helper input
- Compact input (width ~60px) next to check-in date.
- Label: "Nights".
- Arrows or stepper allowed.
- Min = 1; max = any reasonable limit (e.g., 365).
- Visual linkage: updating nights triggers a brief highlight on the auto-calculated check-out date (subtle pulse / color transition) to show cause-and-effect.

### 4.9 GST / Firm block (gated reveal)
- Section with its own label ("GST / Firm Details") inside Column 3.
- Hidden by default; revealed with smooth expand animation when `show_user_gst=Yes` AND `booking_for=Corporate`.
- Expand/collapse: `max-height` transition ~200ms ease-out.
- Fields: Firm Name, Firm GSTIN.
- When hidden → fields are cleared (no residual data).

### 4.10 Dirty-form confirmation dialog
- Uses shadcn `Dialog` component.
- Title: "Unsaved changes"
- Body: "You have entered information that will be lost. Are you sure you want to discard?"
- Buttons: "Cancel" (secondary, stays in modal) + "Discard" (destructive, red-ish).
- Triggered by: Cancel button, X-close, overlay click, browser back, tab close, route change.

### 4.11 File rejection inline error state (bonus)
- When a file fails MIME/size check:
  - File field border → red.
  - Inline text below field: red, small (`text-xs`), exact copy from V2 §6.4 ("File too large. Maximum 5 MB allowed." / "Only JPG, PNG, WEBP, or PDF files are allowed.").
  - Already-selected (invalid) file is cleared automatically.
- Success state (file accepted after compression): file name truncated + small green check icon.

### 4.12 409 Conflict toast + auto-close (bonus)
- Toast variant: warning/destructive (red or amber).
- Message: "This room was just taken by another operator. Please pick another room."
- Duration: 4 seconds.
- Side effect: modal auto-closes after 500 ms so operator sees the toast against the dashboard.

---

## 5. Reference files for the design agent to inspect

| File | Why |
|------|-----|
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` | Current modal — visual baseline |
| `/app/frontend/src/components/modals/SplitBillModal.jsx` | Peer modal — reference for modal patterns in this system |
| `/app/frontend/src/components/modals/StationPickerModal.jsx` | Another peer modal |
| `/app/frontend/src/constants` | `COLORS.*` token definitions |
| `/app/frontend/src/components/ui/` | shadcn/ui components available (dialog, popover, tooltip, etc.) |
| `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md` | Full functional requirements (V2.2) |

---

## 6. Exact brief to paste into `design_agent_full_stack` tool call

When you start the next session, invoke the tool with these parameters:

```
original_problem_statement:
"""
We are adding ~10 NEW UI patterns to an existing Room Check-In modal in a production POS/hotel
system. The Room Check-In module is being upgraded to V2 (see
/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md for full functional requirements).

The visual system is already established in the codebase:
- Orange primary brand (COLORS.primaryOrange token)
- lucide-react icons
- Custom InputField / SelectField / FileField components at
  /app/frontend/src/components/modals/RoomCheckInModal.jsx
- shadcn/ui components available at /app/frontend/src/components/ui/
- 3-column grid layout (Guest | Verification | Booking & Payment)

Your task is NOT to redesign the module. Your task is to produce a DESIGN ADDENDUM that
slots the ~10 new UI patterns into the existing visual system — using existing COLORS tokens,
existing icon library (lucide-react), existing font/typography, and existing modal shell.

Deliverable: /app/memory/ROOM_MODULE_V2_DESIGN_ADDENDUM.md covering each of the 10 patterns
with: visual anatomy, exact token references, icon choices, interaction states
(default/hover/active/disabled/error/loading/focus), micro-animations, accessibility notes.

Reference files to inspect:
- /app/frontend/src/components/modals/RoomCheckInModal.jsx (current modal baseline)
- /app/frontend/src/components/modals/SplitBillModal.jsx (peer modal)
- /app/frontend/src/components/modals/StationPickerModal.jsx (peer modal)
- /app/frontend/src/constants (COLORS tokens)
- /app/frontend/src/components/ui/ (available shadcn components)
- /app/memory/ROOM_MODULE_REQUIREMENTS_V2.md (full requirements)
- /app/memory/ROOM_MODULE_V2_DESIGN_ADDENDUM_BRIEF.md (this brief — has the full 10-pattern list)
"""

user_choices:
"No explicit design preferences provided by user. Constraint: match the existing system — do not
redesign it. Existing COLORS tokens, lucide-react icons, and the 3-column layout must be preserved."

key_functionalities:
[
  "Country-code selector + phone input (default India +91)",
  "Dynamic Add-Row button for Additional Adults",
  "Dynamic Add-Row button for Children",
  "Additional Adult Row layout (name + ID type + front image + back image + remove)",
  "Child Row layout (name + remove)",
  "Remove-row X icon button (with tooltip)",
  "'Edit time' override link next to check-in date picker",
  "Nights helper input with visual linkage to auto-calculated check-out date",
  "Gated GST / Firm block reveal/hide animation",
  "Dirty-form confirmation dialog (shadcn Dialog)",
  "File-rejection inline error state",
  "409-conflict toast + auto-close"
]

app_type: "hybrid_fullstack"
```

---

## 7. Acceptance criteria for the design addendum

Before accepting the design agent's output, verify:

- [ ] Each of the 10 patterns has its own section in the addendum.
- [ ] Every color reference uses `COLORS.*` tokens from the existing constants file — NO new hex codes introduced.
- [ ] Every icon is from `lucide-react` (no other icon library).
- [ ] No new font family introduced.
- [ ] No redesign of the 3-column layout, modal shell, or existing InputField/SelectField/FileField components.
- [ ] Each pattern specifies interaction states (hover/active/disabled/error/focus).
- [ ] Each interactive element's `data-testid` is listed (consistent with V2 §12.14).
- [ ] Accessibility: aria labels, keyboard support, focus rings specified where applicable.
- [ ] Responsive behaviour documented (what happens on narrow widths — though this is desktop POS-first).
- [ ] Micro-animations specified with duration + easing (e.g., `max-height 200ms ease-out`).

If the design agent produces a document that violates any of the "Hard constraints" in §2, reject it and request a scoped rewrite.

---

## 8. Handoff order after design session

Once the design addendum is accepted:

1. **Implementation Agent** receives BOTH documents:
   - `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md` (functional — V2.2)
   - `/app/memory/ROOM_MODULE_V2_DESIGN_ADDENDUM.md` (visual — from design agent)
2. Implementation Agent follows V2 §12 checklist for build order, applying visual guidance from the addendum for each new pattern.
3. The regression-safety guardrails in V2 §13 still apply — design addendum MUST NOT override them.

---

## 9. If the design agent produces scope creep

Watch for these red flags in the addendum:

- Introduces a new color palette → reject.
- Suggests migrating all fields to shadcn/ui `Input` / `Select` → out of scope; reject.
- Proposes a modal redesign (side-drawer, bottom-sheet, wizard steps) → out of scope; reject.
- Adds new dependencies beyond what V2 §12.4/§12.5 already specifies → flag for review.
- Changes typography (new font family, new size scale) → reject.

In all these cases, respond to the design agent with: *"Out of scope per §2 constraints. Rescope to the 10 patterns only."*

---

*End of brief. Copy the `design_agent_full_stack` tool parameters from §6 directly into the next session's tool call.*
