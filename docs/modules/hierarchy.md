# Hierarchy Module

**Files:** `server/routes/hierarchy.js`, `server/db/hierarchy.json`

## Data Model (cascading selects in wizard)
```
Group (1FKT, 1ZML...)
  └── LegalEntity  (has PAN)
        └── Vertical  (E-Commerce, Grocery...)
              └── StateGstin  (state + GSTIN)
                    └── City  (name)
```

## Endpoints
| Endpoint | Filter |
|----------|--------|
| GET /api/hierarchy/groups | — |
| GET /api/hierarchy/legal-entities | ?groupId= |
| GET /api/hierarchy/verticals | ?leId= |
| GET /api/hierarchy/state-gstins | ?leId= &verticalId= |
| GET /api/hierarchy/cities | ?stateGstinId= |

## Usage in Wizard
Each step in `AddClientModal` calls the relevant endpoint to populate a select dropdown. If the user chooses "Add New", they fill a form instead — the new entity is NOT persisted to `hierarchy.json` (it's saved only in the draft's `steps` object). The hierarchy DB is static seed data.
