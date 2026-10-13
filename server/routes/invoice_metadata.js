const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/invoice_metadata.json');
const read  = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const write = (d) => fs.writeFileSync(dbPath, JSON.stringify(d, null, 2));

router.get('/', (req, res) => {
  const { verticalName, city } = req.query;
  let list = read();
  if (verticalName) list = list.filter((r) => r.verticalName === verticalName);
  if (city)         list = list.filter((r) => r.city === city);
  res.json(list);
});

router.post('/', (req, res) => {
  const list = read();
  const { verticalName, city } = req.body;
  const idx = list.findIndex((r) => r.verticalName === verticalName && r.city === city);
  const record = {
    id: idx >= 0 ? list[idx].id : `INV-${String(list.length + 1).padStart(3, '0')}`,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  write(list);
  res.status(201).json(record);
});

module.exports = router;
