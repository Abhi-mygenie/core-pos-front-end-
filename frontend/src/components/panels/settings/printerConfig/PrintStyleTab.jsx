// CR-133: Print Style tab — global typography controls + per-section per-row font size / bold
import { useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { COLORS } from "../../../../constants";
import { SelectInput, NumberInput, SectionTitle } from "../shared";

const humanize = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const RowEditor = ({ sectionKey, rowKey, row, onChange }) => (
  <div className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
    <span className="flex-1 text-xs truncate" style={{ color: COLORS.darkText }}>{humanize(rowKey)}</span>
    <input
      type="number"
      step={0.5}
      min={0}
      value={row.fontSize58}
      onChange={(e) => onChange({ ...row, fontSize58: parseFloat(e.target.value) || 0 })}
      className="w-16 px-2 py-1 text-xs rounded border outline-none text-center"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={`style-row-${rowKey}-58mm`}
    />
    <input
      type="number"
      step={0.5}
      min={0}
      value={row.fontSize80}
      onChange={(e) => onChange({ ...row, fontSize80: parseFloat(e.target.value) || 0 })}
      className="w-16 px-2 py-1 text-xs rounded border outline-none text-center"
      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
      data-testid={`style-row-${rowKey}-80mm`}
    />
    <button
      onClick={() => onChange({ ...row, bold: !row.bold })}
      className="w-8 h-7 text-xs font-bold rounded border"
      style={{
        borderColor: row.bold ? COLORS.primaryOrange : COLORS.borderGray,
        backgroundColor: row.bold ? "rgba(242,107,51,0.1)" : "transparent",
        color: row.bold ? COLORS.primaryOrange : COLORS.grayText,
      }}
      data-testid={`style-row-${rowKey}-bold`}
    >
      B
    </button>
  </div>
);

const StyleAccordion = ({ styleKey, style, update, config }) => {
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
                  sectionKey={sectionKey}
                  rowKey={rowKey}
                  row={row}
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
  const [subTab, setSubTab] = useState("bill");
  const { options } = config;

  return (
    <div data-testid="print-style-tab">
      <SectionTitle title="Global Typography" />
      <div className="grid grid-cols-2 gap-3">
        <SelectInput label="Font Family" value={config.fontFamily} onChange={(v) => update({ fontFamily: v })} options={options.fonts.map((f) => ({ value: f, label: f }))} />
        <SelectInput label="Divider Line" value={config.dividerLineStyle} onChange={(v) => update({ dividerLineStyle: v })} options={options.dividerStyles.map((d) => ({ value: d, label: d }))} />
      </div>

      <SectionTitle title="Page Margins (mm)" />
      <div className="grid grid-cols-4 gap-2">
        {["top", "bottom", "left", "right"].map((side) => (
          <NumberInput key={side} label={humanize(side)} value={config.pageMargins[side]} onChange={(v) => update({ pageMargins: { ...config.pageMargins, [side]: Math.max(0, v) } })} min={0} step={1} />
        ))}
      </div>

      <SectionTitle title="Logo & QR Size (mm)" />
      <div className="grid grid-cols-4 gap-2">
        <NumberInput label="Logo W" value={config.logoSize.width} onChange={(v) => update({ logoSize: { ...config.logoSize, width: v } })} min={0} step={1} />
        <NumberInput label="Logo H" value={config.logoSize.height} onChange={(v) => update({ logoSize: { ...config.logoSize, height: v } })} min={0} step={1} />
        <NumberInput label="UPI QR" value={config.qrSize.upi} onChange={(v) => update({ qrSize: { ...config.qrSize, upi: v } })} min={0} step={1} />
        <NumberInput label="Fdbk QR" value={config.qrSize.feedback} onChange={(v) => update({ qrSize: { ...config.qrSize, feedback: v } })} min={0} step={1} />
      </div>

      <SectionTitle title="Section Styles" />
      <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {[{ id: "bill", label: "Bill" }, { id: "kot", label: "KOT" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md"
            style={{
              backgroundColor: subTab === t.id ? "#FFFFFF" : "transparent",
              color: subTab === t.id ? COLORS.darkText : COLORS.grayText,
              boxShadow: subTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            data-testid={`style-subtab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "bill" ? (
        <StyleAccordion styleKey="billStyle" style={config.billStyle} update={update} config={config} />
      ) : (
        <StyleAccordion styleKey="kotStyle" style={config.kotStyle} update={update} config={config} />
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
