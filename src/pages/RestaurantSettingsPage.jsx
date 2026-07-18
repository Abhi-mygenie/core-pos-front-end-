import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Home, CreditCard, Percent,
  Settings, Package, User, Loader2, Upload, FileText, X,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { COLORS } from "../constants";
import { getSettings, updateSettings } from "../api/services/restaurantSettingsService";
import { useToast } from "../hooks/use-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Step Metadata
// ═══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { id: 1, title: "Restaurant Identity", desc: "Name, address, GST, FSSAI", icon: Home, required: true },
  { id: 2, title: "Channels & Payments", desc: "Dine-in, delivery, UPI, card", icon: CreditCard, required: true },
  { id: 3, title: "Charges & Tips", desc: "Service charge, discounts, rounding", icon: Percent, required: false },
  { id: 4, title: "Order & Kitchen", desc: "KOT, KDS, order preferences", icon: Settings, required: false },
  { id: 5, title: "Inventory & Extras", desc: "Stock, billing, feedback", icon: Package, required: false },
  { id: 6, title: "Owner Info", desc: "Vendor name & contact", icon: User, required: true },
];

const INITIAL_FORM = {
  step1: { name: '', phone: '', address: '', fssai: '', shortCode: false, logoUrl: null, pdfMenuUrl: null, gstEnabled: false, gstCode: '', gstMode: 'category', gstTax: 0, tax: 0, vatEnabled: false, vatCode: '' },
  step2: { dineIn: true, takeAway: true, delivery: false, room: false, payCash: true, payUpi: true, payCc: true, payTab: false, onlinePayment: false, upiId: '', dynamicUpiValue: true, orderPaymentType: 'both', showCashOnDelivery: true, walkinOnlinePayment: false, dineinOnlinePayment: false, takeawayOnlinePayment: false, deliveryOnlinePayment: false },
  step3: { serviceCharge: false, autoServiceCharge: false, serviceChargePercentage: 0, serviceChargeTax: 0, tip: true, availableDiscount: true, totalRound: true },
  step4: { defOrdStatus: 2, listServeItem: 'Dynamic', printKot: true, billingAutoBillPrint: false, canclePostServe: true, voiceInKds: true, realTimeOrderStatus: true, showPopularCategory: true, foodLevelNotes: true, showFoodVarriance: false, orderConfirmForWeb: true, showAcNonMenu: false, foodDate: false, searchBy: [] },
  step5: { inventory: false, inventoryNegative: false, inventoryAlertNumber: '', inventoryManagerName: '', phoneNumberOnBill: '', reportNumber: '', deliveryContactNo: '', deliveryPersonName: '', settelmentReport: true, feedBack: false, sendFeedbackLink: 'internal', feedbackUrl: '', onlineOrderingLink: '' },
  step6: { firstName: '', lastName: '', phone: '' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Shared UI Primitives
// ═══════════════════════════════════════════════════════════════════════════════
const TextInput = ({ label, required, value, onChange, placeholder, type = "text", hint, testId }) => (
  <div className="flex flex-col gap-1.5" data-testid={testId}>
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      className="h-[42px] border rounded-lg px-3.5 text-sm outline-none transition-colors focus:shadow-[0_0_0_3px_rgba(242,107,51,0.08)]"
      style={{ borderColor: value ? 'rgba(50,153,55,0.3)' : COLORS.borderGray, background: value ? 'rgba(50,153,55,0.04)' : '#fff', color: COLORS.darkText }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
    {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
  </div>
);

const TextArea = ({ label, required, value, onChange, placeholder, testId }) => (
  <div className="flex flex-col gap-1.5" data-testid={testId}>
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <textarea
      className="h-20 border rounded-lg px-3.5 py-3 text-sm outline-none resize-y transition-colors focus:shadow-[0_0_0_3px_rgba(242,107,51,0.08)]"
      style={{ borderColor: value ? 'rgba(50,153,55,0.3)' : COLORS.borderGray, background: value ? 'rgba(50,153,55,0.04)' : '#fff', color: COLORS.darkText }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const NumberInput = ({ label, value, onChange, placeholder, suffix, min, max, step = 1 }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>{label}</label>
    <div className="relative">
      <input
        type="number"
        className="h-[42px] w-full border rounded-lg px-3.5 text-sm outline-none transition-colors focus:shadow-[0_0_0_3px_rgba(242,107,51,0.08)]"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? '' : (parseFloat(v) || 0));
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>{suffix}</span>}
    </div>
  </div>
);

const SelectInput = ({ label, value, onChange, options, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>{label}</label>
    <select
      className="h-[42px] border rounded-lg px-3.5 text-sm outline-none appearance-auto"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
  </div>
);

const Toggle = ({ label, hint, checked, onChange, testId }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#f0f0f0' }} data-testid={testId}>
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{label}</span>
      {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
    </div>
    <button
      type="button"
      className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
      style={{ background: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      onClick={() => onChange(!checked)}
    >
      <span className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] shadow-sm transition-transform" style={{ left: 3, transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  </div>
);

const SectionCard = ({ title, desc, children }) => (
  <div className="bg-white border rounded-xl p-7 mb-5" style={{ borderColor: COLORS.borderGray }}>
    {title && <h3 className="text-[15px] font-semibold mb-1" style={{ color: COLORS.darkText }}>{title}</h3>}
    {desc && <p className="text-xs mb-5" style={{ color: COLORS.grayText }}>{desc}</p>}
    {children}
  </div>
);

const StepBanner = ({ required }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-6 text-xs font-medium" style={required
    ? { background: 'rgba(242,107,51,0.06)', border: '1px solid rgba(242,107,51,0.15)', color: COLORS.primaryOrange }
    : { background: 'rgba(50,153,55,0.06)', border: '1px solid rgba(50,153,55,0.15)', color: COLORS.primaryGreen }
  }>
    {required ? <AlertCircle size={14} /> : <Check size={14} />}
    {required ? <>Fields marked with <span className="text-red-500 mx-1">*</span> are required to proceed</> : 'All fields on this step are optional — defaults apply if skipped'}
  </div>
);

const FileUpload = ({ label, icon: Icon, accept, file, existingUrl, onSelect, onClear }) => (
  <div>
    <label className="text-sm font-medium block mb-2" style={{ color: COLORS.darkText }}>{label}</label>
    {file || existingUrl ? (
      <div className="flex items-center gap-3 px-4 py-3 border rounded-xl" style={{ borderColor: 'rgba(50,153,55,0.3)', background: 'rgba(50,153,55,0.04)' }}>
        <Icon size={20} style={{ color: COLORS.primaryGreen }} />
        <span className="text-sm flex-1 truncate" style={{ color: COLORS.darkText }}>{file ? file.name : 'Current file'}</span>
        <button onClick={onClear} className="p-1 rounded-md hover:bg-gray-100"><X size={14} style={{ color: COLORS.grayText }} /></button>
      </div>
    ) : (
      <label className="flex flex-col items-center gap-1.5 w-[120px] h-[100px] border-2 border-dashed rounded-xl cursor-pointer transition-colors hover:border-orange-400 hover:bg-orange-50/30" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
        <Upload size={22} className="mt-5" />
        <span className="text-xs">Upload</span>
        <input type="file" className="hidden" accept={accept} onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
      </label>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Channel & Payment Selection Components
// ═══════════════════════════════════════════════════════════════════════════════
const CHANNELS = [
  { key: 'dineIn', label: 'Dine-In', desc: 'Table service', emoji: '\uD83C\uDF7D\uFE0F', bg: 'rgba(242,107,51,0.08)' },
  { key: 'takeAway', label: 'Takeaway', desc: 'Counter pickup', emoji: '\uD83E\uDD61', bg: 'rgba(139,92,246,0.08)' },
  { key: 'delivery', label: 'Delivery', desc: 'Home delivery', emoji: '\uD83D\uDE97', bg: 'rgba(59,130,246,0.08)' },
  { key: 'room', label: 'Room Service', desc: 'Hotels only', emoji: '\uD83C\uDFE8', bg: 'rgba(244,161,26,0.08)' },
];

const ChannelCard = ({ ch, selected, onToggle }) => (
  <button
    type="button"
    data-testid={`channel-${ch.key}`}
    onClick={onToggle}
    className="border-2 rounded-xl p-5 text-center transition-all hover:shadow-sm"
    style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? 'rgba(50,153,55,0.05)' : '#fff' }}
  >
    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2.5 text-xl" style={{ background: ch.bg }}>{ch.emoji}</div>
    <div className="text-sm font-semibold" style={{ color: selected ? COLORS.primaryGreen : COLORS.darkText }}>{ch.label}</div>
    <div className="text-xs mt-1" style={{ color: COLORS.grayText }}>{ch.desc}</div>
  </button>
);

const PAYMENTS = [
  { key: 'payCash', label: 'Cash', icon: '\uD83D\uDCB5' },
  { key: 'payUpi', label: 'UPI', icon: '\uD83D\uDCF1' },
  { key: 'payCc', label: 'Card', icon: '\uD83D\uDCB3' },
  { key: 'payTab', label: 'Tab / Credit', icon: '\uD83D\uDCDD' },
  { key: 'onlinePayment', label: 'Online', icon: '\uD83C\uDF10' },
];

const PayChip = ({ pm, selected, onToggle }) => (
  <button
    type="button"
    data-testid={`pay-${pm.key}`}
    onClick={onToggle}
    className="flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg transition-all text-sm font-medium"
    style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? 'rgba(50,153,55,0.05)' : '#fff', color: selected ? COLORS.primaryGreen : COLORS.darkText }}
  >
    <span className="w-5 h-5 rounded border-2 flex items-center justify-center text-xs" style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? COLORS.primaryGreen : 'transparent', color: selected ? '#fff' : 'transparent' }}>
      {selected && <Check size={12} />}
    </span>
    {pm.icon} {pm.label}
  </button>
);

const SEARCH_OPTIONS = ['order id', 'table no', 'phone no', 'user id'];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Wizard Page
// ═══════════════════════════════════════════════════════════════════════════════
const RestaurantSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setFormState(data);
      } catch (err) {
        toast({ title: "Failed to load settings", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update a step's form data
  const updateStep = useCallback((stepKey, field, value) => {
    setFormState((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], [field]: value } }));
    setErrors((prev) => { const n = { ...prev }; delete n[`${stepKey}.${field}`]; return n; });
  }, []);

  // Validate current step
  const validateStep = (step) => {
    const stepKey = `step${step}`;
    const errs = {};
    if (step === 1) {
      const s = formState.step1;
      if (!s.name.trim()) errs[`${stepKey}.name`] = 'Restaurant name is required';
      if (!s.phone.trim()) errs[`${stepKey}.phone`] = 'Phone is required';
      if (!s.address.trim()) errs[`${stepKey}.address`] = 'Address is required';
      if (s.gstEnabled && !s.gstCode.trim()) errs[`${stepKey}.gstCode`] = 'GST number is required when GST is enabled';
      if (s.vatEnabled && !s.vatCode.trim()) errs[`${stepKey}.vatCode`] = 'VAT code is required when VAT is enabled';
    } else if (step === 2) {
      const s = formState.step2;
      if (![s.dineIn, s.takeAway, s.delivery, s.room].some(Boolean)) errs[`${stepKey}.channels`] = 'Select at least one service channel';
      if (![s.payCash, s.payUpi, s.payCc, s.payTab, s.onlinePayment].some(Boolean)) errs[`${stepKey}.payments`] = 'Select at least one payment method';
    } else if (step === 6) {
      const s = formState.step6;
      if (!s.firstName.trim()) errs[`${stepKey}.firstName`] = 'First name is required';
      if (!s.lastName.trim()) errs[`${stepKey}.lastName`] = 'Last name is required';
      if (!s.phone.trim()) errs[`${stepKey}.phone`] = 'Phone is required';
    }
    // Merge into existing errors (only replace this step's errors)
    setErrors((prev) => {
      const cleaned = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${stepKey}.`)));
      return { ...cleaned, ...errs };
    });
    return Object.keys(errs).length === 0;
  };

  // Save current step
  const saveStep = async () => {
    setIsSaving(true);
    try {
      // Only send file uploads when saving Step 1 (where they are selected)
      const sendLogo = currentStep === 1 ? logoFile : null;
      const sendPdf = currentStep === 1 ? pdfFile : null;
      await updateSettings(formState, sendLogo, sendPdf);
      return true;
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Next step
  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 6) {
      const ok = await saveStep();
      if (ok) {
        toast({ title: "Restaurant setup complete!", description: "Your settings have been saved." });
        navigate('/dashboard');
      }
      return;
    }
    const ok = await saveStep();
    if (ok) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Skip optional step
  const handleSkip = () => {
    if (currentStep >= STEPS.length) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => prev + 1);
  };

  // Previous step
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  // Click step in rail — only allow if all prior required steps are done
  const goToStep = (step) => {
    if (step === 1) { setCurrentStep(1); return; }
    if (step <= currentStep) { setCurrentStep(step); return; }
    // For forward jumps: check that every required step before `step` is completed
    const allPriorRequiredDone = STEPS
      .filter(s => s.id < step && s.required)
      .every(s => completedSteps.has(s.id));
    if (allPriorRequiredDone && (completedSteps.has(step - 1) || completedSteps.has(step))) {
      setCurrentStep(step);
    }
  };

  const stepMeta = STEPS[currentStep - 1];
  const isOptional = !stepMeta.required;
  const s1 = formState.step1, s2 = formState.step2, s3 = formState.step3;
  const s4 = formState.step4, s5 = formState.step5, s6 = formState.step6;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#F7F7F7' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryOrange }} />
          <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>Loading restaurant settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F7F7F7' }} data-testid="restaurant-settings-wizard">
      {/* ── Left Rail ─────────────────────────── */}
      <div className="w-[280px] bg-white flex flex-col flex-shrink-0 border-r" style={{ borderColor: COLORS.borderGray }}>
        <div className="px-6 pt-8 pb-2">
          <img src="https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" alt="MyGenie" className="h-9 mb-5" />
          <h1 className="text-lg font-bold mb-1" style={{ color: COLORS.darkText }}>Restaurant Setup</h1>
          <p className="text-xs leading-relaxed mb-8" style={{ color: COLORS.grayText }}>Complete these steps to get your restaurant up and running</p>
        </div>
        <ul className="flex-1 px-6">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.has(step.id) && step.id !== currentStep;
            const isActive = step.id === currentStep;
            const isUpcoming = !isCompleted && !isActive;
            return (
              <li key={step.id} className="flex gap-3.5 pb-6 relative cursor-pointer" onClick={() => goToStep(step.id)} data-testid={`step-nav-${step.id}`}>
                {step.id < 6 && (
                  <div className="absolute left-[15px] top-[36px] bottom-0 w-0.5" style={{ background: isCompleted ? COLORS.primaryGreen : COLORS.borderGray }} />
                )}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all"
                  style={{
                    background: isCompleted ? COLORS.primaryGreen : isActive ? COLORS.primaryOrange : '#F7F7F7',
                    color: (isCompleted || isActive) ? '#fff' : '#bbb',
                    border: isActive ? 'none' : isCompleted ? 'none' : `2px solid ${COLORS.borderGray}`,
                    boxShadow: isActive ? '0 0 0 4px rgba(242,107,51,0.15)' : 'none',
                  }}
                >
                  {isCompleted ? <Check size={14} /> : step.id}
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold" style={{ color: isUpcoming ? '#bbb' : COLORS.darkText }}>{step.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: isUpcoming ? '#ccc' : COLORS.grayText }}>{step.desc}</div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1" style={step.required
                    ? { background: 'rgba(242,107,51,0.1)', color: COLORS.primaryOrange }
                    : { background: '#F7F7F7', color: '#bbb' }
                  }>{step.required ? 'Required' : 'Optional'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Main Content ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b px-10 py-5 flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>Step {currentStep}: {stepMeta.title}</h2>
            <p className="text-sm mt-0.5" style={{ color: COLORS.grayText }}>{stepMeta.desc}</p>
          </div>
          <span className="text-sm" style={{ color: COLORS.grayText }}>
            <strong style={{ color: COLORS.primaryGreen }}>{completedSteps.size}</strong> / {STEPS.length} completed
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 pb-32">

          {/* ═══ STEP 1 ═══ */}
          {currentStep === 1 && (
            <div data-testid="step-1-content">
              <StepBanner required />
              <SectionCard title="Basic Information" desc="Your restaurant's core identity">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Restaurant Name" required value={s1.name} onChange={(v) => updateStep('step1', 'name', v)} placeholder="e.g. The Great Kitchen" testId="input-name" />
                  <TextInput label="Phone Number" required value={s1.phone} onChange={(v) => updateStep('step1', 'phone', v)} placeholder="10-digit number" type="tel" testId="input-phone" />
                  <div className="col-span-2">
                    <TextArea label="Address" required value={s1.address} onChange={(v) => updateStep('step1', 'address', v)} placeholder="Full restaurant address" testId="input-address" />
                  </div>
                  <TextInput label="FSSAI License No." value={s1.fssai} onChange={(v) => updateStep('step1', 'fssai', v)} placeholder="14-digit FSSAI" hint="Printed on bills. Can add later." testId="input-fssai" />
                </div>
                <Toggle label="Short Code" hint="Enable short code on bills" checked={s1.shortCode} onChange={(v) => updateStep('step1', 'shortCode', v)} testId="toggle-shortcode" />
                <div className="flex gap-6 mt-5">
                  <FileUpload label="Restaurant Logo" icon={Upload} accept="image/*" file={logoFile} existingUrl={s1.logoUrl} onSelect={setLogoFile} onClear={() => { setLogoFile(null); updateStep('step1', 'logoUrl', null); }} />
                  <FileUpload label="PDF Menu" icon={FileText} accept=".pdf" file={pdfFile} existingUrl={s1.pdfMenuUrl} onSelect={setPdfFile} onClear={() => { setPdfFile(null); updateStep('step1', 'pdfMenuUrl', null); }} />
                </div>
              </SectionCard>
              <SectionCard title="Tax Configuration" desc="GST/VAT affects every bill your restaurant generates">
                <Toggle label="GST Enabled" hint="Most Indian restaurants need this ON" checked={s1.gstEnabled} onChange={(v) => updateStep('step1', 'gstEnabled', v)} testId="toggle-gst" />
                {s1.gstEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <TextInput label="GST Number" required value={s1.gstCode} onChange={(v) => updateStep('step1', 'gstCode', v)} placeholder="15-digit GSTIN" testId="input-gst-code" />
                    <SelectInput label="GST Mode" value={s1.gstMode} onChange={(v) => updateStep('step1', 'gstMode', v)} options={[{ value: 'category', label: 'Item Level' }, { value: 'flat', label: 'Restaurant Level' }]} hint={s1.gstMode === 'category' ? 'Each item/category can have its own GST rate' : 'One GST rate applies to all items restaurant-wide'} />
                    <NumberInput label="Tax %" value={s1.tax} onChange={(v) => updateStep('step1', 'tax', v)} suffix="%" min={0} max={100} />
                  </div>
                )}
                <Toggle label="VAT Enabled" hint="For restaurants using VAT instead of GST" checked={s1.vatEnabled} onChange={(v) => updateStep('step1', 'vatEnabled', v)} testId="toggle-vat" />
                {s1.vatEnabled && (
                  <div className="mt-4">
                    <TextInput label="VAT Code" required value={s1.vatCode} onChange={(v) => updateStep('step1', 'vatCode', v)} placeholder="VAT registration number" testId="input-vat-code" />
                  </div>
                )}
              </SectionCard>
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4" data-testid="validation-errors">
                  {Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2 ═══ */}
          {currentStep === 2 && (
            <div data-testid="step-2-content">
              <StepBanner required />
              <SectionCard title="Service Channels" desc="How do your customers order? Select all that apply.">
                <div className="grid grid-cols-4 gap-3">
                  {CHANNELS.map((ch) => <ChannelCard key={ch.key} ch={ch} selected={s2[ch.key]} onToggle={() => updateStep('step2', ch.key, !s2[ch.key])} />)}
                </div>
                {errors.channels && <p className="text-sm text-red-500 mt-3">{errors.channels}</p>}
              </SectionCard>
              <SectionCard title="Payment Methods" desc="How can customers pay? Select all accepted methods.">
                <div className="flex flex-wrap gap-2.5">
                  {PAYMENTS.map((pm) => <PayChip key={pm.key} pm={pm} selected={s2[pm.key]} onToggle={() => updateStep('step2', pm.key, !s2[pm.key])} />)}
                </div>
                {errors.payments && <p className="text-sm text-red-500 mt-3">{errors.payments}</p>}
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <TextInput label="UPI ID" value={s2.upiId} onChange={(v) => updateStep('step2', 'upiId', v)} placeholder="yourstore@upi" hint="Required if UPI is enabled" testId="input-upi-id" />
                </div>
                <Toggle label="Dynamic UPI Value" hint="Auto-generate UPI amount per order" checked={s2.dynamicUpiValue} onChange={(v) => updateStep('step2', 'dynamicUpiValue', v)} />
                <Toggle label="Show Cash on Delivery" hint="Visible on delivery orders" checked={s2.showCashOnDelivery} onChange={(v) => updateStep('step2', 'showCashOnDelivery', v)} />
              </SectionCard>
              <SectionCard title="Online Payment per Channel" desc="Enable online payment for specific service channels">
                <Toggle label="Walk-in Online Payment" checked={s2.walkinOnlinePayment} onChange={(v) => updateStep('step2', 'walkinOnlinePayment', v)} />
                <Toggle label="Dine-in Online Payment" checked={s2.dineinOnlinePayment} onChange={(v) => updateStep('step2', 'dineinOnlinePayment', v)} />
                <Toggle label="Takeaway Online Payment" checked={s2.takeawayOnlinePayment} onChange={(v) => updateStep('step2', 'takeawayOnlinePayment', v)} />
                <Toggle label="Delivery Online Payment" checked={s2.deliveryOnlinePayment} onChange={(v) => updateStep('step2', 'deliveryOnlinePayment', v)} />
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 3 ═══ */}
          {currentStep === 3 && (
            <div data-testid="step-3-content">
              <StepBanner />
              <SectionCard title="Service Charge" desc="Automatically add service charge to orders">
                <Toggle label="Service Charge" hint="Add service charge to customer bills" checked={s3.serviceCharge} onChange={(v) => updateStep('step3', 'serviceCharge', v)} />
                <Toggle label="Auto Service Charge" hint="Automatically apply to all orders" checked={s3.autoServiceCharge} onChange={(v) => updateStep('step3', 'autoServiceCharge', v)} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <NumberInput label="Service Charge %" value={s3.serviceChargePercentage} onChange={(v) => updateStep('step3', 'serviceChargePercentage', v)} suffix="%" min={0} max={100} step={0.1} />
                  <NumberInput label="Service Charge Tax %" value={s3.serviceChargeTax} onChange={(v) => updateStep('step3', 'serviceChargeTax', v)} suffix="%" min={0} max={100} step={0.1} />
                </div>
              </SectionCard>
              <SectionCard title="Tips & Discounts">
                <Toggle label="Enable Tips" hint="Allow tip collection on bills" checked={s3.tip} onChange={(v) => updateStep('step3', 'tip', v)} />
                <Toggle label="Discounts Available" hint="Allow applying discounts to orders" checked={s3.availableDiscount} onChange={(v) => updateStep('step3', 'availableDiscount', v)} />
                <Toggle label="Total Rounding" hint="Round grand total to nearest rupee" checked={s3.totalRound} onChange={(v) => updateStep('step3', 'totalRound', v)} />
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 4 ═══ */}
          {currentStep === 4 && (
            <div data-testid="step-4-content">
              <StepBanner />
              <SectionCard title="Order Workflow" desc="Control how orders move through your kitchen">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <SelectInput label="Default Order Status" value={s4.defOrdStatus} onChange={(v) => updateStep('step4', 'defOrdStatus', parseInt(v))} options={[{ value: 1, label: '1 — Placed' }, { value: 2, label: '2 — Confirmed' }, { value: 3, label: '3 — Preparing' }, { value: 4, label: '4 — Ready' }, { value: 5, label: '5 — Served' }]} hint="New orders start at this status" />
                  <SelectInput label="Serve Item Display" value={s4.listServeItem} onChange={(v) => updateStep('step4', 'listServeItem', v)} options={[{ value: 'Dynamic', label: 'Dynamic' }, { value: 'Static', label: 'Static' }]} />
                </div>
                <Toggle label="Print KOT" hint="Print Kitchen Order Ticket on order placement" checked={s4.printKot} onChange={(v) => updateStep('step4', 'printKot', v)} />
                <Toggle label="Auto Print Bill" hint="Automatically print bill after payment" checked={s4.billingAutoBillPrint} onChange={(v) => updateStep('step4', 'billingAutoBillPrint', v)} />
                <Toggle label="Cancel After Serve" hint="Allow cancellation after food is served" checked={s4.canclePostServe} onChange={(v) => updateStep('step4', 'canclePostServe', v)} />
                <Toggle label="Voice in KDS" hint="Voice announcements on Kitchen Display" checked={s4.voiceInKds} onChange={(v) => updateStep('step4', 'voiceInKds', v)} />
              </SectionCard>
              <SectionCard title="Display Preferences">
                <Toggle label="Real-Time Order Status" hint="Live status updates on dashboard" checked={s4.realTimeOrderStatus} onChange={(v) => updateStep('step4', 'realTimeOrderStatus', v)} />
                <Toggle label="Show Popular Category" checked={s4.showPopularCategory} onChange={(v) => updateStep('step4', 'showPopularCategory', v)} />
                <Toggle label="Food Level Notes" hint="Add notes at item level" checked={s4.foodLevelNotes} onChange={(v) => updateStep('step4', 'foodLevelNotes', v)} />
                <Toggle label="Show Food Variance" checked={s4.showFoodVarriance} onChange={(v) => updateStep('step4', 'showFoodVarriance', v)} />
                <Toggle label="Confirm Web Orders" hint="Require manual confirmation for online orders" checked={s4.orderConfirmForWeb} onChange={(v) => updateStep('step4', 'orderConfirmForWeb', v)} />
                <Toggle label="Show AC / Non-AC Menu" checked={s4.showAcNonMenu} onChange={(v) => updateStep('step4', 'showAcNonMenu', v)} />
                <Toggle label="Food Date Tracking" checked={s4.foodDate} onChange={(v) => updateStep('step4', 'foodDate', v)} />
                <div className="mt-4">
                  <label className="text-sm font-medium block mb-2" style={{ color: COLORS.darkText }}>Search By</label>
                  <div className="flex flex-wrap gap-2">
                    {SEARCH_OPTIONS.map((opt) => {
                      const selected = s4.searchBy.includes(opt);
                      return (
                        <button key={opt} type="button" onClick={() => {
                          const next = selected ? s4.searchBy.filter((o) => o !== opt) : [...s4.searchBy, opt];
                          updateStep('step4', 'searchBy', next);
                        }}
                          className="flex items-center gap-2 px-3.5 py-2 border-2 rounded-lg text-sm font-medium transition-all"
                          style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? 'rgba(50,153,55,0.05)' : '#fff', color: selected ? COLORS.primaryGreen : COLORS.darkText }}
                          data-testid={`search-${opt.replace(/\s/g, '-')}`}
                        >
                          <span className="w-5 h-5 rounded border-2 flex items-center justify-center text-xs" style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? COLORS.primaryGreen : 'transparent', color: '#fff' }}>
                            {selected && <Check size={12} />}
                          </span>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 5 ═══ */}
          {currentStep === 5 && (
            <div data-testid="step-5-content">
              <StepBanner />
              <SectionCard title="Inventory Management">
                <Toggle label="Inventory Tracking" hint="Track stock levels for menu items" checked={s5.inventory} onChange={(v) => updateStep('step5', 'inventory', v)} />
                {s5.inventory && (
                  <>
                    <Toggle label="Allow Negative Inventory" hint="Continue selling when stock reaches zero" checked={s5.inventoryNegative} onChange={(v) => updateStep('step5', 'inventoryNegative', v)} />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <TextInput label="Inventory Alert Number" value={s5.inventoryAlertNumber} onChange={(v) => updateStep('step5', 'inventoryAlertNumber', v)} placeholder="Phone for stock alerts" type="tel" />
                      <TextInput label="Inventory Manager" value={s5.inventoryManagerName} onChange={(v) => updateStep('step5', 'inventoryManagerName', v)} placeholder="Manager name" />
                    </div>
                  </>
                )}
              </SectionCard>
              <SectionCard title="Billing & Contact">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Phone on Bill" value={s5.phoneNumberOnBill} onChange={(v) => updateStep('step5', 'phoneNumberOnBill', v)} placeholder="Number printed on bills" type="tel" />
                  <TextInput label="Report Contact Number" value={s5.reportNumber} onChange={(v) => updateStep('step5', 'reportNumber', v)} type="tel" />
                  <TextInput label="Delivery Contact" value={s5.deliveryContactNo} onChange={(v) => updateStep('step5', 'deliveryContactNo', v)} placeholder="For delivery coordination" type="tel" />
                  <TextInput label="Delivery Person Name" value={s5.deliveryPersonName} onChange={(v) => updateStep('step5', 'deliveryPersonName', v)} placeholder="Default delivery person" />
                </div>
                <Toggle label="Settlement Report" hint="Enable day-end settlement" checked={s5.settelmentReport} onChange={(v) => updateStep('step5', 'settelmentReport', v)} />
              </SectionCard>
              <SectionCard title="Feedback & Links">
                <Toggle label="Feedback Collection" hint="Collect customer feedback after order" checked={s5.feedBack} onChange={(v) => updateStep('step5', 'feedBack', v)} />
                {s5.feedBack && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <SelectInput label="Feedback Link Type" value={s5.sendFeedbackLink} onChange={(v) => updateStep('step5', 'sendFeedbackLink', v)} options={[{ value: 'internal', label: 'Internal' }, { value: 'external', label: 'External URL' }]} />
                    <TextInput label="Feedback URL" value={s5.feedbackUrl} onChange={(v) => updateStep('step5', 'feedbackUrl', v)} placeholder="https://..." type="url" />
                  </div>
                )}
                <div className="mt-4">
                  <TextInput label="Online Ordering Link" value={s5.onlineOrderingLink} onChange={(v) => updateStep('step5', 'onlineOrderingLink', v)} placeholder="https://..." type="url" />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 6 ═══ */}
          {currentStep === 6 && (
            <div data-testid="step-6-content">
              <StepBanner required />
              <SectionCard title="Owner / Vendor Details" desc="The person responsible for this restaurant">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="First Name" required value={s6.firstName} onChange={(v) => updateStep('step6', 'firstName', v)} placeholder="First name" testId="input-firstname" />
                  <TextInput label="Last Name" required value={s6.lastName} onChange={(v) => updateStep('step6', 'lastName', v)} placeholder="Last name" testId="input-lastname" />
                  <TextInput label="Phone" required value={s6.phone} onChange={(v) => updateStep('step6', 'phone', v)} placeholder="Owner's mobile" type="tel" testId="input-vendor-phone" />
                </div>
              </SectionCard>
              <div className="border rounded-xl p-7 mb-5" style={{ background: 'rgba(50,153,55,0.05)', borderColor: 'rgba(50,153,55,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Check size={18} style={{ color: COLORS.primaryGreen }} />
                  <h3 className="text-[15px] font-semibold" style={{ color: COLORS.primaryGreen }}>Almost Done!</h3>
                </div>
                <p className="text-xs" style={{ color: COLORS.grayText }}>Click &quot;Save &amp; Launch&quot; to complete your restaurant setup. You can always change these settings later from the Settings panel.</p>
              </div>
              {Object.keys(errors).length > 0 && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4" data-testid="validation-errors">
                  {Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Action Bar ────────────────── */}
        <div className="fixed bottom-0 right-0 bg-white border-t px-10 py-4 flex items-center justify-between z-10" style={{ left: 280, borderColor: COLORS.borderGray }}>
          <button
            data-testid="btn-back"
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors border"
            style={{ visibility: currentStep > 1 ? 'visible' : 'hidden', background: '#F7F7F7', color: COLORS.grayText, borderColor: COLORS.borderGray }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {isOptional && (
              <button
                data-testid="btn-skip"
                onClick={handleSkip}
                className="px-4 py-2.5 text-sm font-medium underline transition-colors"
                style={{ color: COLORS.grayText }}
              >
                Skip for now <ChevronRight size={14} className="inline" />
              </button>
            )}
            <button
              data-testid="btn-next"
              onClick={handleNext}
              disabled={isSaving}
              className="flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: COLORS.primaryGreen }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : currentStep === 6 ? <Check size={16} /> : null}
              {isSaving ? 'Saving...' : currentStep === 6 ? 'Save & Launch' : 'Save & Continue'}
              {!isSaving && currentStep < 6 && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSettingsPage;
