# Bookings Module

**Files:** `client/src/pages/CreateBookings.tsx`  
**Backend:** `server/routes/bookings.js`, `server/db/bookings.json`

## Overview
OPM role creates vehicle bookings for their clients. The form is single-page (not multi-step) with draft-save on "Save Booking" and final publish via a Publish button in the list view.

## Booking Classification (4 types)
Derived from `clientPricingLabel` (OD · ... vs Schedule · ...) + `bookingType` (within_city / upcountry):

| Label | Pricing | Geo | Badge color |
|-------|---------|-----|-------------|
| OD-Local | OD | within_city | orange |
| OD-UPC | OD | upcountry | red |
| Sch-Local | Schedule | within_city | blue |
| Sch-UPC | Schedule | upcountry | purple |

## Form Sections
1. **Client Details** — Client Name, Booking Time, OPS POC chip, Client Hub, Client Pricing
2. **Trip Details & Rate** — Start Date, Materials, Helpers, Trip Type, 24hr Trip, Booking Type (Local/Upcountry), classification badge + note, Distance, Time, Est. Cost, Est. Revenue, Margin
3. **Scheduled Opportunity checkbox** (Sch-Local only) — if checked, replaces Driver & Vehicle with "Under Construction" placeholder
4. **Driver & Vehicle Details** (hidden for OD pricing) — Partner Number, Select Vehicle, Driver Pricing, Vehicle Attributes, Driver Contact, Driver Name (auto-fetched)

## Classification Note Banner
Shown below the badge when a pricing is selected. Each type has its own colour + message:
- OD-Local: one-time, Requests to Apply → Partner App
- OD-UPC: one-time, Requests to Bid → Partner App
- Sch-Local/Sch-UPC: Cron Job auto-publishes daily per contract until expiry/deletion

## Bookings List (Sub-area view)
- Column: "Booking Type" (was "OD / Scheduled") with 4-type coloured pills
- Row click expands to show hub, start date, cost, revenue, margin + Edit/Delete buttons
- OD rows show "—" for driver/vehicle columns
- Publish button → confirm dialog with type-specific wording

## Booking Completeness
- OD: requires clientName + hubName + startDate only
- Scheduled: also requires vehicleType/vehicleId + driverName/driverContact

## Server API
- `GET /api/bookings` — list all; filter by `?subArea=`
- `POST /api/bookings` — create (status = draft)
- `PUT /api/bookings/:id` — update/publish; sets `publishedAt` on first publish, `finalStatus` for attendance
- `DELETE /api/bookings/:id` — delete

## Partner & Driver Search
- `GET /api/partners?q=` — search by partner number or name
- `GET /api/partners/drivers/search?q=` — search drivers by name or contact
