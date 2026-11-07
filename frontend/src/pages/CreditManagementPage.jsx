import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import CreditManagementPanel from "../components/panels/CreditManagementPanel";

// CR-041: Credit Management as full-page route (was panel overlay on Dashboard)
const CreditManagementPage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  return (
    <div className="flex h-screen" data-testid="credit-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <CreditManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default CreditManagementPage;
