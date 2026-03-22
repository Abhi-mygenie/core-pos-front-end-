// Centralized mock customer data for the POS application

export const mockCustomers = [
  { 
    id: "MEM-2024-0001", 
    name: "Mr. Sharma", 
    phone: "+91 98765 43210",
    birthday: "1985-03-15",
    anniversary: "2010-06-20",
    // Payment/Rewards fields used by CollectPaymentPanel
    coupons: [
      { code: "WELCOME20", discount: 20, type: "percent", minOrder: 500 },
      { code: "FLAT100", discount: 100, type: "flat", minOrder: 1000 }
    ],
    loyaltyPoints: 450,
    walletBalance: 1200
  },
  { 
    id: "MEM-2024-0002", 
    name: "Ms. Patel", 
    phone: "+91 87654 32109",
    birthday: "1990-07-22",
    anniversary: null,
    coupons: [
      { code: "SUMMER15", discount: 15, type: "percent", minOrder: 300 }
    ],
    loyaltyPoints: 200,
    walletBalance: 500
  },
  { 
    id: "MEM-2024-0003", 
    name: "Mr. Kumar", 
    phone: "+91 76543 21098",
    birthday: "1988-11-08",
    anniversary: "2015-02-14",
    coupons: [],
    loyaltyPoints: 1200,
    walletBalance: 2500
  },
  { 
    id: "MEM-2024-0004", 
    name: "Mrs. Reddy", 
    phone: "+91 65432 10987",
    birthday: "1982-04-30",
    anniversary: "2008-12-25",
    coupons: [
      { code: "BIRTHDAY50", discount: 50, type: "percent", minOrder: 0 }
    ],
    loyaltyPoints: 800,
    walletBalance: 0
  },
  { 
    id: "MEM-2024-0005", 
    name: "Mr. Joshi", 
    phone: "+91 54321 09876",
    birthday: "1995-09-17",
    anniversary: null,
    coupons: [],
    loyaltyPoints: 50,
    walletBalance: 150
  },
];

// Search customers by phone or name
export const searchCustomers = (query) => {
  if (!query || query.length < 3) return [];
  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(c => 
    c.phone.includes(query) || 
    c.name.toLowerCase().includes(lowerQuery)
  );
};

// Get customer by ID (for linking from orders)
export const getCustomerById = (id) => {
  return mockCustomers.find(c => c.id === id) || null;
};
