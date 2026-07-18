import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettlementPanel from "../components/panels/SettlementPanel";

// CR-041: Day Closure (renamed from Settlement) as full-page route
const DayClosurePage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="day-closure-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <SettlementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default DayClosurePage;
