# CR-169 — Live Bill/KOT Print Preview in Printer Config

**Type:** Change Request (New Feature — promote dev mock to live owner-facing preview)
**ID:** CR-169
**Date:** 2026-08-18
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner needs a way to **preview what their actual bill or KOT will look like** before it prints — showing real restaurant data, current logo, actual font sizes, section layout — without placing a real order or wasting paper.

This is a read-only visual preview of the bill/KOT print output using the owner's currently-saved Printer Config style settings.

---

## Code Reality

**PARTIAL — in the wrong direction.**

A page called `PrinterConfigPreviewPage.jsx` (372 lines) already exists at route `/printer-config-preview`:

```jsx
// App.js:208
<Route path="/printer-config-preview" element={<PrinterConfigPreviewPage />} />
```

However:
- It is a **developer design mock** created during the CR-133 Gap Batch to show the team what the UI should look like
- It contains **hardcoded mock data** (fake employee list, static sample values)
- It has **no navigation link** from within the Settings UI — only accessible by typing the URL directly
- It is **not a user-facing feature** — owner cannot reach it through the app
- The "preview" here is of the printer *settings screen design*, not of the actual bill/KOT *print output*

```
// PrinterConfigPreviewPage.jsx:1-2 (header comment)
// CR-133 Gap Batch — Final Screen Design Preview
// Shows: Employee dropdown (G3b), Windows/Android style split (G5+G6), copies fix (G1/G4)
```

**What's missing:** A live preview component wired to real `GET /printer-agent-config` data that renders a simulated bill/KOT layout matching the owner's current style settings.

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Printer Agent Config → Print Style Tab (+ optional dedicated preview panel) |
| Priority | P2 — MEDIUM |
| Severity | MEDIUM — important for setup confidence; owner cannot verify style changes without printing a real order |
| Risk | LOW (read-only display, no API writes, no financial/order logic, no hotspot files) |
| Fast Lane | NO — new component + wiring to live API data |

---

## Evidence

- `App.js:70,208` — confirms route + import exist (dev mock page)
- `PrinterConfigPreviewPage.jsx:1-2` — confirms it's a design preview tool, not end-user bill preview
- No navigation link from Settings UI to any preview page (confirmed by grep — only `App.js` imports it)
- **Source:** OWNER-REPORTED (user noted "CR where we can see the preview")
- **Confidence:** CONFIRMED — dev mock exists, end-user live preview does not

---

## Blast Radius

```bash
grep -rn "PrinterConfigPreview\|printer-config-preview" src/ → 2 matches (App.js only + page file itself)
grep -rn "printPreview\|previewBill\|bill.*preview" src/ → 0 relevant matches in live code
```

| File | Change |
|---|---|
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | Add "Preview" button that opens the preview panel |
| `components/panels/settings/printerConfig/PrintPreviewPanel.jsx` | NEW — live bill/KOT preview component using real config data |
| `pages/PrinterConfigPreviewPage.jsx` | OPTION A: Rewrite to use live data. OPTION B: Repurpose as dev-only, build new panel instead |

- **Estimated scope:** MEDIUM (1 new file + 1 modified, ~100-150 lines new)
- **Hotspot files:** NO
- **Blast radius:** SMALL-MEDIUM

---

## Expected Behavior

### Preview Access
- Button "Preview Bill" / "Preview KOT" in the Print Style tab (or tab header)
- Opens an inline side panel or modal showing a simulated print layout

### Preview Content
- Uses currently-loaded (not necessarily saved) style config from `printerAgentConfigState`
- Renders a sample bill/KOT with:
  - Restaurant header (name, address, phone, FSSAI, GST from `restaurant_information`)
  - Item table with sample items (2-3 dummy rows: "Paneer Butter Masala × 1 ₹320", "Mineral Water × 2 ₹60")
  - Amount section (subtotal, tax, total)
  - Footer text
- Font sizes, bold flags, and section visibility match the current style config
- Paper size toggle: 58mm vs 80mm preview (switch between the two)

### Live Update
- Preview reflects current unsaved changes in the style editor (no need to save first)
- Owner can tweak font sizes and see changes reflected in real time

### No Print Trigger
- Preview is display-only — does NOT send any job to the printer
- "Close" button dismisses; no save/submit action in preview panel

---

## Owner Decisions Needed (Open Questions)

| # | Question |
|---|---|
| OQ-1 | Where should Preview be accessible from? Options: (a) button in Print Style tab header, (b) button in each section header, (c) dedicated "Preview" 6th tab in Printer Agent Config |
| OQ-2 | Should the preview show Bill layout, KOT layout, or both (toggle)? |
| OQ-3 | Should the preview use real restaurant info (from profile context) or placeholder sample data? |
| OQ-4 | What happens to `PrinterConfigPreviewPage.jsx`? (a) Rewrite it with live data, (b) Keep as dev tool, build separate panel, (c) Remove it entirely |

---

## Duplicate / Related Check

| ID | Title | Verdict |
|---|---|---|
| **CR-133** | Printer Agent Config Full Screen | RELATED — CR-133 built the Print Style tab and created the dev mock page. CR-169 adds live preview capability |
| **CR-167** | Wizard → Single Form | RELATED (same Printer Config area) — no conflict, different tab/component |
| `PrinterConfigPreviewPage.jsx` | Dev mock (existing file) | NOT A DUPLICATE — that page is a developer design tool; this CR is an end-user feature |

**Verdict: DISTINCT**

---

## Batch Suggestion

Add to **BATCH-09** (Printer/Station Management) or as a standalone follow-up after BATCH-09. Lower priority than CR-160/161 (new screens) but fits the same printer config sprint.

---

**Backend:** No new API needed — uses existing `GET /printer-agent-config` data already loaded in state
**Frontend:** PARTIAL (dev mock exists; live wiring NONE)
**Next:** Planning Gate 2 — owner answers OQ-1 through OQ-4 first
