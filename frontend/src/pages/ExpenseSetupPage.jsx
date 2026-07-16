import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseSetupPanel from "../components/expense/ExpenseSetupPanel";

// CR-059: Expense Master Setup page
const ExpenseSetupPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="expense-setup-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main
        className="flex-1 overflow-auto bg-[#F7F7F7]"
        style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}
      >
        <ExpenseSetupPanel />
      </main>
    </div>
  );
};

export default ExpenseSetupPage;
