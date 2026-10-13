const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/clients.json');

router.get('/', (req, res) => {
  const { clients } = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const { clients } = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

module.exports = router;
