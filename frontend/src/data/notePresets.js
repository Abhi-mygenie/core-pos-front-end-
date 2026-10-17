// Note presets for Item-level and Order-level notes

export const itemLevelPresets = [
  { id: "no-onion", label: "No Onion", category: "ingredient" },
  { id: "no-garlic", label: "No Garlic", category: "ingredient" },
  { id: "less-spicy", label: "Less Spicy", category: "cooking" },
  { id: "extra-spicy", label: "Extra Spicy", category: "cooking" },
  { id: "less-salt", label: "Less Salt", category: "cooking" },
  { id: "no-cheese", label: "No Cheese", category: "ingredient" },
  { id: "jain", label: "Jain", category: "dietary" },
  { id: "well-cooked", label: "Well Cooked", category: "cooking" },
  { id: "less-oil", label: "Less Oil", category: "cooking" },
  { id: "no-coriander", label: "No Coriander", category: "ingredient" },
];

export const orderLevelPresets = [
  { id: "birthday", label: "Birthday", icon: "🎂", category: "occasion" },
  { id: "anniversary", label: "Anniversary", icon: "🎉", category: "occasion" },
  { id: "vip", label: "VIP Guest", icon: "⭐", category: "priority" },
  { id: "pack-separate", label: "Pack Separately", icon: "📦", category: "packaging" },
  { id: "rush", label: "Rush Order", icon: "⚡", category: "priority" },
  { id: "corporate", label: "Corporate", icon: "🏢", category: "type" },
  { id: "self-pickup", label: "Self Pickup", icon: "🚗", category: "delivery" },
  { id: "bill-split", label: "Bill Split", icon: "💳", category: "billing" },
  { id: "extra-napkins", label: "Extra Napkins", icon: "🧻", category: "service" },
  { id: "kids-present", label: "Kids Present", icon: "👶", category: "service" },
];

// Mock customer preferences (would come from API based on customer ID)
export const mockCustomerPreferences = {
  "MEM-2024-0001": {
    name: "Mr. Sharma",
    phone: "+91 98765 43210",
    itemPreferences: [
      { note: "Usually orders pizza with thin crust", source: "order_history" },
      { note: "Prefers less spicy food", source: "order_history" },
      { note: "Allergic to peanuts", source: "profile", isAlert: true },
    ],
    orderPreferences: [
      { note: "Regular customer - visits every weekend", source: "visit_history" },
      { note: "Prefers corner table", source: "profile" },
      { note: "Extra napkins always requested", source: "order_history" },
    ],
  },
  "MEM-2024-0002": {
    name: "Ms. Patel",
    phone: "+91 87654 32109",
    itemPreferences: [
      { note: "Strictly vegetarian", source: "profile" },
      { note: "No onion, no garlic (Jain)", source: "profile", isAlert: true },
    ],
    orderPreferences: [
      { note: "Corporate account - bill to company", source: "profile" },
      { note: "Prefers quick service", source: "order_history" },
    ],
  },
};

// Get customer preferences by ID
export const getCustomerPreferences = (customerId, type = "item") => {
  const customer = mockCustomerPreferences[customerId];
  if (!customer) return null;
  
  return {
    name: customer.name,
    preferences: type === "item" ? customer.itemPreferences : customer.orderPreferences,
  };
};
