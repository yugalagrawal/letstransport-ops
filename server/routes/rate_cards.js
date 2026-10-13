const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const rcPath  = path.join(__dirname, '../db/rate_cards.json');
const msaPath = path.join(__dirname, '../db/msas.json');
const read    = () => JSON.parse(fs.readFileSync(rcPath, 'utf8'));
const write   = (data) => fs.writeFileSync(rcPath, JSON.stringify(data, null, 2));

router.get('/', (req, res) => {
  const { verticalName, msaId } = req.query;
  let list = read();
  if (verticalName) list = list.filter((r) => r.verticalName === verticalName);
  if (msaId)        list = list.filter((r) => r.msaId === msaId);
  res.json(list);
});

router.post('/', (req, res) => {
  const list = read();
  const next = { id: `RC-${String(list.length + 1).padStart(3, '0')}`, ...req.body, createdAt: new Date().toISOString(), createdBy: 'sales1@letstransport.in' };
  list.push(next);
  write(list);
  res.status(201).json(next);
});

module.exports = router;
