import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import SettingsPanel from "../components/panels/SettingsPanel";

// CR-041: Settings as full-page route (was hidden panel overlay on Dashboard)
const SettingsPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen" data-testid="settings-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <SettingsPanel
        isOpen={true}
        onClose={() => window.history.back()}
        sidebarWidth={isSidebarExpanded ? 280 : 70}
      />
    </div>
  );
};

export default SettingsPage;
