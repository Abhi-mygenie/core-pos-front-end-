// Mock Discount Types for Bill Summary
export const discountTypes = [
  { id: "none", name: "No Discount" },
  { id: "happy_hour", name: "Happy Hour", defaultPercent: 10 },
  { id: "staff", name: "Staff Discount", defaultPercent: 15 },
  { id: "manager", name: "Manager Discount", defaultPercent: 20 },
  { id: "festival", name: "Festival Offer", defaultPercent: 10 },
  { id: "loyalty_program", name: "Loyalty Program", defaultPercent: 5 },
  { id: "first_order", name: "First Order", defaultPercent: 10 },
  { id: "bulk_order", name: "Bulk Order", defaultPercent: 15 },
];

// Tax rates - GST split into SGST and CGST (2.5% each = 5% total)
export const TAX_RATES = {
  SGST: 0.025,    // 2.5% State GST for food
  CGST: 0.025,    // 2.5% Central GST for food
  VAT: 0.20,      // 20% VAT for alcohol
};

// Service charge rate (configurable)
export const SERVICE_CHARGE_RATE = 0.10; // 10%
