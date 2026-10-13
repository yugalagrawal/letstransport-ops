const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dbPath = path.join(__dirname, '../db/bookings.json');
const read  = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const write = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/* List all bookings (optionally filter by subArea) */
router.get('/', (req, res) => {
  const { bookings } = read();
  const { subArea } = req.query;
  res.json(subArea ? bookings.filter(b => b.subArea === subArea) : bookings);
});

/* Create booking */
router.post('/', (req, res) => {
  const db = read();
  const newBooking = {
    id:        `BKG-${String(db.bookings.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'unknown',
    status:    'draft',
    subArea:     req.body.subArea,
    area:        req.body.area,
    draftId:     req.body.draftId,
    clientName:  req.body.clientName,
    hubName:     req.body.hubName,
    date:        req.body.date,
    vehicleType: req.body.vehicleType,
    vehicleCount:req.body.vehicleCount,
    startTime:   req.body.startTime   || '',
    shiftHours:  req.body.shiftHours  || '',
    shiftMinutes:req.body.shiftMinutes|| '',
    notes:       req.body.notes       || '',
  };
  db.bookings.push(newBooking);
  write(db);
  res.status(201).json(newBooking);
});

/* Update booking (edit fields or publish) */
router.put('/:id', (req, res) => {
  const db = read();
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

  const update = { ...db.bookings[idx], ...req.body };
  if (req.body.status === 'published' && !db.bookings[idx].publishedAt) {
    update.publishedAt = new Date().toISOString();
  }
  db.bookings[idx] = update;
  write(db);
  res.json(db.bookings[idx]);
});

/* Delete booking */
router.delete('/:id', (req, res) => {
  const db = read();
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
  db.bookings.splice(idx, 1);
  write(db);
  res.json({ deleted: true });
});

module.exports = router;
