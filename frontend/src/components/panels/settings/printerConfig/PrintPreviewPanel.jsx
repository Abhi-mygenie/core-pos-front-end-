// CR-169: Live Bill/KOT Print Preview — replaces "Coming soon" in PrintStyleTab
// Read-only simulation using real config data. No API calls needed.
import { useState } from "react";
import { COLORS } from "../../../../constants";

const SAMPLE_ITEMS = [
  { name: "Paneer Butter Masala", qty: 1, price: 320 },
  { name: "Garlic Naan",          qty: 2, price:  60 },
  { name: "Mineral Water",        qty: 1, price:  40 },
];

const subtotal = SAMPLE_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
const tax      = Math.round(subtotal * 0.05);
const total    = subtotal + tax;

export const PrintPreviewPanel = ({ config }) => {
  const [previewType, setPreviewType] = useState("bill"); // "bill" | "kot"
  const [paperSize,   setPaperSize]   = useState("58mm"); // "58mm" | "80mm"

  const width = paperSize === "58mm" ? 220 : 296;

  // Helper: get font size from billStyle / kotStyle for current platform
  const styleKey = previewType === "bill" ? "billStyle" : "kotStyle";
  const style    = config?.[styleKey] || {};
  const platform = "windows";

  const fs = (sectionKey, rowKey) => {
    const row = style?.[sectionKey]?.[rowKey]?.[platform] || {};
    return (row.fontSize58 ?? row.size ?? 10) + "px";
  };
  const bold = (sectionKey, rowKey) => {
    const row = style?.[sectionKey]?.[rowKey]?.[platform] || {};
    return row.bold ? 700 : 400;
  };

  const fontFamily    = config?.fontFamily || "monospace";
  const dividerStyle  = config?.dividerLineStyle === "Dashed" ? "dashed" : "solid";
  const restaurantName = config?.restaurantInfo?.restaurantName || "Restaurant Name";
  const address        = config?.restaurantInfo?.address        || "123 Main Street, City";
  const phone          = config?.restaurantInfo?.phone          || "+91 98765 43210";
  const footerText     = config?.billFooter?.footerText         || "Thank you for dining with us!";

  return (
    <div className="mt-3 rounded-lg border overflow-hidden" style={{ borderColor: COLORS.borderGray }}
      data-testid="print-preview-panel">

      {/* Controls bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: COLORS.borderGray, backgroundColor: "#F9FAFB" }}>
        <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>Live Preview</span>
        <div className="flex gap-2">
          {/* Bill / KOT */}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
            {["bill", "kot"].map(t => (
              <button key={t} onClick={() => setPreviewType(t)}
                className="px-3 py-1 text-xs font-medium"
                style={{
                  background: previewType === t ? COLORS.primaryOrange : "#fff",
                  color:      previewType === t ? "#fff" : COLORS.grayText,
                }}
                data-testid={`preview-type-${t}`}>
                {t === "bill" ? "Bill" : "KOT"}
              </button>
            ))}
          </div>
          {/* Paper size */}
          <div className="flex rounded overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
            {["58mm", "80mm"].map(p => (
              <button key={p} onClick={() => setPaperSize(p)}
                className="px-3 py-1 text-xs font-medium"
                style={{
                  background: paperSize === p ? COLORS.primaryOrange : "#fff",
                  color:      paperSize === p ? "#fff" : COLORS.grayText,
                }}
                data-testid={`preview-paper-${p.replace("mm", "")}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt simulation */}
      <div className="flex justify-center p-4" style={{ backgroundColor: "#E5E7EB" }}>
        <div style={{
          width, backgroundColor: "#fff", padding: "12px 10px",
          fontFamily, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          {previewType === "bill" ? (
            <>
              {/* Header */}
              <div className="text-center mb-2">
                <div style={{ fontSize: fs("restaurant_header", "restaurant_name"), fontWeight: bold("restaurant_header", "restaurant_name") }}>
                  {restaurantName}
                </div>
                <div style={{ fontSize: fs("restaurant_header", "restaurant_address") }}>{address}</div>
                <div style={{ fontSize: fs("restaurant_header", "restaurant_phone") }}>{phone}</div>
              </div>
              <hr style={{ borderStyle: dividerStyle, margin: "4px 0", borderColor: "#aaa" }} />

              {/* Bill info */}
              <div style={{ fontSize: fs("bill_information", "row_1") }}>Bill No: #001234</div>
              <div style={{ fontSize: fs("bill_information", "row_2") }}>Date: {new Date().toLocaleDateString("en-IN")}</div>
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#aaa" }} />

              {/* Items */}
              <div style={{ fontSize: fs("item_table", "table_header"), fontWeight: bold("item_table", "table_header"),
                display: "flex", justifyContent: "space-between" }}>
                <span>Item</span><span>Amt</span>
              </div>
              {SAMPLE_ITEMS.map(i => (
                <div key={i.name} style={{ fontSize: fs("item_table", "table_content"),
                  display: "flex", justifyContent: "space-between" }}>
                  <span>{i.name.substring(0, 20)}</span>
                  <span>₹{i.price * i.qty}</span>
                </div>
              ))}
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#aaa" }} />

              {/* Totals */}
              <div style={{ fontSize: fs("amount_section", "amount_breakdown"),
                display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span><span>₹{subtotal}</span>
              </div>
              <div style={{ fontSize: fs("amount_section", "amount_breakdown"),
                display: "flex", justifyContent: "space-between" }}>
                <span>GST (5%)</span><span>₹{tax}</span>
              </div>
              <div style={{ fontSize: fs("amount_section", "total"),
                fontWeight: bold("amount_section", "total"),
                display: "flex", justifyContent: "space-between" }}>
                <span>TOTAL</span><span>₹{total}</span>
              </div>
              <hr style={{ borderStyle: "solid", margin: "4px 0", borderColor: "#aaa" }} />
              <div className="text-center mt-1" style={{ fontSize: fs("footer", "footer_text") }}>
                {footerText}
              </div>
            </>
          ) : (
            <>
              {/* KOT */}
              <div className="text-center mb-2"
                style={{ fontSize: fs("kot_header", "kot_title"), fontWeight: bold("kot_header", "kot_title") }}>
                KOT
              </div>
              <div style={{ fontSize: fs("kot_information", "row_1") }}>Table: T-05 | Order: #001234</div>
              <hr style={{ borderStyle: "dashed", margin: "4px 0", borderColor: "#aaa" }} />
              {SAMPLE_ITEMS.map(i => (
                <div key={i.name} style={{ fontSize: fs("item_table", "table_content"),
                  display: "flex", justifyContent: "space-between" }}>
                  <span>{i.name.substring(0, 22)}</span>
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
