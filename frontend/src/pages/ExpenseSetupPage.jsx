import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseSetupPanel from "../components/expense/ExpenseSetupPanel";

// CR-059: Expense Master Setup page
const ExpenseSetupPage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex h-screen" data-testid="expense-setup-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      {/* CR-074-B smoke-fix: removed redundant marginLeft — flex-1 already accounts for sidebar width */}
      <main className="flex-1 overflow-auto bg-[#F7F7F7]">
        <ExpenseSetupPanel />
      </main>
    </div>
  );
};

export default ExpenseSetupPage;
