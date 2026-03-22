// Mock data for rooms
export const mockRooms = {
  deluxe: {
    name: "Deluxe Rooms",
    prefix: "D",
    rooms: [
      { 
        id: "D101", 
        type: "Deluxe",
        status: "checkedIn", 
        guestName: "Mr. Rajesh Kumar",
        guests: { adults: 2, children: 1 },
        checkIn: "18 Mar, 2:00 PM",
        checkOut: "20 Mar, 11:00 AM",
        rate: 4500,
        total: 9000,
        paymentStatus: "paid",
        bookingSource: "booking.com",
        phone: "+91 98765 43210",
        requests: "Late checkout, Extra pillows"
      },
      { 
        id: "D102", 
        type: "Deluxe",
        status: "reserved", 
        guestName: "Ms. Priya Sharma",
        guests: { adults: 2, children: 0 },
        checkIn: "19 Mar, 1:00 PM",
        checkOut: "21 Mar, 11:00 AM",
        rate: 4500,
        total: 9000,
        paymentStatus: "pending",
        bookingSource: "airbnb",
        phone: "+91 87654 32109",
        requests: ""
      },
      { 
        id: "D103", 
        type: "Deluxe",
        status: "housekeeping", 
        guestName: "",
        lastGuest: "Mr. John Doe",
        checkOut: "18 Mar, 10:30 AM",
      },
      { 
        id: "D104", 
        type: "Deluxe",
        status: "available", 
      },
      { 
        id: "D105", 
        type: "Deluxe",
        status: "available", 
      },
    ]
  },
  suite: {
    name: "Suites",
    prefix: "S",
    rooms: [
      { 
        id: "S201", 
        type: "Suite",
        status: "checkedIn", 
        guestName: "Mr. Amit Patel",
        guests: { adults: 2, children: 2 },
        checkIn: "17 Mar, 3:00 PM",
        checkOut: "22 Mar, 11:00 AM",
        rate: 8500,
        total: 42500,
        paymentStatus: "paid",
        bookingSource: "website",
        phone: "+91 99887 76655",
        requests: "Airport pickup, Baby crib"
      },
      { 
        id: "S202", 
        type: "Suite",
        status: "checkedOut", 
        guestName: "Ms. Sarah Wilson",
        checkOut: "18 Mar, 11:00 AM",
        paymentStatus: "paid",
      },
      { 
        id: "S203", 
        type: "Suite",
        status: "maintenance", 
        note: "AC repair in progress"
      },
      { 
        id: "S204", 
        type: "Suite",
        status: "available", 
      },
    ]
  },
  standard: {
    name: "Standard Rooms",
    prefix: "R",
    rooms: [
      { 
        id: "R301", 
        type: "Standard",
        status: "checkedIn", 
        guestName: "Mr. David Lee",
        guests: { adults: 1, children: 0 },
        checkIn: "18 Mar, 4:00 PM",
        checkOut: "19 Mar, 11:00 AM",
        rate: 2500,
        total: 2500,
        paymentStatus: "paid",
        bookingSource: "direct",
        phone: "+91 77665 54433",
        requests: ""
      },
      { 
        id: "R302", 
        type: "Standard",
        status: "reserved", 
        guestName: "Ms. Anita Verma",
        guests: { adults: 2, children: 0 },
        checkIn: "19 Mar, 2:00 PM",
        checkOut: "20 Mar, 11:00 AM",
        rate: 2500,
        total: 2500,
        paymentStatus: "pending",
        bookingSource: "expedia",
        phone: "+91 88776 65544",
        requests: "Ground floor preferred"
      },
      { 
        id: "R303", 
        type: "Standard",
        status: "available", 
      },
      { 
        id: "R304", 
        type: "Standard",
        status: "available", 
      },
      { 
        id: "R305", 
        type: "Standard",
        status: "available", 
      },
      { 
        id: "R306", 
        type: "Standard",
        status: "available", 
      },
    ]
  }
};
