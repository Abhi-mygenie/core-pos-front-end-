/**
 * reportExporter.js — CR-011 Code Gate 1.5 primitive
 *
 * Shared utility for ALL Insights report screens (S5–S10 Phase 2 + Phase 3/4).
 * Produces:
 *   - PDF via HTML→Blob→`win.print()` (same pattern as creditStatementGenerator.js)
 *   - Excel via SpreadsheetML 2003 XML (dependency-free; opens in Excel, LibreOffice,
 *     Google Sheets natively; multi-sheet; frozen header row)
 *
 * Visual contract: parity with Credit/Tab Management module (`creditStatementGenerator.js`):
 *   - Same colour palette (#ea580c primary, #16a34a paid, #dc2626 outstanding/cancelled)
 *   - Same `STATEMENT_CSS` typography + header layout
 *   - Same `fmtINR` (Indian locale, ₹, 2 decimals) and `fmtDate` (DD/MM/YYYY IST)
 *
 * Promoted from Code Gate 2 to Code Gate 1.5 by owner directive 2026-06-02:
 *   "go path C" — build the primitive now so S5 can be Gate-⑤ validated end-to-end
 *   (numbers + export format in one go), and S6–S10 inherit it free.
 *
 * Spec source: /app/memory/memory/change_requests/impact_analysis/CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md §2
 */

// ─────────────────────────────────────────────────────────────────────────────
// Reused helpers (kept inline so the primitive has zero internal-import coupling
// with credit module — mirrors the formatters there).
// ─────────────────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtINR = (n) => {
  const v = parseFloat(n) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}&#8377;${abs}`;
};

const fmtINRPlain = (n) => {
  const v = parseFloat(n) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}\u20B9${abs}`;
};

const fmtDate = (input) => {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const nowIST = () =>
  new Date().toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

// Lifted verbatim from creditStatementGenerator.js so the visual stays identical.
const STATEMENT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #333; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left h1 { font-size: 22px; color: #ea580c; margin-bottom: 4px; letter-spacing: 0.5px; }
  .header-left .restaurant { font-size: 14px; color: #666; }
  .header-left .mode-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 4px; background: #F3E8FF; color: #6B21A8; }
  .header-right { text-align: right; font-size: 11px; color: #888; }
  .period-bar { background: #f8f8f8; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .period-bar .label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
  .period-bar .value { font-size: 13px; font-weight: 600; color: #333; }
  .summary-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { flex: 1; min-width: 120px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 14px; text-align: center; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 700; font-family: monospace; color: #333; }
  .summary-card .value.primary { color: #ea580c; }
  .summary-card .value.good { color: #16a34a; }
  .summary-card .value.bad { color: #dc2626; }
  .section-title { font-size: 14px; font-weight: 700; margin: 22px 0 8px; padding: 6px 10px; background:#FFF7ED; border-left:4px solid #ea580c; color:#7c2d12; }
  .section-subtitle { font-size: 11px; color: #888; margin: -4px 0 8px 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #333; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  td.amount, th.amount { text-align: right; font-family: monospace; }
  td.center, th.center { text-align: center; }
  tfoot td { font-weight: 700; border-top: 2px solid #333; background: #fafafa; }
  .empty-msg { text-align: center; padding: 16px; color: #999; font-style: italic; font-size: 12px; }
  .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 12px; } .no-print { display: none; } .section-title { page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Cell formatters — drive both PDF rendering and Excel value typing.
// Each sheet column declares `format`:
//   'text' | 'inr' | 'integer' | 'decimal' | 'date' | 'percent'
// ─────────────────────────────────────────────────────────────────────────────
const formatForPDF = (value, format) => {
  if (value === null || value === undefined || value === '') return '&mdash;';
  switch (format) {
    case 'inr':     return fmtINR(value);
    case 'integer': return Number(value).toLocaleString('en-IN');
    case 'decimal': return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'date':    return fmtDate(value);
    case 'percent': return `${Number(value).toFixed(1)}%`;
    case 'text':
    default:        return esc(String(value));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF builder
// ─────────────────────────────────────────────────────────────────────────────
function buildSheetTableHTML(sheet) {
  if (!sheet?.rows || sheet.rows.length === 0) {
    return `<div class="empty-msg">No rows in this section for the selected date range.</div>`;
  }

  const headerCells = sheet.columns.map((c) => {
    const align = c.align === 'right' ? 'amount' : c.align === 'center' ? 'center' : '';
    return `<th class="${align}">${esc(c.label)}</th>`;
  }).join('');

  const rowsHTML = sheet.rows.map((row) => {
    const cells = sheet.columns.map((c) => {
      const align = c.align === 'right' ? 'amount' : c.align === 'center' ? 'center' : '';
      return `<td class="${align}">${formatForPDF(row[c.key], c.format)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // Optional footer totals row
  let footerHTML = '';
  if (sheet.totals) {
    const totalCells = sheet.columns.map((c, i) => {
      if (i === 0) return `<td>${esc(sheet.totals.label || 'TOTAL')} (${sheet.rows.length})</td>`;
      const v = sheet.totals[c.key];
      const align = c.align === 'right' ? 'amount' : c.align === 'center' ? 'center' : '';
      return `<td class="${align}">${v === undefined || v === null ? '' : formatForPDF(v, c.format)}</td>`;
    }).join('');
    footerHTML = `<tfoot><tr>${totalCells}</tr></tfoot>`;
  }

  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rowsHTML}</tbody>${footerHTML}</table>`;
}

function buildReportHTML(params) {
  const { title, subtitle, restaurant, dateRange, generatedBy, kpis = [], sheets = [], summaryTables = [] } = params;

  const periodLabel = (dateRange?.from || dateRange?.to)
    ? `${fmtDate(dateRange.from) || 'Start'} to ${fmtDate(dateRange.to) || 'Today'}`
    : 'All time';

  const restName = restaurant?.name || 'MyGenie Restaurant POS';
  const restAddr = restaurant?.address || '';
  const restId   = restaurant?.id ? `#${restaurant.id}` : '';

  const kpiHTML = kpis.length
    ? `<div class="summary-strip">${kpis.map((k) => `
        <div class="summary-card">
          <div class="label">${esc(k.label)}</div>
          <div class="value ${k.tone || ''}">${k.format === 'inr' ? fmtINR(k.value) : esc(String(k.value))}</div>
        </div>`).join('')}</div>`
    : '';

  const sectionsHTML = sheets.map((s) => `
    <div class="section-title">${esc(s.name)} <span style="float:right;font-size:11px;color:#a3a3a3;font-weight:500;">${s.rows?.length || 0} rows</span></div>
    ${s.subtitle ? `<div class="section-subtitle">${esc(s.subtitle)}</div>` : ''}
    ${buildSheetTableHTML(s)}
  `).join('');

  const subtitleBadge = subtitle ? `<span class="mode-badge">${esc(subtitle)}</span>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(title || 'Report')} — ${esc(restName)}</title>
<style>${STATEMENT_CSS}</style></head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${esc((title || 'REPORT').toUpperCase())}</h1>
      <div class="restaurant">${esc(restName)} ${restId ? `<span style="color:#bbb;">${esc(restId)}</span>` : ''}</div>
      ${restAddr ? `<div class="restaurant" style="font-size:11px;color:#999;">${esc(restAddr)}</div>` : ''}
      ${subtitleBadge}
    </div>
    <div class="header-right">
      <div>Generated: ${nowIST()}</div>
      ${generatedBy ? `<div>By: ${esc(generatedBy)}</div>` : ''}
      <div>Period: ${esc(periodLabel)}</div>
    </div>
  </div>
  <div class="period-bar">
    <div><div class="label">From</div><div class="value">${fmtDate(dateRange?.from)}</div></div>
    <div><div class="label">To</div><div class="value">${fmtDate(dateRange?.to)}</div></div>
    <div><div class="label">Sections</div><div class="value">${sheets.length}</div></div>
    <div><div class="label">Total Rows</div><div class="value">${sheets.reduce((s, x) => s + (x.rows?.length || 0), 0)}</div></div>
  </div>
  ${kpiHTML}
  ${summaryTables.length > 0 ? summaryTables.map((s) => `
    <div class="section-title" style="margin-top:24px;font-size:13px;">${esc(s.name)} <span style="float:right;font-size:11px;color:#a3a3a3;font-weight:500;">${s.rows?.length || 0} rows</span></div>
    ${s.subtitle ? `<div class="section-subtitle">${esc(s.subtitle)}</div>` : ''}
    ${buildSheetTableHTML(s)}
  `).join('') : ''}
  <div style="page-break-after: always;"></div>
  ${sectionsHTML || '<div class="empty-msg">No data available for the selected period.</div>'}
  <div class="footer">
    <p>This is a computer-generated report. Powered by MyGenie Restaurant POS.</p>
    <p style="margin-top:4px;">Format parity: Credit/Tab Management module</p>
  </div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel builder — SpreadsheetML 2003 XML format (dependency-free).
// File extension: .xls — opens natively in Excel / LibreOffice / Google Sheets.
// Supports: multiple worksheets, frozen header row, basic cell types (Number,
// String, DateTime), auto-width columns.
// ─────────────────────────────────────────────────────────────────────────────
const xmlEsc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cellTypeFor = (format, value) => {
  if (value === null || value === undefined || value === '') return 'String';
  switch (format) {
    case 'inr':
    case 'integer':
    case 'decimal':
    case 'percent':
      return 'Number';
    case 'date':
      return 'DateTime';
    case 'text':
    default:
      return 'String';
  }
};

const cellValueFor = (format, value) => {
  if (value === null || value === undefined || value === '') return '';
  switch (format) {
    case 'inr':
    case 'decimal':
      return Number(value).toFixed(2);
    case 'integer':
      return String(Math.round(Number(value)));
    case 'percent':
      return Number(value).toFixed(2);
    case 'date': {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return xmlEsc(String(value));
      return d.toISOString().slice(0, 19);
    }
    case 'text':
    default:
      return xmlEsc(String(value));
  }
};

const styleIdFor = (format, isHeader) => {
  if (isHeader) return 'sHeader';
  switch (format) {
    case 'inr':     return 'sINR';
    case 'integer': return 'sInt';
    case 'decimal': return 'sDec';
    case 'percent': return 'sPct';
    case 'date':    return 'sDate';
    case 'text':
    default:        return 'sText';
  }
};

function buildExcelXML(params) {
  const { title, subtitle, restaurant, dateRange, generatedBy, kpis = [], sheets = [] } = params;
  const periodLabel = (dateRange?.from || dateRange?.to)
    ? `${dateRange.from || ''} to ${dateRange.to || ''}`
    : 'All time';

  // Summary sheet — always first sheet (per addendum §2.4).
  const summaryRows = [
    ['Report',          title || 'Report'],
    ['Subtitle',        subtitle || ''],
    ['Restaurant',      restaurant?.name || ''],
    ['Restaurant ID',   restaurant?.id || ''],
    ['Address',         restaurant?.address || ''],
    ['Period — From',   dateRange?.from || ''],
    ['Period — To',     dateRange?.to || ''],
    ['Generated',       nowIST()],
    ['Generated By',    generatedBy || ''],
    ['Sections',        String(sheets.length)],
    ['Total Rows',      String(sheets.reduce((s, x) => s + (x.rows?.length || 0), 0))],
    ['',                ''],
  ];

  kpis.forEach((k) => summaryRows.push([k.label, k.format === 'inr' ? fmtINRPlain(k.value) : String(k.value)]));

  const summarySheetXML = `
    <Worksheet ss:Name="Summary">
      <Table ss:DefaultColumnWidth="160">
        <Column ss:Width="180"/>
        <Column ss:Width="320"/>
        ${summaryRows.map((r) => `
          <Row>
            <Cell ss:StyleID="sLabel"><Data ss:Type="String">${xmlEsc(r[0])}</Data></Cell>
            <Cell ss:StyleID="sText"><Data ss:Type="String">${xmlEsc(r[1])}</Data></Cell>
          </Row>`).join('')}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <Selected/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>
      </WorksheetOptions>
    </Worksheet>`;

  const tabSheetsXML = sheets.map((s) => {
    // Sanitise sheet name — Excel limits to 31 chars and forbids certain chars
    const safeName = (s.name || 'Sheet').replace(/[\\/?*[\]:]/g, '_').slice(0, 31);

    const headerRow = `
      <Row ss:StyleID="sHeaderRow">
        ${s.columns.map((c) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${xmlEsc(c.label)}</Data></Cell>`).join('')}
      </Row>`;

    const bodyRows = (s.rows || []).map((row) => `
      <Row>
        ${s.columns.map((c) => {
          const t = cellTypeFor(c.format, row[c.key]);
          const v = cellValueFor(c.format, row[c.key]);
          return `<Cell ss:StyleID="${styleIdFor(c.format, false)}"><Data ss:Type="${t}">${v}</Data></Cell>`;
        }).join('')}
      </Row>`).join('');

    // Optional totals row
    const totalsRow = s.totals ? `
      <Row ss:StyleID="sTotalsRow">
        ${s.columns.map((c, i) => {
          if (i === 0) return `<Cell ss:StyleID="sTotalLabel"><Data ss:Type="String">${xmlEsc((s.totals.label || 'TOTAL') + ' (' + (s.rows?.length || 0) + ')')}</Data></Cell>`;
          const v = s.totals[c.key];
          if (v === undefined || v === null) return `<Cell ss:StyleID="sText"><Data ss:Type="String"></Data></Cell>`;
          const t = cellTypeFor(c.format, v);
          return `<Cell ss:StyleID="${styleIdFor(c.format, false)}"><Data ss:Type="${t}">${cellValueFor(c.format, v)}</Data></Cell>`;
        }).join('')}
      </Row>` : '';

    const colDefs = s.columns.map((c) => `<Column ss:Width="${c.width || (c.format === 'inr' ? 110 : c.format === 'text' ? 180 : 95)}"/>`).join('');

    return `
      <Worksheet ss:Name="${xmlEsc(safeName)}">
        <Table>
          ${colDefs}
          ${headerRow}
          ${bodyRows}
          ${totalsRow}
        </Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>
        </WorksheetOptions>
      </Worksheet>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${xmlEsc(title || 'Report')}</Title>
    <Author>MyGenie POS</Author>
    <Company>${xmlEsc(restaurant?.name || '')}</Company>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#333333"/></Style>
    <Style ss:ID="sHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#7C2D12"/></Borders>
    </Style>
    <Style ss:ID="sHeaderRow"><Interior ss:Color="#EA580C" ss:Pattern="Solid"/></Style>
    <Style ss:ID="sLabel"><Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#7C2D12"/><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/></Style>
    <Style ss:ID="sText"><Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#333333"/></Style>
    <Style ss:ID="sINR"><NumberFormat ss:Format="&quot;\u20B9&quot;#,##0.00"/><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#333333"/><Alignment ss:Horizontal="Right"/></Style>
    <Style ss:ID="sInt"><NumberFormat ss:Format="#,##0"/><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#333333"/><Alignment ss:Horizontal="Right"/></Style>
    <Style ss:ID="sDec"><NumberFormat ss:Format="#,##0.00"/><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#333333"/><Alignment ss:Horizontal="Right"/></Style>
    <Style ss:ID="sPct"><NumberFormat ss:Format="0.0%"/><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#333333"/><Alignment ss:Horizontal="Right"/></Style>
    <Style ss:ID="sDate"><NumberFormat ss:Format="dd/mm/yyyy"/><Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#333333"/></Style>
    <Style ss:ID="sTotalsRow"><Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#7C2D12"/><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#333333"/></Borders></Style>
    <Style ss:ID="sTotalLabel"><Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#7C2D12"/><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#333333"/></Borders></Style>
  </Styles>
  ${summarySheetXML}
  ${tabSheetsXML}
</Workbook>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronously open a blank window. MUST be called inside the click handler's
 * call stack to avoid popup-blocker rejection.
 */
export function openReportWindow() {
  return window.open('', '_blank');
}

/**
 * Write the report HTML into the pre-opened window and trigger print dialog.
 * @param {Window} win - window returned by openReportWindow()
 * @param {Object} params - { title, subtitle, restaurant, dateRange, generatedBy, kpis, sheets }
 */
export function exportReportAsPDF(win, params) {
  if (!win || win.closed) {
    throw new Error('Report window was closed before generation completed.');
  }
  const html = buildReportHTML(params);
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  win.location.href = url;

  const cleanup = () => URL.revokeObjectURL(url);
  const checkReady = setInterval(() => {
    try {
      if (win.closed) { clearInterval(checkReady); cleanup(); return; }
      if (win.document && win.document.readyState === 'complete') {
        clearInterval(checkReady);
        cleanup();
        try { win.print(); } catch { /* user closed */ }
      }
    } catch { clearInterval(checkReady); cleanup(); }
  }, 300);
  setTimeout(() => { clearInterval(checkReady); cleanup(); }, 30000);
}

/**
 * Build and trigger download of a multi-sheet Excel workbook.
 * Uses SpreadsheetML 2003 XML format (.xls extension) — no npm dependency.
 * @param {Object} params - same shape as exportReportAsPDF
 * @param {String} [filename] - optional; default derived from title + dates
 */
export function exportReportAsExcel(params, filename) {
  const xml = buildExcelXML(params);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel; charset=utf-8' });

  const safeTitle = (params.title || 'Report').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const fromDate = params.dateRange?.from || '';
  const toDate   = params.dateRange?.to   || '';
  const defaultName = `${safeTitle}${fromDate ? `_${fromDate}` : ''}${toDate ? `_${toDate}` : ''}.xls`;
  const finalName = filename || defaultName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
