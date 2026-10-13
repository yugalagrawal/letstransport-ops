# Issues & Incomplete Logic

## Logic Gaps

### File Uploads (Commercial step)
Files are stored only as metadata (`CommercialFileMeta` with id/name/size/category). No actual upload endpoint exists on the server. Any refresh loses file state — the metadata persists in the draft but the `File` objects in React state are gone.

### My Clients Panel (ClientOnboarding)
`MyClientsPanel` in `ClientOnboarding.tsx` is a stub — it renders a placeholder/empty state. Approved clients aren't shown to the SALES user who created them.

### OPM Hub Details
`opmHubDetails`, `opmHubs`, and `pricings` fields are patched onto drafts but the OPM approval UI for filling these is unclear/incomplete. The server supports them but the frontend form may be partial.

### Dummy GSTIN leak
`buildDummyGSTIN` generates a syntactically valid-looking GSTIN. If a dummy LE draft progresses to approval, approvers see a fake GSTIN with no visual warning it's dummy — only the toggle in step 3 indicates it.

### Role `OPS` and `ADMIN` in users.json
`ops1@letstransport.in` has role `OPS` and `admin@letstransport.in` has `ADMIN`, but `NAV_BY_ROLE.OPS` only shows Dashboard (no other routes), and `ADMIN` shows Dashboard + Client Onboarding + Client Approvals. Neither appears in `DefaultRedirect`, so they land on `/dashboard`. No dedicated admin flows exist.

### Concurrent JSON writes
All DB routes use synchronous `fs.readFileSync` / `fs.writeFileSync`. Concurrent writes (e.g., two approvals at the same moment) will corrupt the JSON file. Fine for single-user dev, not production.

### Auth has no password
Login accepts any valid email from `users.json` — no password/OTP. Any user can impersonate any other user by entering their email.

## Minor / UX
- `AttendanceIntra.tsx` — likely a stub; no data source or backend route for attendance
- Sidebar emoji icons (📋, ✦, 🏢, 📦) will render inconsistently across OS
- `Header.tsx` uses `new Date()` client-side — timezone shown is the user's local timezone, not IST-normalized
