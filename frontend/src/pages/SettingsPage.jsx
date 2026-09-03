import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettingsPanel from "../components/panels/SettingsPanel";

// CR-041: Settings as full-page route (was hidden panel overlay on Dashboard)
const SettingsPage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  return (
    <div className="flex h-screen" data-testid="settings-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <SettingsPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default SettingsPage;
