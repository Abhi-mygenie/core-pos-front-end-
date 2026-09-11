// Mock order items for tables
export const mockOrderItems = {
  "T18": {
    waiter: "Ravi",
    customer: "Mr. Gupta",
    phone: "+91 98765 12345",
    items: [
      { id: 1, name: "Paneer Momo (Steam)", qty: 1, status: "preparing", time: 12 },
      { id: 2, name: "Chilli Momo Gravy Veg", qty: 1, status: "ready", time: 5 },
      { id: 3, name: "masala maggie", qty: 1, status: "ready", time: 8 },
      { id: 4, name: "Hazelnut Cold Coffee", qty: 1, status: "served", time: 15 },
      { id: 5, name: "Chilly Mushroom", qty: 1, status: "served", time: 18 },
      { id: 6, name: "Garlic Bread", qty: 2, status: "served", time: 20 },
    ]
  },
  "T20": {
    waiter: "Priya",
    customer: "Mr. Verma",
    phone: "+91 91234 56789",
    items: [
      { id: 1, name: "Masala Dosa", qty: 2, status: "pending", time: 0 },
      { id: 2, name: "Filter Coffee", qty: 2, status: "pending", time: 0 },
      { id: 3, name: "Idli Sambar", qty: 1, status: "pending", time: 0 },
    ]
  },
  "T5": {
    waiter: "Amit",
    customer: "Mrs. Mehta",
    phone: "+91 87654 32109",
    items: [
      { id: 1, name: "Butter Chicken", qty: 1, status: "served", time: 25 },
      { id: 2, name: "Naan", qty: 3, status: "served", time: 22 },
      { id: 3, name: "Dal Makhani", qty: 1, status: "served", time: 20 },
    ]
  },
  "T2": {
    waiter: "Suresh",
    customer: "",
    phone: "",
    items: [
      { id: 1, name: "Veg Biryani", qty: 2, status: "preparing", time: 8 },
      { id: 2, name: "Raita", qty: 2, status: "ready", time: 3 },
    ]
  },
  "P4": {
    waiter: "Ravi",
    customer: "Mr. Singh",
    phone: "+91 76543 21098",
    items: [
      { id: 1, name: "Fish & Chips", qty: 1, status: "ready", time: 4 },
      { id: 2, name: "Mojito", qty: 2, status: "served", time: 10 },
    ]
  },
  "B1": {
    waiter: "Vikram",
    customer: "",
    phone: "",
    items: [
      { id: 1, name: "Whiskey Sour", qty: 2, status: "ready", time: 2 },
      { id: 2, name: "Nachos", qty: 1, status: "preparing", time: 6 },
    ]
  },
  "B2": {
    waiter: "Vikram",
    customer: "Ms. Kapoor",
    phone: "+91 99887 76655",
    items: [
      { id: 1, name: "Beer Tower", qty: 1, status: "served", time: 15 },
      { id: 2, name: "Chicken Wings", qty: 1, status: "ready", time: 3 },
    ]
  },
  "TR1": {
    waiter: "Neha",
    customer: "Mr. Desai",
    phone: "+91 88776 55443",
    items: [
      { id: 1, name: "Tandoori Platter", qty: 1, status: "preparing", time: 10 },
      { id: 2, name: "Mint Lemonade", qty: 2, status: "served", time: 12 },
    ]
  },
  "TR5": {
    waiter: "Neha",
    customer: "Ms. Iyer",
    phone: "+91 77665 44332",
    items: [
      { id: 1, name: "Caesar Salad", qty: 1, status: "served", time: 30 },
      { id: 2, name: "Pasta Alfredo", qty: 1, status: "served", time: 25 },
    ]
  },
  "G1": {
    waiter: "Rahul",
    customer: "Mr. Bhat",
    phone: "+91 66554 33221",
    items: [
      { id: 1, name: "Grilled Chicken", qty: 1, status: "preparing", time: 15 },
      { id: 2, name: "Iced Tea", qty: 2, status: "served", time: 20 },
    ]
  },
};

// Mock tables data with areas, capacity, status
export const mockTables = {
  restaurant: {
    name: "Restaurant",
    prefix: "T",
    tables: [
      { id: "T1", status: "reserved", capacity: 4, reservedFor: "Mr. Sharma", reservedTime: "8:00 PM" },
      { id: "T2", status: "occupied", capacity: 2, time: "45 min", amount: 1520 },
      { id: "T3", status: "paid", capacity: 4, time: "60 min", amount: 1250 },
      { id: "T4", status: "available", capacity: 6 },
      { id: "T5", status: "billReady", capacity: 4, time: "52 min", amount: 2831 },
      { id: "T6", status: "available", capacity: 2 },
      { id: "T7", status: "available", capacity: 4 },
      { id: "T8", status: "available", capacity: 4 },
      { id: "T9", status: "occupied", capacity: 6, time: "25 min", amount: 3200 },
      { id: "T10", status: "available", capacity: 2 },
      { id: "T11", status: "available", capacity: 4 },
      { id: "T12", status: "occupied", capacity: 4, time: "15 min", amount: 890 },
      { id: "T13", status: "available", capacity: 2 },
      { id: "T14", status: "available", capacity: 6 },
      { id: "T15", status: "reserved", capacity: 4, reservedFor: "Ms. Kumar", reservedTime: "9:00 PM" },
      { id: "T16", status: "available", capacity: 4 },
      { id: "T17", status: "available", capacity: 2 },
      { id: "T18", status: "occupied", capacity: 4, time: "35 min", amount: 2831 },
      { id: "T19", status: "available", capacity: 4 },
      { id: "T20", status: "yetToConfirm", capacity: 4, time: "Just now", amount: 1200 },
    ]
  },
  poolSide: {
    name: "Pool Side",
    prefix: "P",
    tables: [
      { id: "P1", status: "reserved", capacity: 4, reservedFor: "Ms. Patel", reservedTime: "9:00 PM" },
      { id: "P2", status: "available", capacity: 4 },
      { id: "P3", status: "occupied", capacity: 4, time: "20 min", amount: 1850 },
      { id: "P4", status: "occupied", capacity: 4, time: "35 min", amount: 2831 },
      { id: "P5", status: "available", capacity: 2 },
      { id: "P6", status: "available", capacity: 6 },
      { id: "P7", status: "billReady", capacity: 4, time: "40 min", amount: 3200 },
      { id: "P8", status: "available", capacity: 4 },
      { id: "P9", status: "available", capacity: 2 },
      { id: "P10", status: "occupied", capacity: 4, time: "10 min", amount: 560 },
    ]
  },
  bar: {
    name: "Bar",
    prefix: "B",
    tables: [
      { id: "B1", status: "occupied", capacity: 2, time: "35 min", amount: 2831 },
      { id: "B2", status: "occupied", capacity: 2, time: "40 min", amount: 850 },
      { id: "B3", status: "available", capacity: 2 },
      { id: "B4", status: "available", capacity: 4 },
      { id: "B5", status: "occupied", capacity: 2, time: "15 min", amount: 1200 },
      { id: "B6", status: "available", capacity: 2 },
      { id: "B7", status: "available", capacity: 4 },
      { id: "B8", status: "billReady", capacity: 2, time: "55 min", amount: 4500 },
      { id: "B9", status: "available", capacity: 2 },
      { id: "B10", status: "available", capacity: 4 },
      { id: "B11", status: "occupied", capacity: 2, time: "25 min", amount: 1800 },
      { id: "B12", status: "available", capacity: 2 },
      { id: "B13", status: "available", capacity: 2 },
      { id: "B14", status: "reserved", capacity: 4, reservedFor: "Mr. Rao", reservedTime: "10:00 PM" },
      { id: "B15", status: "available", capacity: 2 },
    ]
  },
  terrace: {
    name: "Terrace",
    prefix: "TR",
    tables: [
      { id: "TR1", status: "occupied", capacity: 4, time: "20 min", amount: 950 },
      { id: "TR2", status: "reserved", capacity: 6, reservedFor: "Mr. Joshi", reservedTime: "7:30 PM" },
      { id: "TR3", status: "available", capacity: 4 },
      { id: "TR4", status: "available", capacity: 4 },
      { id: "TR5", status: "billReady", capacity: 4, time: "45 min", amount: 620 },
      { id: "TR6", status: "available", capacity: 6 },
      { id: "TR7", status: "available", capacity: 4 },
      { id: "TR8", status: "occupied", capacity: 4, time: "30 min", amount: 2100 },
      { id: "TR9", status: "available", capacity: 2 },
      { id: "TR10", status: "available", capacity: 4 },
    ]
  },
  garden: {
    name: "Garden",
    prefix: "G",
    tables: [
      { id: "G1", status: "occupied", capacity: 6, time: "30 min", amount: 1200 },
      { id: "G2", status: "available", capacity: 4 },
      { id: "G3", status: "reserved", capacity: 6, reservedFor: "Mrs. Reddy", reservedTime: "8:30 PM" },
      { id: "G4", status: "available", capacity: 4 },
      { id: "G5", status: "available", capacity: 8 },
      { id: "G6", status: "occupied", capacity: 4, time: "15 min", amount: 780 },
      { id: "G7", status: "available", capacity: 6 },
      { id: "G8", status: "billReady", capacity: 4, time: "50 min", amount: 3400 },
    ]
  }
};

// 0-area scenario: 60 tables with no area segregation
const generateFlatTables = (count) => {
  const statuses = ["available", "occupied", "reserved", "billReady", "paid", "yetToConfirm"];
  const names = ["Mr. Sharma", "Ms. Patel", "Mr. Gupta", "Mrs. Mehta", "Mr. Singh", "Ms. Kapoor", "Mr. Desai", "Mrs. Reddy", "Mr. Verma", "Mr. Joshi"];
  const result = [];
  for (let i = 1; i <= count; i++) {
    const status = i <= 12 ? statuses[i % statuses.length] : "available";
    const table = { id: `T${i}`, status };
    if (status === "occupied" || status === "billReady" || status === "paid" || status === "yetToConfirm") {
      table.time = `${10 + (i * 7) % 50} min`;
      table.amount = 1000 + (i * 1300) % 28000;
    }
    if (status === "reserved") {
      table.reservedFor = names[i % names.length];
      table.reservedTime = `${7 + (i % 4)}:${i % 2 === 0 ? '00' : '30'} PM`;
    }
    result.push(table);
  }
  return result;
};

export const mockFlatTables = generateFlatTables(60);
