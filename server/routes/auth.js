const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const usersPath = path.join(__dirname, '../db/users.json');

router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { users } = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) return res.status(404).json({ error: 'No account found for this email' });

  res.json({ name: user.name, role: user.role, email: user.email, roles: user.roles ?? [user.role] });
});

module.exports = router;
