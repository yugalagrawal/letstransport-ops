# Client Onboarding Module

**Files:** `client/src/pages/ClientOnboarding.tsx`, `client/src/components/AddClientModal.tsx`  
**Backend:** `server/routes/drafts.js`, `server/db/drafts.json`

## Overview
SALES role creates clients via a 7-step wizard. Progress is persisted as a `Draft` object. Two approval gates interrupt the wizard and require external reviewers to act before the SALES user can proceed.

## Steps
| # | Step | Key data |
|---|------|---------|
| 0 | Group | Select existing group or add new (name, industryType) |
| 1 | Legal Entity | Select or add (name, PAN, orgType, address; dummy LE toggle) |
| 2 | Vertical | Select or add (name builder: standard or CFA format; tripMode; leg; projectName) |
| 3 | State GSTIN | Select or add (state, GSTIN with validation + checksum, billing address; dummy GSTIN) |
| 4 | POC | Finance primary/alt, Operations primary/alt contacts |
| 5 | City | Select or add (city, hubName, hubAddress, contactName/email/phone) |
| 6 | Commercial | businessType, contract dates, margin%, billingDays, creditDays, invoiceFrequency, remarks, file uploads |

## Approval Gates
- **After step 0 (Group):** wizard pauses, SALES submits to Sales Admin. `salesAdminStatus` set to `Pending`.
- **After step 4 (POC):** wizard pauses, SALES submits to BizFin Admin. `bizFinStatus` set to `Pending`.
- Steps are **locked** (read-only) while `Pending` or `Approved`; unlocked only on `Correction Required`.
- Approval statuses: `Pending` | `Approved` | `Correction Required`

## Draft Schema (key fields)
```
draft.id            — DRAFT-001, DRAFT-002, ...
draft.currentStep   — last completed step index (0-6)
draft.steps         — { group, legalEntity, vertical, stateGstin, poc, city, commercial }
draft.salesAdminStatus / salesAdminComment / salesAdminSubmittedAt
draft.bizFinStatus  / bizFinComment        / bizFinSubmittedAt
draft.opmStatus     / opmComment           / opmSubmittedAt / opmApprovedAt
draft.opmHubDetails / opmHubs / pricings   — filled by OPM on approval
draft.commercialFiles — [{ id, name, size, category }]  (metadata only, no actual file)
```

## Vertical Naming Convention
Standard: `{VerticalPart}_{Leg}_{ProjectName}` (no spaces/underscores in parts)  
CFA: `{CFACompanyName}_{Leg}` (isCFA = true)  
tripMode: `Local` or `Upcountry` — affects commercial margin approval thresholds

## ClientOnboarding Page Tabs
- **My Clients** — stub, shows approved clients (not yet implemented fully)
- **Pending List → My Drafts** — all in-progress drafts (excludes once BizFin has acted)
- **Pending List → Approval Status** — drafts that have been submitted; shows SA + BizFin badges; role-aware action buttons
