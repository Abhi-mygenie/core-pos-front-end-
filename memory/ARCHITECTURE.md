# MyGenie POS Frontend - Complete Architecture Document

**Version:** 3.3 (Socket-First Architecture + Order-Engage)
**Last Updated:** April 10, 2026  
**Audience:** New developers, maintainers, and technical leads

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Application Bootstrap Flow](#4-application-bootstrap-flow)
5. [State Management Architecture](#5-state-management-architecture)
6. [API Layer Architecture](#6-api-layer-architecture)
7. [Real-time Socket Architecture](#7-real-time-socket-architecture)
8. [Transform Layer](#8-transform-layer)
9. [Component Architecture](#9-component-architecture)
10. [Key Data Flows](#10-key-data-flows)
11. [Table Engaged Lock Mechanism](#11-table-engaged-lock-mechanism)
12. [Error Handling](#12-error-handling)
13. [Environment Configuration](#13-environment-configuration)
14. [Testing Strategy](#14-testing-strategy)
15. [Common Patterns & Conventions](#15-common-patterns--conventions)
16. [Troubleshooting Guide](#16-troubleshooting-guide)
17. [Related Documents](#17-related-documents)

---

## 1. Introduction

### 1.1 What is MyGenie POS?
MyGenie POS is a **React-based Point of Sale (POS) frontend** for restaurant operations. It enables:
- Table management and order taking
- Menu browsing and item customization
- Real-time order status updates via WebSocket
- Payment collection and bill management
- Kitchen display integration

### 1.2 Key Architectural Principles
1. **Socket-First Updates**: All order mutations are confirmed via socket events before UI updates
2. **Single Source of Truth**: React Context holds all shared state
3. **Transform Layer**: API ↔ Frontend data mapping is centralized
4. **Optimistic Locking**: Table "engaged" mechanism prevents race conditions

### 1.3 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages: LoginPage → LoadingPage → DashboardPage → OrderEntry    │
├─────────────────────────────────────────────────────────────────┤
│  Contexts: Auth │ Socket │ Restaurant │ Menu │ Table │ Order    │
├─────────────────────────────────────────────────────────────────┤
│  API Layer: Axios │ Services │ Transforms │ Socket Handlers     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐   ┌───────▼───────┐
              │  REST API │   │  Socket.IO    │
              │  (HTTPS)  │   │  (WSS)        │
              └───────────┘   └───────────────┘
                    │                 │
              ┌─────▼─────────────────▼─────┐
              │       BACKEND SERVER        │
              │  preprod.mygenie.online     │
              └─────────────────────────────┘
```

---

## 2. Tech Stack

### 2.1 Core Technologies
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | React | 19.x | UI library |
| **Build Tool** | Create React App + Craco | - | Build configuration |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **UI Components** | Radix UI | Various | Accessible primitives |
| **State** | React Context API | - | Global state management |
| **HTTP Client** | Axios | 1.x | REST API calls |
| **WebSocket** | Socket.IO Client | 4.x | Real-time events |
| **Routing** | React Router DOM | 6.x | Client-side routing |
| **Forms** | React Hook Form + Zod | - | Form handling & validation |
| **Icons** | Lucide React | - | Icon library |

### 2.2 Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Jest | Unit testing |
| React Testing Library | Component testing |

### 2.3 Key Dependencies
```json
{
  "@radix-ui/react-*": "UI primitives (dialog, dropdown, tabs, etc.)",
  "axios": "HTTP client with interceptors",
  "socket.io-client": "WebSocket client",
  "tailwindcss": "Utility CSS framework",
  "lucide-react": "Icon components",
  "react-hook-form": "Form state management",
  "zod": "Schema validation",
  "date-fns": "Date utilities",
  "recharts": "Charts for reports"
}
```

---

## 3. Project Structure

### 3.1 Directory Overview
```
/app/frontend/src/
│
├── api/                          # API Layer
│   ├── axios.js                  # Axios instance + interceptors
│   ├── constants.js              # Endpoints + status mappings
│   ├── index.js                  # Barrel export
│   │
│   ├── services/                 # API Service Functions
│   │   ├── authService.js        # Login, logout, token management
│   │   ├── profileService.js     # User profile + restaurant data
│   │   ├── categoryService.js    # Menu categories
│   │   ├── productService.js     # Menu products
│   │   ├── tableService.js       # Table operations
│   │   ├── orderService.js       # Order CRUD
│   │   ├── customerService.js    # Customer search
│   │   ├── settingsService.js    # Cancellation reasons, etc.
│   │   ├── paymentService.js     # Payment operations
│   │   ├── reportService.js      # Reports data
│   │   └── roomService.js        # Room operations
│   │
│   ├── socket/                   # WebSocket Layer
│   │   ├── socketService.js      # Connection manager (singleton)
│   │   ├── socketEvents.js       # Event constants + channel generators
│   │   ├── socketHandlers.js     # Business logic per event
│   │   ├── useSocketEvents.js    # Hook to wire events to contexts
│   │   └── index.js              # Barrel export
│   │
│   └── transforms/               # Data Transformation Layer
│       ├── orderTransform.js     # Order API ↔ Frontend
│       ├── tableTransform.js     # Table API ↔ Frontend
│       ├── productTransform.js   # Product API ↔ Frontend
│       ├── categoryTransform.js  # Category API ↔ Frontend
│       ├── profileTransform.js   # Profile API ↔ Frontend
│       ├── authTransform.js      # Auth API ↔ Frontend
│       ├── customerTransform.js  # Customer API ↔ Frontend
│       ├── settingsTransform.js  # Settings API ↔ Frontend
│       ├── reportTransform.js    # Report API ↔ Frontend
│       └── index.js              # Barrel export
│
├── contexts/                     # React Context Providers
│   ├── AppProviders.jsx          # Root provider wrapper
│   ├── AuthContext.jsx           # Authentication state
│   ├── SocketContext.jsx         # Socket connection state
│   ├── RestaurantContext.jsx     # Restaurant configuration
│   ├── MenuContext.jsx           # Products + categories
│   ├── TableContext.jsx          # Tables + engaged lock
│   ├── OrderContext.jsx          # Active orders
│   ├── SettingsContext.jsx       # App settings
│   └── index.js                  # Barrel export
│
├── pages/                        # Route-level Components
│   ├── LoginPage.jsx             # Authentication
│   ├── LoadingPage.jsx           # Initial data loading
│   ├── DashboardPage.jsx         # Main table grid
│   ├── AllOrdersReportPage.jsx   # Order reports
│   ├── OrderSummaryPage.jsx      # Order summary
│   └── index.js                  # Barrel export
│
├── components/                   # UI Components
│   ├── ui/                       # Radix-based primitives
│   │   ├── button.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── select.jsx
│   │   ├── toast.jsx
│   │   ├── toaster.jsx
│   │   └── ... (30+ components)
│   │
│   ├── guards/                   # Route guards
│   │   ├── ProtectedRoute.jsx    # Auth guard
│   │   └── ErrorBoundary.jsx     # Error boundary
│   │
│   ├── cards/                    # Card components
│   │   ├── TableCard.jsx         # Table grid card
│   │   ├── DineInCard.jsx        # Dine-in order card
│   │   ├── DeliveryCard.jsx      # Delivery order card
│   │   └── OrderCard.jsx         # Generic order card
│   │
│   ├── order-entry/              # Order taking components
│   │   ├── OrderEntry.jsx        # Main order panel
│   │   ├── CartPanel.jsx         # Shopping cart
│   │   ├── CategoryPanel.jsx     # Category browser
│   │   ├── CollectPaymentPanel.jsx
│   │   ├── ItemCustomizationModal.jsx
│   │   ├── CancelFoodModal.jsx
│   │   ├── CancelOrderModal.jsx
│   │   ├── ShiftTableModal.jsx
│   │   ├── MergeTableModal.jsx
│   │   ├── TransferFoodModal.jsx
│   │   ├── CustomerModal.jsx
│   │   └── ... (more modals)
│   │
│   ├── panels/                   # Side panels
│   │   ├── MenuManagementPanel.jsx
│   │   ├── SettingsPanel.jsx
│   │   └── ... 
│   │
│   └── modals/                   # Global modals
│       └── RoomCheckInModal.jsx
│
├── hooks/                        # Custom React Hooks
│   ├── use-toast.js              # Toast notifications
│   └── useRefreshAllData.js      # Data refresh utility
│
├── constants/                    # App Constants
│   ├── colors.js                 # Brand colors
│   ├── config.js                 # App configuration
│   └── index.js                  # Barrel export
│
├── utils/                        # Utility Functions
│   ├── businessDay.js            # Business day calculations
│   ├── statusHelpers.js          # Status mapping helpers
│   └── index.js                  # Barrel export
│
├── data/                         # Static Data & Mocks
│   ├── notePresets.js            # Predefined order notes
│   ├── mockMenu.js               # Mock menu data
│   ├── mockTables.js             # Mock table data
│   └── ...
│
├── lib/                          # Shared Libraries
│   └── utils.js                  # cn() for className merging
│
├── __tests__/                    # Test Files
│   ├── api/
│   ├── contexts/
│   ├── integration/
│   └── ...
│
├── App.js                        # Root component + routing
├── App.css                       # Global styles
├── index.js                      # Entry point
└── index.css                     # Tailwind imports
```

### 3.2 Import Aliases
The project uses `@/` as an import alias for `src/`:
```javascript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
```

---

## 4. Application Bootstrap Flow

### 4.1 Startup Sequence
```
1. index.js
   └── Renders <App /> inside React.StrictMode

2. App.js
   └── Wraps everything in:
       ├── ErrorBoundary (catch React errors)
       └── AppProviders (all contexts)
           └── BrowserRouter (routing)
               └── Routes

3. Route: "/" → LoginPage
   └── User enters credentials
   └── AuthContext.login() → API call
   └── On success: navigate("/loading")

4. Route: "/loading" → LoadingPage (inside ProtectedRoute)
   └── Fetches all required data in sequence:
       1. Profile + Permissions → AuthContext + RestaurantContext
       2. Categories → MenuContext
       3. Products → MenuContext
       4. Tables → TableContext
       5. Cancellation Reasons → SettingsContext
       6. Popular Food → MenuContext
       7. Running Orders → OrderContext
   └── On complete: navigate("/dashboard")

5. Route: "/dashboard" → DashboardPage (inside ProtectedRoute)
   └── useSocketEvents() → Subscribe to socket channels
   └── Renders table grid with real-time updates
```

### 4.2 Provider Hierarchy
```javascript
// AppProviders.jsx - Order matters!
<AuthProvider>           // Must be first (socket depends on auth)
  <SocketProvider>       // Connects when authenticated
    <RestaurantProvider> // Restaurant config
      <MenuProvider>     // Products & categories
        <TableProvider>  // Tables & engaged state
          <SettingsProvider>
            <OrderProvider>  // Active orders
              {children}
            </OrderProvider>
          </SettingsProvider>
        </TableProvider>
      </MenuProvider>
    </RestaurantProvider>
  </SocketProvider>
</AuthProvider>
```

---

## 5. State Management Architecture

### 5.1 Context Overview
| Context | Purpose | Key State | Key Actions |
|---------|---------|-----------|-------------|
| **AuthContext** | Authentication | `token`, `user`, `permissions` | `login()`, `logout()`, `hasPermission()` |
| **SocketContext** | WebSocket connection | `status`, `isConnected` | `subscribe()`, `reconnect()` |
| **RestaurantContext** | Restaurant config | `restaurant`, `currencySymbol`, `features`, `cancellation` | `setRestaurant()` |
| **MenuContext** | Products catalog | `categories`, `products`, `popularFood` | `getProductById()`, `searchProducts()` |
| **TableContext** | Table management | `tables`, `engagedTables` | `updateTableStatus()`, `setTableEngaged()` |
| **OrderContext** | Active orders | `orders` | `addOrder()`, `updateOrder()`, `removeOrder()` |
| **SettingsContext** | App settings | `cancellationReasons` | `getCancellationReasons()` |

### 5.2 AuthContext Deep Dive
```javascript
// Usage
const { 
  token,           // JWT token string
  user,            // User object { id, name, email, roleName }
  isAuthenticated, // Boolean
  permissions,     // Array of permission strings
  login,           // async (credentials) => authData
  logout,          // () => void
  hasPermission,   // (permission) => boolean
} = useAuth();

// Permission check example (VERIFIED against actual API role[] array)
const canCancelOrder = hasPermission('order_cancel');
const canShiftTable = hasPermission('transfer_table');
const canMergeOrder = hasPermission('merge_table');
const canFoodTransfer = hasPermission('food_transfer');
const canCancelItem = hasPermission('food');
const canBill = hasPermission('bill');
const canCustomerManage = hasPermission('customer_management');
const canDiscount = hasPermission('discount');
// Note: 'Ready' (capital R), 'Loyalty' (capital L), 'expence' (API typo)
```

### 5.2b Cancellation Settings (Restaurant-Level)
```javascript
// Exposed via RestaurantContext
const { cancellation } = useRestaurant();
// cancellation = {
//   allowPostServeCancel: boolean,      // from cancle_post_serve
//   allowPostServeCancel2: boolean,     // from allow_cancel_post_server (redundant gate)
//   orderCancelWindowMinutes: number,   // from cancel_order_time (0 = unlimited)
//   itemCancelWindowMinutes: number,    // from cancel_food_timings (0 = unlimited)
// }

// Decision logic:
// Pre-Ready items: time window applies (cancel_order_time / cancel_food_timings)
// Post-Ready items: cancle_post_serve flag applies (no time check)
```

### 5.3 OrderContext Deep Dive
```javascript
// Usage
const {
  orders,              // Array of all active orders
  isLoaded,            // Boolean - initial load complete
  addOrder,            // (order) => void - from socket new-order
  updateOrder,         // (orderId, order) => void - from socket update
  removeOrder,         // (orderId) => void - when paid/cancelled
  getOrderById,        // (orderId) => order | null
  getOrderByTableId,   // (tableId) => order | null
  waitForOrderRemoval, // (orderId, timeout) => Promise<boolean>
} = useOrders();

// Order shape (after transform)
{
  orderId: 730522,
  orderNumber: "016790",
  orderType: "dineIn",      // dineIn | takeAway | delivery
  status: "preparing",       // preparing | ready | served | cancelled | paid
  tableId: 6244,
  tableNumber: "5",
  customer: "John Doe",
  amount: 616,              // Final payable amount
  items: [...],             // Array of order items
  paymentStatus: "unpaid",  // unpaid | paid
  createdAt: "2026-04-05 19:01:07",
  // ... more fields
}
```

### 5.4 TableContext Deep Dive
```javascript
// Usage
const {
  tables,              // Array of all tables/rooms
  sections,            // Unique section names
  isLoaded,            // Boolean
  updateTableStatus,   // (tableId, status) => void
  setTableEngaged,     // (tableId, engaged) => void
  isTableEngaged,      // (tableId) => boolean
  waitForTableEngaged, // (tableId, timeout) => Promise<boolean>
  getTableById,        // (tableId) => table | null
} = useTables();

// Table shape (after transform)
{
  tableId: 6244,
  tableNumber: "5",
  displayName: "Table 5",
  sectionName: "Main Hall",
  status: "occupied",      // available | occupied | disabled
  isOccupied: true,
  isRoom: false,
  capacity: 4,
}
```

---

## 6. API Layer Architecture

### 6.1 Axios Configuration
```javascript
// api/axios.js
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Request interceptor: Adds JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handles 401 → logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

### 6.2 Service Layer Pattern
Each domain has a dedicated service file:

```javascript
// api/services/orderService.js
import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/orderTransform';

export const getRunningOrders = async (roleName) => {
  const response = await api.get(API_ENDPOINTS.RUNNING_ORDERS, {
    params: { role_name: roleName }
  });
  return fromAPI.orderList(response.data.data || []);
};

export const fetchSingleOrderForSocket = async (orderId) => {
  const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
    order_id: orderId
  });
  const orders = response.data.orders || [];
  return orders.length > 0 ? fromAPI.order(orders[0]) : null;
};
```

### 6.3 API Endpoint Constants
```javascript
// api/constants.js
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/vendoremployee/login',
  
  // Profile
  PROFILE: '/api/v2/vendoremployee/vendor-profile/profile',
  
  // Menu
  CATEGORIES: '/api/v1/vendoremployee/get-categories',
  PRODUCTS: '/api/v1/vendoremployee/get-products-list',
  
  // Orders
  PLACE_ORDER: '/api/v1/vendoremployee/order/place-order',
  UPDATE_ORDER: '/api/v1/vendoremployee/order/update-place-order',
  BILL_PAYMENT: '/api/v2/vendoremployee/order-bill-payment',
  CANCEL_ITEM: '/api/v1/vendoremployee/order/cancel-food-item',
  
  // ... more endpoints
};
```

---

## 7. Real-time Socket Architecture

### 7.1 Socket Service (Singleton)
```javascript
// api/socket/socketService.js
class SocketService {
  constructor() {
    this.socket = null;
    this.status = 'disconnected';
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io(SOCKET_CONFIG.URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    this._setupConnectionHandlers();
  }

  on(event, handler) {
    // Subscribe to event, return unsubscribe function
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export default new SocketService(); // Singleton
```

### 7.2 Socket Channels
| Channel Pattern | Purpose | Events |
|-----------------|---------|--------|
| `new_order_{restaurantId}` | Order events | new-order, update-order, update-order-status, etc. |
| `update_table_{restaurantId}` | Table events | update-table (engage/free) |

### 7.3 Socket Event Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Socket Server  │────►│  useSocketEvents │────►│  socketHandlers │
│  (emit event)   │     │  (route event)   │     │  (business logic)│
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │  Context Update   │
              │  (addOrder, etc.) │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │   UI Re-render    │
              └───────────────────┘
```

### 7.4 Socket Event Handlers
```javascript
// api/socket/socketHandlers.js

// new-order: Full payload in message
export const handleNewOrder = (message, { addOrder, updateTableStatus, setTableEngaged }) => {
  const { orderId, payload } = parseMessage(message);
  const order = orderFromAPI.order(payload.orders[0]);
  addOrder(order);
  updateTableStatus(order.tableId, 'occupied');
  setTableEngaged(order.tableId, true);
  
  // Background enrichment (GET API for missing fields)
  fetchOrderWithRetry(orderId).then(fullOrder => {
    updateOrder(fullOrder.orderId, fullOrder);
    setTableEngaged(order.tableId, false);
  });
};

// update-order: No payload, must fetch from API
export const handleUpdateOrder = async (message, { updateOrder, updateTableStatus }) => {
  const { orderId } = parseMessage(message);
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    updateTableStatus(order.tableId, order.tableStatus);
  }
};
```

### 7.5 useSocketEvents Hook
```javascript
// api/socket/useSocketEvents.js
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder } = useOrders();
  const { updateTableStatus, setTableEngaged } = useTables();
  const { restaurant } = useRestaurant();

  useEffect(() => {
    if (!isConnected || !restaurant?.id) return;

    const orderChannel = `new_order_${restaurant.id}`;
    const unsubscribe = subscribe(orderChannel, handleOrderChannelEvent);

    return () => unsubscribe?.();
  }, [isConnected, restaurant?.id]);
};
```

---

## 8. Transform Layer

### 8.1 Purpose
Transforms normalize data between API format and frontend format:
- **fromAPI**: API response → Frontend state
- **toAPI**: Frontend state → API request payload

### 8.2 Order Transform Example
```javascript
// api/transforms/orderTransform.js

export const fromAPI = {
  // Transform single order from API
  order: (api) => ({
    orderId: api.id,
    orderNumber: api.restaurant_order_id,
    status: mapOrderStatus(api.f_order_status),
    tableId: api.table_id || 0,
    amount: parseFloat(api.order_amount) || 0,
    items: (api.orderDetails || []).map(fromAPI.orderItem),
    rawOrderDetails: api.orderDetails || [],  // Preserved for bill printing
    // ... more mappings
  }),

  // Transform single order item
  orderItem: (detail) => ({
    id: detail.id,
    name: detail.food_details?.name,
    qty: detail.quantity,
    price: parseFloat(detail.unit_price),
    variation: detail.variation || [],
    addOns: detail.add_ons || [],
    // ... more mappings
  }),
};

export const toAPI = {
  // Build place order payload
  placeOrder: (data) => ({
    restaurant_id: data.restaurantId,
    table_id: String(data.tableId),
    order_type: 'pos',
    payment_status: 'unpaid',
    cart: data.items.map(buildCartItem),
    // ... more fields
  }),

  // Build full bill print payload (order-temp-store API)
  buildBillPrintPayload: (order) => ({
    order_id: order.orderId,
    restaurant_order_id: order.orderNumber,
    print_type: 'bill',
    payment_amount: order.amount,
    order_subtotal: order.subtotalBeforeTax,
    billFoodList: order.rawOrderDetails,  // Raw items with food_details
    gst_tax: /* computed from items */,
    vat_tax: /* computed from items */,
    station_kot: '',
    // ... full financial + customer fields (see API_DOCUMENT_V2.md §13)
  }),
};
```

### 8.3 Transform Files Summary
| File | Direction | Key Functions |
|------|-----------|---------------|
| `orderTransform.js` | Both | `fromAPI.order`, `toAPI.placeOrder`, `toAPI.updateOrder`, `toAPI.buildBillPrintPayload` |
| `tableTransform.js` | Both | `fromAPI.table`, `toAPI.shiftTable`, `toAPI.mergeTable` |
| `productTransform.js` | fromAPI | `fromAPI.product`, `fromAPI.productList` |
| `categoryTransform.js` | fromAPI | `fromAPI.category`, `fromAPI.categoryList` |
| `profileTransform.js` | fromAPI | `fromAPI.profile`, `fromAPI.restaurant` |

---

## 9. Component Architecture

### 9.1 Component Categories

#### UI Primitives (`/components/ui/`)
Radix-based components styled with Tailwind:
- `Button`, `Input`, `Select`, `Checkbox`
- `Dialog`, `Sheet`, `Popover`, `Dropdown`
- `Toast`, `Tooltip`, `Badge`
- All are re-exported with consistent styling

#### Route Guards (`/components/guards/`)
```javascript
// ProtectedRoute.jsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};
```

#### Cards (`/components/cards/`)
Display components for tables and orders:
- `TableCard` - Table grid cell with order info
- `OrderCard` - Unified order card for List View (Dine-In, Delivery, TakeAway)
  - Permission-gated buttons (Cancel, Merge, Shift, Food Transfer)
  - Cancellation settings enforcement (time window + post-ready flag)
  - Item-level status toggles for Dine-In (Preparing → Ready → Served)
  - CSS Columns masonry layout (4 columns)
  - KOT/Bill print disabled (Phase 2)
- `DineInCard` - Legacy dine-in card (superseded by OrderCard)
- `DeliveryCard` - Legacy delivery card (superseded by OrderCard)

#### Order Entry (`/components/order-entry/`)
Main order-taking flow components:
- `OrderEntry.jsx` - Main container
- `CartPanel.jsx` - Shopping cart
- `CategoryPanel.jsx` - Menu browser
- `CollectPaymentPanel.jsx` - Payment collection
- Various modals (cancel, shift, merge, transfer)

### 9.2 OrderEntry Component Structure
```
OrderEntry.jsx (main container)
├── Header (table info, customer)
│   ├── Trash icon (cancel order — gated by `order_cancel` + cancellation settings)
│   └── UserPlus icon (customer — gated by `customer_management`)
├── Split View
│   ├── Left: CategoryPanel (menu browser)
│   │   ├── ProductCard (clickable items)
│   │   │   └── ItemCustomizationModal (addons, variations)
│   │   ├── Shift Table button (gated by `transfer_table`)
│   │   └── Merge Table button (gated by `merge_table`)
│   │
│   └── Right: CartPanel (order items)
│       ├── UnplacedItemRow (new items — no permission needed)
│       ├── PlacedItemRow (placed items)
│       │   ├── Cancel item (gated by `food` + cancellation time/post-ready)
│       │   └── Transfer food (gated by `food_transfer`)
│       └── OrderSummary (totals)
│
├── Action Bar
│   ├── Place Order Button
│   └── Collect Bill Button (gated by `bill`)
│
└── Modals
    ├── CollectPaymentPanel
    ├── CancelFoodModal
    ├── CancelOrderModal
    ├── ShiftTableModal
    ├── MergeTableModal
    └── TransferFoodModal
```

### 9.2b OrderCard Permission Architecture
```
DashboardPage.jsx
├── useAuth() → hasPermission()
├── useRestaurant() → cancellation
└── OrderCard (props-based permission gating)
    ├── canCancelOrder = hasPermission('order_cancel')
    │   └── + cancellation time window / post-ready flag
    ├── canMergeOrder = hasPermission('merge_table')
    ├── canShiftTable = hasPermission('transfer_table')
    └── canFoodTransfer = hasPermission('food_transfer')
```

### 9.3 Key Page Components

#### LoginPage
- Email/password form
- Remember me option
- Calls `AuthContext.login()`
- Redirects to `/loading` on success

#### LoadingPage
- Sequential API loading with progress bar
- Populates all contexts
- Redirects to `/dashboard` on complete

#### DashboardPage
- Table grid with sections (Table View)
- Order card masonry layout with CSS Columns (Order View / List View)
- Real-time updates via `useSocketEvents()`
- Opens `OrderEntry` on table/card click
- Filter by section, search by table number
- Filter pills: Dynamic based on view (see Dual-View System below)
- View switch: `[Table ▾]` / `[Order ▾]` labeled dropdown
- Dashboard view switch: `[Channel ▾]` / `[Status ▾]` labeled dropdown (Dual-View System)
- Permission-gated OrderCard buttons (cancel, merge, shift, transfer)
- Cancellation settings enforced (time window + post-ready flag)

### 9.4 Dashboard Dual-View System

**Feature Flag:** `USE_STATUS_VIEW` (in `featureFlags.js`)

The dashboard supports two different grouping views:

#### View Types
| View | Columns | Filter Pills | Dropdown Label |
|------|---------|--------------|----------------|
| **Channel View** | Dine-In, TakeAway, Delivery, Room | 9 Status filters | "Channel ▾" |
| **Status View** | Preparing, Ready, Served, Paid, etc. | 4 Channel filters | "Status ▾" |

#### Architecture Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    DashboardPage.jsx                             │
├─────────────────────────────────────────────────────────────────┤
│  State:                                                          │
│  ├── dashboardView: 'channel' | 'status'                        │
│  ├── activeChannels: ['delivery', 'takeAway', 'dineIn', 'room'] │
│  ├── activeStatuses: ['preparing', 'ready', 'served', ...]      │
│  ├── hiddenChannels: []  (linked to column hiding)              │
│  └── hiddenStatuses: []  (linked to column hiding)              │
├─────────────────────────────────────────────────────────────────┤
│  Memos:                                                          │
│  ├── channelData: Groups orders by channel (dineIn, delivery...)│
│  │   └── Filters by activeStatuses                              │
│  └── statusData: Groups orders by fOrderStatus (1-10)           │
│      └── Filters by activeChannels                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ChannelColumnsLayout                          │
│  Receives: channels[] (either channelData or statusData)        │
│  Renders: ChannelColumn for each visible column                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Header.jsx                                    │
│  Renders filter pills based on dashboardView:                   │
│  ├── Channel View → Status filters (YTC, Preparing, Ready...)  │
│  └── Status View → Channel filters (Del, Take, Dine, Room)     │
│  Labeled Dropdowns (Option A UX):                               │
│  ├── [+ Add] — labeled add order button                         │
│  ├── [Table ▾] / [Order ▾] — view dropdown (Table/Order View)  │
│  ├── [Channel ▾] / [Status ▾] — dashboard view dropdown        │
│  └── [●] — online status indicator                              │
│  Hide column → Also hides corresponding filter                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Status Filter Mapping
| fOrderStatus | Filter ID | Label |
|--------------|-----------|-------|
| 7 | pending | YTC |
| 1 | preparing | Preparing |
| 2 | ready | Ready |
| 8 | running | Running |
| 5 | served | Served |
| 9 | pendingPayment | Pending Pay |
| 6 | paid | Paid |
| 3 | cancelled | Cancelled |
| 10 | reserved | Reserved |

#### Hide Column ↔ Hide Filter (Linked)
When a column is hidden:
- The column disappears from the grid
- The corresponding filter pill is also hidden (in the other view)
- "Show Hidden (N)" button appears in Header
- Clicking restore shows all hidden columns and filters

#### Key Files
| File | Purpose |
|------|---------|
| `featureFlags.js` | `USE_STATUS_VIEW` flag |
| `constants.js` | `STATUS_COLUMNS`, `F_ORDER_STATUS` mappings |
| `DashboardPage.jsx` | State management, `channelData` and `statusData` memos |
| `Header.jsx` | Filter pills, view toggles, restore button |
| `ChannelColumnsLayout.jsx` | Renders columns (generic for both views) |
| `ChannelColumn.jsx` | Individual column with Hide link |

### 9.5 Status Configuration (Visibility Settings)

**Location:** Sidebar → Visibility Settings → Status Configuration

**Route:** `/visibility/status-config`

**Purpose:** Configure which statuses are visible on the dashboard. In future, this will be controlled by role-based permissions.

#### Architecture Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                StatusConfigPage.jsx                              │
│  ├── enabledStatuses: string[] (e.g., ['pending', 'preparing']) │
│  ├── Load from localStorage on mount                            │
│  └── Save to localStorage on "Save Configuration"               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ localStorage
┌─────────────────────────────────────────────────────────────────┐
│                mygenie_enabled_statuses                          │
│  JSON array: ["pending", "preparing", "ready", ...]             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Read on mount
┌─────────────────────────────────────────────────────────────────┐
│                DashboardPage.jsx                                 │
│  ├── enabledStatuses state (loaded from localStorage)           │
│  ├── Listens for storage changes (cross-tab sync)               │
│  └── Passes to Header.jsx                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Header.jsx                                                      │
│  visibleStatusFilters = allStatusFilters                        │
│    .filter(enabled)   ← Only show enabled statuses              │
│    .filter(!hidden)   ← Then remove user-hidden                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  statusData memo                                                 │
│  Only creates columns for enabledStatuses                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Visibility Layers
| Layer | Scope | Persistence | Controls |
|-------|-------|-------------|----------|
| **Enabled (Config)** | Role-based (future) / Config page (now) | localStorage | Master list of allowed statuses |
| **Hidden (User)** | Session-based (hide button) | None (resets on login) | User hides from enabled list |

**Visible = Enabled − Hidden**

#### Key Files
| File | Purpose |
|------|---------|
| `StatusConfigPage.jsx` | Configuration UI with 9 status cards |
| `Sidebar.jsx` | "Visibility Settings" menu section |
| `App.js` | Route `/visibility/status-config` |
| `DashboardPage.jsx` | Reads `enabledStatuses` from localStorage |
| `Header.jsx` | Filters status pills by `enabledStatuses` |

#### localStorage Key
```javascript
// Key: mygenie_enabled_statuses
// Value: JSON array of status IDs
["pending", "preparing", "ready", "running", "served", "pendingPayment", "paid", "cancelled", "reserved"]
```

### 9.6.2 All localStorage Keys (Visibility Settings)

| Key | Purpose | Default Value |
|-----|---------|---------------|
| `mygenie_enabled_statuses` | Enabled status IDs | `["pending", "preparing", "ready", "served"]` |
| `mygenie_station_view_config` | Station View settings | `{ enabled: true, stations: [], displayMode: 'stacked' }` |
| `mygenie_channel_visibility` | Channel override settings | `{ enabled: true, channels: ['dineIn', 'takeAway', 'delivery', 'room'] }` |
| `mygenie_layout_table_view` | Default columns (Table View) | `{ dineIn: 2, takeAway: 2, delivery: 2, room: 2 }` |
| `mygenie_layout_order_view` | Default columns (Order View) | `{ dineIn: 1, takeAway: 1, delivery: 1, room: 1 }` |

### 9.6.3 Column Layout Behavior

```
Visibility Settings Page
        │
        ▼
   localStorage (mygenie_layout_table_view / mygenie_layout_order_view)
        │
        ▼
ChannelColumnsLayout.jsx
        │
        ▼
  getLayoutFromStorage(viewType)
    reads from localStorage
    falls back to hardcoded defaults
```

**Key Points:**
- Arrow buttons on dashboard = session only (not persisted)
- Switching views reloads from localStorage
- Smart measurement logic removed (was auto-calculating based on screen width)

---

## 10. Key Data Flows

### 10.1 Place New Order Flow
```
User Action: Click "Place Order" in OrderEntry

1. OrderEntry.handlePlaceOrder()
   │
   ├─► Build payload: toAPI.placeOrder(...)
   │
   ├─► POST /api/v1/vendoremployee/order/place-order
   │   (multipart/form-data with JSON in "data" field)
   │
   ├─► setIsPlacingOrder(true) // Show loading overlay
   │
   └─► waitForTableEngaged(tableId, 5000) // Poll until socket arrives

2. Server processes → Emits socket event

3. Socket: new-order on new_order_{restaurantId}
   │
   ├─► useSocketEvents routes to handleNewOrder()
   │
   ├─► handleNewOrder():
   │   ├─► orderFromAPI.order(payload) // Transform
   │   ├─► addOrder(order) // OrderContext
   │   ├─► updateTableStatus(tableId, 'occupied') // TableContext
   │   ├─► setTableEngaged(tableId, true) // Lock table
   │   │
   │   └─► Background: fetchSingleOrderForSocket(orderId)
   │       ├─► GET /api/v2/vendoremployee/get-single-order-new
   │       ├─► updateOrder(fullOrder) // Enrich with 51 fields
   │       └─► setTableEngaged(tableId, false) // Release lock

4. waitForTableEngaged resolves
   │
   └─► OrderEntry closes → Navigate to Dashboard
```

### 10.2 Update Order Flow (Add Items)
```
User Action: Add items to existing order, click "Place Order"

1. OrderEntry.handlePlaceOrder() [update path]
   │
   ├─► Build payload: toAPI.updateOrder(...)
   │   (only NEW items in cart-update array)
   │
   ├─► PUT /api/v1/vendoremployee/order/update-place-order
   │   (JSON, application/json)
   │
   └─► waitForTableEngaged(tableId, 5000)

2. Socket: update-order on new_order_{restaurantId}
   │
   ├─► handleUpdateOrder():
   │   ├─► fetchOrderWithRetry(orderId) // Must call API
   │   ├─► updateOrder(order) // OrderContext
   │   ├─► updateTableStatus(tableId, status)
   │   └─► setTableEngaged(tableId, false)

3. waitForTableEngaged resolves → Close OrderEntry
```

### 10.3 Collect Bill Flow (Payment)
```
User Action: Click "Collect Bill" → Select payment method → Confirm

1. CollectPaymentPanel.onPaymentComplete()
   │
   ├─► Build payload: toAPI.collectBillExisting(...)
   │
   ├─► POST /api/v2/vendoremployee/order-bill-payment
   │   (JSON, application/json)
   │
   └─► setTableEngaged(tableId, true)

2. Socket: update-order-status (status=6/paid)
   │
   ├─► handleUpdateOrderStatus():
   │   ├─► fetchOrderWithRetry(orderId)
   │   ├─► order.status === 'paid'
   │   ├─► removeOrder(orderId) // Remove from context
   │   ├─► updateTableStatus(tableId, 'available')
   │   └─► setTableEngaged(tableId, false)

3. OrderEntry closes → Table shows as available
```

---

## 11. Table Engaged Lock Mechanism

### 11.1 Problem
Without locking, users can click a table while its background data is still loading, resulting in stale/incomplete data display.

### 11.2 Solution
```javascript
// TableContext.jsx
const [engagedTables, setEngagedTables] = useState(new Set());
const engagedTablesRef = useRef(new Set()); // For polling

const setTableEngaged = (tableId, engaged) => {
  const next = new Set(engagedTablesRef.current);
  engaged ? next.add(tableId) : next.delete(tableId);
  engagedTablesRef.current = next;
  setEngagedTables(next);
};

const waitForTableEngaged = (tableId, timeout = 5000) => {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (engagedTablesRef.current.has(tableId)) {
        resolve(true);
      } else if (Date.now() - start > timeout) {
        resolve(false); // Timeout
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
};
```

### 11.3 Flow
```
1. User clicks "Place Order"
2. API call sent
3. waitForTableEngaged(tableId) starts polling
4. Socket arrives → setTableEngaged(tableId, true)
5. waitForTableEngaged resolves
6. Background GET completes → setTableEngaged(tableId, false)
7. User can now click the table
```

---

## 12. Error Handling

### 12.1 API Errors
```javascript
// Axios interceptor extracts readable message
error.readableMessage = 
  error.response?.data?.errors?.[0]?.message ||
  error.response?.data?.message ||
  error.message ||
  'Something went wrong';
```

### 12.2 Toast Notifications
```javascript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success
toast({ title: "Order placed", description: "Order #123 created" });

// Error
toast({ 
  title: "Failed to place order", 
  description: error.readableMessage,
  variant: "destructive" 
});
```

### 12.3 Error Boundary
```javascript
// components/guards/ErrorBoundary.jsx
class ErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

---

## 13. Environment Configuration

### 13.1 Required Variables
```bash
# .env
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
```

### 13.2 Fail-Fast Pattern
```javascript
// api/axios.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('[Config] REACT_APP_API_BASE_URL is not set');
}
```

---

## 14. Testing Strategy

### 14.1 Test Structure
```
/src/__tests__/
├── api/
│   ├── axios.test.js              # Axios interceptors
│   ├── constants.test.js          # Constants validation
│   ├── socket/                    # Socket tests
│   └── transforms/                # Transform tests
├── contexts/
│   └── SocketContext.test.jsx     # Context tests
├── guards/
│   ├── ProtectedRoute.test.jsx
│   └── ErrorBoundary.test.jsx
└── integration/
    └── App.routing.test.jsx       # Route tests
```

### 14.2 Running Tests
```bash
cd /app/frontend
yarn test           # Run all tests
yarn test --watch   # Watch mode
yarn test --coverage # Coverage report
```

---

## 15. Common Patterns & Conventions

### 15.1 File Naming
- Components: `PascalCase.jsx` (e.g., `OrderEntry.jsx`)
- Hooks: `camelCase.js` with `use` prefix (e.g., `useSocketEvents.js`)
- Services: `camelCase.js` with `Service` suffix (e.g., `orderService.js`)
- Transforms: `camelCase.js` with `Transform` suffix (e.g., `orderTransform.js`)

### 15.2 Context Pattern
```javascript
// 1. Create context
const MyContext = createContext(null);

// 2. Create provider with useMemo for value
export const MyProvider = ({ children }) => {
  const [state, setState] = useState(initial);
  
  const value = useMemo(() => ({
    state,
    setState,
  }), [state]);
  
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

// 3. Create hook with error if used outside provider
export const useMy = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMy must be used within MyProvider');
  }
  return context;
};
```

### 15.3 Transform Pattern
```javascript
// Always have fromAPI and toAPI namespaces
export const fromAPI = {
  item: (api) => ({ /* mapped fields */ }),
  list: (apiList) => apiList.map(fromAPI.item),
};

export const toAPI = {
  createItem: (data) => ({ /* api format */ }),
};
```

### 15.4 Service Pattern
```javascript
// Single responsibility per function
export const getItems = async (params) => {
  const response = await api.get(ENDPOINT, { params });
  return fromAPI.list(response.data.data);
};
```

---

## 16. Troubleshooting Guide

### 16.1 Socket Not Connecting
1. Check `REACT_APP_SOCKET_URL` in `.env`
2. Verify user is authenticated (socket connects after login)
3. Check browser console for connection errors
4. Use `window.__SOCKET_SERVICE__.getDebugInfo()` in dev

### 16.2 Orders Not Updating
1. Check socket connection status
2. Verify `restaurantId` is set (needed for channel subscription)
3. Check browser console for socket events
4. Verify `useSocketEvents` is mounted (DashboardPage)

### 16.3 Stale Table Data
1. Check if table is "engaged" (loading spinner)
2. Verify socket handler is releasing engaged lock
3. Check for errors in `fetchSingleOrderForSocket`

### 16.4 API 401 Errors
1. Token expired → auto-redirects to login
2. Check `localStorage.getItem('auth_token')`
3. Verify token is being added to requests (interceptor)

---

## 17. Related Documents

| Document | Path | Description |
|----------|------|-------------|
| API Reference | `/app/memory/API_DOCUMENT_V2.md` | Detailed API payloads and responses |
| Bug Tracker | `/app/memory/BUGS.md` | Known issues and fixes |
| OrderCard Suggestions | `/app/memory/ORDERCARD_SUGGESTIONS.md` | OrderCard redesign tracking (Phase 1 & 2 done) |
| Profile Permissions Mapping | `/app/memory/PROFILE_PERMISSIONS_MAPPING.md` | Permission strings → UI component mapping with implementation status |
| Profile API Field Audit | `/app/memory/PROFILE_API_FIELD_AUDIT.md` | Complete 240-field audit of Profile API (MAPPED/MISSING/NOT NEEDED) |
| PRD | `/app/memory/PRD.md` | Product requirements, completed work, and P0/P1/P2 backlog |

---

## Quick Reference Card

### Import Patterns
```javascript
// Contexts
import { useAuth, useOrders, useTables } from '@/contexts';

// UI Components
import { Button, Dialog, Input } from '@/components/ui';

// API
import api from '@/api/axios';
import { API_ENDPOINTS } from '@/api/constants';
import { fromAPI, toAPI } from '@/api/transforms/orderTransform';
```

### Context Hooks
```javascript
const { login, logout, user, hasPermission } = useAuth();
const { orders, addOrder, removeOrder, getOrderById, setOrderEngaged, isOrderEngaged } = useOrders();
const { tables, updateTableStatus, setTableEngaged } = useTables();
const { products, categories, getProductById } = useMenu();
const { restaurant, currencySymbol, cancellation } = useRestaurant();
const { isConnected, subscribe } = useSocket();
```

### Key URLs
- API: `process.env.REACT_APP_API_BASE_URL`
- Socket: `process.env.REACT_APP_SOCKET_URL`

---

## 18. April 10, 2026 Architecture Updates

### 18.1 New Socket Channel: `order-engage`

A new socket channel was added for order-level locking:

| Channel | Pattern | Purpose |
|---------|---------|---------|
| `new_order_{restaurantId}` | Order events | new-order, update-order, etc. |
| `update_table_{restaurantId}` | Table events | update-table (engage/free) |
| **`order-engage_{restaurantId}`** | **Order engage events** | **Lock/unlock order cards** |

#### Message Format
```javascript
// order-engage channel (different from other channels - no event name at index 0)
[orderId, restaurantOrderId, restaurantId, status]
// Example: [730762, '008639', 644, 'engage']

// Status values: 'engage' | 'free'
```

### 18.2 Order-Level Locking (engagedOrders)

**Purpose:** Lock order cards during update operations (works for ALL order types)

| Lock Type | State | Used For |
|-----------|-------|----------|
| Table-level (`engagedTables`) | `setTableEngaged(tableId, bool)` | New Order (dine-in) |
| **Order-level (`engagedOrders`)** | `setOrderEngaged(orderId, bool)` | **Update Order (all types)** |

#### Why Order-Level?
- Walk-in, TakeAway, Delivery orders have `tableId = 0`
- Cannot lock a table that doesn't exist
- `order-engage` locks the **order card** directly by orderId

#### OrderContext Additions
```javascript
const {
  engagedOrders,          // Set<number> of locked order IDs
  setOrderEngaged,        // (orderId, engaged) => void
  isOrderEngaged,         // (orderId) => boolean
} = useOrders();
```

### 18.3 Updated Socket Flows

#### New Order Flow (Socket-First)
```
POST /api/v2/.../place-order (fire, no await for response)
    │
    ├─► For physical tables: wait for update-table engage socket
    │   For walk-in/takeaway/delivery: 0.5s delay for UX
    │
    ▼
SOCKET: update-table engage (for dine-in)
    │
    ▼
Redirect to Dashboard
    │
    ▼
SOCKET: new-order (complete payload - no GET API needed)
    │
    ├─► addOrder() from socket payload
    ├─► updateTableStatus() derived from f_order_status
    └─► setTableEngaged(false) - release
```

#### Update Order Flow (Order-Engage)
```
PUT /api/v2/.../update-place-order
    │
    ▼
SOCKET: order-engage [orderId, restaurantOrderId, restaurantId, 'engage']
    │
    └─► setOrderEngaged(orderId, true) - lock order card
    │
    ▼
SOCKET: update-order [orderId, restaurantId, status, {payload}]
    │
    ├─► updateOrder() from socket payload (NO GET API)
    └─► setOrderEngaged(orderId, false) - auto-release
```

### 18.4 API Endpoint Updates

| Action | Old Endpoint (v1) | New Endpoint (v2) |
|--------|-------------------|-------------------|
| Place Order | `/api/v1/.../place-order` | `/api/v2/.../place-order` |
| Update Order | `/api/v1/.../update-place-order` | `/api/v2/.../update-place-order` |

### 18.5 Key Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| `update-order` data source | GET API call | Socket payload |
| Update Order locking | `setTableEngaged` | `setOrderEngaged` |
| New Order redirect | Wait for HTTP response | Wait for `update-table engage` socket |
| Walk-in/Takeaway/Delivery | Immediate redirect | 0.5s delay for UX |

### 18.6 File Changes

| File | Changes |
|------|---------|
| `constants.js` | Updated endpoints to v2 |
| `socketEvents.js` | Added `getOrderEngageChannel()`, `ORDER_ENGAGE` event |
| `socketHandlers.js` | Added `handleOrderEngage()`, updated `handleUpdateOrder()` to use payload |
| `useSocketEvents.js` | Subscribe to `order-engage` channel |
| `OrderContext.jsx` | Added `engagedOrders`, `setOrderEngaged`, `isOrderEngaged` |
| `OrderEntry.jsx` | Fire HTTP without await, wait for socket before redirect |

---

## 19. April 11, 2026 Architecture Updates — Socket Event Audit

### 19.1 Complete Socket Event Map (Verified from Console Logs)

| Flow | HTTP Verb | Endpoint | Socket Events | Has Payload? |
|------|-----------|----------|---------------|-------------|
| New Order | POST | v2 place-order | `update-table engage` + `new-order` | ✅ Yes |
| Update Order | PUT | v2 update-place-order | `order-engage` + `update-order` | ✅ Yes |
| Transfer Order | POST | v1 transfer-order | `update-table engage/free` + `update-order` | ❌ No |
| Transfer Food Item | POST | v1 transfer-food-item | 2x `update-order` | ❌ No |
| Cancel Food Item | PUT | v1 cancel-food-item | `update-table free` + `update-order-status` | ❌ No |
| Cancel Full Order | PUT | v2 order-status-update | `update-table free` + `update-order-status` | ❌ No |
| Collect Bill | POST | v2 order-bill-payment | `update-order-status` + `update-table free` | ❌ No |

### 19.2 Locking Architecture (Target State)

**Principle:** ALL UI locking comes from socket events. Zero local locking.

```
Socket Event                → Frontend Action
─────────────────────────────────────────────
update-table engage         → setTableEngaged(tableId, true)
update-table free           → setTableEngaged(tableId, false) + updateTableStatus('available')
order-engage engage         → setOrderEngaged(orderId, true)
order-engage free           → setOrderEngaged(orderId, false)
update-order (after lock)   → auto-release via requestAnimationFrame
new-order (after lock)      → auto-release via requestAnimationFrame
```

**What to wait for before redirect (per flow):**

| Flow | Wait Type |
|------|-----------|
| New Order + table | Wait for `update-table engage` |
| New Order + walk-in | 0.5s delay (no socket lock) |
| Update Order | Wait for `order-engage` |
| Transfer Order/Food | Fire & close (no wait) |
| Cancel Food Item | Wait for `update-table engage` (when backend sends it) |

### 19.3 Endpoint Version Map

| Action | Endpoint Version | Sends Socket Payload? |
|--------|-----------------|----------------------|
| Place Order | **v2** | ✅ Yes |
| Update Order | **v2** | ✅ Yes |
| Transfer Order | **v1** | ❌ No |
| Transfer Food Item | **v1** | ❌ No |
| Cancel Food Item | **v1** | ❌ No |
| Order Status Update | **v2** | ❌ No |
| Bill Payment | **v2** | ❌ No |

---

*Document maintained by the MyGenie development team.*
