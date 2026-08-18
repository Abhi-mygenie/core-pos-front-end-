// CR-133-GAP: Print Style tab — Windows/Android split (G5+G6) + allow-empty inputs (G4 fix)
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { COLORS } from "../../../../constants";
import { SelectInput, SectionTitle } from "../shared";

const humanize = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// G4 fix: allow clearing value to retype; clamp to min/max on blur
// BUG-315: local display state — allows clearing to retype without snap-back
const StyleInput = ({ value, onChange, min, max, step, testId }) => {
  const [localVal, setLocalVal] = useState(value != null ? String(value) : '');
  useEffect(() => { setLocalVal(value != null ? String(value) : ''); }, [value]);
  return (
    <input
      type="number"
      step={step ?? 0.5}
      value={localVal}
      onChange={(e) => {
        setLocalVal(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parseFloat(localVal);
        const minV = min ?? 0;
        const clamped = Number.isFinite(n) ? Math.max(minV, max != null ? Math.min(max, n) : n) : minV;
        onChange(clamped);
        setLocalVal(String(clamped));
      }}
      min={min}
      max={max}
      className="w-16 px-2 py-1 text-xs rounded border outline-none text-center"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={testId}
    />
  );
};

// G5+G6: RowEditor edits only the active platform sub-object (windows or android)
const RowEditor = ({ rowKey, row, onChange, platform }) => {
  const isAndroid = platform === 'android';
  const pd = row?.[platform] || {};
  const minV = isAndroid ? 1 : 0;
  const maxV = isAndroid ? 8 : undefined;
  const stepV = isAndroid ? 1 : 0.5;

  const patch = (field, val) =>
    onChange({ ...row, [platform]: { ...(row?.[platform] || {}), [field]: val } });

  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
      <span className="flex-1 text-xs truncate" style={{ color: COLORS.darkText }}>{humanize(rowKey)}</span>
      <StyleInput value={pd.fontSize58 ?? minV} onChange={(v) => patch('fontSize58', v)} min={minV} max={maxV} step={stepV} testId={`style-row-${rowKey}-58mm`} />
      <StyleInput value={pd.fontSize80 ?? minV} onChange={(v) => patch('fontSize80', v)} min={minV} max={maxV} step={stepV} testId={`style-row-${rowKey}-80mm`} />
      <button
        onClick={() => patch('bold', !pd.bold)}
        className="w-8 h-7 text-xs font-bold rounded border"
        style={{
          borderColor: pd.bold ? COLORS.primaryOrange : COLORS.borderGray,
          backgroundColor: pd.bold ? "rgba(242,107,51,0.1)" : "transparent",
          color: pd.bold ? COLORS.primaryOrange : COLORS.grayText,
        }}
        data-testid={`style-row-${rowKey}-bold`}
      >B</button>
    </div>
  );
};

const StyleAccordion = ({ styleKey, style, update, config, platform }) => {
  const [open, setOpen] = useState({});
  return (
    <>
      {Object.entries(style).map(([sectionKey, rows]) => (
        <div key={sectionKey} className="rounded-lg border mb-2" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))}
            className="w-full flex items-center justify-between px-3 py-2.5"
            data-testid={`style-section-${styleKey}-${sectionKey}`}
          >
            <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>{humanize(sectionKey)}</span>
            {open[sectionKey] ? <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} /> : <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />}
          </button>
          {open[sectionKey] && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 py-1 text-[10px] font-medium" style={{ color: COLORS.grayText }}>
                <span className="flex-1">Field</span>
                <span className="w-16 text-center">58mm</span>
                <span className="w-16 text-center">80mm</span>
                <span className="w-8 text-center">Bold</span>
              </div>
              {Object.entries(rows).map(([rowKey, row]) => (
                <RowEditor
                  key={rowKey}
                  rowKey={rowKey}
                  row={row}
                  platform={platform}
                  onChange={(next) =>
                    update({
                      [styleKey]: {
                        ...config[styleKey],
                        [sectionKey]: { ...config[styleKey][sectionKey], [rowKey]: next },
                      },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export const PrintStyleTab = ({ config, update }) => {
  const [subTab,   setSubTab]   = useState("bill");
  const [platform, setPlatform] = useState("windows");
  const { options } = config;
  const isAndroid = platform === 'android';
  const maxScale  = (config.androidScaleRange ?? [1, 8])[1];

  return (
    <div data-testid="print-style-tab">
      <SectionTitle title="Global Typography" />
      <div className="grid grid-cols-2 gap-3">
        <SelectInput label="Font Family" value={config.fontFamily} onChange={(v) => update({ fontFamily: v })} options={options.fonts.map((f) => ({ value: f, label: f }))} />
        <SelectInput label="Divider Line" value={config.dividerLineStyle} onChange={(v) => update({ dividerLineStyle: v })} options={options.dividerStyles.map((d) => ({ value: d, label: d }))} />
      </div>

      {/* Global sizes — Windows + Android side by side */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {/* Windows card */}
        <div className="rounded-lg border p-3" style={{ borderColor: COLORS.borderGray, background: "#F9FAFB" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.primaryOrange }}>🖥 Windows</div>
          <SectionTitle title="Page Margins (mm)" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {["top", "bottom", "left", "right"].map((side) => (
              <div key={side} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: COLORS.grayText }}>{humanize(side)}</span>
                <StyleInput value={config.pageMargins[side]} onChange={(v) => update({ pageMargins: { ...config.pageMargins, [side]: v } })} min={0} step={1} testId={`margin-${side}`} />
              </div>
            ))}
          </div>
          <SectionTitle title="Logo & QR (mm)" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Logo W</span><StyleInput value={config.logoSize.width}    onChange={(v) => update({ logoSize: { ...config.logoSize, width: v }     })} min={0} step={1} testId="logo-w" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Logo H</span><StyleInput value={config.logoSize.height}   onChange={(v) => update({ logoSize: { ...config.logoSize, height: v }    })} min={0} step={1} testId="logo-h" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>UPI QR</span><StyleInput value={config.qrSize.upi}        onChange={(v) => update({ qrSize: { ...config.qrSize, upi: v }            })} min={0} step={1} testId="qr-upi" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: COLORS.grayText }}>Fdbk QR</span><StyleInput value={config.qrSize.feedback}  onChange={(v) => update({ qrSize: { ...config.qrSize, feedback: v }       })} min={0} step={1} testId="qr-feedback" /></div>
          </div>
        </div>

        {/* Android card */}
        <div className="rounded-lg border p-3" style={{ borderColor: "#86efac", background: "#F0FFF4" }}>
          <div className="text-xs font-semibold mb-1" style={{ color: COLORS.primaryGreen }}>📱 Android</div>
          <div className="text-[10px] mb-3" style={{ color: COLORS.grayText }}>Min: 1</div>{/* BUG-317: removed max constraint — android absolute sizes have no upper bound */}
          <div className="space-y-2">
            {[
              { label: 'Logo Size', stateKey: 'androidLogoSize' },
              { label: 'UPI QR',    stateKey: 'androidUpiQrSize' },
              { label: 'Fdbk QR',   stateKey: 'androidFeedbackQrSize' },
            ].map(({ label, stateKey }) => (
              <div key={stateKey} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: COLORS.grayText }}>{label}</span>
                <StyleInput value={config[stateKey]} onChange={(v) => update({ [stateKey]: v })} min={1} step={1} testId={`android-${stateKey}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Styles — Bill/KOT × Windows/Android */}
      <SectionTitle title="Section Styles" />

      {/* Bill / KOT toggle */}
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {[{ id: "bill", label: "Bill" }, { id: "kot", label: "KOT" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md"
            style={{ backgroundColor: subTab === t.id ? "#FFFFFF" : "transparent", color: subTab === t.id ? COLORS.darkText : COLORS.grayText, boxShadow: subTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}
            data-testid={`style-subtab-${t.id}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Windows / Android platform toggle */}
      <div className="flex gap-0 mb-2 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray, width: 'fit-content' }}>
        {[{ id: 'windows', label: '🖥 Windows' }, { id: 'android', label: '📱 Android' }].map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className="px-4 py-1.5 text-xs font-semibold border-none cursor-pointer"
            style={{ background: platform === p.id ? COLORS.primaryOrange : '#fff', color: platform === p.id ? '#fff' : COLORS.grayText }}
            data-testid={`style-platform-${p.id}`}
          >{p.label}</button>
        ))}
      </div>

      {isAndroid && (
        <div className="text-[10px] px-2 py-1.5 rounded mb-2" style={{ background: '#F0FFF4', color: COLORS.primaryGreen, border: '1px solid #86efac' }}>
          Android scale: 1–{maxScale} · Values are scale multipliers, not pt sizes
        </div>
      )}

      {subTab === "bill" ? (
        <StyleAccordion styleKey="billStyle" style={config.billStyle} update={update} config={config} platform={platform} />
      ) : (
        <StyleAccordion styleKey="kotStyle" style={config.kotStyle} update={update} config={config} platform={platform} />
      )}

      {/* Phase 2/3 — visible-disabled per OD-8 */}
      <div className="p-3 rounded-lg opacity-60 mt-3" style={{ backgroundColor: "#F9FAFB", border: `1px dashed ${COLORS.borderGray}` }} data-testid="style-alignment-coming-soon">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Coming soon</span>
        </div>
        <p className="text-xs" style={{ color: COLORS.grayText }}>
          Text alignment, section reordering, and live receipt preview.
        </p>
      </div>
    </div>
  );
};
