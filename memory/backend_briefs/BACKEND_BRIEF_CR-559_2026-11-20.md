# BACKEND_BRIEF_CR-559_2026-11-20

## Summary
- Issue: The POS "Accept" flow for web/scan orders needs to gate KOT auto-printing on the restaurant's **Scan-Order Auto-print** setting, but that flag is NOT present in the profile payload the dashboard reads.
- Classification: CONTRACT_MISMATCH (field available on a different endpoint; needed on profile)
- Frontend impact: Without it, the CR-559 gate (`settings.scanOrderAutoPrint`) is always false → Accept never auto-prints the KOT.
- Priority/Risk: P1 / CRITICAL (printing / order flow)

## Ask (owner decision OD-5 = Option A)
Surface `scan_order_auto_print` in the **profile** response at the **`restaurants[0]` root**, mirroring the existing sibling flags `print_kot` and `billing_auto_bill_print`. Value format `"Yes"`/`"No"` (same as those flags). The frontend maps it via `toBoolean(apiSettings.scan_order_auto_print)`.

## Endpoint
- Method: GET
- URL: `/api/v1/vendoremployee/profile`
- Auth/context: Bearer <employee token> (masked)

## Source of truth today
The same value is already returned by:
- GET `/api/v2/vendoremployee/restaurant-settings/printer-agent-config` → `settings_config.auto_printing.scan_order_auto_print` = `"Yes"` (verified live for The Goan Kitchen).

## Evidence
- Profile (flag ABSENT): `memory/evidence/CR-559/profile_response.json`
- Printer-agent-config (flag PRESENT): `memory/evidence/CR-559/printer_agent_config_response.json`
- Probe scripts: `memory/evidence/CR-559/CR-559_probe.py`, `CR-559_probe2.py`

## Expected after fix
`GET /api/v1/vendoremployee/profile` → `restaurants[0].scan_order_auto_print` = `"Yes"` | `"No"`.

## Frontend Workaround
- Available: YES (Option B — fetch printer-agent-config at load and merge) but NOT chosen; owner selected backend parity (Option A).

## Validation after deploy
`cd /app && python3 memory/evidence/CR-559/CR-559_probe.py` → must report the flag present at `restaurants[0]` root.
