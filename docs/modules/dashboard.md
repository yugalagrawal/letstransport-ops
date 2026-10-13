# Dashboard Module

**Files:** `client/src/pages/Dashboard.tsx`, `client/src/hooks/useDashboard.ts`  
**Backend:** `server/routes/dashboard.js`, `server/db/dashboard.json`

## Overview
Available to OPS and ADMIN roles. Shows KPI cards and a recent trips table.

## Components
- **KPICard** — shows label, value+unit, trend arrow (trendUp bool)
- **Recent Trips table** — id, origin→destination, driver, time, status badge
- Status values: `completed` | `in_transit` | `pending`

## Data
`dashboard.json` is static seed data. `useDashboard` hook fetches `GET /api/dashboard` once on mount. No real-time updates.
