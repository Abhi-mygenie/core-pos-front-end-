// CR-133-GAP: Bill Content tab — +employee dropdown (G3b), footer, QR, display, Windows options
import { useState, useEffect } from "react";
import { Store, Lock } from "lucide-react";
import { COLORS } from "../../../../constants";
import { TextInput, SectionTitle } from "../shared";
import { getEmployeeList } from "../../../../api/services/printerAgentConfigService";

const Toggle = ({ label, hint, checked, onChange, testId }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
    <div>
      <span className="text-sm block" style={{ color: COLORS.darkText }}>{label}</span>
      {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      data-testid={testId}
    >
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow" style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  </div>
);

export const BillContentTab = ({ config, update }) => {
  const [employees,   setEmployees]   = useState([]);
  const [empLoading,  setEmpLoading]  = useState(true);

  useEffect(() => {
    getEmployeeList()
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, []);

  return (
    <div data-testid="bill-content-tab">

      {/* Employee dropdown — G3b */}
      <SectionTitle title="Printer Agent Employee" />
      <div className="py-2" data-testid="employee-dropdown-section">
        <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>Employee</label>
        <p className="text-xs mb-2" style={{ color: COLORS.grayText }}>
          The employee identity used by the printer agent for API authentication
        </p>
        {empLoading ? (
          <div className="text-xs py-2" style={{ color: COLORS.grayText }}>Loading employees…</div>
        ) : (
          <select
            value={config.employeeId || ''}
            onChange={(e) => update({ employeeId: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="employee-dropdown"
          >
            <option value="">— Select employee —</option>
            {employees.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Read-only restaurant info banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg mb-4 mt-2" style={{ backgroundColor: "#F9FAFB", border: `1px solid ${COLORS.borderGray}` }} data-testid="restaurant-info-banner">
        <Store className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.grayText }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{config.restaurantInfo.name || "—"}</p>
          <p className="text-xs" style={{ color: COLORS.grayText }}>{config.restaurantInfo.phone || "—"} · Printed on bill header (managed in Restaurant Info)</p>
        </div>
      </div>

      <SectionTitle title="Bill Footer" />
      <TextInput label="Footer Text" value={config.footerText} onChange={(v) => update({ footerText: v })} placeholder="e.g. Thank you, visit again!" />

      <SectionTitle title="QR Codes on Bill" />
      <Toggle label="UPI Payment QR" hint="Show a UPI QR code on printed bills" checked={config.upiQrEnabled} onChange={(v) => update({ upiQrEnabled: v })} testId="upi-qr-toggle" />
      {config.upiQrEnabled && (
        <TextInput label="UPI ID" value={config.upiId} onChange={(v) => update({ upiId: v })} placeholder="yourname@upi" required />
      )}
      <Toggle label="Dynamic UPI QR" hint="QR pre-filled with the exact bill amount" checked={config.upiDynamicEnabled} onChange={(v) => update({ upiDynamicEnabled: v })} testId="upi-dynamic-toggle" />
      <Toggle label="Feedback QR" hint="Show a feedback / review QR code on bills" checked={config.feedbackQrEnabled} onChange={(v) => update({ feedbackQrEnabled: v })} testId="feedback-qr-toggle" />
      {config.feedbackQrEnabled && (
        <TextInput label="Feedback URL" value={config.feedbackQrUrl} onChange={(v) => update({ feedbackQrUrl: v })} placeholder="https://…" required />
      )}

      <SectionTitle title="Display Options" />
      <Toggle label="Show Item Date (80mm)" hint="Print the item date column on 80mm paper" checked={config.showItemDateOn80mm} onChange={(v) => update({ showItemDateOn80mm: v })} testId="show-item-date-toggle" />

      <SectionTitle title="Windows Printing" />
      <Toggle label="Use PDF Printing on Windows" hint="Render prints as PDF on the Windows agent" checked={config.usePdfOnWindows} onChange={(v) => update({ usePdfOnWindows: v })} testId="use-pdf-windows-toggle" />
      {config.usePdfOnWindows && (
        <Toggle label="PDF for Bills Only" hint="KOTs keep using direct (ESC/POS) printing" checked={config.usePdfForBillsOnly} onChange={(v) => update({ usePdfForBillsOnly: v })} testId="use-pdf-bills-only-toggle" />
      )}

      {/* Phase 2/3 — visible-disabled per OD-8 */}
      <SectionTitle title="Field Visibility" />
      <div className="p-3 rounded-lg opacity-60" style={{ backgroundColor: "#F9FAFB", border: `1px dashed ${COLORS.borderGray}` }} data-testid="field-visibility-coming-soon">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Coming soon</span>
        </div>
        <p className="text-xs" style={{ color: COLORS.grayText }}>
          Choose which fields appear on bills and KOTs (waiter name, customer phone, and more).
        </p>
      </div>
    </div>
  );
};
