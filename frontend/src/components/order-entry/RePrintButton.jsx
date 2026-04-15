import { Printer } from "lucide-react";
import { COLORS } from "../../constants";

const RePrintButton = () => (
  <button 
    className="flex items-center gap-2 px-4 py-2 rounded-full border"
    style={{ borderColor: COLORS.borderGray, color: COLORS.primaryGreen }}
    data-testid="reprint-kot-btn"
  >
    <Printer className="w-4 h-4" />
    <span className="text-sm font-medium">Re-Print</span>
  </button>
);

export default RePrintButton;
