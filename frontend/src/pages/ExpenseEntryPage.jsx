import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseEntryPanel from "../components/expense/ExpenseEntryPanel";

// CR-059: Daily Expense Entry page
const ExpenseEntryPage = () => {
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  return (
    <div className="flex h-screen" data-testid="expense-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      {/* CR-074-B smoke-fix: removed redundant marginLeft — flex-1 already accounts for sidebar width */}
      <main className="flex-1 overflow-auto bg-[#F7F7F7]">
        <ExpenseEntryPanel />
      </main>
    </div>
  );
};

export default ExpenseEntryPage;
