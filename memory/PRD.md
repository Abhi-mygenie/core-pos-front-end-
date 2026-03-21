# Restaurant POS System - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/core-pos-front-end-.git and build it as-is (no backend, frontend only).

## Project Overview
A Restaurant POS (Point of Sale) frontend system built with React, CRACO, and Tailwind CSS.

## Tech Stack
- React 19.0.0
- CRACO (Create React App Configuration Override)
- Tailwind CSS 3.4.17
- Radix UI Components
- React Router DOM 7.5.1
- Recharts for data visualization

## What's Been Implemented (Jan 2026)
- ✅ Cloned repository from GitHub
- ✅ Set up frontend with all dependencies
- ✅ Configured CRACO with webpack aliases (@/ prefix)
- ✅ Application running successfully on port 3000
- ✅ **Customer Name Auto-Suggest** - Added auto-suggestions to name field showing matching customers (name + phone) after 2 characters typed
- ✅ **Fixed: First click selection** - Changed from onClick to onMouseDown to prevent blur race condition
- ✅ **Fixed: Linked field clearing** - Clearing name clears phone (and vice versa) when customer was selected
- ✅ **Fixed: Double dropdown bug** - After selecting customer, dropdowns no longer reappear (checks `isCustomerSelected` state)
- ✅ **Category Panel Redesign** - Added search box, compact items (36px vs 50px), scroll indicator, supports 20 categories
- ✅ **"All" Category** - Added "All" as first option to show all menu items from all categories
- ✅ **Back Button** - Added orange back arrow in category panel header (before Shift/Merge buttons) to return to dashboard
- ✅ **Header Alignment** - Standardized all 3 section headers to `py-3` for consistent height
- ✅ **Touch-Friendly Icons** - Increased icon padding to `p-3` and gap to `gap-3` for 40x40px tap targets
- ✅ **Tap Compliant Filters** - Dietary filter pills now 42px height (py-3) meeting touch accessibility standards
- ✅ **RHS Cart Panel Tap Compliance** - Fixed Cancel(x), Qty +/-, Add Note, Customize buttons to 40x40px+ targets

## Features
- Login Page with MyGenie branding
- Dashboard with Dine-In Orders view
- Multi-tab order management (All, Del, Take, Dine, Room)
- Order status tracking (Confirm, Cooking, Ready, Running, Schedule)
- Sidebar navigation (Dashboard, Orders, Reports, Menu Management, Employees, Expenses, Inventory, Settings)
- Table management (T2, T3, T5, T9, T12, T18, etc.)
- Bill/KOT functionality

## Pages
1. `/` - Login Page
2. `/dashboard` - Main Dashboard with Order Management

## Next Action Items
- Backend integration (if needed)
- Authentication flow implementation
- API endpoints connection

## Notes
- This is a frontend-only build as requested
- Uses mock data for orders and tables
