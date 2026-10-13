# Auth Module

**Files:** `client/src/hooks/useAuth.ts`, `server/routes/auth.js`, `server/db/users.json`

## How it works
1. User enters work email on `/login`
2. POST `/api/auth/login` checks `users.json` by email (case-insensitive)
3. Returns `{ name, email, role, roles[] }` — stored in `localStorage` as `lt_ops_user`
4. `getUser()` reads localStorage on every render; no token/session server-side

## Roles
| Role | Default landing | Nav items |
|------|----------------|-----------|
| SALES | /client-onboarding | Client Onboarding |
| Sales_admin | /client-approvals | Client Approvals |
| BizFin_admin | /client-approvals | Client Approvals |
| OPM | /opm-approvals | Client Approvals, My Clients, Create Bookings, Attendance |
| FieldOps | /attendance-intra | Attendance |
| OPS | /dashboard | Dashboard |
| ADMIN | /dashboard | Dashboard, Client Onboarding, Client Approvals |

## Role switching
Users with multiple roles in `roles[]` (e.g. `sales1@letstransport.in`) get a dropdown in the sidebar footer. `switchRole(role)` updates localStorage and does `window.location.href = '/'` to hard-reload and re-apply routing.

## Test users
| Email | Default role | Notes |
|-------|-------------|-------|
| sales1@letstransport.in | SALES | Has all roles — use for testing any role |
| sales2@letstransport.in | SALES | Single role |
| ops1@letstransport.in | OPS | Single role |
| admin@letstransport.in | ADMIN | Single role |
| fo1@letstransport.in | FieldOps | Single role |
