import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";

// CR-041: Menu Management as full-page route (was panel overlay on Dashboard)
const MenuManagementPage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  return (
    <div className="flex h-screen" data-testid="menu-management-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <MenuManagementPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default MenuManagementPage;
