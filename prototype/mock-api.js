// Seeds an in-memory db, mounts the real server routes, and overrides window.fetch.
import db_bookings from '../server/db/bookings.json';
import db_clients from '../server/db/clients.json';
import db_dashboard from '../server/db/dashboard.json';
import db_drafts from '../server/db/drafts.json';
import db_drivers from '../server/db/drivers.json';
import db_eligible_verticals from '../server/db/eligible_verticals.json';
import db_hierarchy from '../server/db/hierarchy.json';
import db_invoice_metadata from '../server/db/invoice_metadata.json';
import db_msas from '../server/db/msas.json';
import db_partners from '../server/db/partners.json';
import db_permissions from '../server/db/permissions.json';
import db_pod_metadata from '../server/db/pod_metadata.json';
import db_rate_cards from '../server/db/rate_cards.json';
import db_users from '../server/db/users.json';
import r_auth from '../server/routes/auth.js';
import r_dashboard from '../server/routes/dashboard.js';
import r_clients from '../server/routes/clients.js';
import r_hierarchy from '../server/routes/hierarchy.js';
import r_drafts from '../server/routes/drafts.js';
import r_bookings from '../server/routes/bookings.js';
import r_partners from '../server/routes/partners.js';
import r_msas from '../server/routes/msas.js';
import r_rate_cards from '../server/routes/rate_cards.js';
import r_pod_metadata from '../server/routes/pod_metadata.js';
import r_invoice_metadata from '../server/routes/invoice_metadata.js';
import r_permissions from '../server/routes/permissions.js';

const db = { 'bookings.json': db_bookings, 'clients.json': db_clients, 'dashboard.json': db_dashboard, 'drafts.json': db_drafts, 'drivers.json': db_drivers, 'eligible_verticals.json': db_eligible_verticals, 'hierarchy.json': db_hierarchy, 'invoice_metadata.json': db_invoice_metadata, 'msas.json': db_msas, 'partners.json': db_partners, 'permissions.json': db_permissions, 'pod_metadata.json': db_pod_metadata, 'rate_cards.json': db_rate_cards, 'users.json': db_users };
globalThis.__DB__ = {};
for (const k in db) globalThis.__DB__[k] = JSON.stringify(db[k], null, 2);

const mounts = [
  ['/api/auth', r_auth],
  ['/api/dashboard', r_dashboard],
  ['/api/clients', r_clients],
  ['/api/hierarchy', r_hierarchy],
  ['/api/drafts', r_drafts],
  ['/api/bookings', r_bookings],
  ['/api/partners', r_partners],
  ['/api/msas', r_msas],
  ['/api/rate-cards', r_rate_cards],
  ['/api/pod-metadata', r_pod_metadata],
  ['/api/invoice-metadata', r_invoice_metadata],
  ['/api/permissions', r_permissions],
];

function dispatch(method, urlStr, body) {
  const url = new URL(urlStr, 'http://x');
  if (url.pathname === '/api/health') return { status: 200, body: { status: 'ok' } };
  for (const [prefix, router] of mounts) {
    if (!url.pathname.startsWith(prefix)) continue;
    const sub = url.pathname.slice(prefix.length) || '/';
    for (const r of router.routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(sub);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const req = { params, query: Object.fromEntries(url.searchParams), body: body ?? {} };
      let status = 200, out;
      const res = {
        status(s) { status = s; return res; },
        json(d) { out = d; return res; },
      };
      try { r.handler(req, res); } catch (e) { return { status: 500, body: { error: String(e) } }; }
      return { status, body: out };
    }
  }
  return { status: 404, body: { error: 'Not found (prototype)' } };
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const u = typeof input === 'string' ? input : input.url;
  if (!u.startsWith('/api/')) return realFetch(input, init);
  let body;
  try { body = init.body ? JSON.parse(init.body) : undefined; } catch { body = undefined; }
  const { status, body: out } = dispatch((init.method || 'GET').toUpperCase(), u, body);
  await new Promise((r) => setTimeout(r, 120));
  return new Response(JSON.stringify(out ?? null), { status, headers: { 'Content-Type': 'application/json' } });
};
