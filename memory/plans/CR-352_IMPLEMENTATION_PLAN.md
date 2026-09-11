# CR-352 — Implementation Plan: Printer Type Routing Gate

**ID:** CR-352
**Stage:** Gate 3 — Implementation Plan
**Date:** 2026-08-30
**Based on:** `memory/impact/CR-352_IMPACT_ANALYSIS.md`
**Risk:** HIGH (RestaurantSettingsPage.jsx is R5 hotspot)

---

## Pre-Implementation Entry Verification

Before writing any code, verify these starting states still hold:

| Check | Expected | How to Verify |
|---|---|---|
| `profileTransform.js` line 391 | `showPopularCategory: toBoolean(...)` — last field in `fromAPI.settings()` | `sed -n '391p' profileTransform.js` |
| `restaurantSettingsTransform.js` line 55 | `isCoupon: toBool(basic.is_coupon),` — last field in `fromAPI.step1` | `sed -n '55p' restaurantSettingsTransform.js` |
| `restaurantSettingsTransform.js` line 252 | `show_scan_popup: s5.showScanPopup ? 1 : 0, // CR-056` | `sed -n '252p' restaurantSettingsTransform.js` |
| `RestaurantSettingsPage.jsx` line 39 | `isLoyality: false, isCustomerWallet: false, isCoupon: false,` | `sed -n '39p' RestaurantSettingsPage.jsx` |
| `RestaurantSettingsPage.jsx` line 224 | `const [pdfFile, setPdfFile] = useState(null);` — last useState | `sed -n '224p' RestaurantSettingsPage.jsx` |
| `ListFormViews.jsx` line 186 | `export { PrinterAgentConfigView as PrintersView }...` | `sed -n '186p' ListFormViews.jsx` |

If any check fails → STOP and return to Planning agent. Do not proceed.

---

## Scope Lock

**Files WILL change (9 edits across 4 files):**
1. `src/api/transforms/profileTransform.js`
2. `src/api/transforms/restaurantSettingsTransform.js`
3. `src/pages/RestaurantSettingsPage.jsx`
4. `src/components/panels/settings/ListFormViews.jsx`

**Files will NOT touch:**
`LocalPrinterSetupView.jsx`, `PrinterAgentConfigView.jsx`, `StationsTab.jsx`, `BillContentTab.jsx`, `BillStyleTab.jsx`, `SettingsPanel.jsx`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `CartPanel.jsx`

---

## Edit 1 — `profileTransform.js`: Add `printerType` to `fromAPI.settings()`

**File:** `src/api/transforms/profileTransform.js`
**Location:** Line 391 — after `showPopularCategory`, before the closing `};`
**Purpose:** Expose `printer_agent` from profile into `restaurant.settings.printerType` so `ListFormViews.jsx` routing gate can read it.

**Current (lines 389–393):**
```javascript
      showPopularCategory: toBoolean(apiSettings.show_popular_category ?? apiSettings.settings?.show_popular_category),
    };
  },
};
```

**Replace with:**
```javascript
      showPopularCategory: toBoolean(apiSettings.show_popular_category ?? apiSettings.settings?.show_popular_category),
      // CR-352: printer type routing gate — 'agent' = Printer Agent device, 'direct' = Direct Printer (default)
      // Backend field: restaurants[0].settings.printer_agent = "Yes" (agent) | "No" (direct)
      printerType: apiSettings.settings?.printer_agent === 'Yes' ? 'agent' : 'direct',
    };
  },
};
```

**Self-test:** After edit, grep confirms `printerType` exists in the file.

---

## Edit 2 — `restaurantSettingsTransform.js`: Add `printerType` to `fromAPI.step1`

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Location:** Line 55 — after `isCoupon`, before closing `},` of `step1`
**Purpose:** Load the saved `printer_agent` value from the settings API into `step1.printerType` so the wizard can show the current value on load.

**Current (lines 53–57):**
```javascript
        isLoyality:      toBool(basic.is_loyality),   // typo preserved R9
        isCustomerWallet: toBool(basic.is_customer_wallet),
        isCoupon:         toBool(basic.is_coupon),
      },

      // ── Step 2: Printer Settings ──
```

**Replace with:**
```javascript
        isLoyality:      toBool(basic.is_loyality),   // typo preserved R9
        isCustomerWallet: toBool(basic.is_customer_wallet),
        isCoupon:         toBool(basic.is_coupon),
        // CR-352: printer type routing gate
        printerType:      basic.printer_agent === 'Yes' ? 'agent' : 'direct',
      },

      // ── Step 2: Printer Settings ──
```

**Self-test:** `grep -n "printerType" restaurantSettingsTransform.js` returns this line.

---

## Edit 3 — `restaurantSettingsTransform.js`: Add `printer_agent` to `toAPI.basic`

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Location:** Line 252 — after `show_scan_popup`
**Purpose:** Emit `printer_agent` in the save payload when the user changes the Printer Type toggle.

**Current (lines 251–254):**
```javascript
        // Screen 3 — misc basic
        show_scan_popup: s5.showScanPopup ? 1 : 0, // CR-056
        // Screen 4 — Other Charges
```

**Replace with:**
```javascript
        // Screen 3 — misc basic
        show_scan_popup: s5.showScanPopup ? 1 : 0, // CR-056
        printer_agent:   s1.printerType === 'agent' ? 'Yes' : 'No', // CR-352
        // Screen 4 — Other Charges
```

**Self-test:** `grep -n "printer_agent" restaurantSettingsTransform.js` returns this line (not the printerAgentSelector import).

---

## Edit 4 — `RestaurantSettingsPage.jsx`: Add `printerType` to `INITIAL_FORM.step1`

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Location:** Line 39 — end of `step1` defaults
**Purpose:** Default new restaurants to `'direct'` printer type.

**Current (line 39):**
```javascript
    isLoyality: false, isCustomerWallet: false, isCoupon: false,
```

**Replace with:**
```javascript
    isLoyality: false, isCustomerWallet: false, isCoupon: false,
    printerType: 'direct', // CR-352: default to Direct Printer for new restaurants
```

**Self-test:** `grep -n "printerType" RestaurantSettingsPage.jsx` returns this line.

---

## Edit 5 — `RestaurantSettingsPage.jsx`: Add 3 imports for printer tab components

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Location:** After line 14 (`import { useToast } from "../hooks/use-toast";`)
**Purpose:** Make `StationsTab`, `BillContentTab`, `BillStyleTab` available in Step 2 JSX.

**Current (line 14):**
```javascript
import { useToast } from "../hooks/use-toast";
```

**Replace with:**
```javascript
import { useToast } from "../hooks/use-toast";
import { StationsTab }    from "../components/panels/settings/localPrinter/StationsTab";    // CR-352
import { BillContentTab } from "../components/panels/settings/localPrinter/BillContentTab"; // CR-352
import { BillStyleTab }   from "../components/panels/settings/localPrinter/BillStyleTab";   // CR-352
```

**Self-test:** `grep -n "StationsTab\|BillContentTab\|BillStyleTab" RestaurantSettingsPage.jsx` returns these 3 lines.

---

## Edit 6 — `RestaurantSettingsPage.jsx`: Add Step 2 tab state + bill shared state

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Location:** Line 224 — after last `useState` declaration (`pdfFile`)
**Purpose:** Drive the 4-tab Step 2 UI and share bill config state between BillContentTab and BillStyleTab.

**Current (line 224):**
```javascript
  const [pdfFile, setPdfFile]           = useState(null);
```

**Replace with:**
```javascript
  const [pdfFile, setPdfFile]           = useState(null);
  const [step2Tab, setStep2Tab]         = useState('basic');        // CR-352: Step 2 active tab
  const [billState, setBillState]       = useState(null);           // CR-352: shared bill config state
  const handleBillStateChange = useCallback((s) => setBillState(s), []); // CR-352
```

**Self-test:** `grep -n "step2Tab\|billState\|handleBillStateChange" RestaurantSettingsPage.jsx` returns 3 lines.

---

## Edit 7 — `RestaurantSettingsPage.jsx`: Add Printer Type selector to Step 1

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Location:** After line 416 — after the "CRM & Loyalty" `SectionCard` closing tag, before the validation error block
**Purpose:** Let the user choose Direct Printer or Printer Agent in Step 1 (Basic Settings).

**Current (lines 415–423):**
```javascript
                <Toggle label="Coupon Programme" hint="Coupon redemption at POS" checked={s1.isCoupon} onChange={(v) => updateStep('step1', 'isCoupon', v)} testId="toggle-is-coupon" />
              </SectionCard>
              {Object.keys(errors).filter(k => k.startsWith('step1')).length > 0 && (
```

**Replace with:**
```javascript
                <Toggle label="Coupon Programme" hint="Coupon redemption at POS" checked={s1.isCoupon} onChange={(v) => updateStep('step1', 'isCoupon', v)} testId="toggle-is-coupon" />
              </SectionCard>
              {/* CR-352: Printer Type selector */}
              <SectionCard title="Printer Type" desc="How this restaurant connects to its printer">
                <div className="flex gap-3">
                  {[
                    { value: 'direct', label: 'Direct Printer', hint: 'USB / Bluetooth / WiFi — no extra hardware' },
                    { value: 'agent',  label: 'Printer Agent',  hint: 'Dedicated printer agent device on the network' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateStep('step1', 'printerType', opt.value)}
                      data-testid={`printer-type-${opt.value}`}
                      className="flex-1 border-2 rounded-xl p-4 text-left transition-all"
                      style={{
                        borderColor: s1.printerType === opt.value ? COLORS.primaryGreen : COLORS.borderGray,
                        background: s1.printerType === opt.value ? 'rgba(50,153,55,0.05)' : '#fff',
                      }}
                    >
                      <div className="text-sm font-semibold" style={{ color: s1.printerType === opt.value ? COLORS.primaryGreen : COLORS.darkText }}>{opt.label}</div>
                      <div className="text-xs mt-1" style={{ color: COLORS.grayText }}>{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </SectionCard>
              {Object.keys(errors).filter(k => k.startsWith('step1')).length > 0 && (
```

**Self-test:** Navigate to Step 1 in the wizard — two pill buttons "Direct Printer" and "Printer Agent" are visible. Clicking each changes the selection (green border).

---

## Edit 8 — `RestaurantSettingsPage.jsx`: Replace Step 2 with 4-tab layout

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Location:** Lines 425–454 — the entire `{currentStep === 2 && (...)}` block
**Purpose:** Make Step 2 a 4-tab container: Basic Settings (always) + Printers / Bill Content / Bill Style (conditional on `s1.printerType`).

**Note on shared state:** `BillContentTab` and `BillStyleTab` require `sharedState={billState}` and `onStateChange={handleBillStateChange}` (from `LocalPrinterSetupView` pattern). `StationsTab` is zero-props.

**Current (lines 425–456):**
```javascript
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
```

**Replace with:**
```javascript
          {/* ═══ STEP 2: Printer Settings ═══ */}
          {/* CR-352: 4-tab layout — Tab 1 always; Tabs 2/3/4 conditional on printer_agent */}
          {currentStep === 2 && (
            <div data-testid="step-2-content">
              <StepBanner />
              {/* Tab bar */}
              <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ backgroundColor: '#F3F4F6' }}>
                {[
                  { id: 'basic',       label: 'Basic Settings' },
                  { id: 'printers',    label: 'Printers' },
                  { id: 'billcontent', label: 'Bill Content' },
                  { id: 'billstyle',   label: 'Bill Style' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStep2Tab(tab.id)}
                    data-testid={`step2-tab-${tab.id}`}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
                    style={{
                      backgroundColor: step2Tab === tab.id ? '#FFFFFF' : 'transparent',
                      color: step2Tab === tab.id ? COLORS.darkText : COLORS.grayText,
                      boxShadow: step2Tab === tab.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Basic Print Settings — always shown */}
              {step2Tab === 'basic' && (
                <div data-testid="step2-basic-content">
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

              {/* Tabs 2/3/4: Printer configuration — Direct Printer or placeholder */}
              {step2Tab === 'printers' && (
                <div data-testid="step2-printers-content">
                  {s1.printerType === 'direct'
                    ? <StationsTab />
                    : <div className="text-center py-10 text-sm" style={{ color: COLORS.grayText }}>Printer hardware settings are managed via <strong>Settings → All Settings → Printers</strong>.</div>
                  }
                </div>
              )}
              {step2Tab === 'billcontent' && (
                <div data-testid="step2-billcontent-content">
                  {s1.printerType === 'direct'
                    ? <BillContentTab sharedState={billState} onStateChange={handleBillStateChange} />
                    : <div className="text-center py-10 text-sm" style={{ color: COLORS.grayText }}>Bill content settings are managed via <strong>Settings → All Settings → Printers</strong>.</div>
                  }
                </div>
              )}
              {step2Tab === 'billstyle' && (
                <div data-testid="step2-billstyle-content">
                  {s1.printerType === 'direct'
                    ? <BillStyleTab sharedState={billState} onStateChange={handleBillStateChange} />
                    : <div className="text-center py-10 text-sm" style={{ color: COLORS.grayText }}>Bill style settings are managed via <strong>Settings → All Settings → Printers</strong>.</div>
                  }
                </div>
              )}
            </div>
          )}
```

**Self-test:** Navigate to Step 2 — 4 tabs visible. Click "Printers" → StationsTab loads. Click "Bill Content" → BillContentTab loads. No console errors.

---

## Edit 9 — `ListFormViews.jsx`: Replace static re-export with routing gate

**File:** `src/components/panels/settings/ListFormViews.jsx`
**Location:** Lines 182–186 — the Printers section
**Note:** `useRestaurant` is already imported at line 3. `LocalPrinterSetupView` is not yet imported here.

**Current (lines 182–186):**
```javascript
// ─── Printers ───────────────────────────────────────────────────────────────
// CR-133: PrintersView rewritten as the full Printer Agent Config screen.
// Implementation lives in ./printerConfig/ — this is a thin re-export so
// SettingsPanel.jsx keeps importing the same symbol.
export { PrinterAgentConfigView as PrintersView } from "./printerConfig/PrinterAgentConfigView";
```

**Replace with:**
```javascript
// ─── Printers ───────────────────────────────────────────────────────────────
// CR-352: PrintersView routes to correct screen based on restaurant printer_agent setting.
// printerType = 'agent'  → PrinterAgentConfigView (existing behaviour)
// printerType = 'direct' → LocalPrinterSetupView  (new routing for Direct Printer restaurants)
import { PrinterAgentConfigView } from "./printerConfig/PrinterAgentConfigView";
import { LocalPrinterSetupView }  from "./localPrinter/LocalPrinterSetupView";
const PrintersViewGate = () => {
  const { restaurant } = useRestaurant();
  const isAgent = restaurant?.settings?.printerType === 'agent';
  return isAgent ? <PrinterAgentConfigView /> : <LocalPrinterSetupView />;
};
export { PrintersViewGate as PrintersView };
```

**Self-test:** Login as `owner@18march.com` → Settings → All Settings → Printers tile → `LocalPrinterSetupView` renders (3-tab header: Printers / Bill Content / Bill Style).

---

## Execution Order

Execute edits in this order to ensure each build step compiles:

```
1. Edit 1  — profileTransform.js             (isolated, compile-safe)
2. Edit 2  — restaurantSettingsTransform.js fromAPI    (isolated)
3. Edit 3  — restaurantSettingsTransform.js toAPI      (isolated)
   → Build check #1: webpack should compile clean after edits 1-3
4. Edit 4  — RestaurantSettingsPage.jsx INITIAL_FORM   (1 line)
5. Edit 5  — RestaurantSettingsPage.jsx imports        (3 lines)
6. Edit 6  — RestaurantSettingsPage.jsx state vars     (3 lines)
7. Edit 7  — RestaurantSettingsPage.jsx Step 1 JSX     (~20 lines)
8. Edit 8  — RestaurantSettingsPage.jsx Step 2 JSX     (replace block)
   → Build check #2: webpack compiles after all RestaurantSettingsPage edits
9. Edit 9  — ListFormViews.jsx routing gate            (~9 lines)
   → Build check #3: final webpack 0 new warnings
```

---

## Verification Matrix

| # | Edit | File | Verification | Manual / Auto |
|---|---|---|---|---|
| V1 | Edit 1 | profileTransform.js | Login `owner@18march.com` → console `window.__restaurantCtx?.restaurant?.settings?.printerType` → `'direct'` | Manual |
| V2 | Edit 1 | profileTransform.js | Login food court → same check → `'agent'` | Manual |
| V3 | Edits 2+3 | restaurantSettingsTransform.js | Open /restaurant-settings → Step 1 → Printer Type shows "Direct Printer" selected | Manual |
| V4 | Edits 2+3 | restaurantSettingsTransform.js | Save Step 1 → Network tab → POST body `basic.printer_agent === 'No'` | Manual |
| V5 | Edit 4 | RestaurantSettingsPage.jsx | Webpack compiles without new warnings after INITIAL_FORM edit | Auto |
| V6 | Edit 7 | RestaurantSettingsPage.jsx | Step 1 → "Printer Type" SectionCard with 2 pill buttons visible | Manual |
| V7 | Edit 7 | RestaurantSettingsPage.jsx | Click "Printer Agent" pill → green border | Manual |
| V8 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → 4 tabs visible (Basic Settings / Printers / Bill Content / Bill Style) | Manual |
| V9 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → "Printers" tab → StationsTab loads (no error) for Direct Printer account | Manual |
| V10 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → "Printers" tab → placeholder shown for Printer Agent account | Manual |
| V11 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → "Bill Content" tab → BillContentTab loads, bill toggles visible | Manual |
| V12 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → "Bill Style" tab → BillStyleTab loads, style rows visible | Manual |
| V13 | Edit 8 | RestaurantSettingsPage.jsx | Step 2 → Switch Bill Content → Bill Style → shared state preserved (no re-fetch flash) | Manual |
| V14 | Edit 9 | ListFormViews.jsx | `owner@18march.com` → Settings → Printers tile → LocalPrinterSetupView opens | Manual |
| V15 | Edit 9 | ListFormViews.jsx | Food court account → Settings → Printers tile → PrinterAgentConfigView opens | Manual |
| V16 | All | All 4 files | Webpack compiles with 0 new warnings | Auto |

---

## Post-Code Registry Checklist

Implementation agent MUST execute ALL before writing QA handover:

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f: d=json.load(f)
     items = {i['id']:i for i in d['items']}
     assert 'IMPLEMENTED' in items['CR-352']['status'], 'CR-352 not IMPLEMENTED'
     print('Registry sync: PASS')
     "

□ 2. CR_REGISTRY.md: CR-352 row updated to IMPLEMENTED

□ 3. FILE_OWNERSHIP.md: Add 4 files with CR-352 + date 2026-08-30

□ 4. CODE MARKERS: Every modified file has at least one // CR-352 comment
     grep -rn "CR-352" src/ | grep -v ".md"  → must return ≥4 lines (one per file)

□ 5. COMPILE CHECK:
     tail -5 /var/log/supervisor/frontend.out.log → "Compiled successfully"
     → 0 new warnings compared to pre-implementation
```

---

## Risk Mitigations

| Risk | Mitigation in this plan |
|---|---|
| RestaurantSettingsPage.jsx (R5) edit breaks other steps | Scope lock: only edits 4/5/6/7/8 touch this file; edits 4-6 are isolated (default + imports + state); edits 7-8 only change Step 1 JSX tail and Step 2 JSX block — no changes to Steps 3-8 or save logic |
| BillContentTab/BillStyleTab crash without billState | Shared state added in Edit 6 (`billState`, `handleBillStateChange`) before Step 2 JSX in Edit 8 — same pattern as `LocalPrinterSetupView` |
| ListFormViews.jsx gate reads undefined restaurant | Optional chaining `restaurant?.settings?.printerType` — falls back to `undefined` → `isAgent = false` → `LocalPrinterSetupView` (safe Direct Printer default) |
| `PrinterAgentConfigView` was a re-export; now it's a dynamic import | Changed from `export { ... as PrintersView }` to a named component. `SettingsPanel.jsx` line 40 maps `"printers": PrintersView` — the exported symbol name is unchanged, so SettingsPanel needs no edit |

---

*Implementation Plan complete. Awaiting Gate 4 GO from owner.*
