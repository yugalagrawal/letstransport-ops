// In-memory "filesystem" keyed by file basename, seeded from server/db/*.json (see mock-api.js).
const store = () => globalThis.__DB__;
const base = (p) => String(p).split('/').pop();
module.exports = {
  readFileSync: (p) => {
    const k = base(p);
    if (!(k in store())) throw new Error('ENOENT ' + p);
    return store()[k];
  },
  writeFileSync: (p, data) => { store()[base(p)] = String(data); },
  existsSync: (p) => base(p) in store(),
};
