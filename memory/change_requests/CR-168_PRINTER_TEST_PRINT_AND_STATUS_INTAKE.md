# CR-168 — Printer Agent: Test Print Job + Live Printer Status

**Type:** Change Request (New Feature — wire up existing disabled stubs)
**ID:** CR-168
**Date:** 2026-08-18
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Inside **Settings → Printer Agent Config → Printers tab**, every printer card already shows two disabled stub elements:

```
"Status — Coming soon"     ← grey dot + text, data-testid="printer-status-{id}"
"Test Print — Coming soon" ← disabled button, data-testid="printer-test-print-{id}"
```

Both are non-functional placeholders (`disabled`, `opacity-50`, `cursor-not-allowed`). This CR replaces them with working functionality:

### Part A — Printer Status (live connectivity check)
Per-printer indicator showing whether the printer is currently reachable from the printer agent:
- Green dot = online / reachable
- Grey dot = unknown / not checked yet
- Red dot = unreachable / error

### Part B — Test Print Job
A "Test Print" button that sends a real test print job (test KOT or test bill) through the printer agent to verify the physical printer actually prints. Different from CR-152 (which is only a TCP socket ping — no print job is sent).

---

## Code Reality

**PARTIAL** — UI stubs already exist in production code:

```jsx
// PrintersTab.jsx:273-276 — DISABLED STUBS (exist today)
<span ... data-testid={`printer-status-${p.id}`}>
  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#D1D5DB" }} />
  Status — Coming soon
</span>
<button disabled className="... opacity-50 cursor-not-allowed"
  data-testid={`printer-test-print-${p.id}`}>
  Test Print — Coming soon
</button>
```

No API wiring exists. No service function. No constants entry.

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Printer Agent Config → Printers Tab |
| Priority | P2 — MEDIUM (important for setup/verification; printing works without it) |
| Severity | MEDIUM — operational quality; stubs create UX confusion ("Coming soon" visible to owner) |
| Risk | MEDIUM (calls printer agent API; no financial/order logic, but incorrect implementation could affect printer routing expectations) |
| Fast Lane | NO — multi-file, API wiring needed |

---

## Evidence

- **Screenshot:** `PrintersTab.jsx:273-276` — code confirms both stubs
- **Steps to reproduce:** Open Settings → Printer Agent Config → Printers tab → see "Status — Coming soon" + disabled "Test Print — Coming soon" button on every printer card
- **Source:** OWNER-REPORTED (user noted "CR related to know if the printer is connected, to automatically testing the printer")
- **Confidence:** CONFIRMED — stubs visible in code and in live UI

---

## Blast Radius

```bash
grep -rn "printer-test-print\|printer-status\|Test Print.*Coming" src/ → 3 matches (all in PrintersTab.jsx)
```

| File | Change |
|---|---|
| `components/panels/settings/printerConfig/PrintersTab.jsx` | Wire up disabled stubs → live status indicator + working Test Print button |
| `api/services/printerAgentConfigService.js` | +`testPrint(printerId)` function |
| `api/constants.js` | +test-print endpoint constant |

- **Estimated scope:** SMALL-MEDIUM (3 files, ~30-40 lines)
- **Hotspot files:** NO
- **Blast radius:** SMALL

---

## Expected Behavior

### Part A — Status
- On Printers tab load: for each printer, show "Checking..." briefly, then resolve to green / grey / red
- OR: lazy — only check when user clicks the status dot/chip
- Status updates automatically after Test Print completes

### Part B — Test Print
- Button enabled (remove `disabled` + `opacity-50`)
- On click: loading state ("Printing…")
- Calls test-print API with `printer_id`
- Success: button briefly shows ✓ "Sent" + toast "Test print sent to [printer label]"
- Error: toast "Test print failed: [reason]"
- No modal, no confirmation required (non-destructive)

---

## Owner Decisions Needed (Open Questions)

| # | Question |
|---|---|
| OQ-1 | What is the printer agent API endpoint for test print? (e.g., `POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config/test-print`?) Owner to confirm endpoint + payload |
| OQ-2 | For Printer Status: is there a status-check endpoint, or is it derived from the test-print result? |
| OQ-3 | Should the test print send a test KOT, a test bill, or a simple "printer test" page? |
| OQ-4 | Should status auto-refresh on the Printers tab load, or only on user click? |

---

## Duplicate / Related Check

| ID | Title | Verdict |
|---|---|---|
| **CR-152** | Test Connection for LAN Printer | RELATED but DISTINCT — CR-152 is a TCP socket ping (connectivity only, no print). CR-168 sends an actual print job and covers all connection types (USB/LAN/Bluetooth), not LAN only. Recommend implementing CR-168 with CR-152 absorbed as a sub-feature (the status check replaces CR-152's scope entirely) |
| **CR-133** | Printer Agent Config Full Screen | RELATED — CR-133 built the Printers tab with these stubs. CR-168 activates them |

**Verdict: DISTINCT (absorbs CR-152 scope)**

---

## Batch Suggestion

Add to **BATCH-09** (Printer/Station Management) — all three existing CRs touch `PrinterAgentConfigView.jsx` and `PrintersTab.jsx`. This CR also lives in the same file area. Gate 4 execution order: after CR-167 (wizard collapse) since both touch `PrintersTab.jsx`.

---

**Backend:** API endpoint UNKNOWN — OQ-1/2/3 must be resolved at Gate 2
**Frontend:** PARTIAL (stubs exist, not wired)
**Next:** Planning Gate 2 — owner answers OQ-1 through OQ-4 first
