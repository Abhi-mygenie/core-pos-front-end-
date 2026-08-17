# BUG-319 — Intake: Footer Text "Powered by MyGenie" Hardcoded in Print Agent

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (curl)  
**Confidence:** CONFIRMED  
**Duplicate check:** DISTINCT

---

## Classification

| Field | Value |
|---|---|
| Type | BACKEND_BUG |
| Severity | P2 — MEDIUM (cosmetic branding issue) |
| Risk | LOW (no FE logic change needed) |
| Fast Lane eligible | N/A — backend issue |

---

## Description

Bills always print with footer text "Powered by MyGenie" regardless of what is configured in the Printer Config UI.

**FE side:** The BillContentTab renders an editable "Footer Text" field, saves it correctly via the printer-agent-config API. API confirms it stores `bill_footer.footer_text = 'Powered by MyGenie'`.

**Problem:** The physical print agent (device software) ignores the `footer_text` field from the API and uses its own hardcoded string.

**Owner says:** "footer text is not needed here -- its hard coded in print agent." This suggests the owner wants either:
- a) The footer field removed from the FE UI (since it has no effect)
- b) OR the print agent to be updated to read the configured value

**Curl evidence:** `/app/memory/evidence/CR-133-PRINTER-GAPS/printer_config_api.txt`  
`bill_footer: {'footer_text': 'Powered by MyGenie'}`

---

## Fix Summary

**Backend Brief needed:** Print agent must read `footer_text` from `printer-agent-config.bill_footer.footer_text`.  
**FE optional:** If backend cannot fix, hide/disable the Footer Text field in BillContentTab with a note "Managed by print agent".

---

## Owner Decisions Needed

1. Should the Footer Text field be hidden from the FE UI (since it has no effect currently)?
2. Is removing "Powered by MyGenie" from the print agent on the roadmap?
