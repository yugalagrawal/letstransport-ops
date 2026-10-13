const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/drafts.json');
const read  = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const write = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/* List all drafts */
router.get('/', (req, res) => {
  const { drafts } = read();
  res.json(drafts);
});

/* Get a single draft by ID */
router.get('/:id', (req, res) => {
  const { drafts } = read();
  const draft = drafts.find((d) => d.id === req.params.id);
  if (!draft) return res.status(404).json({ error: 'Draft not found' });
  res.json(draft);
});

/* Create a new draft (called on first Save & Next) */
router.post('/', (req, res) => {
  const db = read();
  const newDraft = {
    id: `DRAFT-${String(db.drafts.length + 1).padStart(3, '0')}`,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    createdBy:   req.body.createdBy || 'unknown',
    currentStep: req.body.currentStep ?? 0,
    steps: req.body.steps || {},
  };
  db.drafts.push(newDraft);
  write(db);
  res.status(201).json(newDraft);
});

/* Update an existing draft (called on each subsequent Save & Next) */
router.put('/:id', (req, res) => {
  const db = read();
  const idx = db.drafts.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Draft not found' });

  const update = {
    ...db.drafts[idx],
    updatedAt:   new Date().toISOString(),
    currentStep: req.body.currentStep ?? db.drafts[idx].currentStep,
    steps:       { ...db.drafts[idx].steps, ...(req.body.steps || {}) },
  };

  // Approval status fields — only overwrite when explicitly provided
  const approvalFields = [
    'salesAdminStatus', 'salesAdminSubmittedAt', 'salesAdminComment',
    'bizFinStatus',     'bizFinSubmittedAt',      'bizFinComment',
    'opmStatus',        'opmSubmittedAt',          'opmComment',
    'opmApprovedAt',    'opmHubDetails',           'opmHubs',
    'pricings',         'driverPricings',    'commercialFiles',
  ];
  approvalFields.forEach((f) => { if (f in req.body) update[f] = req.body[f]; });

  db.drafts[idx] = update;
  write(db);
  res.json(db.drafts[idx]);
});

module.exports = router;
