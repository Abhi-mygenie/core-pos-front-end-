# Impact Analysis — CR-169: Live Bill/KOT Print Preview

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-18
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — design exists in `public/cr133-printer-mockup.html` (split-panel layout with right-side preview). `PrintStyleTab.jsx:214-223` has a "Coming soon" placeholder for "live receipt preview". No live-wired preview component exists. |
| Conflict Pre-Check | `PrintStyleTab.jsx` touched ONLY by CR-169 in this batch. `PrinterAgentConfigView.jsx` touched by all 4 CRs — execute LAST in sequence. No conflict on `PrintStyleTab.jsx`. |
| Risk | LOW — read-only display component, no API writes, no financial logic, no hotspot files |
| Owner Decisions | Access via Print Style tab (design already shows split-panel). Show both Bill + KOT with toggle (Q2). Use real restaurant info from config (Q3). Leave `PrinterConfigPreviewPage.jsx` as dev tool (Q4). |

---

## §1 — Design Reference

File: `public/cr133-printer-mockup.html`
Title: "CR-133 v3 — Printer Settings + Live Preview"

The Print Style tab (`#tab-3`) in this mockup already has a **split-panel layout**:
- Left side: style settings editor (380px flex)
- Right side: `.preview-panel` (340px fixed width, grey background) — live receipt preview

The "Coming soon" block in `PrintStyleTab.jsx:214-223` is the placeholder for this panel.

```jsx
// Current placeholder (to be REPLACED):
<div className="p-3 rounded-lg opacity-60 mt-3"
  style={{ backgroundColor: "#F9FAFB", border: `1px dashed ${COLORS.borderGray}` }}
  data-testid="style-alignment-coming-soon">
  <Lock className="w-3.5 h-3.5" />
  <span>Coming soon</span>
  <p>Text alignment, section reordering, and live receipt preview.</p>
</div>
```

---

## §2 — Data Flow Trace

```
PrintStyleTab receives: config (full printer agent config state)
  config.restaurantInfo = { restaurantName, phone, address, gstNumber, fssaiNumber, logoUrl }
  config.billStyle       = { restaurant_header, bill_information, item_table, amount_section, footer }
  config.kotStyle        = { kot_header, kot_information, item_table }
  config.fontFamily      = "Poppins"
  config.dividerLineStyle = "Solid" | "Dashed"

PrintPreviewPanel receives all of the above as props (passed from PrintStyleTab)

Preview renders:
  [Bill | KOT] toggle
  [58mm | 80mm] paper width toggle
  Simulated receipt using:
    - Real font family from config.fontFamily
    - Real font sizes from config.billStyle / config.kotStyle (for current paper size + platform=windows)
    - Real restaurant name, address, phone from config.restaurantInfo
    - Sample items (hardcoded: 2-3 rows)
    - Real footer text from config.billFooter.footerText

No API call needed — all data already in config prop.
Preview reflects CURRENT unsaved changes in the style editor (real-time).
```

---

## §3 — Affected Files

| File | Change | Type |
|---|---|---|
| `components/panels/settings/printerConfig/PrintPreviewPanel.jsx` | NEW — live preview component (bill/KOT, 58mm/80mm, real config data) | NEW (~150 lines) |
| `components/panels/settings/printerConfig/PrintStyleTab.jsx` | REPLACE lines 214–223 "Coming soon" block with `<PrintPreviewPanel config={config} />` inline | Replace ~10 lines with ~3 lines |

**Files NOT touched:**
- `PrinterAgentConfigView.jsx` — no structural change (preview is inside PrintStyleTab, not a new tab)
- `printerAgentConfigService.js`, `printerAgentConfigTransform.js`
- `api/constants.js` — no new endpoint
- Any order/report/hotspot file

---

## §4 — PrintPreviewPanel Component Design

```jsx
// PrintPreviewPanel.jsx

const SAMPLE_ITEMS = [
  { name: "Paneer Butter Masala", qty: 1, price: 320 },
  { name: "Garlic Naan", qty: 2, price: 60 },
  { name: "Mineral Water", qty: 1, price: 40 },
];

export const PrintPreviewPanel = ({ config }) => {
  const [previewType, setPreviewType] = useState("bill"); // "bill" | "kot"
  const [paperSize, setPaperSize] = useState("58mm");     // "58mm" | "80mm"

  const width = paperSize === "58mm" ? 220 : 300; // px — simulated paper width
  const style = previewType === "bill" ? config.billStyle : config.kotStyle;
  const fontKey = paperSize === "58mm" ? "fontSize58" : "fontSize80";

  // Helper: get font size for a section/row from style config
  const fs = (sectionKey, rowKey) =>
    style?.[sectionKey]?.[rowKey]?.windows?.[fontKey] ?? 10;

  const bold = (sectionKey, rowKey) =>
    style?.[sectionKey]?.[rowKey]?.windows?.bold ?? false;

  const subtotal = SAMPLE_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  return (
    <div className="mt-3 rounded-lg border overflow-hidden"
      style={{ borderColor: COLORS.borderGray }}
      data-testid="print-preview-panel">

      {/* Preview controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: COLORS.borderGray, backgroundColor: "#F9FAFB" }}>
        <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
          Live Preview
        </span>
        <div className="flex gap-2">
          {/* Bill / KOT toggle */}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
            {["bill", "kot"].map(t => (
              <button key={t} onClick={() => setPreviewType(t)}
                className="px-3 py-1 text-xs font-medium"
                style={{ background: previewType === t ? COLORS.primaryOrange : "#fff",
                         color: previewType === t ? "#fff" : COLORS.grayText }}
                data-testid={`preview-type-${t}`}>
                {t === "bill" ? "Bill" : "KOT"}
              </button>
            ))}
          </div>
          {/* Paper size toggle */}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
            {["58mm", "80mm"].map(p => (
              <button key={p} onClick={() => setPaperSize(p)}
                className="px-3 py-1 text-xs font-medium"
                style={{ background: paperSize === p ? COLORS.primaryOrange : "#fff",
                         color: paperSize === p ? "#fff" : COLORS.grayText }}
                data-testid={`preview-paper-${p.replace("mm","")}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt simulation */}
      <div className="flex justify-center p-4" style={{ backgroundColor: "#E5E7EB" }}>
        <div style={{ width, backgroundColor: "#fff", padding: "12px 10px",
                      fontFamily: config.fontFamily || "monospace",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>

          {previewType === "bill" ? (
            // Bill layout
            <>
              {/* Restaurant header */}
              <div className="text-center mb-2">
                <div style={{ fontSize: fs("restaurant_header","restaurant_name"),
                               fontWeight: bold("restaurant_header","restaurant_name") ? 700 : 400 }}>
                  {config.restaurantInfo?.restaurantName || "Restaurant Name"}
                </div>
                <div style={{ fontSize: fs("restaurant_header","restaurant_address") }}>
                  {config.restaurantInfo?.address || "123 Main Street"}
                </div>
                <div style={{ fontSize: fs("restaurant_header","restaurant_phone") }}>
                  {config.restaurantInfo?.phone || "+91 98765 43210"}
                </div>
              </div>
              <hr style={{ borderStyle: config.dividerLineStyle === "Dashed" ? "dashed" : "solid",
                            margin: "4px 0", borderColor: "#999" }} />

              {/* Bill info */}
              <div style={{ fontSize: fs("bill_information","row_1") }}>
                Bill No: #001234
              </div>
              <div style={{ fontSize: fs("bill_information","row_2") }}>
                Date: {new Date().toLocaleDateString('en-IN')}
              </div>
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#999" }} />

              {/* Items */}
              <div style={{ fontSize: fs("item_table","table_header"),
                             fontWeight: bold("item_table","table_header") ? 700 : 400 }}>
                Item              Qty   Amt
              </div>
              {SAMPLE_ITEMS.map(i => (
                <div key={i.name} style={{ fontSize: fs("item_table","table_content"),
                                            display: "flex", justifyContent: "space-between" }}>
                  <span>{i.name.substring(0, 18)}</span>
                  <span>{i.qty} {(i.price * i.qty).toFixed(0)}</span>
                </div>
              ))}
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#999" }} />

              {/* Totals */}
              <div style={{ fontSize: fs("amount_section","amount_breakdown"),
                             display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span><span>₹{subtotal}</span>
              </div>
              <div style={{ fontSize: fs("amount_section","amount_breakdown"),
                             display: "flex", justifyContent: "space-between" }}>
                <span>GST (5%)</span><span>₹{tax}</span>
              </div>
              <div style={{ fontSize: fs("amount_section","total"),
                             fontWeight: bold("amount_section","total") ? 700 : 400,
                             display: "flex", justifyContent: "space-between" }}>
                <span>TOTAL</span><span>₹{total}</span>
              </div>
              <hr style={{ borderStyle: "solid", margin: "4px 0", borderColor: "#999" }} />

              {/* Footer */}
              <div className="text-center mt-1" style={{ fontSize: fs("footer","footer_text") }}>
                {config.billFooter?.footerText || "Thank you for dining with us!"}
              </div>
            </>
          ) : (
            // KOT layout
            <>
              <div className="text-center mb-2" style={{
                fontSize: fs("kot_header","kot_title"),
                fontWeight: bold("kot_header","kot_title") ? 700 : 400
              }}>
                KOT
              </div>
              <div style={{ fontSize: fs("kot_information","row_1") }}>
                Table: T-05 | Order: #001234
              </div>
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#999" }} />
              {SAMPLE_ITEMS.map(i => (
                <div key={i.name} style={{ fontSize: fs("item_table","table_content"),
                                            display: "flex", justifyContent: "space-between" }}>
                  <span>{i.name.substring(0, 20)}</span>
                  <span style={{ fontWeight: 700 }}>{i.qty}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## §5 — PrintStyleTab.jsx Change

**Replace lines 214–223:**
```jsx
// BEFORE (Coming Soon placeholder):
<div className="p-3 rounded-lg opacity-60 mt-3" ... data-testid="style-alignment-coming-soon">
  <Lock .../> <span>Coming soon</span>
  <p>Text alignment, section reordering, and live receipt preview.</p>
</div>

// AFTER (CR-169: live preview panel):
<PrintPreviewPanel config={config} />  // CR-169
```

**Add import at top of PrintStyleTab.jsx:**
```js
import { PrintPreviewPanel } from "./PrintPreviewPanel";  // CR-169
```

---

## §6 — Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | Print Style tab shows preview panel below style editor | Browser |
| V2 | Bill/KOT toggle switches the preview content | Browser |
| V3 | 58mm/80mm toggle changes preview width | Browser |
| V4 | Changing font family dropdown updates preview font in real time | Browser |
| V5 | Changing a font size in style editor updates preview size in real time | Browser |
| V6 | Restaurant name from config.restaurantInfo shows in preview header | Browser |
| V7 | "Coming soon" placeholder no longer visible | Browser |
| V8 | No API call fired when toggling preview options | Browser DevTools |
| V9 | Unsaved style changes reflected in preview before saving | Browser |
| V10 | Divider line style (Solid vs Dashed) reflected in preview | Browser |

---

## §7 — Risk Register

| Risk | Level | Notes |
|---|---|---|
| Style config paths differ from expected | LOW | Trace from `config.billStyle` — already used in StyleAccordion component |
| `config.restaurantInfo` path | LOW | Confirm in printerAgentConfigTransform.js line 251 (seen as `restaurantInfo: { ... }`) |
| Preview font rendering differs from actual thermal print | NOTE | This is inherent — it's a simulation, not pixel-perfect. Owner aware. |

---

## §8 — Post-Code Registry Checklist

```
□ registry.json: CR-169 → IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: PrintPreviewPanel.jsx + PrintStyleTab.jsx entries
□ Code markers: // CR-169 in both files
□ Webpack: 0 new warnings
□ data-testid on all interactive elements in preview panel
```

**Impact Analysis: COMPLETE**
**Files WILL change:** `PrintStyleTab.jsx` (replace 10 lines with 3)
**Files NEW:** `PrintPreviewPanel.jsx` (~150 lines)
**Files WILL NOT touch:** All API, service, transform, order, report files
**Next:** Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
