// CR-133: Auto Print tab — copies, in-house toggles (incl. Auto Settle)
// CR-133 amendment: Aggregator Orders section removed — moved to CR-135 AggregatorSetup OperationalTab
import { COLORS } from "../../../../constants";
import { NumberInput, SelectInput, SectionTitle } from "../shared";

// Local toggle wrapper so the data-testid matches the plan's naming exactly
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

export const AutoPrintTab = ({ config, update }) => (
  <div data-testid="autoprint-tab">
    <SectionTitle title="Print Copies" />
    <div className="grid grid-cols-2 gap-3">
      <NumberInput label="Bill Copies" value={config.billCopyCount} onChange={(v) => update({ billCopyCount: Math.max(1, Math.round(v)) })} min={1} max={5} step={1} />
      <NumberInput label="KOT Copies" value={config.kotCopyCount} onChange={(v) => update({ kotCopyCount: Math.max(1, Math.round(v)) })} min={1} max={5} step={1} />
    </div>

    <SectionTitle title="In-House Orders" />
    <Toggle label="Auto-print Bill" hint="Print the bill automatically when generated" checked={config.autoPrintBill} onChange={(v) => update({ autoPrintBill: v })} testId="auto-print-bill-toggle" />
    <Toggle label="Auto-print KOT" hint="Print kitchen tickets automatically on order placement" checked={config.autoPrintKot} onChange={(v) => update({ autoPrintKot: v })} testId="auto-print-kot-toggle" />
    <Toggle label="Auto Settle" hint="Settle the order automatically after bill print" checked={config.autoSettle} onChange={(v) => update({ autoSettle: v })} testId="auto-settle-toggle" />
    <Toggle label="Scan Order Auto-print" hint="Auto-print orders placed via QR scan" checked={config.scanOrderAutoPrint} onChange={(v) => update({ scanOrderAutoPrint: v })} testId="scan-order-auto-print-toggle" />

  </div>
);
