const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const permPath = path.join(__dirname, '../db/permissions.json');
const usersPath = path.join(__dirname, '../db/users.json');

function readPerms() {
  return JSON.parse(fs.readFileSync(permPath, 'utf8'));
}
function writePerms(data) {
  fs.writeFileSync(permPath, JSON.stringify(data, null, 2));
}
function readUsers() {
  return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
}

// Static city master list
const CITIES = [
  'Ahmedabad', 'Bangalore', 'Bhopal', 'Bhubaneswar', 'Chandigarh', 'Chennai',
  'Coimbatore', 'Delhi', 'Gurgaon', 'Hyderabad', 'Indore', 'Jaipur', 'Kochi',
  'Kolkata', 'Lucknow', 'Ludhiana', 'Mumbai', 'Nagpur', 'New Delhi', 'Noida',
  'Patna', 'Pune', 'Surat', 'Vadodara', 'Visakhapatnam',
];

// GET /api/permissions/meta — all functions + roleDefaults + cities
router.get('/meta', (req, res) => {
  const { functions, roleDefaults } = readPerms();
  res.json({ functions, roleDefaults, cities: CITIES });
});

// GET /api/permissions/users — all users with their effective permissions
router.get('/users', (req, res) => {
  const { users } = readUsers();
  const { userOverrides, roleDefaults } = readPerms();

  const result = users.map((u) => {
    const override = userOverrides.find((o) => o.email === u.email);
    const effectiveFunctions = override
      ? override.functions
      : (u.roles ?? [u.role]).flatMap((r) => roleDefaults[r] ?? []).filter((v, i, a) => a.indexOf(v) === i);
    return {
      email: u.email,
      name: u.name,
      role: u.role,
      roles: u.roles ?? [u.role],
      appliedRoles: override?.appliedRoles ?? [u.role],
      functions: effectiveFunctions,
      cities: override?.cities ?? [],
      hasOverride: !!override,
    };
  });

  res.json(result);
});

// GET /api/permissions/user/:email — single user effective permissions
router.get('/user/:email', (req, res) => {
  const { users } = readUsers();
  const { userOverrides, roleDefaults } = readPerms();
  const email = decodeURIComponent(req.params.email).toLowerCase();

  const u = users.find((u) => u.email.toLowerCase() === email);
  if (!u) return res.status(404).json({ error: 'User not found' });

  const override = userOverrides.find((o) => o.email.toLowerCase() === email);
  const effectiveFunctions = override
    ? override.functions
    : (u.roles ?? [u.role]).flatMap((r) => roleDefaults[r] ?? []).filter((v, i, a) => a.indexOf(v) === i);

  res.json({
    email: u.email,
    name: u.name,
    role: u.role,
    roles: u.roles ?? [u.role],
    appliedRoles: override?.appliedRoles ?? [u.role],
    functions: effectiveFunctions,
    cities: override?.cities ?? [],
    hasOverride: !!override,
  });
});

// PUT /api/permissions/user/:email — save user permission override
router.put('/user/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const { appliedRoles, functions, cities } = req.body;

  if (!Array.isArray(functions)) return res.status(400).json({ error: 'functions must be an array' });

  // Save permission override
  const data = readPerms();
  const idx = data.userOverrides.findIndex((o) => o.email.toLowerCase() === email);
  const entry = { email, appliedRoles: appliedRoles ?? [], functions, cities: cities ?? [] };
  if (idx >= 0) data.userOverrides[idx] = entry;
  else data.userOverrides.push(entry);
  writePerms(data);

  // Sync appliedRoles → users.json so login returns the correct roles array
  if (Array.isArray(appliedRoles) && appliedRoles.length > 0) {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const uIdx = usersData.users.findIndex((u) => u.email.toLowerCase() === email);
    if (uIdx >= 0) {
      usersData.users[uIdx].roles = appliedRoles;
      // If current primary role is no longer in appliedRoles, reset it to first
      if (!appliedRoles.includes(usersData.users[uIdx].role)) {
        usersData.users[uIdx].role = appliedRoles[0];
      }
      fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    }
  }

  res.json({ ok: true, entry });
});

// DELETE /api/permissions/user/:email — remove override (revert to role defaults)
router.delete('/user/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const data = readPerms();
  data.userOverrides = data.userOverrides.filter((o) => o.email.toLowerCase() !== email);
  writePerms(data);
  res.json({ ok: true });
});

module.exports = router;
