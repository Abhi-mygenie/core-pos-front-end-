// CR-161: Local Printer Setup — 3-tab container (printer_agent = "No")
import { useState, useCallback } from "react";
import { COLORS } from "../../../../constants";
import { StationsTab }    from "./StationsTab";
import { BillContentTab } from "./BillContentTab";  // CR-351
import { BillStyleTab }   from "./BillStyleTab";    // CR-351

const TABS = [
  { id: "printers",    label: "Printers" },     // CR-161
  { id: "billcontent", label: "Bill Content" }, // CR-351
  { id: "billstyle",   label: "Bill Style" },   // CR-351
];

export const LocalPrinterSetupView = () => {
  const [activeTab, setActiveTab] = useState("printers");
  // CR-351: shared bill config state so BillContent + BillStyle stay in sync
  const [billState, setBillState] = useState(null);
  const handleBillStateChange = useCallback((s) => setBillState(s), []);

  return (
    <div className="flex flex-col" data-testid="local-printer-setup">

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: activeTab === t.id ? "#FFFFFF" : "transparent",
              color: activeTab === t.id ? COLORS.darkText : COLORS.grayText,
              boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
            data-testid={`local-printer-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === "printers"    && <StationsTab />}
        {activeTab === "billcontent" && <BillContentTab sharedState={billState} onStateChange={handleBillStateChange} />}  {/* CR-351 */}
        {activeTab === "billstyle"   && <BillStyleTab   sharedState={billState} onStateChange={handleBillStateChange} />}   {/* CR-351 */}
      </div>
    </div>
  );
};
