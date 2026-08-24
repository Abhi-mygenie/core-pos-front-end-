// CR-132: Restaurant Settings Wizard — 8-step rewrite
// Steps: Basic → Printer → Channels & Info → Tax → Order & Kitchen → Online → Inventory → Room
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "../contexts"; // BUG-337
import {
  ArrowLeft, ArrowRight, Check, Home, CreditCard, Percent,
  Settings, Package, Loader2, Upload, FileText, X,
  ChevronRight, AlertCircle, Printer, Globe, Building2,
} from "lucide-react";
import { COLORS } from "../constants";
import { getSettings, updateSettings } from "../api/services/restaurantSettingsService";
import { getProfile } from "../api/services/profileService"; // BUG-337
import { useToast } from "../hooks/use-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Step Metadata
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_STEPS = [
  { id: 1, title: "Basic Settings",     desc: "Identity, flags & loyalty",       icon: Home,      required: true },
  { id: 2, title: "Printer Settings",   desc: "Copies, KOT language & token",    icon: Printer,   required: false },
  { id: 3, title: "Channels & Info",    desc: "Channels, payments & contacts",   icon: CreditCard, required: true },
  { id: 4, title: "Tax & Charges",      desc: "GST, VAT, service charge & fees", icon: Percent,   required: false },
  { id: 5, title: "Order & Kitchen",    desc: "KOT, KDS, scheduling & scan",     icon: Settings,  required: false },
  { id: 6, title: "Online Ordering",    desc: "Online ordering link",            icon: Globe,     required: false },
  { id: 7, title: "Inventory",          desc: "Stock tracking & alerts",         icon: Package,   required: false },
  { id: 8, title: "Room & Hospitality", desc: "Room billing & guest options",    icon: Building2, required: false, conditional: true },
];

const INITIAL_FORM = {
  step1: {
    name: '', address: '', fssai: '', phoneNumberOnBill: '',
    shortCode: false, logoUrl: null, pdfMenuUrl: null,
    restaurantFor: 'Normal', defOrdStatus: 2,
    prepaidAutoSattle: false, autoDispatch: false, ordersAutoPaid: false,
    showPopularCategory: true, showFoodVarriance: false, showAcNonMenu: false,
    foodDate: false, foodLevelNotes: true,
    isBanner: true, isCategoryBox: true,
    isLoyality: false, isCustomerWallet: false, isCoupon: false,
  },
  step2: {
    printKot: true, billingAutoBillPrint: false,
    noOfBill: '1', noOfKot: '1',
    printingInKds: true, printBillCustomerCopy: false,
    useToken: false, kotLanguage: 'English',
  },
  step3: {
    dineIn: true, takeAway: true, delivery: false, room: false,
    onlineOrder: false, multipleMenu: false, foodDifferentPrice: false,
    dineinNumber: false, dineinOtpRequire: false,
    payCash: true, payUpi: true, payCc: true, payTab: false, onlinePayment: false,
    upiId: '', dynamicUpiValue: true, orderPaymentType: 'both', showCashOnDelivery: true,
    walkinOnlinePayment: false, dineinOnlinePayment: false, takeawayOnlinePayment: false, deliveryOnlinePayment: false,
    roleBaseDiscount: false,
    phone: '', reportNumber: '', deliveryContactNo: '', deliveryPersonName: '',
    settelmentReport: true, feedBack: false, sendFeedbackLink: 'internal', feedbackUrl: '',
    firstName: '', lastName: '', vendorPhone: '',
  },
  step4: {
    gstEnabled: false, gstCode: '', gstMode: 'category', gstTax: 0, tax: 0,
    vatEnabled: false, vatCode: '',
    serviceCharge: false, autoServiceCharge: false, serviceChargePercentage: 0, serviceChargeTax: 0,
    tip: true, availableDiscount: true, totalRound: true,
    takeawayCharges: 0, serviceChrgTaxt: 'Service Charge', deliverChargeGst: 0, showUserGst: false,
  },
  step5: {
    canclePostServe: true, orderAutoServe: false, scheduleOrder: false, listServeItem: 'Dynamic',
    voiceInKds: true, realTimeOrderStatus: true,
    orderConfirmForWeb: true, showScanPopup: true,
    confirmOrderShowTab: false, confirmOrderTone: 'default', locationSelection: 'scanner',
    searchBy: [],
    aggregatorOrderTone: 'buzzer', aggregatorAutoKot: false, aggregatorAutoBill: false,
    aggregatorAutoBillStage: 'Ready', defaultPrepTime: 15, prepTimeCountMethod: 'quantity',
    autoPrepTimeAck: false, prepTimeBonusConfig: null, autoPaid: false,
  },
  step6: { onlineOrderingLink: '' },
  step7: {
    inventory: false, inventoryNegative: false,
    inventoryAlertNumber: '', inventoryManagerName: '', autoAcceptInventory: false,
  },
  step8: {
    roomGstApplicable: false, roomBillingIncluded: false, roomOtpRequire: false,
    roomPrice: false, payViaRoom: false, guestDetails: false, bookingDetails: false, billingEmployee: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI Primitives
// ═══════════════════════════════════════════════════════════════════════════════
const TextInput = ({ label, required, value, onChange, placeholder, type = "text", hint, testId }) => (
  <div className="flex flex-col gap-1.5" data-testid={testId}>
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input type={type} className="h-[42px] border rounded-lg px-3.5 text-sm outline-none transition-colors focus:shadow-[0_0_0_3px_rgba(242,107,51,0.08)]"
      style={{ borderColor: value ? 'rgba(50,153,55,0.3)' : COLORS.borderGray, background: value ? 'rgba(50,153,55,0.04)' : '#fff', color: COLORS.darkText }}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    {hint && <span className="text-xs" style={{ color: COLORS.grayText }}>{hint}</span>}
  </div>
);

const TextArea = ({ label, required, value, onChange, placeholder, testId }) => (
  <div className="flex flex-col gap-1.5" data-testid={testId}>
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <textarea className="h-20 border rounded-lg px-3.5 py-3 text-sm outline-none resize-y transition-colors focus:shadow-[0_0_0_3px_rgba(242,107,51,0.08)]"
      style={{ borderColor: value ? 'rgba(50,153,55,0.3)' : COLORS.borderGray, background: value ? 'rgba(50,153,55,0.04)' : '#fff', color: COLORS.darkText }}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const NumberInput = ({ label, value, onChange, suffix, min, max, step = 1 }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>{label}</label>
    <div className="relative">
      <input type="number" className="h-[42px] w-full border rounded-lg px-3.5 text-sm outline-none"
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        value={value} onChange={(e) => { const v = e.target.value; onChange(v === '' ? '' : (parseFloat(v) || 0)); }}
        min={min} max={max} step={step} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>{suffix}</span>}
    </div>
  </div>
);

const SelectInput = ({ label, value, onChange, options, hint, testId }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: COLORS.darkText }}>{label}</label>
    <select className="h-[42px] border rounded-lg px-3.5 text-sm outline-none appearance-auto"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
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
    <button type="button" className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
      style={{ background: checked ? COLORS.primaryGreen : COLORS.borderGray }}
      onClick={() => onChange(!checked)}>
      <span className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] shadow-sm transition-transform"
        style={{ left: 3, transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
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
    {required ? <>Fields marked <span className="text-red-500 mx-1">*</span> are required</> : 'All fields optional — defaults apply if skipped'}
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
      <label className="flex flex-col items-center gap-1.5 w-[120px] h-[100px] border-2 border-dashed rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/30" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>
        <Upload size={22} className="mt-5" />
        <span className="text-xs">Upload</span>
        <input type="file" className="hidden" accept={accept} onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])} />
      </label>
    )}
  </div>
);

// ─── Channel + Payment selectors ────────────────────────────────────────────
const CHANNELS = [
  { key: 'dineIn',    label: 'Dine-In',      desc: 'Table service',  emoji: '🍽️', bg: 'rgba(242,107,51,0.08)' },
  { key: 'takeAway',  label: 'Takeaway',      desc: 'Counter pickup', emoji: '🥡', bg: 'rgba(139,92,246,0.08)' },
  { key: 'delivery',  label: 'Delivery',      desc: 'Home delivery',  emoji: '🚗', bg: 'rgba(59,130,246,0.08)' },
  { key: 'room',      label: 'Room Service',  desc: 'Hotels only',    emoji: '🏨', bg: 'rgba(244,161,26,0.08)' },
  { key: 'onlineOrder', label: 'Online Orders', desc: 'Web/app orders', emoji: '🌐', bg: 'rgba(16,185,129,0.08)' },
];

const PAYMENTS = [
  { key: 'payCash', label: 'Cash',     icon: '💵' },
  { key: 'payUpi',  label: 'UPI',      icon: '📱' },
  { key: 'payCc',   label: 'Card',     icon: '💳' },
  { key: 'payTab',  label: 'Tab/Credit', icon: '📝' },
  { key: 'onlinePayment', label: 'Online', icon: '🌐' },
];

const SEARCH_OPTIONS = ['order id', 'table no', 'phone no', 'user id'];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Wizard
// ═══════════════════════════════════════════════════════════════════════════════
const RestaurantSettingsPage = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { setRestaurant } = useRestaurant(); // BUG-337: re-sync context after settings save

  const [currentStep, setCurrentStep]   = useState(1);
  const [formState, setFormState]       = useState(INITIAL_FORM);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [errors, setErrors]             = useState({});
  const [logoFile, setLogoFile]         = useState(null);
  const [pdfFile, setPdfFile]           = useState(null);

  // Effective steps: step 8 only shown when room is ON
  const roomEnabled = formState.step3.room;
  const STEPS = roomEnabled ? ALL_STEPS : ALL_STEPS.filter(s => s.id !== 8);
  const lastStepId = roomEnabled ? 8 : 7;

  useEffect(() => {
    getSettings()
      .then((data) => setFormState(data))
      .catch((err) => toast({ title: "Failed to load settings", description: err.message, variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStep = useCallback((stepKey, field, value) => {
    setFormState((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], [field]: value } }));
    setErrors((prev) => { const n = { ...prev }; delete n[`${stepKey}.${field}`]; return n; });
  }, []);

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formState.step1.name.trim())    errs['step1.name']    = 'Restaurant name is required';
      if (!formState.step1.address.trim()) errs['step1.address'] = 'Address is required';
    } else if (step === 3) {
      const s = formState.step3;
      if (![s.dineIn, s.takeAway, s.delivery, s.room, s.onlineOrder].some(Boolean))
        errs['step3.channels'] = 'Select at least one service channel';
      if (![s.payCash, s.payUpi, s.payCc, s.payTab, s.onlinePayment].some(Boolean))
        errs['step3.payments'] = 'Select at least one payment method';
    } else if (step === 4) {
      if (formState.step4.gstEnabled && !formState.step4.gstCode.trim())
        errs['step4.gstCode'] = 'GST number is required when GST is enabled';
      if (formState.step4.vatEnabled && !formState.step4.vatCode.trim())
        errs['step4.vatCode'] = 'VAT code is required when VAT is enabled';
    }
    setErrors((prev) => {
      const stepKey = `step${step}`;
      const cleaned = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${stepKey}.`)));
      return { ...cleaned, ...errs };
    });
    return Object.keys(errs).length === 0;
  };

  const saveStep = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formState, currentStep === 1 ? logoFile : null, currentStep === 1 ? pdfFile : null);
      return true;
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === lastStepId) {
      const ok = await saveStep();
      if (ok) {
        try {
          const fresh = await getProfile(); // BUG-337: re-sync context so all flags are live immediately
          setRestaurant(fresh.restaurant);
        } catch (_) { /* non-blocking — context refresh is best-effort */ }
        toast({ title: "Restaurant setup complete!" });
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

  const handleSkip = () => {
    if (currentStep >= lastStepId) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep((prev) => prev - 1); };

  const goToStep = (id) => {
    if (id === 1 || id <= currentStep) { setCurrentStep(id); return; }
    const allPriorRequired = STEPS.filter(s => s.id < id && s.required).every(s => completedSteps.has(s.id));
    if (allPriorRequired) setCurrentStep(id);
  };

  const stepMeta = STEPS.find(s => s.id === currentStep) || STEPS[0];
  const isOptional = !stepMeta.required;

  const s1 = formState.step1; const s2 = formState.step2; const s3 = formState.step3;
  const s4 = formState.step4; const s5 = formState.step5; const s6 = formState.step6;
  const s7 = formState.step7; const s8 = formState.step8;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F7F7F7' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryOrange }} />
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#F7F7F7' }} data-testid="restaurant-settings-wizard">
      {/* ── Left Rail ─────────────────────────── */}
      <div className="w-[280px] bg-white flex flex-col flex-shrink-0 border-r" style={{ borderColor: COLORS.borderGray }}>
        <div className="px-6 pt-8 pb-2">
          <img src="https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" alt="MyGenie" className="h-9 mb-5" />
          <h1 className="text-lg font-bold mb-1" style={{ color: COLORS.darkText }}>Restaurant Setup</h1>
          <p className="text-xs leading-relaxed mb-8" style={{ color: COLORS.grayText }}>Complete these steps to configure your restaurant</p>
        </div>
        <ul className="flex-1 px-6">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.has(step.id) && step.id !== currentStep;
            const isActive    = step.id === currentStep;
            const isUpcoming  = !isCompleted && !isActive;
            return (
              <li key={step.id} className="flex gap-3.5 pb-5 relative cursor-pointer" onClick={() => goToStep(step.id)} data-testid={`step-nav-${step.id}`}>
                {step.id < lastStepId && (
                  <div className="absolute left-[15px] top-[36px] bottom-0 w-0.5" style={{ background: isCompleted ? COLORS.primaryGreen : COLORS.borderGray }} />
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all"
                  style={{ background: isCompleted ? COLORS.primaryGreen : isActive ? COLORS.primaryOrange : '#F7F7F7', color: (isCompleted || isActive) ? '#fff' : '#bbb', boxShadow: isActive ? '0 0 0 4px rgba(242,107,51,0.15)' : 'none' }}>
                  {isCompleted ? <Check size={14} /> : step.id}
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold" style={{ color: isUpcoming ? '#bbb' : COLORS.darkText }}>{step.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: isUpcoming ? '#ccc' : COLORS.grayText }}>{step.desc}</div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1" style={step.required ? { background: 'rgba(242,107,51,0.1)', color: COLORS.primaryOrange } : { background: '#F7F7F7', color: '#bbb' }}>
                    {step.required ? 'Required' : step.conditional ? 'Conditional' : 'Optional'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Main Content ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-10 py-5 flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>Step {currentStep}: {stepMeta.title}</h2>
            <p className="text-sm mt-0.5" style={{ color: COLORS.grayText }}>{stepMeta.desc}</p>
          </div>
          <span className="text-sm" style={{ color: COLORS.grayText }}>
            <strong style={{ color: COLORS.primaryGreen }}>{completedSteps.size}</strong> / {STEPS.length} completed
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8 pb-32">

          {/* ═══ STEP 1: Basic Settings ═══ */}
          {currentStep === 1 && (
            <div data-testid="step-1-content">
              <StepBanner required />
              <SectionCard title="Restaurant Identity" desc="Core identity information">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Restaurant Name" required value={s1.name} onChange={(v) => updateStep('step1', 'name', v)} placeholder="e.g. The Great Kitchen" testId="input-name" />
                  <SelectInput label="Restaurant Type" value={s1.restaurantFor} onChange={(v) => updateStep('step1', 'restaurantFor', v)} options={[{ value: 'Normal', label: 'Normal' }, { value: 'Hotel', label: 'Hotel' }, { value: 'food_court', label: 'Food Court' }]} testId="select-restaurant-for" /> {/* BUG-339 */}
                  <SelectInput label="Default Order Status" value={String(s1.defOrdStatus)} onChange={(v) => updateStep('step1', 'defOrdStatus', parseInt(v))} options={[{ value: '1', label: 'Ready' }, { value: '2', label: 'Serve' }, { value: '4', label: 'Accept' }, { value: '5', label: 'Bill' }]} hint="Order flow configuration" testId="select-def-ord-status" />
                  <TextInput label="Phone on Bill" value={s1.phoneNumberOnBill} onChange={(v) => updateStep('step1', 'phoneNumberOnBill', v)} placeholder="Number printed on bills" type="tel" testId="input-phone-on-bill" />
                  <div className="col-span-2">
                    <TextArea label="Address" required value={s1.address} onChange={(v) => updateStep('step1', 'address', v)} placeholder="Full restaurant address" testId="input-address" />
                  </div>
                  <TextInput label="FSSAI License No." value={s1.fssai} onChange={(v) => updateStep('step1', 'fssai', v)} placeholder="14-digit FSSAI" hint="Printed on bills" testId="input-fssai" />
                  <Toggle label="Short Code" hint="Enable short code on bills" checked={s1.shortCode} onChange={(v) => updateStep('step1', 'shortCode', v)} testId="toggle-shortcode" />
                </div>
                <div className="flex gap-6 mt-5">
                  <FileUpload label="Restaurant Logo" icon={Upload} accept="image/*" file={logoFile} existingUrl={s1.logoUrl} onSelect={setLogoFile} onClear={() => { setLogoFile(null); updateStep('step1', 'logoUrl', null); }} />
                  <FileUpload label="PDF Menu (Digital Menu Link)" icon={FileText} accept=".pdf" file={pdfFile} existingUrl={s1.pdfMenuUrl} onSelect={setPdfFile} onClear={() => { setPdfFile(null); updateStep('step1', 'pdfMenuUrl', null); }} />
                </div>
              </SectionCard>
              <SectionCard title="Operational Flags" desc="Auto-payment and dispatch behaviour">
                <Toggle label="Prepaid Auto Settle" hint="Automatically settle prepaid orders" checked={s1.prepaidAutoSattle} onChange={(v) => updateStep('step1', 'prepaidAutoSattle', v)} testId="toggle-prepaid-auto-sattle" />
                <Toggle label="Auto Dispatch" hint="Automatically dispatch orders to kitchen" checked={s1.autoDispatch} onChange={(v) => updateStep('step1', 'autoDispatch', v)} testId="toggle-auto-dispatch" />
                <Toggle label="Orders Auto Paid" hint="Mark orders as paid automatically" checked={s1.ordersAutoPaid} onChange={(v) => updateStep('step1', 'ordersAutoPaid', v)} testId="toggle-orders-auto-paid" />
              </SectionCard>
              <SectionCard title="Display & UI" desc="What staff and customers see on the screen">
                <Toggle label="Show Popular Items" hint="Show popular items section on menu" checked={s1.showPopularCategory} onChange={(v) => updateStep('step1', 'showPopularCategory', v)} testId="toggle-show-popular-items" />
                <Toggle label="Show Food Variance" checked={s1.showFoodVarriance} onChange={(v) => updateStep('step1', 'showFoodVarriance', v)} testId="toggle-show-food-varriance" />
                <Toggle label="Show AC / Non-AC Menu" checked={s1.showAcNonMenu} onChange={(v) => updateStep('step1', 'showAcNonMenu', v)} testId="toggle-show-ac-non-menu" />
                <Toggle label="Food Date Tracking" checked={s1.foodDate} onChange={(v) => updateStep('step1', 'foodDate', v)} testId="toggle-food-date" />
                <Toggle label="Food Level Notes" hint="Add notes at item level" checked={s1.foodLevelNotes} onChange={(v) => updateStep('step1', 'foodLevelNotes', v)} testId="toggle-food-level-notes" />
              </SectionCard>
              <SectionCard title="CRM & Loyalty" desc="Customer retention and reward programs">
                <Toggle label="Loyalty Programme" hint="Points-based loyalty rewards" checked={s1.isLoyality} onChange={(v) => updateStep('step1', 'isLoyality', v)} testId="toggle-is-loyality" />
                <Toggle label="Customer Wallet" hint="Customer wallet balance" checked={s1.isCustomerWallet} onChange={(v) => updateStep('step1', 'isCustomerWallet', v)} testId="toggle-is-customer-wallet" />
                <Toggle label="Coupon Programme" hint="Coupon redemption at POS" checked={s1.isCoupon} onChange={(v) => updateStep('step1', 'isCoupon', v)} testId="toggle-is-coupon" />
              </SectionCard>
              {Object.keys(errors).filter(k => k.startsWith('step1')).length > 0 && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4" data-testid="validation-errors">
                  {Object.entries(errors).filter(([k]) => k.startsWith('step1')).map(([k, v]) => <div key={k}>{v}</div>)}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Printer Settings ═══ */}
          {currentStep === 2 && (
            <div data-testid="step-2-content">
              <StepBanner />
              <div className="flex items-start gap-2 px-3 py-2 rounded-md mb-5 text-xs" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
                <Printer size={14} className="mt-0.5 flex-shrink-0" />
                <span>Hardware configuration (printer IP, port, bill style) is managed at <strong>Settings → Printers</strong>.</span>
              </div>
              <SectionCard title="Print Behaviour" desc="When and what the system prints automatically">
                <div className="grid grid-cols-2 gap-x-8">
                  <Toggle label="Print KOT" hint="Print Kitchen Order Ticket on order placement" checked={s2.printKot} onChange={(v) => updateStep('step2', 'printKot', v)} testId="toggle-print-kot" />
                  <Toggle label="Auto Print Bill" hint="Automatically print bill after payment" checked={s2.billingAutoBillPrint} onChange={(v) => updateStep('step2', 'billingAutoBillPrint', v)} testId="toggle-billing-auto-bill-print" />
                  <Toggle label="Print in KDS" hint="Send print jobs to Kitchen Display System" checked={s2.printingInKds} onChange={(v) => updateStep('step2', 'printingInKds', v)} testId="toggle-printing-in-kds" />
                  <Toggle label="Print Customer Copy" hint="Print a separate copy for the customer" checked={s2.printBillCustomerCopy} onChange={(v) => updateStep('step2', 'printBillCustomerCopy', v)} testId="toggle-print-bill-customer-copy" />
                </div>
              </SectionCard>
              <SectionCard title="Copies" desc="Number of copies to print per document">
                <div className="grid grid-cols-2 gap-4">
                  <SelectInput label="Bill Copies" value={s2.noOfBill} onChange={(v) => updateStep('step2', 'noOfBill', v)} options={[{ value: '1', label: '1 copy' }, { value: '2', label: '2 copies' }, { value: '3', label: '3 copies' }]} testId="select-no-of-bill" />
                  <SelectInput label="KOT Copies" value={s2.noOfKot} onChange={(v) => updateStep('step2', 'noOfKot', v)} options={[{ value: '1', label: '1 copy' }, { value: '2', label: '2 copies' }, { value: '3', label: '3 copies' }]} testId="select-no-of-kot" />
                </div>
              </SectionCard>
              <SectionCard title="KOT & Token Options" desc="Language and token settings for kitchen tickets">
                <Toggle label="Token on Bill / KOT" hint="Print token number on bills and kitchen tickets" checked={s2.useToken} onChange={(v) => updateStep('step2', 'useToken', v)} testId="toggle-use-token" />
                <div className="mt-3">
                  <SelectInput label="KOT Language" value={s2.kotLanguage} onChange={(v) => updateStep('step2', 'kotLanguage', v)} options={[{ value: 'English', label: 'English' }, { value: 'Hindi', label: 'Hindi' }]} testId="select-kot-language" />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 3: Channels & Info ═══ */}
          {currentStep === 3 && (
            <div data-testid="step-3-content">
              <StepBanner required />
              <SectionCard title="Service Channels" desc="How do your customers order? Select all that apply.">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {CHANNELS.map((ch) => (
                    <button key={ch.key} type="button" data-testid={`channel-${ch.key}`} onClick={() => updateStep('step3', ch.key, !s3[ch.key])}
                      className="border-2 rounded-xl p-4 text-center transition-all"
                      style={{ borderColor: s3[ch.key] ? COLORS.primaryGreen : COLORS.borderGray, background: s3[ch.key] ? 'rgba(50,153,55,0.05)' : '#fff' }}>
                      <div className="text-xl mb-1.5">{ch.emoji}</div>
                      <div className="text-xs font-semibold" style={{ color: s3[ch.key] ? COLORS.primaryGreen : COLORS.darkText }}>{ch.label}</div>
                    </button>
                  ))}
                </div>
                {errors['step3.channels'] && <p className="text-sm text-red-500 mt-2">{errors['step3.channels']}</p>}
                <div className="grid grid-cols-2 gap-x-8 mt-2">
                  <Toggle label="Multiple Menus" hint="Support multiple menu versions" checked={s3.multipleMenu} onChange={(v) => updateStep('step3', 'multipleMenu', v)} testId="toggle-multiple-menu" />
                  <Toggle label="Different Prices per Channel" checked={s3.foodDifferentPrice} onChange={(v) => updateStep('step3', 'foodDifferentPrice', v)} testId="toggle-food-different-price" />
                  <Toggle label="Dine-in Table Number" checked={s3.dineinNumber} onChange={(v) => updateStep('step3', 'dineinNumber', v)} testId="toggle-dinein-number" />
                  <Toggle label="Dine-in OTP Required" checked={s3.dineinOtpRequire} onChange={(v) => updateStep('step3', 'dineinOtpRequire', v)} testId="toggle-dinein-otp-require" />
                  <Toggle label="Role-Based Discount" hint="Restrict discounts by staff role" checked={s3.roleBaseDiscount} onChange={(v) => updateStep('step3', 'roleBaseDiscount', v)} testId="toggle-role-base-discount" />
                </div>
              </SectionCard>
              <SectionCard title="Payment Methods" desc="How can customers pay?">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {PAYMENTS.map((pm) => (
                    <button key={pm.key} type="button" data-testid={`pay-${pm.key}`} onClick={() => updateStep('step3', pm.key, !s3[pm.key])}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg text-sm font-medium transition-all"
                      style={{ borderColor: s3[pm.key] ? COLORS.primaryGreen : COLORS.borderGray, background: s3[pm.key] ? 'rgba(50,153,55,0.05)' : '#fff', color: s3[pm.key] ? COLORS.primaryGreen : COLORS.darkText }}>
                      {pm.icon} {pm.label}
                    </button>
                  ))}
                </div>
                {errors['step3.payments'] && <p className="text-sm text-red-500 mb-3">{errors['step3.payments']}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="UPI ID" value={s3.upiId} onChange={(v) => updateStep('step3', 'upiId', v)} placeholder="yourstore@upi" hint="Required if UPI is enabled" testId="input-upi-id" />
                  <SelectInput label="Order Payment Type" value={s3.orderPaymentType} onChange={(v) => updateStep('step3', 'orderPaymentType', v)} options={[{ value: 'both', label: 'Both' }, { value: 'prepaid', label: 'Prepaid' }, { value: 'postpaid', label: 'Postpaid' }]} />
                </div>
                <Toggle label="Dynamic UPI Value" hint="Auto-generate UPI amount per order" checked={s3.dynamicUpiValue} onChange={(v) => updateStep('step3', 'dynamicUpiValue', v)} />
                <Toggle label="Show Cash on Delivery" checked={s3.showCashOnDelivery} onChange={(v) => updateStep('step3', 'showCashOnDelivery', v)} />
              </SectionCard>
              <SectionCard title="Online Payment per Channel">
                <div className="grid grid-cols-2 gap-x-8">
                  <Toggle label="Walk-in Online Payment" checked={s3.walkinOnlinePayment} onChange={(v) => updateStep('step3', 'walkinOnlinePayment', v)} />
                  <Toggle label="Dine-in Online Payment" checked={s3.dineinOnlinePayment} onChange={(v) => updateStep('step3', 'dineinOnlinePayment', v)} />
                  <Toggle label="Takeaway Online Payment" checked={s3.takeawayOnlinePayment} onChange={(v) => updateStep('step3', 'takeawayOnlinePayment', v)} />
                  <Toggle label="Delivery Online Payment" checked={s3.deliveryOnlinePayment} onChange={(v) => updateStep('step3', 'deliveryOnlinePayment', v)} />
                </div>
              </SectionCard>
              <SectionCard title="Contact & Delivery">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="Restaurant Phone" value={s3.phone} onChange={(v) => updateStep('step3', 'phone', v)} placeholder="Main phone number" type="tel" hint="Optional" testId="input-phone" />
                  <TextInput label="Report Contact Number" value={s3.reportNumber} onChange={(v) => updateStep('step3', 'reportNumber', v)} type="tel" testId="input-report-number" />
                  <TextInput label="Delivery Contact" value={s3.deliveryContactNo} onChange={(v) => updateStep('step3', 'deliveryContactNo', v)} placeholder="Delivery coordination" type="tel" testId="input-delivery-contact" />
                  <TextInput label="Delivery Person Name" value={s3.deliveryPersonName} onChange={(v) => updateStep('step3', 'deliveryPersonName', v)} placeholder="Default delivery person" testId="input-delivery-person" />
                </div>
              </SectionCard>
              <SectionCard title="Settlement & Feedback">
                <Toggle label="Settlement Report" hint="Enable day-end settlement report" checked={s3.settelmentReport} onChange={(v) => updateStep('step3', 'settelmentReport', v)} testId="toggle-settelment-report" />
                <Toggle label="Feedback Collection" checked={s3.feedBack} onChange={(v) => updateStep('step3', 'feedBack', v)} testId="toggle-feedback" />
                {s3.feedBack && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <SelectInput label="Feedback Link Type" value={s3.sendFeedbackLink} onChange={(v) => updateStep('step3', 'sendFeedbackLink', v)} options={[{ value: 'internal', label: 'Internal' }, { value: 'external', label: 'External URL' }]} />
                    <TextInput label="Feedback URL" value={s3.feedbackUrl} onChange={(v) => updateStep('step3', 'feedbackUrl', v)} placeholder="https://..." type="url" />
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Owner / Vendor Info" desc="Person responsible for this restaurant">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="First Name" value={s3.firstName} onChange={(v) => updateStep('step3', 'firstName', v)} placeholder="First name" testId="input-firstname" />
                  <TextInput label="Last Name" value={s3.lastName} onChange={(v) => updateStep('step3', 'lastName', v)} placeholder="Last name" testId="input-lastname" />
                  <TextInput label="Owner Phone" value={s3.vendorPhone} onChange={(v) => updateStep('step3', 'vendorPhone', v)} placeholder="Owner mobile" type="tel" testId="input-vendor-phone" />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 4: Tax & Charges ═══ */}
          {currentStep === 4 && (
            <div data-testid="step-4-content">
              <StepBanner />
              <SectionCard title="GST Configuration" desc="GST affects every bill your restaurant generates">
                <Toggle label="GST Enabled" hint="Most Indian restaurants need this ON" checked={s4.gstEnabled} onChange={(v) => updateStep('step4', 'gstEnabled', v)} testId="toggle-gst" />
                {s4.gstEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <TextInput label="GST Number" required value={s4.gstCode} onChange={(v) => updateStep('step4', 'gstCode', v)} placeholder="15-digit GSTIN" testId="input-gst-code" />
                    <SelectInput label="GST Mode" value={s4.gstMode} onChange={(v) => updateStep('step4', 'gstMode', v)} options={[{ value: 'category', label: 'Item Level' }, { value: 'flat', label: 'Restaurant Level' }]} />
                    <NumberInput label="GST Tax %" value={s4.gstTax} onChange={(v) => updateStep('step4', 'gstTax', v)} suffix="%" min={0} max={100} />
                    <NumberInput label="Tax %" value={s4.tax} onChange={(v) => updateStep('step4', 'tax', v)} suffix="%" min={0} max={100} />
                  </div>
                )}
                <Toggle label="Show GST to Customers" hint="Show GST breakdown on customer screens" checked={s4.showUserGst} onChange={(v) => updateStep('step4', 'showUserGst', v)} testId="toggle-show-user-gst" />
              </SectionCard>
              <SectionCard title="VAT Configuration" desc="For restaurants using VAT instead of GST">
                <Toggle label="VAT Enabled" checked={s4.vatEnabled} onChange={(v) => updateStep('step4', 'vatEnabled', v)} testId="toggle-vat" />
                {s4.vatEnabled && (
                  <div className="mt-4">
                    <TextInput label="VAT Code" required value={s4.vatCode} onChange={(v) => updateStep('step4', 'vatCode', v)} placeholder="VAT registration number" testId="input-vat-code" />
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Service Charge" desc="Automatically add service charge to orders">
                <Toggle label="Service Charge" checked={s4.serviceCharge} onChange={(v) => updateStep('step4', 'serviceCharge', v)} testId="toggle-service-charge" />
                <Toggle label="Auto Service Charge" hint="Automatically apply to all orders" checked={s4.autoServiceCharge} onChange={(v) => updateStep('step4', 'autoServiceCharge', v)} testId="toggle-auto-service-charge" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <NumberInput label="Service Charge %" value={s4.serviceChargePercentage} onChange={(v) => updateStep('step4', 'serviceChargePercentage', v)} suffix="%" min={0} max={100} step={0.1} />
                  <NumberInput label="Service Charge Tax %" value={s4.serviceChargeTax} onChange={(v) => updateStep('step4', 'serviceChargeTax', v)} suffix="%" min={0} max={100} step={0.1} />
                  <TextInput label="Service Charge Label" value={s4.serviceChrgTaxt} onChange={(v) => updateStep('step4', 'serviceChrgTaxt', v)} placeholder="Service Charge" hint="Text shown on bill" testId="input-service-chrg-taxt" />
                </div>
              </SectionCard>
              <SectionCard title="Tips & Discounts">
                <Toggle label="Enable Tips" hint="Allow tip collection on bills" checked={s4.tip} onChange={(v) => updateStep('step4', 'tip', v)} />
                <Toggle label="Discounts Available" hint="Allow applying discounts" checked={s4.availableDiscount} onChange={(v) => updateStep('step4', 'availableDiscount', v)} />
                <Toggle label="Total Rounding" hint="Round grand total to nearest rupee" checked={s4.totalRound} onChange={(v) => updateStep('step4', 'totalRound', v)} />
              </SectionCard>
              <SectionCard title="Other Charges" desc="Delivery and takeaway fee configuration">
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Takeaway Charges (₹)" value={s4.takeawayCharges} onChange={(v) => updateStep('step4', 'takeawayCharges', v)} min={0} />
                  <NumberInput label="Delivery Charge GST %" value={s4.deliverChargeGst} onChange={(v) => updateStep('step4', 'deliverChargeGst', v)} suffix="%" min={0} max={100} step={0.1} />
                </div>
              </SectionCard>
              {Object.keys(errors).filter(k => k.startsWith('step4')).length > 0 && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4" data-testid="validation-errors">
                  {Object.entries(errors).filter(([k]) => k.startsWith('step4')).map(([k, v]) => <div key={k}>{v}</div>)}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 5: Order & Kitchen ═══ */}
          {currentStep === 5 && (
            <div data-testid="step-5-content">
              <StepBanner />
              <SectionCard title="Order Workflow" desc="How orders move through your kitchen">
                <div className="grid grid-cols-2 gap-x-8">
                  <Toggle label="Cancel After Serve" hint="Allow cancellation after food is served" checked={s5.canclePostServe} onChange={(v) => updateStep('step5', 'canclePostServe', v)} testId="toggle-cancle-post-serve" />
                  <Toggle label="Order Auto Serve" hint="Auto-serve items when kitchen marks ready" checked={s5.orderAutoServe} onChange={(v) => updateStep('step5', 'orderAutoServe', v)} testId="toggle-order-auto-serve" />
                  <Toggle label="Schedule Orders" hint="Enable future scheduled orders" checked={s5.scheduleOrder} onChange={(v) => updateStep('step5', 'scheduleOrder', v)} testId="toggle-schedule-order" />
                </div>
                <div className="mt-3">
                  <SelectInput label="Serve Item Display" value={s5.listServeItem} onChange={(v) => updateStep('step5', 'listServeItem', v)} options={[{ value: 'Dynamic', label: 'Dynamic' }, { value: 'Static', label: 'Static' }]} testId="select-list-serve-item" />
                </div>
              </SectionCard>
              <SectionCard title="Kitchen Display (KDS)" desc="Voice and real-time status settings">
                <div className="grid grid-cols-2 gap-x-8">
                  <Toggle label="Voice in KDS" hint="Voice announcements on Kitchen Display" checked={s5.voiceInKds} onChange={(v) => updateStep('step5', 'voiceInKds', v)} testId="toggle-voice-in-kds" />
                  <Toggle label="Real-Time Order Status" hint="Live status updates on dashboard" checked={s5.realTimeOrderStatus} onChange={(v) => updateStep('step5', 'realTimeOrderStatus', v)} testId="toggle-real-time-order-status" />
                </div>
              </SectionCard>
              <SectionCard title="Confirmations & Pop-ups" desc="Online order confirmation and scan settings">
                <Toggle label="Confirm Web Orders" hint="Require manual confirmation for online/web orders" checked={s5.orderConfirmForWeb} onChange={(v) => updateStep('step5', 'orderConfirmForWeb', v)} testId="toggle-order-confirm-for-web" />
                <Toggle label="Show Scan Pop Up" hint="Show scan popup on dashboard for QR orders" checked={s5.showScanPopup} onChange={(v) => updateStep('step5', 'showScanPopup', v)} testId="toggle-show-scan-popup" />
                <Toggle label="Show Confirm Order Tab" hint="Dedicated confirmation tab in order screen" checked={s5.confirmOrderShowTab} onChange={(v) => updateStep('step5', 'confirmOrderShowTab', v)} testId="toggle-confirm-order-show-tab" />
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <SelectInput label="Confirm Order Tone" value={s5.confirmOrderTone} onChange={(v) => updateStep('step5', 'confirmOrderTone', v)} options={[{ value: 'default', label: 'Default' }, { value: 'buzzer', label: 'Buzzer' }, { value: 'chime', label: 'Chime' }, { value: 'silent', label: 'Silent' }]} testId="select-confirm-order-tone" />
                  <SelectInput label="Location Selection" value={s5.locationSelection} onChange={(v) => updateStep('step5', 'locationSelection', v)} options={[{ value: 'scanner', label: 'Scanner (QR)' }, { value: 'manual', label: 'Manual' }]} testId="select-location-selection" />
                </div>
              </SectionCard>
              <SectionCard title="Search By" desc="Fields staff can use to search for orders">
                <div className="flex flex-wrap gap-2">
                  {SEARCH_OPTIONS.map((opt) => {
                    const selected = s5.searchBy.includes(opt);
                    return (
                      <button key={opt} type="button" data-testid={`search-${opt.replace(/\s/g, '-')}`}
                        onClick={() => updateStep('step5', 'searchBy', selected ? s5.searchBy.filter(o => o !== opt) : [...s5.searchBy, opt])}
                        className="flex items-center gap-2 px-3.5 py-2 border-2 rounded-lg text-sm font-medium transition-all"
                        style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? 'rgba(50,153,55,0.05)' : '#fff', color: selected ? COLORS.primaryGreen : COLORS.darkText }}>
                        <span className="w-5 h-5 rounded border-2 flex items-center justify-center text-xs" style={{ borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray, background: selected ? COLORS.primaryGreen : 'transparent', color: '#fff' }}>
                          {selected && <Check size={12} />}
                        </span>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 6: Online Ordering ═══ */}
          {currentStep === 6 && (
            <div data-testid="step-6-content">
              <StepBanner />
              <SectionCard title="Online Ordering Link" desc="Share this link for online menu orders">
                <TextInput label="Online Ordering Link" value={s6.onlineOrderingLink} onChange={(v) => updateStep('step6', 'onlineOrderingLink', v)} placeholder="https://..." type="url" testId="input-online-ordering-link" />
              </SectionCard>
            </div>
          )}

          {/* ═══ STEP 7: Inventory ═══ */}
          {currentStep === 7 && (
            <div data-testid="step-7-content">
              <StepBanner />
              <SectionCard title="Inventory Management">
                <Toggle label="Inventory Tracking" hint="Track stock levels for menu items" checked={s7.inventory} onChange={(v) => updateStep('step7', 'inventory', v)} testId="toggle-inventory" />
                {s7.inventory && (
                  <>
                    <Toggle label="Allow Negative Inventory" hint="Continue selling when stock is zero" checked={s7.inventoryNegative} onChange={(v) => updateStep('step7', 'inventoryNegative', v)} testId="toggle-inventory-negative" />
                    <Toggle label="Auto Accept Inventory" hint="Auto-accept stock transfers and purchases" checked={s7.autoAcceptInventory} onChange={(v) => updateStep('step7', 'autoAcceptInventory', v)} testId="toggle-auto-accept-inventory" />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <TextInput label="Inventory Alert Number" value={s7.inventoryAlertNumber} onChange={(v) => updateStep('step7', 'inventoryAlertNumber', v)} placeholder="Phone for stock alerts" type="tel" testId="input-inventory-alert" />
                      <TextInput label="Inventory Manager" value={s7.inventoryManagerName} onChange={(v) => updateStep('step7', 'inventoryManagerName', v)} placeholder="Manager name" testId="input-inventory-manager" />
                    </div>
                  </>
                )}
              </SectionCard>
              {currentStep === lastStepId && (
                <div className="border rounded-xl p-7 mb-5" style={{ background: 'rgba(50,153,55,0.05)', borderColor: 'rgba(50,153,55,0.2)' }}>
                  <div className="flex items-center gap-2 mb-1"><Check size={18} style={{ color: COLORS.primaryGreen }} /><h3 className="text-[15px] font-semibold" style={{ color: COLORS.primaryGreen }}>Almost Done!</h3></div>
                  <p className="text-xs" style={{ color: COLORS.grayText }}>Click "Save &amp; Launch" to complete your restaurant setup.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 8: Room & Hospitality (conditional) ═══ */}
          {currentStep === 8 && (
            <div data-testid="step-8-content">
              <StepBanner />
              <SectionCard title="Room Billing" desc="Configuration for hotel room billing">
                <Toggle label="Room Billing Included" hint="Include room charges in the bill" checked={s8.roomBillingIncluded} onChange={(v) => updateStep('step8', 'roomBillingIncluded', v)} testId="toggle-room-billing-included" />
                <Toggle label="Room OTP Required" hint="Require OTP for room billing confirmation" checked={s8.roomOtpRequire} onChange={(v) => updateStep('step8', 'roomOtpRequire', v)} testId="toggle-room-otp-require" />
                <Toggle label="Room Price Override" hint="Allow overriding room price on billing" checked={s8.roomPrice} onChange={(v) => updateStep('step8', 'roomPrice', v)} testId="toggle-room-price" />
                <Toggle label="Pay Via Room" hint="Allow charges to be billed to room account" checked={s8.payViaRoom} onChange={(v) => updateStep('step8', 'payViaRoom', v)} testId="toggle-pay-via-room" />
                <Toggle label="Room GST Applicable" hint="Apply GST on room billing" checked={s8.roomGstApplicable} onChange={(v) => updateStep('step8', 'roomGstApplicable', v)} testId="toggle-room-gst-applicable" />
              </SectionCard>
              <SectionCard title="Guest & Booking Options">
                <Toggle label="Collect Guest Details" hint="Capture guest name and contact" checked={s8.guestDetails} onChange={(v) => updateStep('step8', 'guestDetails', v)} testId="toggle-guest-details" />
                <Toggle label="Show Booking Details" hint="Show booking reference on orders" checked={s8.bookingDetails} onChange={(v) => updateStep('step8', 'bookingDetails', v)} testId="toggle-booking-details" />
                <Toggle label="Billing by Employee" hint="Track which employee handles room billing" checked={s8.billingEmployee} onChange={(v) => updateStep('step8', 'billingEmployee', v)} testId="toggle-billing-employee" />
              </SectionCard>
              <div className="border rounded-xl p-7 mb-5" style={{ background: 'rgba(50,153,55,0.05)', borderColor: 'rgba(50,153,55,0.2)' }}>
                <div className="flex items-center gap-2 mb-1"><Check size={18} style={{ color: COLORS.primaryGreen }} /><h3 className="text-[15px] font-semibold" style={{ color: COLORS.primaryGreen }}>Almost Done!</h3></div>
                <p className="text-xs" style={{ color: COLORS.grayText }}>Click "Save &amp; Launch" to complete your restaurant setup.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Action Bar ─────────────────── */}
        <div className="fixed bottom-0 right-0 bg-white border-t px-10 py-4 flex items-center justify-between z-10" style={{ left: 280, borderColor: COLORS.borderGray }}>
          <button data-testid="btn-back" onClick={handleBack}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors border"
            style={{ visibility: currentStep > 1 ? 'visible' : 'hidden', background: '#F7F7F7', color: COLORS.grayText, borderColor: COLORS.borderGray }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {isOptional && currentStep !== lastStepId && (
              <button data-testid="btn-skip" onClick={handleSkip}
                className="px-4 py-2.5 text-sm font-medium underline" style={{ color: COLORS.grayText }}>
                Skip <ChevronRight size={14} className="inline" />
              </button>
            )}
            <button data-testid="btn-next" onClick={handleNext} disabled={isSaving}
              className="flex items-center gap-2 px-7 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: COLORS.primaryGreen }}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : currentStep === lastStepId ? <Check size={16} /> : null}
              {isSaving ? 'Saving...' : currentStep === lastStepId ? 'Save & Launch' : 'Save & Continue'}
              {!isSaving && currentStep < lastStepId && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSettingsPage;
