const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/dashboard.json');

router.get('/', (req, res) => {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  res.json(data);
});

module.exports = router;
