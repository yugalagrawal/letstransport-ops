const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const partnersPath = path.join(__dirname, '../db/partners.json');
const driversPath  = path.join(__dirname, '../db/drivers.json');
const readPartners = () => JSON.parse(fs.readFileSync(partnersPath, 'utf8')).partners;
const readDrivers  = () => JSON.parse(fs.readFileSync(driversPath,  'utf8')).drivers;

/* GET /api/partners?q=xxx  — search by number or name */
router.get('/', (req, res) => {
  const { q } = req.query;
  const partners = readPartners();
  if (!q) return res.json(partners);
  const query = String(q).toLowerCase();
  res.json(partners.filter(p =>
    p.partnerNumber.toLowerCase().includes(query) ||
    p.name.toLowerCase().includes(query)
  ));
});

/* GET /api/partners/:id — single partner */
router.get('/:id', (req, res) => {
  const partner = readPartners().find(p => p.id === req.params.id || p.partnerNumber === req.params.id);
  if (!partner) return res.status(404).json({ error: 'Not found' });
  res.json(partner);
});

/* GET /api/partners/drivers/search?q=xxx  — search drivers by contact or name */
router.get('/drivers/search', (req, res) => {
  const { q } = req.query;
  const drivers = readDrivers();
  if (!q) return res.json(drivers);
  const query = String(q).toLowerCase();
  res.json(drivers.filter(d =>
    d.contact.includes(query) ||
    d.name.toLowerCase().includes(query)
  ));
});

module.exports = router;
