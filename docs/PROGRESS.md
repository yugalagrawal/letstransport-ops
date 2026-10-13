# Progress

## Done
- **Auth** — email login, localStorage session, role switching
- **Sidebar** — role-aware nav, multi-role dropdown, collapse/expand, logout
- **Client Onboarding wizard** (`AddClientModal`) — all 7 steps fully implemented:
  - Group (select existing or add new)
  - Legal Entity (select or add; PAN validation; dummy-LE toggle)
  - Vertical (standard/CFA naming convention builder; trip mode; leg type; project name)
  - State GSTIN (state → auto-code; GSTIN validation + checksum; dummy GSTIN generation)
  - POC (Finance primary/alt, Operations primary/alt)
  - City (select or add; hub name/address/contact)
  - Commercial (business type, contract dates, margin%, billing/credit days, file uploads)
- **Approval gates** in wizard — Sales Admin approval triggered at step 0 (Group), BizFin at step 4 (POC); steps lock when pending/approved
- **ClientOnboarding page** — My Clients panel (stub), My Drafts panel, Approval Status panel
- **ClientApprovals page** — Sales_admin / BizFin_admin review queue with Approve / Correction Required actions and comment
- **OPMApprovals page** — OPM approval queue after BizFin approval; shows hub details assignment
- **OPMClients page** — OPM's portfolio of approved clients
- **CreateBookings page** — multi-step booking form (draft save + publish flow, partner/driver search)
- **AttendanceIntra page** — FieldOps attendance view
- **Dashboard** — KPI cards, recent trips table
- **All server routes** — CRUD for drafts, bookings, read-only for clients/hierarchy/partners/drivers

## In Progress / Incomplete
- **My Clients panel** in ClientOnboarding — renders a static empty/stub state; no real data integration
- **ApprovedClientsPanel** — component exists but integration depth unclear
- **OPMApprovals hub detail form** — `opmHubDetails` / `opmHubs` fields exist in draft schema but UI completeness unclear
- **AttendanceIntra** — page exists; actual functionality likely stub
- **Placeholder.tsx** — used for any nav items not yet built

## Not Started
- Real file upload (commercial/approval files stored as metadata only, no actual file storage)
- Notifications / email triggers
- Actual booking dispatch / driver assignment post-creation
- Any admin/reporting views
