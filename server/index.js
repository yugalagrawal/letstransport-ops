const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'] }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/hierarchy', require('./routes/hierarchy'));
app.use('/api/drafts',    require('./routes/drafts'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/partners',  require('./routes/partners'));
app.use('/api/msas',         require('./routes/msas'));
app.use('/api/rate-cards',   require('./routes/rate_cards'));
app.use('/api/pod-metadata',     require('./routes/pod_metadata'));
app.use('/api/invoice-metadata', require('./routes/invoice_metadata'));
app.use('/api/permissions',      require('./routes/permissions'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'lt-ops-server' }));

app.listen(PORT, () => {
  console.log(`letstransport Ops Server running on http://localhost:${PORT}`);
});
