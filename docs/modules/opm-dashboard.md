# OPM Dashboard Module

**File:** `client/src/pages/OPMDashboard.tsx`  
**Route:** `/opm-dashboard`  
**Role:** OPM (default landing page after login)  
**Sidebar:** First item in OPM nav, above Client Approvals

## Features
- **Date selector:** Yesterday / Today / Tomorrow quick pills + calendar date picker
- **Sub-Area dropdown:** All + dynamic list from bookings data (Peenya, Koramangala, Hebbal, etc.)
- **Booking Type filter:** Multi-select checkbox dropdown — OD-Local, OD-UPC, Sch-Local, Sch-UPC with Select all/Clear all
- **4 stat cards:** Trips, Clients, Hubs, Vehicles — all reactive to date + filters
- **Published Trips cards:** One card per booking, styled like AttendanceIntra cards

## Trip Card Layout
```
[Avatar] ClientName          [Time]     [FINAL dropdown]  [Vehicle Details]
         BKG-xxx · hub       VehicleType  Partner Marked   driver / reg / phone
                             Type badge   N/A / Yes
```

## Final Status Dropdown
Same ATTENDANCE_STATUS groups as AttendanceIntra (Present/Absent/Half-day/Client Cancelled).
Saves to PUT /api/bookings/:id with { finalStatus: v } on select.
Partner Marked = Yes when finalStatus is P-going or P-reported-late.

NOTE: ATTENDANCE_STATUS and FinalStatusDropdown are duplicated inline in OPMDashboard.tsx.
If refactoring, extract to client/src/utils/attendanceStatus.ts.

## Data
Fetches GET /api/bookings on mount, filters client-side to status === 'published'.
All filtering (date, subArea, bookingType) is purely client-side via useMemo.
