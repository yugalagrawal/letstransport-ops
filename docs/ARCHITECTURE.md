# Architecture

## Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Backend | Express.js (Node), plain JSON files as DB |
| Auth | Email-only login; user stored in `localStorage` as `lt_ops_user` |
| Styling | Tailwind with custom `brand-navy` / `brand-orange` theme tokens |

## Ports
- Client: `http://localhost:5173` (Vite dev server, proxies `/api` → 3001)
- Server: `http://localhost:3001`
- Run both: `npm run dev` from root (concurrently)

## Folder Structure
```
letstransport-ops/
├── client/src/
│   ├── App.tsx                  # Routes + RequireAuth + DefaultRedirect
│   ├── hooks/
│   │   ├── useAuth.ts           # getUser/setUser/clearUser/switchRole (localStorage)
│   │   └── useDashboard.ts      # fetches /api/dashboard
│   ├── components/
│   │   ├── Sidebar.tsx          # Role-aware nav + role switcher + logout
│   │   ├── Header.tsx           # Page title + date
│   │   ├── AddClientModal.tsx   # 7-step onboarding wizard (largest file)
│   │   └── ApprovedClientsPanel.tsx  # OPM's approved clients list
│   └── pages/
│       ├── Login.tsx            # Email-only login form
│       ├── Dashboard.tsx        # KPI cards + recent trips (OPS/ADMIN)
│       ├── ClientOnboarding.tsx # SALES — My Clients / My Drafts / Approval Status tabs
│       ├── ClientApprovals.tsx  # Sales_admin / BizFin_admin approval queue
│       ├── OPMApprovals.tsx     # OPM approval queue (post BizFin)
│       ├── OPMClients.tsx       # OPM's client portfolio view
│       ├── CreateBookings.tsx   # OPM creates vehicle bookings (multi-step)
│       ├── AttendanceIntra.tsx  # FieldOps attendance tracking
│       └── Placeholder.tsx      # Stub for unbuilt pages
├── server/
│   ├── index.js                 # Express app, mounts all routes
│   ├── routes/                  # auth, clients, drafts, bookings, hierarchy, partners, dashboard
│   └── db/                      # users.json, clients.json, drafts.json, bookings.json,
│                                #   hierarchy.json, partners.json, drivers.json, dashboard.json
```

## Key Decisions
- **No auth tokens**: login only checks email against `users.json`; session is just `localStorage`.
- **Flat JSON files as DB**: simple for prototyping; all routes read/write files synchronously.
- **Role switching**: users with `roles` array (e.g. sales1) can switch roles via sidebar dropdown without re-login.
- **Draft-centric flow**: client onboarding creates a `draft` object that accumulates steps and approval statuses; no separate approval entity.
- **Approval lock**: once a draft step is submitted (SA or BizFin), that step is read-only until `Correction Required` is set.
