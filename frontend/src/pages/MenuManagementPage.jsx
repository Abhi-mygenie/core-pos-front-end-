import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";

// CR-041: Menu Management as full-page route (was panel overlay on Dashboard)
const MenuManagementPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="menu-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <MenuManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default MenuManagementPage;
