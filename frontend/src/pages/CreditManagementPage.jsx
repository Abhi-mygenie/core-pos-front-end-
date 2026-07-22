import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import CreditManagementPanel from "../components/panels/CreditManagementPanel";

// CR-041: Credit Management as full-page route (was panel overlay on Dashboard)
const CreditManagementPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="credit-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <CreditManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default CreditManagementPage;
