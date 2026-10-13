# Approvals Module

**Files:** `client/src/pages/ClientApprovals.tsx`, `client/src/pages/OPMApprovals.tsx`  
**Backend:** `server/routes/drafts.js` (PUT /:id patches approval fields)

## Approval Flow
```
SALES submits → Sales Admin reviews → BizFin Admin reviews → OPM reviews → Client live
```

## ClientApprovals.tsx (Sales_admin / BizFin_admin)
- Shows all drafts that have been submitted (have a `salesAdminStatus` or `bizFinStatus`)
- Three sub-tabs: **Pending** | **Correction Required** | **Approved**
- Role guard: `Sales_admin` / `ADMIN` can act on Sales Admin column; `BizFin_admin` / `ADMIN` on BizFin column
- Actions: **Approve** → sets status to `Approved`; **Request Correction** → sets `Correction Required` + saves comment
- PATCH call: `PUT /api/drafts/:id` with `{ salesAdminStatus, salesAdminComment, salesAdminSubmittedAt }` or bizFin equivalents

## OPMApprovals.tsx (OPM)
- Shows drafts where both SA and BizFin are `Approved` and `opmStatus` is not yet `Approved`
- OPM can approve (sets `opmStatus = 'Approved'`, `opmApprovedAt`) or request correction
- OPM fills in hub details (`opmHubDetails`, `opmHubs`) on approval
- After OPM approval the client is considered onboarded

## ApprovalCard Component
Shared between ClientApprovals and shows:
- Group name, Legal Entity, Vertical, tripMode
- SA status badge + comment if Correction Required
- BizFin status badge + comment if Correction Required
- Action buttons (conditional on role + current status)
