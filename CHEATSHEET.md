# Cheatsheet — letstransport-ops

> Load `docs/` before starting any task. Do NOT re-read old chat history.

## Run the app
```
npm run dev          # from repo root — starts both client (5173) and server (3001)
```
Test users: `sales1@letstransport.in` (all roles), `sales2@letstransport.in` (SALES only), `fo1@letstransport.in` (FieldOps)

---

## Common task prompts

### Add a new page / route
> "Add a new page called `<PageName>` accessible to role `<ROLE>`. Create `client/src/pages/<PageName>.tsx`, add the route in `App.tsx`, and add the nav entry in `NAV_BY_ROLE` in `Sidebar.tsx`. See `docs/ARCHITECTURE.md` for the routing pattern."

### Add a new wizard step
> "Add a step `<StepName>` at index <N> in the client onboarding wizard. See `docs/modules/client-onboarding.md` for the step structure. The wizard is in `client/src/components/AddClientModal.tsx`. Add the step to `PIPELINE_STEPS`, add a form component, add a `setNew<Step>` handler, and add the field to `buildStepData`."

### Add a new approval role / action
> "Add an approval action for role `<Role>` in the approvals flow. See `docs/modules/approvals.md`. The approval status fields live in the draft object in `server/db/drafts.json` and are patched via `PUT /api/drafts/:id`. Add UI in `ClientApprovals.tsx` or `OPMApprovals.tsx`."

### Add a new API endpoint
> "Add a new route `<METHOD> /api/<resource>` in `server/routes/<resource>.js`. Register it in `server/index.js`. The DB file is `server/db/<resource>.json`. Follow the existing pattern: `read()` / `write()` helpers, no auth middleware."

### Fix a draft field not persisting
> "The field `<fieldName>` on a draft isn't persisting. In `server/routes/drafts.js`, add `<fieldName>` to the `approvalFields` array (line ~44) so it gets explicitly patched on PUT."

### Add a new role
> "Add role `<RoleName>`. Steps: (1) add to `Role` type in `useAuth.ts`, (2) add label in `ROLE_LABELS`, (3) add nav items in `NAV_BY_ROLE` in `Sidebar.tsx`, (4) add redirect in `DefaultRedirect` in `App.tsx`, (5) add a test user in `server/db/users.json`."

### Change sidebar nav items for a role
> "Update the nav items for role `<Role>` in `NAV_BY_ROLE` in `client/src/components/Sidebar.tsx`."

### Update seed/mock data
> "Update `server/db/<filename>.json` to add/change seed data. Files: `users.json`, `clients.json`, `hierarchy.json`, `drafts.json`, `bookings.json`, `partners.json`, `drivers.json`, `dashboard.json`."

### Implement the My Clients panel
> "Implement `MyClientsPanel` in `client/src/pages/ClientOnboarding.tsx`. It should fetch `GET /api/clients` and display the list. See the `Client` type used in that file. The panel is currently a stub — see `docs/ISSUES.md`."

### Add real file upload
> "Implement file upload for the Commercial step. Currently only metadata is stored — see `docs/ISSUES.md`. Add a `POST /api/drafts/:id/files` endpoint in the server and wire it to the file input in `CommercialStep` inside `AddClientModal.tsx`."
