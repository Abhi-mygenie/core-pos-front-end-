import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettlementPanel from "../components/panels/SettlementPanel";

// CR-041: Day Closure (renamed from Settlement) as full-page route
const DayClosurePage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  return (
    <div className="flex h-screen" data-testid="day-closure-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <SettlementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default DayClosurePage;
