// Centralized mock customer data for the POS application

export const mockCustomers = [
  { 
    id: "MEM-2024-0001", 
    name: "Mr. Sharma", 
    phone: "+91 98765 43210",
    birthday: "1985-03-15",
    anniversary: "2010-06-20"
  },
  { 
    id: "MEM-2024-0002", 
    name: "Ms. Patel", 
    phone: "+91 87654 32109",
    birthday: "1990-07-22",
    anniversary: null
  },
  { 
    id: "MEM-2024-0003", 
    name: "Mr. Kumar", 
    phone: "+91 76543 21098",
    birthday: "1988-11-08",
    anniversary: "2015-02-14"
  },
  { 
    id: "MEM-2024-0004", 
    name: "Mrs. Reddy", 
    phone: "+91 65432 10987",
    birthday: "1982-04-30",
    anniversary: "2008-12-25"
  },
  { 
    id: "MEM-2024-0005", 
    name: "Mr. Joshi", 
    phone: "+91 54321 09876",
    birthday: "1995-09-17",
    anniversary: null
  },
];

// Lookup customer by phone
export const findCustomerByPhone = (phone) => {
  return mockCustomers.find(c => c.phone.includes(phone));
};

// Search customers by phone or name
export const searchCustomers = (query) => {
  if (!query || query.length < 3) return [];
  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(c => 
    c.phone.includes(query) || 
    c.name.toLowerCase().includes(lowerQuery)
  );
};
