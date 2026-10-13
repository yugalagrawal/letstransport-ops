const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/hierarchy.json');
const read = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));

router.get('/groups',       (req, res) => res.json(read().groups));
router.get('/legal-entities', (req, res) => {
  const { groupId } = req.query;
  const { legalEntities } = read();
  res.json(groupId ? legalEntities.filter((le) => le.groupId === groupId) : legalEntities);
});
router.get('/verticals', (req, res) => {
  const { leId } = req.query;
  const { verticals } = read();
  res.json(leId ? verticals.filter((v) => v.leId === leId) : verticals);
});
router.get('/state-gstins', (req, res) => {
  const { leId, verticalId } = req.query;
  let { stateGstins } = read();
  if (leId)       stateGstins = stateGstins.filter((s) => s.leId === leId);
  if (verticalId) stateGstins = stateGstins.filter((s) => s.verticalId === verticalId);
  res.json(stateGstins);
});
router.get('/cities', (req, res) => {
  const { stateGstinId } = req.query;
  const { cities } = read();
  res.json(stateGstinId ? cities.filter((c) => c.stateGstinId === stateGstinId) : cities);
});

module.exports = router;
