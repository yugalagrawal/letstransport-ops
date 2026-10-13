// Minimal in-browser stand-in for express: Router + json routing only.
function compile(path) {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  return { re, keys };
}
function Router() {
  const routes = [];
  const add = (method) => (path, handler) => { routes.push({ method, ...compile(path), handler }); };
  return {
    routes,
    get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), delete: add('DELETE'),
  };
}
function express() { throw new Error('express() not supported in prototype'); }
express.Router = Router;
module.exports = express;
