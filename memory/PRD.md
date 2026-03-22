# Restaurant POS Frontend - PRD

## Original Problem Statement
1. Pull code from repo `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch: 22-1-march-)
2. Build project as-is
3. Summarize learnings about the project

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI
- **Backend API**: `https://preprod.mygenie.online` (external)
- **State**: React Context (AuthContext, TableOrderContext)
- **Build Tool**: Craco (Create React App Configuration Override)

## Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Styling | Tailwind CSS 3.4 |
| Components | Radix UI, Shadcn patterns |
| Drag & Drop | @dnd-kit |
| HTTP Client | Axios |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Routing | React Router DOM 7 |

## API Endpoints (External)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/vendoremployee/login` | POST | Authentication |
| `/api/v2/vendoremployee/vendor-profile/profile` | GET | Vendor profile |
| `/api/v1/categories` | GET | Categories list |
| `/api/v1/vendoremployee/get-products-list` | GET | Products paginated |

## What's Been Implemented (Jan 2026)

### Phase 1: Setup
- [x] Cloned from GitHub branch 22-1-march-
- [x] Dependencies installed via yarn
- [x] Production build successful (220KB JS, 11KB CSS)

### Core Features
- [x] Login page with API integration
- [x] Dashboard with multi-channel support (Dine-In, Delivery, TakeAway, Room)
- [x] Table view with area sections
- [x] Order cards with status management
- [x] Search across tables/orders
- [x] Settings panel (8 sections)
- [x] Menu management (categories, products, drag-drop, bulk actions)

## File Structure
```
/frontend/src/
├── components/
│   ├── cards/        # Table, Delivery, DineIn, Room cards
│   ├── common/       # FilterPill, SearchResult components
│   ├── header/       # ChannelPills, StatusFilters, ViewToggle
│   ├── layout/       # Header, Sidebar
│   ├── menu/         # Menu management (CRUD, DnD)
│   ├── order-entry/  # Order taking flow
│   ├── payment/      # Payment processing
│   ├── sections/     # Table, Room, Order sections
│   ├── settings/     # 8 settings forms
│   └── ui/           # Shadcn UI primitives
├── context/          # AuthContext, TableOrderContext
├── data/             # Mock data
├── hooks/            # Custom hooks
├── pages/            # LoginPage, DashboardPage
├── services/         # API layer
└── utils/            # Helpers
```

## Backlog (P0/P1/P2)
### P0 - Critical
- [ ] Connect real CRUD APIs for Settings/Menu/Products

### P1 - Important
- [ ] Form validation for all inputs
- [ ] Loading spinners & error toasts
- [ ] Image upload to server (not base64)

### P2 - Nice to Have
- [ ] Printer assignment UI
- [ ] Refactor MenuManagementPanel.jsx (1000+ lines)

## Test Credentials
- Email: owner@18march.com
- Password: Qplazm@10

## Notes
- All CUD operations are MOCKED (local state only)
- Read operations connect to real API
- Build output: 4.4MB uncompressed, 231KB gzipped
