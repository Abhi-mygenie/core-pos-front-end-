import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseEntryPanel from "../components/expense/ExpenseEntryPanel";

// CR-059: Daily Expense Entry page
const ExpenseEntryPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="expense-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main
        className="flex-1 overflow-auto bg-[#F7F7F7]"
        style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}
      >
        <ExpenseEntryPanel />
      </main>
    </div>
  );
};

export default ExpenseEntryPage;
