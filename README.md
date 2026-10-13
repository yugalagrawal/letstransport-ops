# LetsTransport Ops Console

A high-fidelity product prototype of **LetsTransport's internal operations console**, which digitizes client onboarding and field operations for Sales, Sales Admin, BizFin, OPM, and FieldOps teams.

Built and iterated by me as a Product Manager, using React + AI-assisted prototyping to go straight from concept to a clickable, realistic UI so flows can be tested with stakeholders before engineering starts.

> This is a **prototype**, not the production app. All data is mocked in flat JSON files.

## Try it instantly

Open [`letstransport-ops-prototype.html`](./letstransport-ops-prototype.html) in any browser, with no install and no server. Pick a user under **Prototype access** on the sign-in page. Data resets on reload.

## Modules

- **Client Onboarding** — 7-step wizard (Group → Legal Entity → Vertical → State GSTIN → POC → City → Commercial)
- **Approvals** — two-stage pipeline: Sales Admin → BizFin Admin → OPM
- **MSA / Rate Card** — contracts and rate cards per client and vertical
- **Bookings** — OPM vehicle booking creation, drafts, and dashboards
- **BizFin tools** — POD metadata, invoice metadata, MIS template
- **Field Ops** — attendance and helper verification
- **Permissions Admin** — role and access management

## Prototype users

| Email | Access |
|---|---|
| `sales1@letstransport.in` | All roles |
| `sales2@letstransport.in` | Sales only |
| `fo1@letstransport.in` | Field Ops |

## Stack

React 18 · Vite · Tailwind CSS · React Router · Express (JSON-file backend)

## Running locally

```bash
npm run install:all
npm run dev   # client :5173, server :3001
```

Rebuild the single-file prototype with `./prototype/build.sh`.

## Docs

[`docs/`](./docs) has architecture, context, per-module specs, and [`CHEATSHEET.md`](./CHEATSHEET.md) has common task prompts.
