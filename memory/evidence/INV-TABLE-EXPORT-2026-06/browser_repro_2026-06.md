# Browser reproduction — Table export (preview, Playwright)

Account: cafe103 owner (alias). App: https://pos-frontend-app-2.preview.emergentagent.com

## Steps
1. Login → /loading (no restaurant picker for this account).
2. /settings → tile "Table Management" → table-management-view (84 items).
3. Click **Export** (`data-testid="export-btn"`).
4. Bulk Edit → click **Export** (`data-testid="table-bulk-export-btn"`).

## Observed (Playwright — popups NOT blocked)
- Main export:  popups=['NEWPAGE::', ':']  downloads=['TableList_1791458356.xlsx']  console errors: none
- Bulk export:  popups=['NEWPAGE::', ':']  downloads=['TableList_1791458360.xlsx']  console errors: none

## Interpretation
`window.open(url,"_blank")` is invoked AFTER `await exportTableList()`. It opens an EMPTY
new tab (NEWPAGE with blank URL) and, only because Playwright does not enforce popup
blocking, the file still downloads. In a production browser the popup blocker blocks the
deferred `window.open` (transient user activation already consumed by the await) → no tab
opens and no download occurs, while the "Exported" toast still reports success.

Canonical reliable pattern already used elsewhere in this app:
- api/services/reportService.js `exportOrderReportBetaExcel` (anchor + a.download + blob fallback)
- api/services/recipeService.js (anchor + a.download)
