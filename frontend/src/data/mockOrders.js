// Mock Delivery Orders
// Order Status: yetToConfirm, preparing, ready, dispatched, delivered
// Rider Status: lookingForRider, riderAssigned, riderReached
export const mockDeliveryOrders = [
  {
    id: "D001",
    orderType: "delivery",
    source: "swiggy",
    customer: "Rahul Kumar",
    phone: "+91 98765 43210",
    address: "123, MG Road, Sector 5",
    time: "15 min",
    amount: 1250,
    status: "preparing",
    riderStatus: "riderAssigned",
    rider: "Amit",
    riderPhone: "9876543210",
    otp: "4365",
    items: [
      { id: 1, name: "Butter Chicken", qty: 1, status: "preparing" },
      { id: 2, name: "Naan", qty: 4, status: "ready" },
      { id: 3, name: "Raita", qty: 1, status: "ready" },
    ]
  },
  {
    id: "D002",
    orderType: "delivery",
    source: "zomato",
    customer: "Priya Sharma",
    phone: "+91 87654 32109",
    address: "45, Green Park, Block B",
    time: "25 min",
    amount: 890,
    status: "ready",
    riderStatus: "riderReached",
    rider: "Vikash",
    riderPhone: "8765432109",
    otp: "2847",
    items: [
      { id: 1, name: "Veg Biryani", qty: 2, status: "ready" },
      { id: 2, name: "Paneer Tikka", qty: 1, status: "ready" },
    ]
  },
  {
    id: "D003",
    orderType: "delivery",
    source: "own",
    customer: "Amit Verma",
    phone: "+91 76543 21098",
    address: "78, Lajpat Nagar",
    time: "10 min",
    amount: 2100,
    status: "yetToConfirm",
    riderStatus: "lookingForRider",
    rider: "",
    riderPhone: "",
    otp: "",
    items: [
      { id: 1, name: "Fish Curry", qty: 1, status: "preparing" },
      { id: 2, name: "Prawn Masala", qty: 1, status: "preparing" },
      { id: 3, name: "Rice", qty: 2, status: "ready" },
    ]
  },
  {
    id: "D004",
    orderType: "delivery",
    source: "swiggy",
    customer: "Neha Gupta",
    phone: "+91 99887 76655",
    address: "22, Connaught Place",
    time: "5 min",
    amount: 1580,
    status: "dispatched",
    riderStatus: "riderAssigned",
    rider: "Raju",
    riderPhone: "9988776655",
    otp: "7821",
    items: [
      { id: 1, name: "Pasta", qty: 2, status: "ready" },
      { id: 2, name: "Garlic Bread", qty: 1, status: "ready" },
    ]
  },
];

// Mock TakeAway Orders
export const mockTakeAwayOrders = [
  {
    id: "TA01",
    orderType: "takeAway",
    source: "own",
    customer: "Sneha Reddy",
    phone: "+91 65432 10987",
    time: "20 min",
    amount: 750,
    status: "ready",
    otp: "1234",
    items: [
      { id: 1, name: "Hakka Noodles", qty: 2, status: "ready" },
      { id: 2, name: "Manchurian", qty: 1, status: "ready" },
    ]
  },
  {
    id: "TA02",
    orderType: "takeAway",
    source: "swiggy",
    customer: "Karan Singh",
    phone: "+91 54321 09876",
    time: "12 min",
    amount: 1450,
    status: "preparing",
    otp: "",
    items: [
      { id: 1, name: "Chicken Biryani", qty: 1, status: "preparing" },
      { id: 2, name: "Kebab Platter", qty: 1, status: "preparing" },
      { id: 3, name: "Cold Drink", qty: 2, status: "ready" },
    ]
  },
];
