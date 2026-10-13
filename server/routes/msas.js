const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/msas.json');
const evPath = path.join(__dirname, '../db/eligible_verticals.json');
const read = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const write = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// Must be before '/:id' routes to avoid being swallowed by param routes
router.get('/eligible-verticals', (_req, res) => {
  const allMsas = read();
  const existing = new Set(allMsas.map((m) => m.verticalName.toLowerCase()));
  const eligible = JSON.parse(fs.readFileSync(evPath, 'utf8'));
  res.json(eligible.filter((v) => !existing.has(v.verticalName.toLowerCase()) && v.tripMode === 'Upcountry'));
});

router.get('/', (_req, res) => {
  res.json(read());
});

router.post('/', (req, res) => {
  const list = read();
  const next = { id: `MSA-${String(list.length + 1).padStart(3, '0')}`, ...req.body };
  list.push(next);
  write(list);
  res.status(201).json(next);
});

router.put('/:id', (req, res) => {
  const list = read();
  const idx = list.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  list[idx] = { ...list[idx], ...req.body };
  write(list);
  res.json(list[idx]);
});

module.exports = router;
