// CR-133: Printers tab — defaults strip, printer cards, add/edit wizard, delete confirm
import { useState } from "react";
import { ArrowLeft, Printer, Plus, Pencil, Trash2, AlertTriangle, X, Wifi } from "lucide-react";
import { COLORS } from "../../../../constants";
import { useToast } from "../../../../hooks/use-toast";
import { SelectInput, TextInput, ToggleSwitch, BoolBadge } from "../shared";
import { newPrinter } from "../../../../api/transforms/printerAgentConfigTransform";

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

const isUsb = (t) => t === "USB Printer";
const isLan = (t) => t === "LAN Printer";
const isBle = (t) => t?.includes("Bluetooth");

const validatePrinter = (p) => {
  const errors = [];
  if (!p.label.trim()) errors.push("Printer name is required.");
  if (isUsb(p.type) && !p.usbPrinterName.trim()) errors.push("USB printer name is required.");
  if (isLan(p.type)) {
    if (!IPV4_RE.test(p.lanIpAddress)) errors.push("A valid IPv4 address is required for LAN printers.");
    if (!/^\d+$/.test(p.lanPort) || +p.lanPort < 1 || +p.lanPort > 65535) errors.push("A valid port (1-65535) is required.");
  }
  if (isBle(p.type) && !MAC_RE.test(p.bluetoothMacAddress)) errors.push("A valid MAC address (e.g. AA:BB:CC:DD:EE:FF) is required.");
  return errors;
};

// ─── Printer Wizard (3 steps: connection → identity/hardware → routing) ─────
const PrinterWizard = ({ printer, isNew, options, onCancel, onDone }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(printer);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stationInput, setStationInput] = useState("");

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const addStation = () => {
    const s = stationInput.trim();
    if (s && !form.handledStations.includes(s)) set("handledStations", [...form.handledStations, s]);
    setStationInput("");
  };

  const next = () => {
    if (step === 2) {
      const errors = validatePrinter(form);
      if (errors.length) {
        toast({ title: "Check printer details", description: errors[0], variant: "destructive" });
        return;
      }
    }
    setStep(step + 1);
  };

  const finish = () => {
    const errors = validatePrinter(form);
    if (errors.length) {
      toast({ title: "Check printer details", description: errors[0], variant: "destructive" });
      return;
    }
    onDone(form);
  };

  return (
    <div data-testid="printer-wizard">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100" data-testid="printer-wizard-close-btn">
          <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          {isNew ? "Add Printer" : "Edit Printer"}
        </h3>
        <span className="ml-auto text-xs" style={{ color: COLORS.grayText }}>Step {step} of 3</span>
      </div>

      {step === 1 && (
        <div data-testid="printer-wizard-step-1">
          <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>How is this printer connected?</p>
          {options.printerTypes.map((t) => (
            <button
              key={t}
              onClick={() => set("type", t)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border mb-2 text-left"
              style={{
                borderColor: form.type === t ? COLORS.primaryOrange : COLORS.borderGray,
                backgroundColor: form.type === t ? "rgba(242,107,51,0.05)" : "transparent",
              }}
              data-testid={`printer-type-option-${t.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              {isLan(t) ? <Wifi className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <Printer className="w-4 h-4" style={{ color: COLORS.grayText }} />}
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{t}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div data-testid="printer-wizard-step-2">
          <TextInput label="Printer Name" value={form.label} onChange={(v) => set("label", v)} required placeholder="e.g. Kitchen Printer" />
          {isUsb(form.type) && (
            <>
              <TextInput label="USB Printer Name" value={form.usbPrinterName} onChange={(v) => set("usbPrinterName", v)} required placeholder="As shown in system devices" />
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium py-1"
                style={{ color: COLORS.primaryOrange }}
                data-testid="printer-advanced-toggle"
              >
                {showAdvanced ? "Hide advanced" : "Show advanced (Vendor / Product ID)"}
              </button>
              {showAdvanced && (
                <>
                  <TextInput label="Vendor ID" value={form.vendorId} onChange={(v) => set("vendorId", v)} placeholder="Optional" />
                  <TextInput label="Product ID" value={form.productId} onChange={(v) => set("productId", v)} placeholder="Optional" />
                </>
              )}
            </>
          )}
          {isLan(form.type) && (
            <>
              <TextInput label="IP Address" value={form.lanIpAddress} onChange={(v) => set("lanIpAddress", v)} required placeholder="e.g. 192.168.1.50" />
              <TextInput label="Port" value={form.lanPort} onChange={(v) => set("lanPort", v)} required placeholder="9100" />
            </>
          )}
          {isBle(form.type) && (
            <TextInput label="Bluetooth MAC Address" value={form.bluetoothMacAddress} onChange={(v) => set("bluetoothMacAddress", v)} required placeholder="AA:BB:CC:DD:EE:FF" />
          )}
          <SelectInput
            label="Paper Size"
            value={form.paperSize}
            onChange={(v) => set("paperSize", v)}
            options={options.paperSizes.map((o) => ({ value: o, label: o }))}
          />
        </div>
      )}

      {step === 3 && (
        <div data-testid="printer-wizard-step-3">
          <label className="block text-xs font-medium mb-1 mt-2" style={{ color: COLORS.grayText }}>Kitchen Stations (KOT routing)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={stationInput}
              onChange={(e) => setStationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStation()}
              placeholder="e.g. KDS, Bar — press Enter"
              className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="printer-station-input"
            />
            <button onClick={addStation} className="px-3 py-2 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: COLORS.primaryOrange }} data-testid="printer-station-add-btn">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {form.handledStations.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(242,107,51,0.1)", color: COLORS.primaryOrange }} data-testid={`printer-station-chip-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                {s}
                <button onClick={() => set("handledStations", form.handledStations.filter((x) => x !== s))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {form.handledStations.length === 0 && <span className="text-xs" style={{ color: COLORS.grayText }}>No stations assigned yet.</span>}
          </div>
          <ToggleSwitch label="Prints Bills (customer receipts)" checked={form.handlesBill} onChange={(v) => set("handlesBill", v)} />
          {!form.handlesBill && form.handledStations.length === 0 && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#D97706" }} data-testid="printer-orphan-warning">
              <AlertTriangle className="w-3 h-3" /> This printer has no stations and doesn't print bills — it won't be used.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between gap-3 mt-6">
        <button
          onClick={() => (step === 1 ? onCancel() : setStep(step - 1))}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="printer-wizard-back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {step === 1 ? "Cancel" : "Back"}
        </button>
        <button
          onClick={step === 3 ? finish : next}
          className="px-5 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: step === 3 ? COLORS.primaryGreen : COLORS.primaryOrange }}
          data-testid="printer-wizard-next-btn"
        >
          {step === 3 ? (isNew ? "Add Printer" : "Update Printer") : "Next"}
        </button>
      </div>
    </div>
  );
};

// ─── Tab ─────────────────────────────────────────────────────────────────────
export const PrintersTab = ({ config, update }) => {
  const [wizard, setWizard] = useState(null); // { printer, isNew }
  const [deletingId, setDeletingId] = useState(null);
  const { printers, options } = config;
  const hasBillPrinter = printers.some((p) => p.handlesBill);

  const connectionSummary = (p) => {
    if (isLan(p.type)) return `${p.lanIpAddress || "?"}:${p.lanPort}`;
    if (isBle(p.type)) return p.bluetoothMacAddress || "Not paired";
    return p.usbPrinterName || "Not set";
  };

  const handleWizardDone = (form) => {
    if (wizard.isNew) {
      update({ printers: [...printers, form] });
    } else {
      update({ printers: printers.map((p) => (p.id === form.id ? form : p)) });
    }
    setWizard(null);
  };

  const confirmDelete = (id) => {
    update({ printers: printers.filter((p) => p.id !== id) });
    setDeletingId(null);
  };

  if (wizard) {
    return <PrinterWizard printer={wizard.printer} isNew={wizard.isNew} options={options} onCancel={() => setWizard(null)} onDone={handleWizardDone} />;
  }

  return (
    <div data-testid="printers-tab">
      {/* Global defaults */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SelectInput label="Default Paper Size" value={config.paperSize} onChange={(v) => update({ paperSize: v })} options={options.paperSizes.map((o) => ({ value: o, label: o }))} />
        <SelectInput label="Default Printer Type" value={config.printerType} onChange={(v) => update({ printerType: v })} options={options.printerTypes.map((o) => ({ value: o, label: o }))} />
      </div>

      {!hasBillPrinter && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)" }} data-testid="no-bill-printer-banner">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#D97706" }} />
          <span className="text-xs" style={{ color: "#92400E" }}>No printer is set to print bills. Customer receipts will not print.</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>Printers ({printers.length})</h3>
        <button
          onClick={() => setWizard({ printer: newPrinter({ paperSize: config.paperSize }), isNew: true })}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="printer-add-btn"
        >
          <Plus className="w-3.5 h-3.5" /> Add Printer
        </button>
      </div>

      {printers.length === 0 && <p className="text-sm py-8 text-center" style={{ color: COLORS.grayText }}>No printers configured. Add one to start printing.</p>}

      {printers.map((p) => (
        <div key={p.id} className="p-3 rounded-lg mb-2 border" style={{ borderColor: COLORS.borderGray }} data-testid={`printer-card-${p.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Printer className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{p.label}</span>
                {p.handlesBill && <BoolBadge value trueLabel="Bills" />}
              </div>
              <div className="text-xs" style={{ color: COLORS.grayText }}>
                {p.type} · {connectionSummary(p)} · {p.paperSize}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {p.handledStations.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F3F4F6", color: COLORS.grayText }}>{s}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: COLORS.grayText }} data-testid={`printer-status-${p.id}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#D1D5DB" }} /> Status — Coming soon
                </span>
                <button disabled className="text-[10px] px-2 py-0.5 rounded border opacity-50 cursor-not-allowed" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }} data-testid={`printer-test-print-${p.id}`}>
                  Test Print — Coming soon
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setWizard({ printer: { ...p, handledStations: [...p.handledStations] }, isNew: false })} className="p-1.5 rounded hover:bg-gray-100" data-testid={`printer-edit-${p.id}`}>
                <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
              </button>
              <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded hover:bg-red-50" data-testid={`printer-delete-${p.id}`}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
              </button>
            </div>
          </div>

          {deletingId === p.id && (
            <div className="mt-2 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }} data-testid={`printer-delete-confirm-${p.id}`}>
              <p className="text-xs mb-2" style={{ color: "#EF4444" }}>
                {p.handlesBill
                  ? "This is your bill printer. Deleting it means customer receipts will stop printing. Delete anyway?"
                  : "Delete this printer?"}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeletingId(null)} className="text-xs px-3 py-1 rounded border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>No</button>
                <button onClick={() => confirmDelete(p.id)} className="text-xs px-3 py-1 rounded text-white" style={{ backgroundColor: "#EF4444" }} data-testid={`printer-confirm-delete-${p.id}`}>Yes, Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
