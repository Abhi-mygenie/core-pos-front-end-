import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseEntryPanel from "../components/expense/ExpenseEntryPanel";

// CR-059: Daily Expense Entry page
const ExpenseEntryPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="expense-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      {/* CR-074-B smoke-fix: removed redundant marginLeft — flex-1 already accounts for sidebar width */}
      <main className="flex-1 overflow-auto bg-[#F7F7F7]">
        <ExpenseEntryPanel />
      </main>
    </div>
  );
};

export default ExpenseEntryPage;
