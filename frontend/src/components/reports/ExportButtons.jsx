// ExportButtons - PDF and CSV export functionality
// Phase 4A: Order Reports - Step 8

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

/**
 * Format currency for export
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0';
  return parseFloat(amount).toFixed(2);
};

/**
 * Format date for export
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

/**
 * Generate CSV content from orders
 */
const generateCSV = (orders, tabId, selectedDate) => {
  // Define columns based on tab
  const columns = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'createdAt', label: 'Date/Time', format: formatDate },
    { key: 'customer', label: 'Customer' },
    { key: 'table', label: 'Table' },
    { key: 'waiter', label: 'Waiter' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'paymentType', label: 'Payment Type' },
    { key: 'amount', label: 'Amount', format: formatCurrency },
  ];

  // Add tab-specific columns
  if (tabId === 'cancelled') {
    columns.splice(6, 0, { key: 'cancellationReason', label: 'Cancel Reason' });
  }
  if (tabId === 'aggregator') {
    columns.splice(2, 0, { key: 'aggregatorPlatform', label: 'Platform' });
    columns.splice(7, 0, { key: 'riderName', label: 'Rider' });
  }

  // Generate header row
  const header = columns.map(col => `"${col.label}"`).join(',');

  // Generate data rows
  const rows = orders.map(order => {
    return columns.map(col => {
      let value = order[col.key];
      if (col.format) {
        value = col.format(value);
      }
      // Escape quotes and wrap in quotes
      value = String(value || '').replace(/"/g, '""');
      return `"${value}"`;
    }).join(',');
  });

  // Add summary row
  const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
  const summaryRow = `\n"Total","","","","","","","${formatCurrency(totalAmount)}"`;

  return header + '\n' + rows.join('\n') + summaryRow;
};

/**
 * Download CSV file
 */
const downloadCSV = (content, filename) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate and download PDF using print
 */
const generatePDF = (orders, tabId, tabLabel, selectedDate, summary) => {
  // Create a printable HTML document
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order Report - ${tabLabel} - ${selectedDate}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .summary-card { text-align: center; padding: 15px 30px; border: 1px solid #ddd; border-radius: 4px; }
        .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
        .summary-card .value { font-size: 24px; font-weight: bold; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5f5f5; padding: 10px 8px; text-align: left; border-bottom: 2px solid #333; font-weight: 600; text-transform: uppercase; font-size: 11px; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:hover { background: #fafafa; }
        .amount { text-align: right; font-family: monospace; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order Report - ${tabLabel}</h1>
        <p>Date: ${selectedDate} | Generated: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <div class="label">Total Orders</div>
          <div class="value">${summary.totalOrders}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Amount</div>
          <div class="value">₹${summary.totalAmount.toLocaleString('en-IN')}</div>
        </div>
        <div class="summary-card">
          <div class="label">Avg Order Value</div>
          <div class="value">₹${Math.round(summary.avgOrderValue).toLocaleString('en-IN')}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Time</th>
            <th>Customer</th>
            <th>Table</th>
            <th>Waiter</th>
            <th>Payment</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td style="font-family: monospace;">${order.orderId || order.id}</td>
              <td>${formatDate(order.createdAt)}</td>
              <td>${order.customer || 'Guest'}</td>
              <td>${order.table || '—'}</td>
              <td>${order.waiter || '—'}</td>
              <td>${order.paymentMethod || '—'}</td>
              <td class="amount">₹${formatCurrency(order.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>MyGenie Restaurant POS - Order Reports</p>
      </div>
      
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
};

/**
 * ExportButtons Component
 * 
 * @param {Array} orders - Orders to export
 * @param {string} tabId - Current tab id
 * @param {string} tabLabel - Current tab label
 * @param {string} selectedDate - Selected date
 * @param {object} summary - Summary data { totalOrders, totalAmount, avgOrderValue }
 * @param {boolean} disabled - Disable buttons when no data
 */
const ExportButtons = ({ orders = [], tabId, tabLabel, selectedDate, summary, disabled }) => {
  const [isExporting, setIsExporting] = useState(null); // 'pdf' | 'csv' | null

  const handleExportCSV = async () => {
    if (orders.length === 0) return;
    
    setIsExporting('csv');
    try {
      // Small delay for UX feedback
      await new Promise(r => setTimeout(r, 300));
      
      const csv = generateCSV(orders, tabId, selectedDate);
      const filename = `orders_${tabId}_${selectedDate}.csv`;
      downloadCSV(csv, filename);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (orders.length === 0) return;
    
    setIsExporting('pdf');
    try {
      await new Promise(r => setTimeout(r, 300));
      generatePDF(orders, tabId, tabLabel, selectedDate, summary);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const isDisabled = disabled || orders.length === 0;

  return (
    <div className="flex items-center gap-2" data-testid="export-buttons">
      {/* PDF Export */}
      <button
        onClick={handleExportPDF}
        disabled={isDisabled || isExporting === 'pdf'}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm rounded-sm border transition-colors
          ${isDisabled 
            ? 'border-zinc-200 text-zinc-400 cursor-not-allowed' 
            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
          }
        `}
        data-testid="export-pdf-button"
        title={isDisabled ? 'No data to export' : 'Export as PDF'}
      >
        {isExporting === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        PDF
      </button>

      {/* CSV Export */}
      <button
        onClick={handleExportCSV}
        disabled={isDisabled || isExporting === 'csv'}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm rounded-sm border transition-colors
          ${isDisabled 
            ? 'border-zinc-200 text-zinc-400 cursor-not-allowed' 
            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
          }
        `}
        data-testid="export-csv-button"
        title={isDisabled ? 'No data to export' : 'Export as CSV'}
      >
        {isExporting === 'csv' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        CSV
      </button>
    </div>
  );
};

export default ExportButtons;
